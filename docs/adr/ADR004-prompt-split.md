# ADR-004：Prompt 拆分

## 状态
已采纳

## 日期
2026-06-28

## 背景
V1 只有一个场景识别 Prompt，混合了意图判断、业务分类、内容生成逻辑。Prompt 越写越长，改一行影响全局。

## 决策
Prompt 按职责拆分为独立的版本化文件：

- INTENT_PROMPT_v1：判断用户意图
- TASK_PROMPT_v1：识别工作任务
- INFO_PROMPT_v1：信息不足时追问
- GENERATE_PROMPT_v1：生成内容
- PREVIEW_PROMPT_v1：预览格式化
- SUGGESTION_PROMPT_v1：AI 主动建议
- WORKSPACE_PROMPT_v1：上下文理解

每个 Prompt ≤ 30 行。升级时新建版本文件。

## 后果
- ✅ 单个 Prompt 修改不影响其他
- ✅ 支持版本对比和回退
- ⚠️ 需要管理 7 个文件
