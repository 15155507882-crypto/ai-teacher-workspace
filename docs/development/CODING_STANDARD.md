# 编码规范 (Coding Standard)

> **版本**：1.0.0 | **生效日期**：2026-06-28
> **依赖**：本文件服从 `DEVELOPMENT_CONSTITUTION.md`

---

## 一、命名规范

### 1.1 文件命名

| 类型               | 规则          | 示例                              |
| ------------------ | ------------- | --------------------------------- |
| 普通文件           | kebab-case    | `conversation-manager.ts`         |
| React 组件文件     | kebab-case    | `ai-chat-center.tsx`              |
| Next.js 页面       | page.tsx      | `app/workspace/page.tsx`          |
| NestJS 模块入口    | *.module.ts   | `ai.module.ts`                    |
| NestJS Controller  | *.controller.ts | `ai.controller.ts`              |
| NestJS Service     | *.service.ts  | `ai.service.ts`                   |
| DTO 文件           | *.dto.ts      | `ai.dto.ts`                       |
| Entity 文件        | *.entity.ts   | `ai-session.entity.ts`            |
| Repository 文件    | *.repository.ts | `ai-session.repository.ts`      |
| Migration 文件     | 时间戳+描述   | `1748000000000-V22AddAiTables.ts` |
| 测试文件           | *.spec.ts     | `ai.service.spec.ts`              |
| 类型定义文件       | *.types.ts    | `conversation.types.ts`           |

### 1.2 代码命名

| 元素          | 规则            | 示例                                            |
| ------------- | --------------- | ----------------------------------------------- |
| 类/接口       | PascalCase      | `ConversationManager`, `IAIAdapter`              |
| 函数/方法     | camelCase       | `detectScene()`, `createWorkspace()`             |
| 变量          | camelCase       | `userId`, `workspaceId`                          |
| 常量          | UPPER_SNAKE     | `MAX_RETRY_COUNT`, `AI_QUEUE_MAX_SIZE`           |
| 枚举成员      | UPPER_SNAKE     | `SceneType.NORMAL_CHAT`                          |
| 私有成员      | 无下划线前缀    | `private readonly stateMachine`                  |
| 类型/接口     | PascalCase      | `ChatRequestDto`, `IAIAdapter`                   |
| 泛型参数      | 单字母大写      | `<T>`, `<K, V>`                                  |
| React 组件    | PascalCase      | `AiChatCenter`, `AppShell`                       |
| React Hooks   | use 前缀        | `useCaptcha`, `useWorkspace`                     |

---

## 二、TypeScript 规范

### 2.1 严格模式

项目使用 `strict: true`（见 `tsconfig.base.json`），必须遵守：

- 所有函数参数和返回值必须有类型注解
- 不允许隐式 `any`
- 不允许可能为 `null/undefined` 的未检查访问
- 不允许 `strictNullChecks` 关闭

```typescript
// ❌ 禁止
function process(data) { ... }

// ✅ 正确
function process(data: ChatRequestDto): Promise<ChatResponseDto> { ... }
```

### 2.2 类型优先于 Interface

```typescript
// ✅ 推荐：type 用于普通类型定义
type ConversationState = 'idle' | 'waiting' | 'processing' | 'done';

// ✅ 推荐：interface 用于可扩展的 API
interface IAIAdapter {
  chat(prompt: string): Promise<string>;
}

// ✅ 推荐：DTO 使用 class（NestJS 装饰器需要）
class ChatRequestDto {
  @IsString()
  text: string;
}
```

### 2.3 禁止使用

- ❌ `any` — 除非有充分理由并在注释中说明
- ❌ `as` 强制类型转换 — 优先使用类型守卫
- ❌ `@ts-ignore` / `@ts-expect-error` — 除非是临时调试
- ❌ `var` — 只用 `const` 和 `let`
- ❌ `==` — 只用 `===`

---

## 三、NestJS 模块规范

### 3.1 模块文件结构

每个模块目录必须包含以下文件：

```
modules/[name]/
├── [name].module.ts       # 模块定义 + 依赖注册
├── [name].controller.ts   # HTTP 路由处理
├── [name].service.ts      # 业务逻辑
├── [name].dto.ts          # 请求/响应 DTO
└── (optional) *.guard.ts  # 守卫
```

### 3.2 Controller 规范

```typescript
@Controller('api/ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  @UseGuards(JwtAuthGuard)
  async chat(@Body() dto: ChatRequestDto, @Req() req: AuthenticatedRequest) {
    // 1. 参数验证（由 class-validator 自动完成）
    // 2. 调用 Service
    // 3. 返回统一响应格式
    return { code: 0, data: result, message: 'ok' };
  }
}
```

**规则**：
- Controller 只做路由和参数提取，不写业务逻辑
- 所有接口使用统一响应格式 `{ code, data, message }`
- 需要认证的接口加 `@UseGuards(JwtAuthGuard)`

### 3.3 Service 规范

```typescript
@Injectable()
export class AiService {
  constructor(
    private readonly aiSessionRepo: AiSessionRepository,
    private readonly actionEngine: ActionEngineService,
    @InjectQueue('ai-recognition') private readonly aiQueue: Queue,
  ) {}

  async processChat(dto: ChatRequestDto, userId: string): Promise<ChatResponseDto> {
    // 业务逻辑
  }
}
```

**规则**：
- Service 只注入 Repository 和其他 Service，不注入 Controller
- 耗时操作通过 `@InjectQueue` 入队，不直接执行
- 每个 public 方法必须有明确的返回类型

### 3.4 DTO 规范

```typescript
export class ChatRequestDto {
  @IsString()
  @IsNotEmpty()
  text: string;

  @IsOptional()
  @IsString()
  workspace_id?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  file_ids?: string[];
}
```

---

## 四、React / Next.js 规范

### 4.1 组件结构

```typescript
// app/workspace/page.tsx
'use client';

import { AppShell } from '@/components/app-shell';
import { TeacherWorkspace } from '@/components/teacher-workspace';

export default function WorkspacePage() {
  return (
    <AppShell>
      <TeacherWorkspace />
    </AppShell>
  );
}
```

### 4.2 组件编写规则

- 每个组件一个文件
- 使用函数组件 + TypeScript
- 文件内导出的组件只有一个 default export
- 组件 props 必须有类型定义
- 使用 Tailwind CSS utility class，不写 inline style
- 客户端交互组件加 `'use client'` 指令

```typescript
interface AiChatCenterProps {
  workspaceId: string;
  onMessageSent?: (message: string) => void;
}

export function AiChatCenter({ workspaceId, onMessageSent }: AiChatCenterProps) {
  // ...
}
```

### 4.3 Hooks 规范

- 自定义 Hook 以 `use` 开头
- 每个 Hook 一个文件，放在 `hooks/` 目录
- Hook 必须有返回类型

```typescript
export function useCaptcha(): { captchaId: string; image: string; refresh: () => Promise<void> } {
  // ...
}
```

### 4.4 状态管理

- 组件内状态：`useState`
- 跨组件共享：`useContext` + Provider
- **不使用 Redux / MobX / Zustand**（MVP 阶段）
- API 调用结果直接通过 state 管理

---

## 五、Import 顺序

按以下顺序组织 import，组之间空一行：

```typescript
// 1. Node 内置模块
import * as path from 'path';

// 2. 第三方库
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

// 3. 内部 workspace 包
import { ChatRequestDto } from '@workspace/shared';
import { logger } from '@workspace/logger';

// 4. 相对路径导入
import { ConversationManager } from './conversation-manager';
import { ConversationStateMachine } from './conversation-state-machine';
```

---

## 六、错误处理

### 6.1 API 层

```typescript
// ✅ 使用 NestJS 内置异常
throw new BadRequestException('Invalid workspace_id');
throw new NotFoundException('Session not found');
throw new UnauthorizedException('Token expired');

// ❌ 禁止
throw new Error('some error');  // 无法返回正确的 HTTP 状态码
```

### 6.2 Worker 层

```typescript
// ✅ 使用 logger 记录 + BullMQ 重试
try {
  await processJob(data);
} catch (error) {
  logger.error('AI recognition failed', { jobId: job.id, error });
  throw error; // BullMQ 自动重试
}
```

### 6.3 前端

```typescript
// ✅ 统一 try-catch + 用户友好提示
try {
  const res = await api.post('/api/ai/chat', payload);
  if (res.code !== 0) throw new Error(res.message);
} catch (error) {
  toast.error('AI 处理失败，请稍后重试');
}
```

---

## 七、Git 提交规范

### 7.1 Commit Message 格式

```
type(scope): description

- type: feat / fix / docs / refactor / test / chore
- scope: web / api / worker-ai / worker-preview / worker-export / worker-schedule / packages
- description: 简短描述（中文或英文，保持一致）
```

示例：
```
feat(api): 新增 AI 对话状态机
fix(web): 修复 workspace 页面刷新后上下文丢失
docs(development): 新增开发宪法
```

### 7.2 Pre-commit 钩子

Husky + lint-staged 已配置：
- `*.{ts,tsx}` → Prettier 自动格式化
- `*.{json,md,css}` → Prettier 自动格式化

**禁止手动格式化**，依赖 pre-commit 自动处理。

---

## 八、注释规范

### 8.1 必须写注释的场合

- 复杂的业务逻辑
- 非直观的算法
- 临时解决方案（TODO/FIXME/HACK）
- 公开 API 的 JSDoc

```typescript
/**
 * 检测用户意图场景
 * @param text - 用户输入文本
 * @param fileIds - 关联文件 ID 列表
 * @returns 检测结果，包含场景类型和置信度
 */
async detectScene(text: string, fileIds: string[]): Promise<SceneDetectionResult> {
  // ...
}
```

### 8.2 不需要写注释的场合

- 显而易见的代码（`// 设置用户名为 name`）
- 可以通过变量名/函数名自解释的代码

---

## 九、格式化工具配置

项目使用 Prettier，配置见 `.prettierrc`：

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

ESLint 配置见 `.eslintrc.json`。

---

## 十、修订记录

| 版本  | 日期       | 修改内容       |
| ----- | ---------- | -------------- |
| 1.0.0 | 2026-06-28 | 初始版本       |
