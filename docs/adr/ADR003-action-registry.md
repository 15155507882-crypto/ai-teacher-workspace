# ADR-003：Action Registry 插件化

## 状态
已采纳

## 日期
2026-06-28

## 背景
V1 中 Action Engine 通过 if/else 分发 action。每新增一个动作（导出/复制/分享）就要改 Action Engine 代码，耦合严重。

## 决策
新增 ActionRegistry，所有动作以插件方式注册：

```typescript
ActionRegistry.register('SAVE', SaveAction);
ActionRegistry.register('DELETE', DeleteAction);
```

Action Engine 统一 `dispatch(actionType, workspace)`。

## 后果
- ✅ 新增动作不修改 Action Engine
- ✅ 每个 Action 独立测试
- ✅ 支持运行时注册/卸载
