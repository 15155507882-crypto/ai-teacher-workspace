# ADR-005：StateMachine 独立模块

## 状态
已采纳

## 日期
2026-06-28

## 背景
V1 状态管理散落在 Worker、API、前端各处，通过 if/else 判断当前阶段。新增状态/转换需要改 3 个地方，容易不一致。

## 决策
将状态机抽取为独立模块 `ConversationStateMachine`，定义 9 个状态 + 合法转换表 + 禁止转换表。

ConversationManager 只负责协调，状态转换由 StateMachine 验证。

## 后果
- ✅ 状态转换规则集中管理
- ✅ 非法转换在调用时即被拦截
- ✅ 支持状态恢复
- ✅ 单模块可独立测试
