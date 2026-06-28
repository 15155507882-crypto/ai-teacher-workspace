# AI 工作台 V2.1 架构升级 — 整体开发方案（终版）

> 版本：V2.1-final  
> 日期：2026-06-28  
> 状态：开发中（Phase 1 ✅ | Phase 2-6 ⬜）

---

## 概述

本次不是修 Bug，而是 AI 工作台架构升级。

核心理念：**Chat First → Workspace → Save Later**

目标：AI 工作台成为一个持续工作空间，不是一次聊天一次保存。

---

## 一、新架构分层

```
┌──────────────────────────────────────────────────┐
│                   UI Layer                        │
│   聊天区 · 预览区 · 工作空间面板 · 文件上下文        │
└──────────────────────────────────────────────────┘
                       │
┌──────────────────────────────────────────────────┐
│              Conversation Manager                │
│   会话管理 · 状态机 · 事件总线 · 上下文传递        │
└──────────────────────────────────────────────────┘
                       │
┌──────────────────────────────────────────────────┐
│              Workspace Manager                   │
│   当前附件 · 当前生成内容 · 当前标题 · 当前分类     │
│   当前版本 · 当前Prompt · 当前Task · 当前聊天       │
└──────────────────────────────────────────────────┘
                       │
┌──────────────────────────────────────────────────┐
│          Intent Detection（意图识别层）            │
│    CHAT · ASK · CREATE · EDIT · UPLOAD            │
└──────────────────────────────────────────────────┘
                       │
┌──────────────────────────────────────────────────┐
│          Task Detection（任务识别层）              │
│   Create Lesson · Create Reflection              │
│   Create Summary · Optimize · Generate PPT ...   │
└──────────────────────────────────────────────────┘
                       │
┌──────────────────────────────────────────────────┐
│         Need More Info（信息补全层）               │
│   年级？ · 学科？ · 具体要求？ · 亮点/问题？        │
└──────────────────────────────────────────────────┘
                       │
┌──────────────────────────────────────────────────┐
│           Generate（内容生成层）                   │
│   教案 · 总结 · 反思 · 计划 · 课件 · 练习          │
└──────────────────────────────────────────────────┘
                       │
┌──────────────────────────────────────────────────┐
│         Preview Workspace（预览工作区）            │
│   标题编辑 · 正文编辑 · 重新生成 · 版本管理         │
└──────────────────────────────────────────────────┘
                       │
┌──────────────────────────────────────────────────┐
│           SaveType Resolution                    │
│   Task → SaveType 映射：                         │
│   Create Lesson → personal_lesson                │
│   Create Reflection → reflection                 │
│   ...                                           │
└──────────────────────────────────────────────────┘
                       │
┌──────────────────────────────────────────────────┐
│           Action Registry（动作注册表）            │
│   SAVE · DELETE · UNDO · EXPORT_DOCX             │
│   EXPORT_PDF · COPY · SHARE · REGENERATE          │
│   CONTINUE_CHAT                                  │
└──────────────────────────────────────────────────┘
                       │
┌──────────────────────────────────────────────────┐
│       Action Engine（动作执行层 — 不动）           │
│   Content · 子表 · 附件 · 日志 · 事务             │
└──────────────────────────────────────────────────┘
```

### 核心变化（相比 V1）

| V1（当前） | V2.1（设计） |
|-----------|-------------|
| Session 为中心 | **Workspace 为中心** |
| 关键词 → 类型 → 卡片 | Intent → Task → Generate → Preview → Save |
| 无错误恢复 | 状态机含 ERROR 状态 |
| 搜索即结束 | 文件上传后保持上下文持续工作 |
| switch/if 分发 | Action Registry 标准化 |
| 无版本 | Workspace Version 支持回退 |

### Task 与 SaveType 解耦

```
Task（做什么）              SaveType（存成什么）
Create Lesson          →   personal_lesson
Create Reflection      →   reflection
Create Summary         →   plan_summary
Create Plan            →   plan_summary（plan_type=teaching_plan）
Optimize               →   保持原 SaveType
Generate PPT           →   courseware（将来扩展）
Generate Practice      →   exercise（将来扩展）
```

Task 代表工作意图，可以不断扩展。SaveType 是数据库落地格式。两者独立演进。

---

## 二、状态机设计（含 Error）

```
                        ┌─────────┐
              用户输入   │  IDLE   │
          ┌────────────→│（空闲）   │
          │             └────┬────┘
          │                  │
          │           开始处理│
          │                  ▼
          │             ┌──────────┐
          │             │PROCESSING│
          │             │（处理中）  │
          │             └────┬─────┘
          │                  │
          │      ┌───────────┼───────────┐
          │      ▼           ▼           ▼
          │  ┌───────┐  ┌─────────┐  ┌───────┐
          │  │CHATTING│  │GENERATING│ │ASKING │
          │  └───┬───┘  └────┬────┘  └───────┘
          │      │            │
          │      │       生成完成
          │      │            ▼
          │      │      ┌─────────┐
          │      │      │ PREVIEW │
          │      │      │（预览中） │
          │      │      └────┬────┘
          │      │           │ 用户点 SAVE
          │      │           ▼
          │      │      ┌─────────┐
          │      │      │ SAVING  │
          │      │      └────┬────┘
          │      │           │ 成功
          │      │           ▼
          │      │      ┌─────────┐
          │      └─────→│  SAVED  │
          │             └─────────┘
          │
          │  任何状态发生异常
          │      │
          │      ▼
          │  ┌─────────┐
          │  │  ERROR  │ ← 新增
          │  └────┬────┘
          │       │ Retry
          │       └────→ PROCESSING
          │
          └── 继续输入 → PROCESSING
```

### 禁止转换

- IDLE → SAVING（必须经 PREVIEW）
- PROCESSING → SAVED（必须经 PREVIEW → SAVING）
- ERROR → SAVED（必须先 Retry）
- 任何状态 → 自动保存

---

## 三、分层职责（含 workspacespec）

### Layer 0：Workspace Manager（新增 ★）

**Redis Key**：
```
ai:workspace:{sessionId}
```

**数据结构**：
```typescript
interface Workspace {
  id: string;                    // workspace id = sessionId
  version: number;               // 每次保存 +1
  state: ConversationState;      // 当前状态机状态
  currentFile?: {                // 当前附件
    fileId: number;
    fileName: string;
    uploadedAt: number;
  };
  currentContent?: {             // 当前生成内容
    title: string;
    body: string;
    task: string;
    saveType: string;
    version: number;
  };
  currentTask?: string;          // 当前 Task
  currentPrompt?: string;        // 当前 Prompt
  history: {                      // 历史版本
    version: number;
    title: string;
    body: string;
    savedAt: number;
  }[];
  chatHistory: ChatMessage[];    // 聊天记录
  createdAt: number;
  updatedAt: number;
}
```

**职责**：
- 维护整个工作空间状态
- 版本管理（每次保存自动递增）
- 恢复历史版本
- 不判断 Intent、不生成内容、不保存数据库

### Layer 1：Conversation Manager

| 职责 | 说明 |
|------|------|
| 会话生命周期 | 创建/恢复/关闭 |
| 状态转换 | 根据 Intent 切换状态机 |
| 事件总线 | 发布 MessageReceived / IntentDetected / TaskDetected / PreviewReady / Saved |
| 上下文传递 | Workspace → 各层 |
| 错误处理 | 捕获各层异常 → 转 ERROR 状态 → 支持 Retry |

**事件流**：
```
MessageReceived → IntentDetected → TaskDetected → InfoCollected
→ ContentGenerated → PreviewReady → SaveRequested → Saved
```

### Layer 2：Intent Detection

| Intent | 触发 | 行为 |
|--------|------|------|
| CHAT | 问候、闲聊 | 自然回复，不触发下层 |
| ASK | 教学咨询 | 直接回答 |
| CREATE | 「帮我写」「生成」 | → Task Detection |
| EDIT | 「优化」「改」 | → Task Detection（保持上下文） |
| UPLOAD | 上传文件 | 分析 → 建议操作 → 等用户选择 |

**只做**：判断意图，返回 { intent, confidence }  
**不做**：判断业务类型、生成内容、保存

### Layer 3：Task Detection

仅当 Intent=CREATE/EDIT 时调用。

**Task 枚举（可扩展）**：
```
Create Lesson        → 创建备课
Create Reflection    → 创建反思
Create Summary       → 创建总结
Create Plan          → 创建计划
Optimize Lesson      → 优化备课
Generate PPT         → 生成课件（将来）
Generate Practice    → 生成练习（将来）
```

**只做**：识别任务类型  
**不做**：判断 SaveType、生成内容

### Layer 4：Need More Info

当信息不足以生成时：
- AI 主动追问年级、学科、具体要求
- 收集完毕 → 回到 Generate

### Layer 5：Generate

基于上下文生成内容。返回预览。

### Layer 6：Preview + Workspace Version

展示生成内容，支持：
- 编辑标题/正文（inline）
- 版本管理：每次修改递增 version
- 恢复历史版本
- [保存] [重新生成] [继续聊天]

### Layer 7：SaveType Resolution

Task → SaveType 映射：
```
Create Lesson → personal_lesson
Create Reflection → reflection
Create Plan → plan_summary（plan_type=teaching_plan）
Create Summary → plan_summary（plan_type=semester_summary）
Optimize → 保持原 SaveType
```

### Layer 8：Action Registry

```
┌─────────────┐
│ Action      │  输入: workspace + actionType + params
│ Registry    │  输出: 统一的 dispatch 调用
└──────┬──────┘
       │
       ├── SAVE         → Action Engine.save()
       ├── DELETE       → Action Engine.softDelete()
       ├── UNDO         → Action Engine.undo()
       ├── EXPORT_DOCX  → ExportService.docx()
       ├── EXPORT_PDF   → ExportService.pdf()
       ├── COPY         → 复制到剪贴板
       ├── SHARE        → 生成分享链接
       ├── REGENERATE   → 回到 Generate 层
       └── CONTINUE_CHAT→ 回到 CHATTING 状态
```

每个 Action 统一接口：
```typescript
interface Action {
  type: string;
  execute(ctx: Workspace): Promise<ActionResult>;
}
interface ActionResult {
  success: boolean;
  message: string;
  data?: any;
  workspaceVersion: number;
}
```

### Layer 9：Action Engine（不动）

保持现有 Content / 子表 / 附件 / 事务 / 撤销逻辑。

---

## 四、Prompt 拆分明细

| Prompt | 职责 | 位置 |
|--------|------|------|
| INTENT_PROMPT | 判断用户意图 | Layer 2 |
| TASK_PROMPT | 识别业务任务 | Layer 3 |
| INFO_PROMPT | 信息不足时追问 | Layer 4 |
| GENERATE_PROMPT | 生成内容 | Layer 5 |
| PREVIEW_PROMPT | 预览格式化 | Layer 6 |
| SUGGESTION_PROMPT | AI 主动建议 | 独立，不定时触发 |
| WORKSPACE_PROMPT | 上下文理解 | Layer 0 |

**规则**：
- 一个 Prompt 一个职责
- Prompt 不超过 30 行
- 不跨层混用 Prompt

---

## 五、通用接口规范

所有 API 统一返回：

```typescript
interface ApiResponse<T> {
  success: boolean;
  code: number;          // 0=成功
  message: string;
  data?: T;
  traceId: string;
  workspaceId: string;
  workspaceVersion: number;
}
```

---

## 六、分阶段开发计划

### Phase 1：Workspace + Conversation（根基）

| 文件 | 变更 |
|------|------|
| `apps/api/src/modules/ai/` | + WorkspaceManager（Redis） |
| `worker-ai/src/main.ts` | Workspace 初始化 + 状态机 |
| 文档 | 更新 API 文档 + Workspace schema |

**验收**：
- workspace 创建/恢复/更新
- 状态机 IDLE → PROCESSING → CHATTING

### Phase 2：Intent + Task Detection

| 文件 | 变更 |
|------|------|
| `prompt-registry.ts` | + INTENT_PROMPT + TASK_PROMPT |
| `main.ts` | Intent 分流 + Task 检测 |

**验收**：
- 「你好」→ CHAT
- 「帮我写教案」→ CREATE + Task=Create Lesson

### Phase 3：Generate + Preview + 编辑

| 文件 | 变更 |
|------|------|
| `workspace/page.tsx` | 预览卡片 + inline 编辑 |
| `main.ts` | INFO_PROMPT + GENERATE_PROMPT |

**验收**：
- 信息不足 → AI 追问
- 生成完成 → 预览卡片 + 可编辑

### Phase 4：Action Registry + 文件上下文

| 文件 | 变更 |
|------|------|
| `action-engine.service.ts` | 封装 Action Registry |
| `main.ts` | 文件上下文维护 |

**验收**：
- 上传文件 → 保持上下文继续聊
- SAVE → Action Engine 写入

### Phase 5：版本管理 + Workspace 恢复 + Error 处理

| 文件 | 变更 |
|------|------|
| `main.ts` | 版本递增 + 恢复 + ERROR 状态 |
| `workspace/page.tsx` | 恢复 UI |

**验收**：
- 刷新 → 恢复状态
- 异常 → ERROR → Retry → 正常

### Phase 6：全场景验收

8 个场景全部通过，10 条验收标准全部满足。

---

## 七、开发规范

### 1. 分层原则

```
每层只做自己的事情：

Workspace   → 不判断 Intent
Intent      → 不判断 Task
Task        → 不生成内容
Generate    → 不保存数据库
Preview     → 不调用 Action Engine
Action      → 不判断业务逻辑
```

### 2. Prompt 规范

- 一个 Prompt 一个职责
- 每个 Prompt 不超过 30 行
- Prompt 独立存储，不内嵌在业务逻辑

### 3. 状态恢复

- 所有状态必须可恢复（浏览器刷新不丢数据）
- Workspace 版本每次保存 +1
- 支持回退到任意历史版本

### 4. 接口规范

- 统一返回格式（ApiResponse）
- traceId 全链路追踪
- workspaceId / workspaceVersion 必带

### 5. 阶段验收

每个 Phase 结束前：
- 更新架构文档
- 更新接口文档
- 更新时序图
- 输出测试报告
- 确认向下兼容

未完成 → 不进入下一 Phase

---

## 八、审批清单

请逐项确认：

- [ ] Workspace Manager 作为核心对象（Layer 0）
- [ ] Task 与 SaveType 解耦
- [ ] 状态机含 ERROR + Retry
- [ ] Action Registry 标准化
- [ ] Workspace Version 版本管理
- [ ] Prompt 拆分明细（7 个独立 Prompt）
- [ ] 6 个 Phase 开发顺序
- [ ] 开发规范 5 条
- [ ] 向下兼容现有功能（Action Engine / Content / confirm / undo）
- [ ] 每阶段独立可运行

---

批准后按 Phase 1 → 6 顺序开始开发。
