# AI 工作台 V2 设计文档

> Intent First · Chat First, Save Later  
> 版本：V2.0-draft  
> 日期：2026-06-28  
> 状态：待确认

---

## 一、现状与问题

### 当前流程

```
用户输入 → Worker 场景检测 → 生成结构化卡片 → 确认保存
                                            → 修改分类 → 保存
                                            → 继续聊天（normal_chat 分支）
```

### 核心问题

1. **关键词驱动**：看到「教案」就进 personal_lesson，看到「反思」就进 reflection
2. **强制卡片**：AI 识别后立即展示「识别完成: xxx - xxx」卡片，用户被迫确认/修改
3. **体验割裂**：普通聊天返回模板回复，业务场景跨越式进卡片，两条路径完全不统一
4. **文件上传后即结束**：上传 docx → 识别 → 卡片 → 不再能继续聊这个文件
5. **无上下文**：每次发送都是全新请求，附件分析后不保持上下文

---

## 二、V2 设计目标

```
用户输入 → AI 判断 Intent → CHAT/ASK/GENERATE/MODIFY/SAVE
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
               自然聊天      生成内容     保存内容
                                │
                                ▼
                          建议保存卡片
                                │
                          用户确认 → Action Engine
```

**核心原则**：Chat First, Save Later。默认聊天，按需沉淀。

---

## 三、Intent 层（新增）

### 3.1 Intent 定义

| Intent | 含义 | 触发条件 | 行为 |
|--------|------|---------|------|
| **CHAT** | 普通聊天 | 问候、闲聊、无业务意图 | 自然回复，不卡片 |
| **ASK** | 教学咨询 | 「什么是」「如何」「怎样提高」 | 直接回答，不卡片 |
| **GENERATE** | 内容生成 | 「帮我写」「生成」「整理成」 | AI 创作完毕 → 建议保存 |
| **MODIFY** | 内容修改 | 「优化」「润色」「改一下」 | 修改完 → 建议保存 |
| **SAVE** | 用户明确保存 | 「保存」「存起来」「确认」 | 直接调 Action Engine |

### 3.2 Intent 判断逻辑

```
第一步：Intent 判断
  - 用户手动选 mode → 直接用
  - AI 判断 → 返回 { intent, confidence, reason }

第二步：按 Intent 分流
  CHAT   → 自然回复，无卡片
  ASK    → 直接回答，无卡片
  GENERATE → AI 创作，完成后展示预览卡片 + [保存] [修改] [重新生成]
  MODIFY → 修改原内容，完成后展示预览 + [保存]
  SAVE   → 直接调用 Action Engine 保存

第三步：只有 SAVE 才进入业务分类
  - 判断保存到 reflection / personal_lesson / group_lesson / plan_summary
  - 调用 Action Engine
  - 写入数据库
```

### 3.3 场景识别降级

保留原有场景识别规则，但只在 **SAVE intent** 时使用。

其他 Intent 不输出业务分类。

---

## 四、状态机设计

### 4.1 会话状态（Conversation State）

```
┌──────────┐    用户发送消息    ┌──────────┐
│  IDLE    │ ─────────────────→ │ PROCESSING│
│ (空闲)    │                    │ (处理中)   │
└──────────┘                    └────┬─────┘
       ▲                             │
       │        返回结果              │
       │    ┌────────────────────────┘
       │    ▼
       │  ┌──────────┐
       ├──│ CHATTING │ ← CHAT/ASK intent
       │  │ (聊天中)   │
       │  └──────────┘
       │
       │  ┌───────────┐
       ├──│ PREVIEWING│ ← GENERATE/MODIFY intent
       │  │ (预览中)   │     显示预览卡片 + [保存]
       │  └─────┬─────┘
       │        │ 用户点「保存」
       │        ▼
       │  ┌──────────┐
       └──│  SAVED   │
          │ (已保存)   │
          └──────────┘
```

### 4.2 保存动作状态

```
用户点「保存」
  │
  ▼
┌─────────────┐
│ VALIDATING  │ ← 校验 messageId / title / type
│ (校验中)     │
└──────┬──────┘
       │
  ┌────┴────┐
  ▼         ▼
有效      无效
  │         │
  ▼         ▼
┌──────┐  ┌──────┐
│CALLING│  │ERROR │
│调用中 │  │提示  │
└──┬───┘  └──────┘
   │
   ▼
┌──────┐
│DONE  │ ← 保存成功，刷新列表
└──────┘
```

---

## 五、交互流程（Sequence）

### 5.1 普通聊天（CHAT）

```
User → POST /api/ai/chat { text, mode:"auto" }
  → Worker: detectScene → AI判断Intent → CHAT
  → Worker: 自然聊天回复（不生成卡片）
  → Response: { intent:"CHAT", nl_reply:"你好！...", isBusinessScene:false }
  → 前端: 普通消息气泡，无卡片
```

### 5.2 内容生成（GENERATE）

```
User → POST /api/ai/chat { text:"帮我写期末总结", mode:"auto" }
  → Worker: AI判断Intent → GENERATE
  → Worker: AI追问/生成内容
  → Response: { intent:"GENERATE", preview:"...", suggestedSave:true, suggestedType:"plan_summary" }
  → 前端: 预览卡片 + [保存] [修改] [继续聊天]
  → 用户点[保存] → POST /api/ai/confirm
```

### 5.3 文件上传

```
User → upload docx → POST /api/ai/upload → file_id
User → POST /api/ai/chat { file_id, text:"请分析" }
  → Worker: 读取文件内容 → AI判断Intent → 可能 GENERATE
  → Worker: 生成预览 + 建议保存
  → Response: { intent:"GENERATE", preview, suggestedType, fileContext:true }
  → 前端: 预览卡片。后续消息自动带 fileContext。
```

### 5.4 继续聊天（上下文保持）

```
User → POST /api/ai/chat { text:"帮我优化导入", mode:"auto" }
  → Worker: 上下文中有 fileContext（观潮.docx）
  → AI: 基于观潮.docx 优化导入
  → 前端: 修改建议 + [保存] [继续聊天]
```

---

## 六、UI 改造清单

### 6.1 聊天区

| 项 | 说明 |
|----|------|
| 消息气泡 | CHAT/ASK 显示普通气泡，无额外控件 |
| 预览卡片 | GENERATE/MODIFY 完成后，消息下方嵌入预览卡片 |
| 文件上下文 | 上传文件后，输入框上方显示「当前文件: 观潮.docx ×」 |
| 额度显示 | normal_chat 模式显示剩余额度 |

### 6.2 预览卡片

```
┌──────────────────────────────────┐
│ 📋 AI 已完成内容预览              │
│                                  │
│ 期末教学总结                      │
│ 本学期在数学教学方面...           │
│                                  │
│ 建议保存为：学期总结              │
│                                  │
│ [保存] [修改分类] [继续聊天]      │
└──────────────────────────────────┘
```

### 6.3 文件分析卡片

```
┌──────────────────────────────────┐
│ 📄 已分析：观潮.docx              │
│                                  │
│ 内容类型：个人备课（91%）         │
│ 标题：观潮                        │
│ 学科：语文 年级：四年级           │
│                                  │
│ [保存] [修改分类] [继续聊天]      │
└──────────────────────────────────┘
```

---

## 七、Prompt 重构

### 7.1 Intent 判断 Prompt（新增）

```
你是学校备课系统的意图识别器。
判断用户输入属于哪种意图。只返回JSON。

意图定义：
1. CHAT：问候、闲聊、感谢、无明确业务目的
2. ASK：教学咨询，如"什么是课堂导入""如何设计板书"
3. GENERATE：明确要求生成内容，如"帮我写""生成""整理成"
4. MODIFY：修改已有内容，如"优化""润色""改一下"
5. SAVE：用户明确要求保存，如"保存""存起来""确认保存"

判断原则：
- 无明确业务意图 → CHAT
- 只询问不生成 → ASK
- 要求创建新内容 → GENERATE
- 修改已有内容 → MODIFY
- 明确保存意图 → SAVE

返回格式：
{"intent":"CHAT","confidence":0.92,"reason":"用户是普通问候"}
```

### 7.2 保存判断 Prompt（SAVE intent 的第二步）

保留现有场景识别 prompt（personal_lesson/reflection/group_lesson/plan_summary），只在 SAVE 时调用。

---

## 八、数据结构变更

### 8.1 Worker Response 扩展

```typescript
interface WorkerResult {
  // 新增
  intent: 'CHAT' | 'ASK' | 'GENERATE' | 'MODIFY' | 'SAVE';
  intentConfidence: number;
  
  // GENERATE/MODIFY 专用
  preview?: string;           // 预览内容
  suggestedSave?: boolean;    // 是否建议保存
  suggestedType?: string;     // 建议的类型（personal_lesson等）
  
  // 文件上下文
  fileContext?: {
    fileId: number;
    fileName: string;
    lastExtractTime: number;
  };
  
  // 保留
  type?: string;
  title_candidate?: string;
  nl_reply: string;
  isBusinessScene: boolean;
  scene?: string;
}
```

### 8.2 会话上下文

新增 Redis key：
- `ai_context:{sessionId}` → { fileId, fileName, lastMessage, intent }

---

## 九、代码变更范围

### 9.1 文件清单

| 文件 | 变更 | 说明 |
|------|------|------|
| `worker-ai/src/main.ts` | 重写 | Intent分流 + 上下文保持 + GENERATE处理 |
| `worker-ai/src/prompts/prompt-registry.ts` | 新增 | INTENT_PROMPT 替换 SCENE_DETECTION_PROMPT |
| `apps/web/src/app/workspace/page.tsx` | 重写 | 预览卡片 + 上下文显示 + 分类映射 |
| `apps/api/src/modules/ai/ai.service.ts` | 小改 | 传递 fileContext |

### 9.2 不变的部分

| 组件 | 说明 |
|------|------|
| Action Engine | 保存逻辑不变 |
| Content / 子表 | 数据表结构不变 |
| 确认保存 API | POST /api/ai/confirm 不变 |
| 撤销 API | POST /api/ai/undo 不变 |
| 手动录入 | 保留 |

---

## 十、验收场景

### 场景 1：普通聊天
```
输入：你好
→ intent: CHAT → 普通回复 → 无卡片 → 无保存提示
```

### 场景 2：内容生成
```
输入：帮我写期末总结
→ intent: GENERATE → AI追问 → 生成内容 → 预览卡片 + [保存]
→ 点保存 → Action Engine → content表 + plan_summary表
```

### 场景 3：文件上传
```
上传 观潮.docx → 分析 → intent: GENERATE → 预览卡片 + [保存]
→ 继续聊天：「帮我优化导入」→ 基于文件上下文回复
```

### 场景 4：AI 主动建议
```
输入：今天课堂效果很好，学生参与度高
→ AI回复 + 建议：「我建议把这段整理成教学反思」
→ [保存] [继续聊天]
```

### 场景 5：确认保存
```
点[保存] → messageId 数字 + title 非空 + type 合法
→ Action Engine 写入 → code:0 → 按钮显示「已保存」
```

---

## 十一、开发排期

| 阶段 | 内容 | 预估 |
|------|------|------|
| 1 | Intent prompt + Worker 分流 | 1天 |
| 2 | 前端预览卡片 + 上下文 UI | 1天 |
| 3 | 文件上下文保持 | 0.5天 |
| 4 | 联调 + 验收 | 0.5天 |

---

## 十二、审批意见

请确认以下关键决策后开始开发：

1. [ ] Intent 五分类（CHAT/ASK/GENERATE/MODIFY/SAVE）是否认可？
2. [ ] 预览卡片替代自动保存卡片？
3. [ ] GENERATE 完成后先预览，用户点保存才写入？
4. [ ] 文件上传后保持上下文，可继续聊天？
5. [ ] AI 可主动建议保存，但最终由用户决定？
6. [ ] SAVE 时才调用 Action Engine？
