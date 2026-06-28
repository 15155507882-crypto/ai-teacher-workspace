# 工作空间规范 (Workspace Spec)

> **版本**：1.0.0 | **生效日期**：2026-06-28
> **依赖**：本文件服从 `DEVELOPMENT_CONSTITUTION.md`

---

## 一、Workspace 概念

### 1.1 定义

Workspace（工作空间）是 AI 教师工作台中对话的**上下文容器**。每一次 AI 对话都在一个 Workspace 中进行。

### 1.2 核心原则

> **聊天是工作过程，右侧列表是工作成果**

| 区域                | 角色                                   |
| ------------------- | -------------------------------------- |
| 左侧 70% AI 聊天区  | 工作过程：上传、解析、识别、确认、修改 |
| 右侧 30% 工作成果区 | 工作成果：已确认的内容卡片、搜索、筛选 |

### 1.3 对应实体

```
AiWorkspace Entity (ai_workspaces table)
├── id (UUID)
├── teacher_id (所属教师)
├── title (工作空间标题)
├── status (active / archived)
├── created_at
└── updated_at

AiSession Entity (ai_sessions table)
├── id (UUID)
├── workspace_id (关联 workspace)
├── state (对话状态，由 ConversationStateMachine 管理)
├── created_at
└── updated_at

AiMessage Entity (ai_messages table)
├── id (UUID)
├── session_id (关联 session)
├── role (user / assistant / system)
├── content (消息内容)
├── file_references (引用的文件 ID 列表)
└── created_at
```

### 1.4 关联关系

```
Teacher 1──N Workspace 1──N Session 1──N Message
                          │
                          └── Content (AI 识别后生成的内容)
```

---

## 二、Workspace 生命周期

### 2.1 状态流转

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  [创建] ──→ active ──→ [对话结束] ──→ archived            │
│    │                      │                    │            │
│    │                      ▼                    │            │
│    │              [可恢复对话]                  │            │
│    │                      │                    │            │
│    └──────────────────────┴────────────────────┘            │
│                                                             │
│  创建：POST /api/ai/chat（首次对话，无 workspace_id）       │
│  活跃：继续对话                                              │
│  归档：用户离开/长时间不活跃                                 │
│  恢复：从成果列表点击"恢复聊天"                              │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 创建流程

```
1. 用户进入 AI 工作台 或 发送第一条消息
         │
2. 前端 POST /api/ai/chat
   { text: "帮我...", workspace_id: undefined }
         │
3. API Controller → AiService.processChat()
         │
4. 创建 Workspace → 创建 Session → 状态设为 idle
         │
5. 入队 ai-recognition
   { workspaceId, userId, text, fileIds }
         │
6. 返回 { code: 0, data: { workspace_id, session_id } }
         │
7. 前端保存 workspace_id，后续消息携带此 ID
```

### 2.3 恢复流程

```
1. 用户在右侧成果列表点击某条内容的"恢复聊天"
         │
2. 前端 GET /api/ai/workspace/{id}/session
         │
3. API 返回该 workspace 的最新 session + 历史消息
         │
4. 前端加载历史消息到聊天区
         │
5. 前端切换 workspace_id 为当前活跃 workspace
```

---

## 三、文件引用（File Reference）

### 3.1 文件关联机制

当用户上传文件到 Workspace 中时，需要建立文件与消息的引用关系：

```typescript
// Message 中的 file_references
{
  message_id: 'msg-123',
  content: '请帮我看一下这个课件',
  file_references: [
    {
      file_id: 'file-456',
      file_name: '语文教案.docx',
      file_type: 'docx',
      upload_time: '2026-06-28T10:00:00Z'
    }
  ]
}
```

### 3.2 文件引用规则

- ✅ 文件引用跟随消息持久化
- ✅ 恢复对话时，文件引用必须恢复
- ✅ 如果文件被删除，引用保留但标记为 `deleted: true`
- ❌ 不可在对话中断开文件引用
- ❌ 不可在多个 workspace 之间共享文件引用（每个 workspace 独立）

---

## 四、Workspace API

### 4.1 接口列表

| 方法 | 路径                                  | 说明                   |
| ---- | ------------------------------------- | ---------------------- |
| POST | `/api/ai/chat`                        | 发送消息（创建/继续）  |
| GET  | `/api/ai/workspace/{id}`              | 获取 workspace 详情    |
| GET  | `/api/ai/workspace/{id}/session`      | 获取最新 session+消息  |
| GET  | `/api/ai/workspace/{id}/messages`     | 获取消息历史           |
| GET  | `/api/ai/workspaces`                  | 获取用户的 workspace 列表 |

### 4.2 请求/响应格式

```typescript
// POST /api/ai/chat Request
interface ChatRequestDto {
  text: string;
  workspace_id?: string;  // 首次为空，后续携带
  file_ids?: string[];    // 引用的文件 ID
}

// POST /api/ai/chat Response
interface ChatResponseDto {
  workspace_id: string;
  session_id: string;
  message: {
    id: string;
    role: 'assistant';
    content: string;
  };
}
```

---

## 五、与 Content 的关系

### 5.1 AI 识别 → 保存 Content

```
用户发送消息（含文件）
    │
    ▼
Worker AI 识别
    │
    ├── detectScene() → 识别内容类型
    │
    ├── chat() → 生成内容
    │
    ├── 推荐分类（lesson_plan/group_lesson/reflection/plan_summary）
    │
    ▼
聊天区展示确认卡片
    │
    ▼
用户确认/修改分类
    │
    ▼
ActionEngine → ContentService.create()
    │
    ├── 保存到 contents 表
    ├── 关联 workspace_id
    └── 触发右侧成果列表刷新
```

### 5.2 关键规则

- ✅ Content 与 Workspace 关联（content.workspace_id）
- ✅ 用户确认后才能保存 Content
- ✅ 分类信息通过聊天区确认，不使用弹窗
- ❌ AI 不可自动保存 Content 到正式内容表（必须先确认）

---

## 六、禁止事项

- ❌ 断开 Workspace 上下文
- ❌ 新建 Workspace 时丢失历史消息
- ❌ 在多个 Workspace 之间共享文件引用
- ❌ AI 自动保存未确认的内容
- ❌ Workspace 创建后不返回 workspace_id
- ❌ 恢复对话时不加载历史消息

---

## 七、修订记录

| 版本  | 日期       | 修改内容       |
| ----- | ---------- | -------------- |
| 1.0.0 | 2026-06-28 | 初始版本       |
