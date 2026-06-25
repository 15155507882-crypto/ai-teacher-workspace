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
│   ├── adapter-ai/         # AI 适配器 (DeepSeek)
│   ├── adapter-preview/    # 预览适配器 (LibreOffice)
│   └── adapter-storage/    # 存储适配器 (Local/MinIO)
├── storage/                # 文件存储目录
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

- Husky pre-commit: ESLint + Prettier 自动检查
- 禁止跨越 Sprint/Task 开发
- 先更新文档，再修改代码

## 环境变量

复制 `.env.example` 到各应用目录:

```bash
cp .env.example apps/api/.env
```

关键环境变量见 `.env.example`。

## Sprint 进度

| Sprint   | Task                     |   状态    |
| -------- | ------------------------ | :-------: |
| Sprint 0 | Task-001 基础架构        | 🚧 进行中 |
| Sprint 1 | Task-002~003 数据库+认证 | ⏳ 待开始 |
| Sprint 2 | Task-004~006 组织+教师   | ⏳ 待开始 |
| Sprint 3 | Task-007~008 首页+空间   | ⏳ 待开始 |
| Sprint 4 | Task-009~010 AI核心      | ⏳ 待开始 |
| Sprint 5 | Task-011~012 备课+反思   | ⏳ 待开始 |
| Sprint 6 | Task-013~014 集体+计划   | ⏳ 待开始 |
| Sprint 7 | Task-015~016 预览+导出   | ⏳ 待开始 |
| Sprint 8 | Task-017~018 权限+后台   | ⏳ 待开始 |
| Sprint 9 | Task-019~020 测试+部署   | ⏳ 待开始 |
