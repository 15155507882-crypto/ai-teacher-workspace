# ADR-002：Intent / Task / SaveType 三层拆分

## 状态
已采纳

## 日期
2026-06-28

## 背景
V1 直接把用户输入映射到业务类型（personal_lesson/reflection/plan_summary）。导致"你好"被当成 personal_lesson，"帮我看看"被当成 reflection。

## 决策
拆分三层：

1. **Intent**：用户真实意图（CHAT/ASK/CREATE/EDIT/UPLOAD）
2. **Task**：具体工作任务（Create Lesson / Optimize / Generate PPT ...）
3. **SaveType**：数据库保存类型（personal_lesson / reflection / plan_summary）

三层独立演进。只有 Intent=CREATE/EDIT 才进入 Task Detection。只有用户点保存才解析 SaveType。

## 后果
- ✅ 普通聊天不再误判为业务场景
- ✅ Task 可无限扩展（课件、练习等）
- ✅ SaveType 不受 Task 变化影响
