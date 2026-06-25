# AI 教师工作空间 (AI Teacher Workspace) V1.0

学校备课资料共享与 AI 自动归档工作空间。

**核心能力**: 教师聊天式发送课件/教案/反思/计划总结，AI 自动识别类型、归档、关联；全校教师在线查看任意备课资料。

## 技术栈

| 层级      | 方案                                              |
| --------- | ------------------------------------------------- |
| 包管理    | pnpm Workspace Monorepo                           |
| 前端      | Next.js 15 (App Router) + React 19 + Tailwind CSS |
| 后端      | NestJS 10 + TypeORM + BullMQ                      |
| 数据库    | PostgreSQL 15                                     |
| 缓存/队列 | Redis 7 + BullMQ 5                                |
| AI        | DeepSeek V4 (Adapter 抽象，可替换)                |
| 预览      | LibreOffice Headless (Adapter 抽象)               |
| 部署      | Docker Compose                                    |

## 项目结构

```
ai-teacher-workspace/
├── apps/
│   ├── web/                # Next.js 前端 (8080)
│   ├── api/                # NestJS API (3000)
│   ├── worker-ai/          # AI 识别 Worker
│   ├── worker-preview/     # 预览转换 Worker
│   ├── worker-export/      # PDF 导出 Worker
│   └── worker-schedule/    # 定时任务 Worker
├── packages/
│   ├── shared/             # 共享类型、枚举、常量
│   ├── config/             # 统一配置管理
│   ├── logger/             # 统一日志输出
│   ├── adapter-ai/         # AI 适配器 (DeepSeek)
│   ├── adapter-preview/    # 预览适配器 (LibreOffice)
│   └── adapter-storage/    # 存储适配器 (Local/MinIO)
├── storage/
│   ├── original/           # 原始上传文件
│   ├── preview/            # 预览生成文件
│   ├── export/             # 导出产物
│   ├── thumbnail/          # 缩略图
│   ├── temp/               # 临时文件
│   └── trash/              # 回收站
├── docker/                 # Docker 编排
└── docs/                   # 设计文档
```

## 快速开始

### 环境要求

- Node.js >= 22
- pnpm >= 9
- Docker & Docker Compose

### 安装依赖

```bash
pnpm install
```

### 启动基础设施

```bash
docker compose -f docker/docker-compose.yml up -d postgres redis
```

### 执行数据库迁移

```bash
pnpm run migration:run
```

### 启动开发服务

```bash
# 启动所有服务
pnpm run dev

# 或分别启动
pnpm --filter @workspace/api dev        # API: localhost:3000
pnpm --filter @workspace/web dev        # Web: localhost:8080
pnpm --filter @workspace/worker-ai dev
```

### Docker 完整启动

```bash
docker compose -f docker/docker-compose.yml up -d
```

## 开发规范

### 数据库

- **禁止使用 `synchronize: true`**
- 所有 Schema 变更通过 TypeORM Migration
- `pnpm run migration:generate` 生成迁移
- `pnpm run migration:run` 执行迁移

### Adapter 接口

所有外部依赖通过 Adapter 接口隔离:

- `IAIAdapter`: AI 识别 (DeepSeek / OpenAI)
- `IPreviewAdapter`: 文件预览 (LibreOffice / OnlyOffice)
- `IStorageAdapter`: 文件存储 (Local / MinIO / S3)

### Git 提交

- Husky pre-commit: Prettier 自动格式化
- 禁止跨越 Sprint/Task 开发
- 先更新文档，再修改代码

## Architecture Decision Records (ADR)

关键架构决策记录，按时间倒序排列。

### ADR-001: pnpm Workspace Monorepo

- **日期**: 2026-06-25
- **状态**: 已采纳
- **决策**: 采用 pnpm Workspace Monorepo 管理多应用和多共享包
- **理由**: 共享类型定义 (DTO/Enum/Constants)、共享 Adapter 接口、统一构建工具链、依赖版本一致性
- **替代方案**: Turborepo (过度设计，Sprint 0 不需要)、npm workspaces (性能不如 pnpm)

### ADR-002: Adapter 抽象层

- **日期**: 2026-06-25
- **状态**: 已采纳
- **决策**: AI/Preview/Storage 均通过 Adapter 接口抽象，不直接绑定具体实现
- **理由**: (1) 开发环境无需真实 LibreOffice/Docker 即可跑通; (2) AI 模型可从 DeepSeek 切换到 OpenAI; (3) 存储可从本地文件系统切换到 MinIO/S3，无需改业务代码
- **替代方案**: 直接依赖具体实现 (耦合高，测试和本地开发困难)

### ADR-003: 异步 Worker 架构

- **日期**: 2026-06-25
- **状态**: 已采纳
- **决策**: 所有耗时任务 (AI 识别、文件预览转换、PDF 导出) 通过 BullMQ 异步执行，API 不允许同步执行耗时操作
- **理由**: API 保持低延迟响应; Worker 可独立扩缩容; 失败重试机制内置; 任务状态可追踪
- **替代方案**: 同步处理 (API 响应慢、无重试、无状态追踪)

### ADR-004: TypeORM Migration 模式

- **日期**: 2026-06-25
- **状态**: 已采纳
- **决策**: 使用 TypeORM Migration 管理数据库 Schema，禁用 `synchronize: true`
- **理由**: 数据库变更可审计、可回滚、可复现; 生产环境安全; 团队协作无冲突
- **替代方案**: synchronize: true (开发便利但生产危险)、手写 SQL (维护成本高)

### ADR-005: Sprint 串行推进

- **日期**: 2026-06-25
- **状态**: 已采纳
- **决策**: 严格按 Sprint 顺序开发，每个 Sprint 验收通过后进入下一阶段，禁止跨 Sprint 开发
- **理由**: 每阶段有可验收的独立产物; 架构稳定性逐步建立; 问题早发现; 避免大规模返工
- **替代方案**: 并行开发多个模块 (依赖混乱、验收困难)

### ADR-006: 文档驱动开发 (DDD)

- **日期**: 2026-06-25
- **状态**: 已采纳
- **决策**: 所有需求以产品文档和技术设计文档为唯一依据，禁止自行增加业务需求; 发现设计问题先更新文档
- **理由**: 保持实现与设计一致; 需求可追溯; 减少随意性
- **替代方案**: 代码先行后补文档 (文档滞后、设计与实现脱节)

## 环境变量

复制 `.env.example` 到各应用目录:

```bash
cp .env.example apps/api/.env
```

关键环境变量见 `.env.example`。

## Sprint 进度

| Sprint    | Task                                      |   状态    |
| --------- | ----------------------------------------- | :-------: |
| Sprint 0  | Task-001 基础架构                         | ✅ 已完成 |
| Sprint 1A | 数据库 Schema/Migration/Entity/Repository | 🚧 进行中 |
| Sprint 1B | Task-002~003 登录+认证                    | ⏳ 待开始 |
| Sprint 2  | Task-004~006 组织+教师                    | ⏳ 待开始 |
| Sprint 3  | Task-007~008 首页+空间                    | ⏳ 待开始 |
| Sprint 4  | Task-009~010 AI核心                       | ⏳ 待开始 |
| Sprint 5  | Task-011~012 备课+反思                    | ⏳ 待开始 |
| Sprint 6  | Task-013~014 集体+计划                    | ⏳ 待开始 |
| Sprint 7  | Task-015~016 预览+导出                    | ⏳ 待开始 |
| Sprint 8  | Task-017~018 权限+后台                    | ⏳ 待开始 |
| Sprint 9  | Task-019~020 测试+部署                    | ⏳ 待开始 |
