# 开发宪法引用

This repository follows the Development Constitution defined in:

**docs/development/DEVELOPMENT_CONSTITUTION.md**

Before making any code changes, you MUST read and follow this document.

If any implementation conflicts with the Constitution, stop coding and report the conflict first.

Never bypass the Constitution.

---

# 项目开发强制规则：证据驱动验收

## 一、核心原则

本项目不接受"代码已修改，所以应该好了"的结论。

任何任务必须按以下流程完成：

1. 先复现问题
2. 输出复现证据
3. 定位根因
4. 最小范围修改代码
5. 重启相关服务
6. 证明新代码已生效
7. 用真实页面 / 接口 / 数据库验证
8. 输出验收证据
9. 最后才能声明是否完成

没有证据，不得说"已修复""验证通过""刷新试试"。

---

## 二、禁止行为

禁止以下行为：

1. 禁止只看代码后说"已修复"
2. 禁止没有截图、日志、SQL 就说"验证通过"
3. 禁止把 curl 成功当成页面成功
4. 禁止把后端成功当成前端成功
5. 禁止把接口 code:0 当成业务正确
6. 禁止没有重启 API / Worker / 前端就说新代码已生效
7. 禁止没有确认当前页面真实组件就修改某个组件
8. 禁止没有 Network 请求证据就判断前端已传参
9. 禁止没有 Worker 日志就判断 AI 任务已执行
10. 禁止猜测式结论

---

## 三、Bug 修复必须输出的内容

每次 Bug 修复完成后，必须按以下格式输出：

### 1. 复现证据

- 操作步骤：
- 实际错误表现：
- 页面截图 / 日志：
- Network 请求：

### 2. 根因定位

- 问题卡在哪一层：前端 / API / Worker / Redis / 数据库 / 服务未重启
- 具体文件：
- 具体函数：
- 根因说明：

### 3. 修改文件

- 文件 1：
- 文件 2：
- 修改说明：

### 4. 重启证据

必须说明：

- 前端是否重启：
- API 是否重启：
- Worker 是否重启：
- 重启命令：
- 当前进程 PID：
- 进程启动时间：
- 修改文件时间：
- 是否确认新代码已生效：

### 5. 前端验证

涉及页面问题时必须提供：

- 页面 URL：
- 当前实际渲染组件：
- Network Request Payload：
- Network Response Body：
- Console 是否报错：
- 页面实际截图：

### 6. 后端验证

涉及接口时必须提供：

- Controller 是否收到请求：
- DTO 参数：
- Service 执行日志：
- 返回结果：

### 7. Worker / Redis / 队列验证

涉及 AI、异步任务、BullMQ、Redis 时必须提供：

- API 入队 payload：
- Worker job.data：
- Worker 执行分支：
- Redis key：
- 队列 waiting / active / failed 数量：
- Worker 是否已重启：

### 8. 数据库验证

涉及保存、删除、更新时，必须提供 SQL 查询结果。

不能只说"已写入数据库"。

### 9. 最终结论

- 是否修复：
- 证据是否完整：
- 剩余风险：
- 下一步建议：

---

## 四、任务完成标准

只有同时满足以下条件，才允许声明任务完成：

1. 问题已真实复现
2. 根因有具体代码位置
3. 修改文件明确
4. 相关服务已重启
5. 页面或接口已真实测试
6. 日志能证明链路正确
7. 数据库结果符合预期
8. 没有遗留旧逻辑或旧模板
9. 用户可按报告复查

否则只能说：

"代码已修改，但尚未完成真实验收。"

---

## 五、普通前端页面问题最低验收要求

前端问题至少提供：

1. 页面截图
2. 当前实际组件路径
3. Network 请求
4. Response Body
5. Console 报错情况
6. 修复后截图

---

## 六、接口问题最低验收要求

接口问题至少提供：

1. Request Payload
2. Response Body
3. Controller 日志
4. Service 日志
5. 数据库 SQL，如涉及数据变更

---

## 七、AI 工作台问题最低验收要求

AI 工作台问题必须提供完整链路：

1. 前端 mode / text / file_id
2. POST /api/ai/chat Request Payload
3. Controller DTO
4. Service 入队 payload
5. Worker job.data
6. detectScene 结果
7. 是否进入 normal_chat 或业务场景分支
8. 是否调用 LLM
9. 是否生成保存卡片
10. 是否写 content
11. 是否扣 quota
12. 页面最终显示结果

---

## 八、开发习惯要求

1. 每次只改和根因相关的最小范围
2. 不要顺手重构
3. 不要一次改多个不相关问题
4. 修改前先说明影响范围
5. 修改后必须说明是否影响原有功能
6. 涉及数据库字段变更必须说明迁移方案
7. 涉及部署目录必须说明生产环境注意事项
