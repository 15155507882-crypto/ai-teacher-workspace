# 对话规范 (Conversation Spec)

> **版本**：1.0.0 | **生效日期**：2026-06-28
> **依赖**：本文件服从 `DEVELOPMENT_CONSTITUTION.md`

---

## 一、ConversationStateMachine（对话状态机）

### 1.1 设计原则

状态机是一个独立模块（见 ADR-005），集中管理对话的所有合法状态和转换规则。

**核心价值**：
- 状态转换规则集中管理（不改多处）
- 非法转换在调用时即被拦截
- 支持状态恢复
- 单模块可独立测试

### 1.2 文件位置

```
apps/api/src/modules/ai/
├── conversation-state-machine.ts   # 状态机定义
└── conversation-manager.ts         # 状态管理器（协调层）
```

---

## 二、状态定义（9 个状态）

| 状态           | 含义                       | 说明                             |
| -------------- | -------------------------- | -------------------------------- |
| `idle`         | 空闲                       | 初始状态，等待用户输入           |
| `waiting`      | 等待中                     | 用户已发送消息，等待 Worker 处理 |
| `processing`   | 处理中                     | Worker 正在执行 AI 调用          |
| `classifying`  | 分类中                     | AI 已完成识别，等待分类确认      |
| `confirming`   | 确认中                     | 展示确认卡片，等待用户确认       |
| `saving`       | 保存中                     | 用户已确认，正在保存内容         |
| `done`         | 完成                       | 当前对话轮次完成                 |
| `error`        | 错误                       | 处理过程中发生错误               |
| `recovering`   | 恢复中                     | 从历史记录恢复对话               |

---

## 三、合法转换表

```
idle        → waiting        ✅  用户发送消息
idle        → recovering     ✅  恢复历史对话

waiting     → processing     ✅  Worker 开始处理
waiting     → error          ✅  入队失败

processing  → classifying    ✅  AI 识别完成
processing  → done           ✅  AI 识别为普通对话
processing  → error          ✅  AI 调用失败

classifying → confirming     ✅  分类推荐生成完毕
classifying → error          ✅  分类失败

confirming  → saving         ✅  用户确认分类
confirming  → processing     ✅  用户修改分类，重新处理
confirming  → idle           ✅  用户取消

saving      → done           ✅  保存成功
saving      → error          ✅  保存失败

done        → waiting        ✅  用户继续发送消息
done        → idle           ✅  用户停止操作

error       → waiting        ✅  重试
error       → idle           ✅  放弃

recovering  → idle           ✅  恢复完成
recovering  → error          ✅  恢复失败
```

---

## 四、禁止转换表

以下转换在任何情况下都**不允许**：

```
idle        → saving         ❌  未发消息不能保存
idle        → done           ❌  无操作不能完成
waiting     → saving         ❌  未处理完不能保存
processing  → confirming     ❌  未分类不能确认
done        → saving         ❌  已完成不能再保存
error       → saving         ❌  错误状态不能保存
error       → done           ❌  错误状态不能完成
```

---

## 五、ConversationManager（对话管理器）

### 5.1 职责

`ConversationManager` 是状态机的协调层，负责：

1. 持有当前状态
2. 调用 `ConversationStateMachine` 验证转换
3. 执行转换前后的业务逻辑（日志、通知、数据更新）
4. 提供状态查询接口

### 5.2 接口

```typescript
class ConversationManager {
  private currentState: ConversationState;
  private stateMachine: ConversationStateMachine;

  // 获取当前状态
  getState(): ConversationState;

  // 尝试状态转换（会验证合法性）
  transition(target: ConversationState, context?: TransitionContext): void;

  // 查询是否允许转换
  canTransition(target: ConversationState): boolean;

  // 获取当前状态允许的下一步状态
  getAllowedTransitions(): ConversationState[];

  // 从持久化数据恢复状态
  restoreFromHistory(historyState: ConversationState, messages: Message[]): void;
}
```

### 5.3 使用示例

```typescript
// API Service 中
class AiService {
  async processChat(dto: ChatRequestDto, userId: string) {
    // 获取或创建 conversation manager
    const manager = await this.getOrCreateManager(dto.workspace_id);

    // 状态转换（自动验证合法性）
    manager.transition('waiting', { userId, text: dto.text });

    // 入队
    await this.aiQueue.add('recognize', {
      workspaceId: manager.workspaceId,
      userId,
      text: dto.text,
      fileIds: dto.file_ids,
    });

    return { workspace_id: manager.workspaceId, state: manager.getState() };
  }
}
```

---

## 六、状态恢复

### 6.1 恢复场景

- 用户从成果列表点击"恢复聊天"
- 页面刷新后重新进入
- 服务重启后恢复活跃对话

### 6.2 恢复流程

```
1. 前端加载 workspace 的最新 session
         │
2. 获取 session 的当前状态 + 历史消息
         │
3. 调用 manager.restoreFromHistory(state, messages)
         │
4. StateMachine 验证历史状态的合法性
         │
5. 恢复对话上下文（messages + file_references）
         │
6. 前端渲染历史消息 + 恢复聊天输入框
```

---

## 七、错误处理

### 7.1 错误状态处理

```
任何状态 → error 后：

1. 记录错误日志
2. 保存错误信息到 AiDecisionLog
3. 前端展示错误提示
4. 用户可选择：重试（error → waiting）或放弃（error → idle）
```

### 7.2 不可恢复的错误

以下错误不能通过重试解决：
- AI API Key 无效
- 文件已被删除
- 数据库连接失败（等待恢复）
- Workspace 已归档

---

## 八、测试用例清单

状态机必须覆盖以下测试场景：

| 编号 | 测试场景                           | 预期结果     |
| ---- | ---------------------------------- | ------------ |
| T01  | idle → waiting                     | ✅ 合法      |
| T02  | idle → saving                      | ❌ 非法      |
| T03  | processing → classifying           | ✅ 合法      |
| T04  | done → waiting                     | ✅ 合法      |
| T05  | done → saving                      | ❌ 非法      |
| T06  | error → saving                     | ❌ 非法      |
| T07  | confirming → saving                | ✅ 合法      |
| T08  | confirming → processing (修改分类) | ✅ 合法      |
| T09  | error → waiting (重试)             | ✅ 合法      |
| T10  | 恢复历史状态到 idle                | ✅ 合法      |
| T11  | 恢复历史非法状态                   | ❌ 抛出异常  |
| T12  | 所有合法转换遍历测试               | 100% 覆盖    |

---

## 九、禁止事项

- ❌ 绕过 StateMachine 直接修改状态
- ❌ 在多个地方定义状态转换规则
- ❌ 允许非法状态转换（状态机必须抛异常）
- ❌ 恢复对话时不验证状态合法性
- ❌ 修改状态机不更新 ADR-005

---

## 十、修订记录

| 版本  | 日期       | 修改内容       |
| ----- | ---------- | -------------- |
| 1.0.0 | 2026-06-28 | 初始版本       |
