# 架构规范 (Architecture Spec)

> **版本**：1.0.0 | **生效日期**：2026-06-28
> **依赖**：本文件服从 `DEVELOPMENT_CONSTITUTION.md`

---

## 一、系统架构全景

```
                          ┌──────────────────────────────────────┐
                          │           Nginx (8080/3000)           │
                          └────┬───────────────┬─────────────────┘
                               │               │
              ┌────────────────▼──┐    ┌───────▼──────────────┐
              │  Web (Next.js 15) │    │  API (NestJS 10)     │
              │  Port: 8080       │    │  Port: 3000          │
              │                   │    │                      │
              │  app/             │    │  modules/            │
              │  ├── page.tsx     │    │  ├── auth/           │
              │  ├── workspace/   │    │  ├── ai/             │
              │  ├── login/       │    │  ├── content/        │
              │  ├── admin/       │    │  ├── school/          │
              │  └── ...          │    │  ├── teacher/        │
              │                   │    │  ├── department/     │
              │  components/      │    │  └── home-group/     │
              │  hooks/           │    │                      │
              │  services/        │    │  database/           │
              │  lib/             │    │  ├── entities/       │
              └───────────────────┘    │  ├── repositories/   │
                                       │  └── migrations/     │
                                       └──────┬───────────────┘
                                              │ (BullMQ)
                                    ┌─────────▼──────────┐
                                    │    Redis 7          │
                                    │    + BullMQ 5       │
                                    └─┬──────┬──────┬────┘
                                      │      │      │
                          ┌───────────▼┐ ┌──▼──┐ ┌─▼───────┐
                          │ worker-ai  │ │prev │ │ export   │
                          │ (AI识别)   │ │iew  │ │ (PDF)    │
                          └────────────┘ └─────┘ └──────────┘
                                              │
                                    ┌─────────▼──────────┐
                                    │  PostgreSQL 15      │
                                    └─────────────────────┘
```

---

## 二、Monorepo 包结构

```
ai-teacher-workspace/
├── apps/
│   ├── web/                # Next.js 15 前端 (React 19, Tailwind CSS)
│   ├── api/                # NestJS 10 后端 API
│   ├── worker-ai/          # AI 识别 Worker (BullMQ Consumer)
│   ├── worker-preview/     # 预览转换 Worker
│   ├── worker-export/      # PDF 导出 Worker
│   └── worker-schedule/    # 定时任务 Worker
├── packages/
│   ├── shared/             # 共享类型、枚举、常量、DTO
│   │   ├── types/          # 接口/类型定义
│   │   ├── enums/          # 枚举定义
│   │   └── constants/      # 常量定义
│   ├── config/             # 统一配置管理（环境变量读取）
│   ├── logger/             # 统一日志输出（Winston）
│   ├── adapter-ai/         # AI Adapter 接口 + DeepSeek 实现
│   ├── adapter-preview/    # 预览 Adapter 接口 + LibreOffice 实现
│   └── adapter-storage/    # 存储 Adapter 接口 + Local 实现
├── docker/                 # Docker Compose + Dockerfile + Nginx 配置
├── storage/                # 本地存储（original/preview/export/thumbnail/temp/trash）
└── docs/                   # 项目文档
```

### 2.1 包依赖规则

```
apps/web → packages/shared

apps/api → packages/shared
        → packages/config
        → packages/logger
        → packages/adapter-ai
        → packages/adapter-preview
        → packages/adapter-storage

apps/worker-ai → packages/shared
              → packages/config
              → packages/logger
              → packages/adapter-ai

apps/worker-preview → packages/shared
                   → packages/config
                   → packages/logger
                   → packages/adapter-preview
                   → packages/adapter-storage

apps/worker-export → packages/shared
                  → packages/config
                  → packages/logger
                  → packages/adapter-storage

apps/worker-schedule → packages/shared
                    → packages/config
                    → packages/logger

packages/* → 不可依赖 apps/*
```

---

## 三、API 模块架构

### 3.1 模块列表

| 模块           | 路径                              | 职责                           |
| -------------- | --------------------------------- | ------------------------------ |
| auth           | modules/auth/                     | 登录/注册/JWT/验证码/CAPTCHA   |
| ai             | modules/ai/                       | AI 对话/ActionEngine/状态机    |
| content        | modules/content/                  | 内容 CRUD（课件/教案/反思等）  |
| school         | modules/school/                   | 学校信息管理                   |
| teacher        | modules/teacher/                  | 教师信息管理                   |
| department     | modules/department/               | 部门/教研组管理                |
| home-group     | modules/home-group/               | 首页教研组展示                 |
| ai-config      | modules/ai-config/                | AI 配置管理（Provider/Key）    |

### 3.2 模块依赖方向

```
auth → (无依赖，基础模块)

ai → content (保存识别结果)
ai → auth (JWT 认证)

content → auth (JWT 认证)

school → auth
teacher → auth, school, department
department → auth, school
home-group → auth, teacher, department
ai-config → auth
```

**禁止反向依赖**：
- ❌ content → ai
- ❌ auth → content
- ❌ teacher → home-group

### 3.3 每个模块的内部结构

```
modules/[name]/
├── [name].module.ts         # NestJS Module：注册 Controller/Service/Repository
├── [name].controller.ts     # HTTP 路由：GET/POST/PUT/DELETE
├── [name].service.ts        # 业务逻辑层
├── [name].dto.ts            # 请求验证 + 响应类型
├── (optional) *.guard.ts    # 自定义守卫
└── (optional) *.strategy.ts # Passport 策略
```

---

## 四、数据架构

### 4.1 Entity 列表

| Entity                  | 表名                    | 用途                       |
| ----------------------- | ----------------------- | -------------------------- |
| School                  | schools                 | 学校信息                   |
| Teacher                 | teachers                | 教师信息                   |
| Department              | departments             | 部门/教研组                |
| HomeGroup               | home_groups             | 首页展示组                 |
| HomeGroupTeacher        | home_group_teachers     | 组-教师关联                |
| PersonalLesson          | personal_lessons        | 个人备课                   |
| GroupLesson             | group_lessons           | 集体备课                   |
| PlanSummary             | plan_summaries          | 计划总结                   |
| Reflection              | reflections             | 教学反思                   |
| LessonAttachment        | lesson_attachments      | 备课附件                   |
| GroupLessonComment      | group_lesson_comments   | 集体备课评论               |
| AiSession               | ai_sessions             | AI 对话会话                |
| AiMessage               | ai_messages             | AI 对话消息                |
| AiWorkspace             | ai_workspaces           | AI 工作空间                 |
| AiConfig                | ai_configs              | AI 配置                    |
| AiCallLog               | ai_call_logs            | AI 调用日志                |
| AiDecisionLog           | ai_decision_logs        | AI 决策日志                |
| AiRecognitionRecord     | ai_recognition_records  | AI 识别记录                |
| FileAsset               | file_assets             | 文件资源                   |
| PreviewFile             | preview_files           | 预览文件                   |
| ExportTask              | export_tasks            | 导出任务                   |
| Content                 | contents                | 内容（统一内容表）         |
| ContentVersion          | content_versions        | 内容版本                   |
| DeletedRecord           | deleted_records         | 删除记录                   |
| SystemConfig            | system_configs          | 系统配置                   |
| LoginLog                | login_logs              | 登录日志                   |
| OperationLog            | operation_logs          | 操作日志                   |
| TeacherStatusHistory    | teacher_status_histories| 教师状态变更历史           |

### 4.2 Repository 层规范

每个 Entity 必须有对应的 Repository：

```typescript
@Injectable()
export class AiSessionRepository {
  constructor(
    @InjectRepository(AiSession)
    private readonly repo: Repository<AiSession>,
  ) {}

  async findByWorkspaceId(workspaceId: string): Promise<AiSession | null> {
    return this.repo.findOne({ where: { workspaceId } });
  }

  async create(data: Partial<AiSession>): Promise<AiSession> {
    return this.repo.save(this.repo.create(data));
  }
}
```

**规则**：
- 所有数据库操作封装在 Repository 方法中
- Service 层只调用 Repository，不直接操作 Entity Manager
- 复杂查询使用 QueryBuilder，不写原始 SQL

### 4.3 Migration 规范

- 禁用 `synchronize: true`
- Schema 变更必须通过 Migration
- Migration 命名：`{timestamp}-{description}.ts`
- 生成：`pnpm run migration:generate`
- 执行：`pnpm run migration:run`
- 回滚：`pnpm run migration:revert`

---

## 五、异步任务架构

### 5.1 队列设计

```
┌──────────┐     BullMQ      ┌──────────────┐
│   API    │ ──────────────→ │   Redis 7    │
│ (入队)   │                 │  (消息队列)   │
└──────────┘                 └──────┬───────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
            ┌────────────┐  ┌────────────┐  ┌────────────┐
            │ worker-ai   │  │ worker-    │  │ worker-    │
            │             │  │ preview    │  │ export     │
            │ 队列:       │  │ 队列:      │  │ 队列:      │
            │ ai-         │  │ preview    │  │ export     │
            │ recognition │  │            │  │            │
            └────────────┘  └────────────┘  └────────────┘
```

### 5.2 队列配置

| 队列名            | Worker           | 并发  | 重试次数 | 超时     |
| ----------------- | ---------------- | ----- | -------- | -------- |
| ai-recognition    | worker-ai        | 5     | 3        | 60s      |
| preview           | worker-preview   | 2     | 2        | 120s     |
| export            | worker-export     | 1     | 2        | 300s     |
| schedule          | worker-schedule  | 1     | 0        | 60s      |

### 5.3 入队规范

```typescript
// API Service 中入队
await this.aiQueue.add('recognize', {
  workspaceId: dto.workspace_id,
  userId: userId,
  text: dto.text,
  fileIds: dto.file_ids,
}, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: true,
  removeOnFail: 100,
});
```

---

## 六、Adapter 架构

### 6.1 AI Adapter

```typescript
// packages/adapter-ai/src/adapters/ai-adapter.interface.ts
export interface IAIAdapter {
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>;
  chatStream(messages: ChatMessage[], options?: ChatOptions): AsyncIterable<ChatChunk>;
}

// 实现：packages/adapter-ai/src/adapters/deepseek.adapter.ts
export class DeepSeekAdapter implements IAIAdapter { ... }
```

### 6.2 Preview Adapter

```typescript
// packages/adapter-preview/src/adapters/preview-adapter.interface.ts
export interface IPreviewAdapter {
  convertToPdf(inputPath: string, outputPath: string): Promise<void>;
  generateThumbnail(inputPath: string, outputPath: string): Promise<void>;
  getTextContent(inputPath: string): Promise<string>;
}

// 实现：packages/adapter-preview/src/adapters/libreoffice.adapter.ts
```

### 6.3 Storage Adapter

```typescript
// packages/adapter-storage/src/adapters/storage-adapter.interface.ts
export interface IStorageAdapter {
  save(file: Buffer, path: string): Promise<void>;
  get(path: string): Promise<Buffer>;
  delete(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  getUrl(path: string): Promise<string>;
}

// 实现：local / minio
```

---

## 七、修订记录

| 版本  | 日期       | 修改内容       |
| ----- | ---------- | -------------- |
| 1.0.0 | 2026-06-28 | 初始版本       |
