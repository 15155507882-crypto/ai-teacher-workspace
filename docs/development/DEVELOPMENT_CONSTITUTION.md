# 开发宪法 (Development Constitution)

> **版本**：1.0.0
> **生效日期**：2026-06-28
> **优先级**：最高 —— 本文件高于所有其他规范、需求、个人判断
> **适用范围**：本项目所有开发者（人类 + AI）

---

## 前言

本宪法是 AI 教师工作空间（AI Teacher Workspace）项目的最高开发准则。

**宪法地位**：
- 任何需求、PRD、设计文档、代码不得违反本宪法
- 如果需求与宪法冲突，以宪法为准（先修改需求）
- 如果发现宪法需要修改，必须通过 ADR 流程，不得直接修改
- 每次开发任务必须先阅读本宪法

**为什么需要宪法**：
AI 编程的最大问题是上下文变长后会忘记前面的规范。本宪法是"不可缩短的上下文"——每次开发必须读取，每条铁律必须遵守。

---

## 第一章：架构铁律（Architecture Invariants）

### 1.1 分层边界不可跨越

```
┌─────────────────────────────────────────────┐
│  Web (Next.js 15)          ← 展示层          │
│  只能调用 API 接口，不可直接访问 DB/Redis     │
├─────────────────────────────────────────────┤
│  API (NestJS 10)           ← 业务层          │
│  入队 Redis/BullMQ，不可同步执行耗时任务      │
├─────────────────────────────────────────────┤
│  Redis + BullMQ            ← 消息队列        │
│  API 只能入队，Worker 只能消费               │
├─────────────────────────────────────────────┤
│  Worker (BullMQ Consumer)  ← 执行层          │
│  执行耗时任务，不可直接响应用户请求           │
├─────────────────────────────────────────────┤
│  Database (PostgreSQL 15)  ← 持久层          │
│  只能通过 Repository 访问，不可直接操作       │
└─────────────────────────────────────────────┘
```

**铁律**：
- ❌ **禁止** Web 层直接调用 Worker
- ❌ **禁止** Web 层直接操作数据库
- ❌ **禁止** API 层同步执行耗时操作（AI 调用、文件转换、PDF 导出）
- ❌ **禁止** Worker 层直接响应用户 HTTP 请求
- ✅ API 层耗时操作必须通过 BullMQ 入队，由 Worker 异步执行

### 1.2 Adapter 模式不可绕过

```
                   ┌──────────────┐
                   │  IAIAdapter   │  ← 接口（packages/adapter-ai）
                   └──────┬───────┘
                          │ implements
              ┌───────────┼───────────┐
              ▼           ▼           ▼
        DeepSeek      OpenAI      (未来扩展)
```

**铁律**：
- ❌ **禁止** 在业务代码中直接调用 DeepSeek SDK / OpenAI SDK
- ❌ **禁止** 在业务代码中直接调用 LibreOffice 命令
- ❌ **禁止** 在业务代码中直接操作文件系统（如 `fs.writeFile`）
- ✅ 所有外部依赖必须通过 Adapter 接口调用
- ✅ 可通过环境变量切换 Adapter 实现

**现有 Adapter**：
| Adapter            | 接口包                | 实现                     |
| ------------------ | --------------------- | ------------------------ |
| IAIAdapter         | packages/adapter-ai   | DeepSeek（可切换OpenAI） |
| IPreviewAdapter    | packages/adapter-preview | LibreOffice Headless  |
| IStorageAdapter    | packages/adapter-storage | Local / MinIO         |

### 1.3 异步 Worker 不可同步化

**铁律**：
- ❌ **禁止** API Controller 中直接调用 AI 识别
- ❌ **禁止** API Controller 中直接调用文件预览转换
- ❌ **禁止** API Controller 中直接执行 PDF 导出
- ✅ AI 识别 → 入队 `ai-recognition` 队列 → Worker 消费
- ✅ 文件预览 → 入队 `preview` 队列 → Worker 消费
- ✅ PDF 导出 → 入队 `export` 队列 → Worker 消费

**Worker 类型**：
| Worker             | 职责                   | 队列名            |
| ------------------ | ---------------------- | ----------------- |
| worker-ai          | AI 识别/对话/场景检测  | ai-recognition    |
| worker-preview     | 文件预览转换           | preview           |
| worker-export      | PDF 导出               | export            |
| worker-schedule    | 定时任务               | schedule          |

### 1.4 Action Engine 不可绕过

**铁律**：
- ❌ **禁止** 在 AI 相关代码中直接写业务逻辑分支（if/else 判断做什么）
- ✅ 所有 AI 操作必须通过 `ActionEngine` 注册和分发
- ✅ 新增操作类型 → 注册到 ActionEngine → 实现 action handler

### 1.5 Workspace 上下文不可断

**铁律**：
- ❌ **禁止** 在对话中断开 workspace 引用
- ❌ **禁止** 丢弃对话中的文件引用（file_id）
- ✅ 每次对话必须持有有效的 workspace_id
- ✅ 文件引用必须随对话持久化

### 1.6 Prompt 不可直接修改

**铁律**：
- ❌ **禁止** 在业务代码中硬编码 AI prompt
- ❌ **禁止** 在非 prompt-registry 文件中修改 prompt 内容
- ✅ 所有 prompt 定义在 `apps/worker-ai/src/prompts/prompt-registry.ts`
- ✅ 修改 prompt → 先在 registry 中修改 → 测试 → 上线

### 1.7 数据库不可直接操作

**铁律**：
- ❌ **禁止** 在 Controller / Service 中直接使用 `dataSource.query()`
- ❌ **禁止** 在 Controller / Service 中直接操作 Entity Manager
- ❌ **禁止** 使用 `synchronize: true`
- ✅ 所有数据库操作必须通过 Repository 层
- ✅ 所有 Schema 变更必须通过 TypeORM Migration

---

## 第二章：开发流程铁律（Process Invariants）

### 2.1 先改文档，后改代码

**铁律**：
- 任何架构变更 → 必须先写 ADR → 审批 → 改代码
- 任何接口变更 → 必须先更新设计文档 → 改代码
- 任何数据库变更 → 必须先更新 Schema 文档 → 写 Migration → 执行
- 如果发现代码与文档不一致 → 停止开发 → 报告冲突 → 等待决策

### 2.2 不得跨 Phase 开发

**铁律**：
- ❌ **禁止** 同时开发多个 Sprint/Task
- ❌ **禁止** 在当前 Task 未验收的情况下开始下一个 Task
- ✅ 每个 Phase 验收通过后才能进入下一 Phase

### 2.3 冲突必须先报告后修改

**铁律**：
- 如果需求与宪法冲突 → 停止 → 报告冲突分析 → 等待确认
- 如果发现更好的架构 → 不许直接重构 → 写 ADR 说明原因和影响 → 等待批准
- 如果测试中发现设计问题 → 先报告 → 更新文档 → 再改代码

### 2.4 证据驱动验收

**铁律**（不得违背 AGENTS.md 中的验收规则）：
- ❌ 禁止说"已修复"而不提供复现证据
- ❌ 禁止说"验证通过"而不提供截图/日志/SQL
- ❌ 禁止把 curl 成功当成页面成功
- ❌ 禁止把后端成功当成前端成功
- ❌ 禁止把接口 code:0 当成业务正确
- ✅ 必须按 AGENTS.md 四、任务完成标准 输出完整验收证据

---

## 第三章：模块边界（Module Boundaries）

### 3.1 API 模块依赖规则

```
auth ← content
auth ← ai
auth ← school
auth ← teacher
auth ← department
auth ← home-group

ai → content (保存识别结果)
ai → auth (身份验证)

禁止：
❌ content → ai (反向依赖)
❌ 任何模块 → 跨模块直接操作 Entity
```

### 3.2 包依赖规则

```
apps/web → packages/shared (类型共享)
apps/api → packages/shared, packages/config, packages/logger,
           packages/adapter-ai, packages/adapter-preview, packages/adapter-storage
apps/worker-* → packages/shared, packages/config, packages/logger,
                packages/adapter-ai, packages/adapter-preview
packages/* → 不可依赖 apps/*
packages/* → 不可依赖其他 packages/* (除非显式声明)
```

---

## 第四章：禁止行为清单（Do Not Ever）

以下行为在任何情况下都不被允许：

| 编号 | 禁止行为                               | 严重程度 |
| ---- | -------------------------------------- | -------- |
| D01  | 跨层调用（Web→Worker、Web→DB）         | 🔴 致命  |
| D02  | 绕过 Adapter 直接调用外部 SDK          | 🔴 致命  |
| D03  | API 同步执行 AI/文件转换等耗时操作     | 🔴 致命  |
| D04  | 绕过 Action Engine 写 AI 业务逻辑      | 🔴 致命  |
| D05  | 断开 Workspace 上下文                  | 🔴 致命  |
| D06  | 在非 registry 文件修改 Prompt          | 🔴 致命  |
| D07  | 绕过 Repository 直接操作数据库         | 🔴 致命  |
| D08  | 使用 synchronize: true                 | 🔴 致命  |
| D09  | 跨 Phase 开发                          | 🟠 严重  |
| D10  | 不写 ADR 直接改架构                    | 🟠 严重  |
| D11  | 未经验收说"已修复""已通过"             | 🟠 严重  |
| D12  | 边分析边改代码                         | 🟡 警告  |
| D13  | 边写边改需求                           | 🟡 警告  |
| D14  | 无测试直接提交                         | 🟡 警告  |
| D15  | 顺手重构与任务无关的代码               | 🟡 警告  |

---

## 第五章：决策层级（Decision Hierarchy）

当多份文档出现冲突时，按以下优先级裁决：

```
1. 本宪法 (DEVELOPMENT_CONSTITUTION.md)        ← 最高
2. ADR (docs/adr/)                              ← 架构决策记录
3. 架构规范 (ARCHITECTURE_SPEC.md)              ← 系统设计
4. 功能规范 (WORKSPACE_SPEC.md 等)              ← 功能设计
5. 编码规范 (CODING_STANDARD.md)                ← 实现细节
6. PRD / 需求文档                               ← 业务需求
7. 个人判断                                     ← 最低
```

**冲突处理流程**：
1. 发现冲突 → 停止开发
2. 按决策层级判断哪个优先
3. 如果低级文档需要覆盖高级文档 → 必须先更新高级文档
4. 如果宪法需要修改 → 走 ADR 流程

---

## 第六章：ADR 流程（Architecture Decision Records）

### 6.1 何时需要写 ADR

- 新增/修改架构决策
- 引入新的设计模式
- 修改模块边界
- 更换技术方案
- 修改本宪法

### 6.2 ADR 格式

```markdown
# ADR-XXX：标题

## 状态
提议 / 已采纳 / 已废弃 / 已替代

## 日期
YYYY-MM-DD

## 背景
为什么需要做这个决策

## 决策
具体做了什么决定

## 后果
✅ 正面影响
⚠️ 负面/风险
```

### 6.3 ADR 存放位置

`docs/adr/ADRXXX-description.md`

---

## 第七章：修订记录

| 版本  | 日期       | 修改内容         | 作者 |
| ----- | ---------- | ---------------- | ---- |
| 1.0.0 | 2026-06-28 | 初始版本，建立宪法 | -    |

---

> **记住：本宪法是项目的"最高法"。任何代码、需求、个人判断都不得凌驾于宪法之上。**
