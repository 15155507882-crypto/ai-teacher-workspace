---
name: ui-ux-polish
description: |
  UI/UX visual optimization for AI Teacher Workspace. Apply modern education SaaS styling.
  Trigger when: developing ANY frontend page, redesigning UI, building admin pages, 
  AI workspace, home page, list pages, forms, dialogs, drawers, detail views.
  Ensure pages meet production-quality visual standards — clean, spacious, consistent.
  Never deliver bare functional pages without visual polish.
---

# UI/UX 视觉优化与页面美化

## 核心目标

不仅实现功能，还要达到"学校后台系统可正式交付"的视觉标准。页面干净、清爽、留白充足。

## 统一规范速查

### 色彩
- 主色: `#2563EB` (蓝), Hover: `#1D4ED8`
- 背景: `#F8FAFC`, 卡片: `#FFFFFF`, 次级: `#F1F5F9`
- 文字: 标题 `#0F172A`, 正文 `#334155`, 辅助 `#64748B`
- 成功 `#22C55E`, 警告 `#F59E0B`, 危险 `#EF4444`

### 间距
- 页面边距 24px/32px, 卡片内边距 20px/24px
- 表单项间距 16px, 按钮间距 8px/12px

### 表格
- 表头浅灰背景加粗, 行高 52-60px, 状态用 Badge 不用纯文字
- 每页 20 条, 空数据显示 Empty 状态, 长文本省略

### 表单
- 输入框高度统一(h-10), 必填项标*, 底部按钮: 取消 + 确定(主按钮右侧)

### 弹窗/抽屉
- 弹窗宽度 520-720px, 抽屉宽度 520-720px
- 删除用危险按钮 + 二次确认

### 按钮分层
- 主按钮(蓝): 新增/保存/确认
- 次按钮(白边): 取消/返回
- 危险按钮(红): 删除/停用
- 操作列: 编辑/查看/启用/删除

### 状态标签(Badge)
- 绿色: 启用/在职/已完成
- 橙色: 停用/待确认
- 灰色: 离职/草稿
- 红色: 删除/失败

### AI 对话框
- 最大宽度 860px 居中, 附件显示真实文件名
- AI 消息白卡左对齐+头像, 用户消息蓝底右对齐
- 确认卡片内嵌气泡, 反思显示关联推荐

### 首页
- 备课组卡片式展示, 教师首字头像+姓名+备课数+反思数
- 空状态有引导文案

## 开发流程

1. 理解页面业务目标
2. 设计页面布局
3. 实现功能
4. 同步优化 UI
5. 自检视觉效果

## 验收清单

- [ ] 页面整洁有留白
- [ ] 表格不拥挤
- [ ] 按钮统一
- [ ] 弹窗美观
- [ ] 状态用 Badge
- [ ] 空/加载/错误状态已处理
- [ ] 长文本省略
- [ ] 每页 20 条分页
- [ ] 和现有页面风格一致

## 禁止

- 裸 HTML 样式、默认浏览器按钮
- 表格无边距、内容挤在一起
- 状态显示 true/false/0/1
- 空数据直接空白
- 每个页面风格不一致
- 只实现功能不做美化
