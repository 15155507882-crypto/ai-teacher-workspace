# Sprint 0: 基础架构搭建 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭建 AI 教师工作空间 pnpm Monorepo 完整基础架构，包含 6 个应用、4 个共享包、Docker 环境、数据库/缓存/队列基础设施

**Architecture:** pnpm Workspace Monorepo，NestJS API + Next.js Web + 4 BullMQ Workers，Adapter 抽象层三个独立包。所有服务通过 Docker Compose 编排，TypeORM Migration 管理数据库

**Tech Stack:** pnpm 9+, Next.js 15 (App Router), NestJS 10, TypeORM 0.3, BullMQ 5, PostgreSQL 15, Redis 7, Docker Compose, ESLint, Prettier, Husky

---

## Task 1: 初始化 Monorepo 根目录

**Files:**

- Create: `ai-teacher-workspace/package.json`
- Create: `ai-teacher-workspace/pnpm-workspace.yaml`
- Create: `ai-teacher-workspace/tsconfig.base.json`
- Create: `ai-teacher-workspace/.gitignore`
- Create: `ai-teacher-workspace/.npmrc`
- Create: `ai-teacher-workspace/.nvmrc`
- Create: `ai-teacher-workspace/.env.example`

- [ ] **Step 1: 创建根 package.json**

```json
{
  "name": "ai-teacher-workspace",
  "version": "1.0.0",
  "private": true,
  "description": "AI Teacher Workspace — AI 驱动的教师备课工作空间",
  "scripts": {
    "dev": "pnpm --parallel run dev",
    "build": "pnpm --parallel run build",
    "lint": "pnpm --parallel run lint",
    "format": "prettier --write \"**/*.{ts,tsx,json,md}\"",
    "format:check": "prettier --check \"**/*.{ts,tsx,json,md}\"",
    "migration:generate": "pnpm --filter @workspace/api migration:generate",
    "migration:run": "pnpm --filter @workspace/api migration:run",
    "migration:revert": "pnpm --filter @workspace/api migration:revert",
    "clean": "pnpm --parallel -r run clean",
    "prepare": "husky"
  },
  "engines": {
    "node": ">=22.0.0",
    "pnpm": ">=9.0.0"
  }
}
```

- [ ] **Step 2: 创建 pnpm-workspace.yaml**

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

- [ ] **Step 3: 创建 tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "moduleResolution": "node",
    "baseUrl": "."
  },
  "exclude": ["node_modules", "dist", "**/*.spec.ts"]
}
```

- [ ] **Step 4: 创建 .gitignore**

```
node_modules/
dist/
.env
.env.local
*.log
storage/uploads/*
storage/previews/*
storage/exports/*
!storage/uploads/.gitkeep
!storage/previews/.gitkeep
!storage/exports/.gitkeep
.DS_Store
coverage/
.turbo/
```

- [ ] **Step 5: 创建 .npmrc**

```
strict-peer-dependencies=false
auto-install-peers=true
```

- [ ] **Step 6: 创建 .nvmrc**

```
22
```

- [ ] **Step 7: 创建 .env.example**

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ai_teacher

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=change-me-in-production
JWT_EXPIRES_IN=7d

# AI (DeepSeek)
AI_API_KEY=sk-your-deepseek-api-key
AI_MODEL=deepseek-chat
AI_BASE_URL=https://api.deepseek.com/v1

# Storage
STORAGE_BACKEND=local
STORAGE_LOCAL_PATH=./storage

# Preview Engine
PREVIEW_ENGINE=libreoffice

# Upload
UPLOAD_MAX_SIZE_MB=200

# API
API_PORT=3000
WEB_PORT=8080
```

- [ ] **Step 8: 初始化 pnpm**

```bash
cd ai-teacher-workspace && pnpm install
```

Expected: `pnpm install` 成功，无错误

- [ ] **Step 9: Commit**

```bash
git add .
git commit -m "feat: init monorepo workspace with pnpm, tsconfig, env template"
```

---

## Task 2: 创建共享包 packages/shared

**Files:**

- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/enums/content-type.enum.ts`
- Create: `packages/shared/src/enums/role.enum.ts`
- Create: `packages/shared/src/enums/status.enum.ts`
- Create: `packages/shared/src/constants/business.constants.ts`
- Create: `packages/shared/src/types/api-response.type.ts`

- [ ] **Step 1: 创建 packages/shared/package.json**

```json
{
  "name": "@workspace/shared",
  "version": "1.0.0",
  "private": true,
  "description": "Shared types, enums, constants, and utilities",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "clean": "rm -rf dist",
    "dev": "tsc --watch"
  },
  "devDependencies": {
    "typescript": "^5.5.0"
  }
}
```

- [ ] **Step 2: 创建 packages/shared/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: 创建 packages/shared/src/enums/content-type.enum.ts**

```typescript
export enum ContentType {
  PERSONAL_LESSON = 'personal_lesson',
  REFLECTION = 'reflection',
  GROUP_LESSON = 'group_lesson',
  PLAN_SUMMARY = 'plan_summary',
}
```

- [ ] **Step 4: 创建 packages/shared/src/enums/role.enum.ts**

```typescript
export enum Role {
  TEACHER = 'teacher',
  ADMIN = 'admin',
}
```

- [ ] **Step 5: 创建 packages/shared/src/enums/status.enum.ts**

```typescript
export enum TeacherStatus {
  ACTIVE = 'active',
  RESIGNED = 'resigned',
  DISABLED = 'disabled',
}

export enum ContentStatus {
  DRAFT = 'draft',
  CONFIRMED = 'confirmed',
  ARCHIVED = 'archived',
  DELETED = 'deleted',
}

export enum FileStatus {
  UPLOADED = 'uploaded',
  PARSED = 'parsed',
  FAILED = 'failed',
  DELETED = 'deleted',
}

export enum PreviewStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
}

export enum ExportStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILED = 'failed',
}
```

- [ ] **Step 6: 创建 packages/shared/src/constants/business.constants.ts**

```typescript
/** 学年开始月日 (8月1日) */
export const ACADEMIC_YEAR_START_MONTH = 8;
export const ACADEMIC_YEAR_START_DAY = 1;

/** 学年结束月日 (7月31日) */
export const ACADEMIC_YEAR_END_MONTH = 7;
export const ACADEMIC_YEAR_END_DAY = 31;

/** 学期名称 */
export const SEMESTER_FIRST = '上学期';
export const SEMESTER_SECOND = '下学期';

/** 教学反思关联最近备课条数 */
export const RECENT_LESSON_COUNT = 3;

/** 默认上传文件大小限制 (200MB) */
export const DEFAULT_UPLOAD_MAX_SIZE = 200 * 1024 * 1024;

/** AI 置信度阈值 */
export const AI_CONFIDENCE_THRESHOLD = 0.6;
```

- [ ] **Step 7: 创建 packages/shared/src/types/api-response.type.ts**

```typescript
/** 统一 API 响应结构 */
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
  requestId: string;
}

/** 分页响应 */
export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** 分页请求参数 */
export interface PaginationQuery {
  page?: number;
  pageSize?: number;
}
```

- [ ] **Step 8: 创建 packages/shared/src/index.ts**

```typescript
// Enums
export * from './enums/content-type.enum';
export * from './enums/role.enum';
export * from './enums/status.enum';

// Constants
export * from './constants/business.constants';

// Types
export * from './types/api-response.type';
```

- [ ] **Step 9: 安装依赖并构建**

```bash
cd packages/shared && pnpm install && pnpm run build
```

Expected: 构建成功，`dist/` 目录生成

- [ ] **Step 10: Commit**

```bash
git add packages/shared/
git commit -m "feat: add @workspace/shared with enums, constants, and types"
```

---

## Task 3: 创建 adapter-ai 包

**Files:**

- Create: `packages/adapter-ai/package.json`
- Create: `packages/adapter-ai/tsconfig.json`
- Create: `packages/adapter-ai/src/ai-adapter.interface.ts`
- Create: `packages/adapter-ai/src/types.ts`
- Create: `packages/adapter-ai/src/ai-adapter.factory.ts`
- Create: `packages/adapter-ai/src/adapters/deepseek.adapter.ts`
- Create: `packages/adapter-ai/src/adapters/index.ts`
- Create: `packages/adapter-ai/src/index.ts`

- [ ] **Step 1: 创建 packages/adapter-ai/package.json**

```json
{
  "name": "@workspace/adapter-ai",
  "version": "1.0.0",
  "private": true,
  "description": "AI adapter abstraction layer with DeepSeek implementation",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "clean": "rm -rf dist",
    "dev": "tsc --watch"
  },
  "dependencies": {
    "@workspace/shared": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.5.0"
  }
}
```

- [ ] **Step 2: 创建 packages/adapter-ai/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"],
  "references": [{ "path": "../shared" }]
}
```

- [ ] **Step 3: 创建 packages/adapter-ai/src/types.ts**

```typescript
import { ContentType } from '@workspace/shared';

export interface AIRecognitionInput {
  /** 文本内容 */
  text?: string;
  /** 上传文件名 */
  fileName?: string;
  /** 文件解析后的文本内容 */
  fileContent?: string;
  /** 上下文范围 */
  scope?: string;
}

export interface AIRecognitionResult {
  /** AI 预测类型 */
  predictedType: ContentType | 'unknown';
  /** AI 提取的标题 */
  title: string;
  /** 置信度 0.00 ~ 1.00 */
  confidence: number;
  /** AI 提取的其他字段 */
  extractedFields: Record<string, any>;
  /** AI 生成的摘要 */
  summary?: string;
}
```

- [ ] **Step 4: 创建 packages/adapter-ai/src/ai-adapter.interface.ts**

```typescript
import { AIRecognitionInput, AIRecognitionResult } from './types';

export interface IAIAdapter {
  /** 识别内容类型与提取字段 */
  recognize(input: AIRecognitionInput): Promise<AIRecognitionResult>;

  /** 带上下文的识别 */
  recognizeWithContext(input: AIRecognitionInput, history: string[]): Promise<AIRecognitionResult>;
}
```

- [ ] **Step 5: 创建 packages/adapter-ai/src/adapters/deepseek.adapter.ts**

```typescript
import { ContentType } from '@workspace/shared';
import { IAIAdapter } from '../ai-adapter.interface';
import { AIRecognitionInput, AIRecognitionResult } from '../types';

export class DeepSeekAdapter implements IAIAdapter {
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(config: { apiKey: string; model?: string; baseUrl?: string }) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'deepseek-chat';
    this.baseUrl = config.baseUrl || 'https://api.deepseek.com/v1';
  }

  async recognize(input: AIRecognitionInput): Promise<AIRecognitionResult> {
    return this.callAI(input, []);
  }

  async recognizeWithContext(
    input: AIRecognitionInput,
    history: string[]
  ): Promise<AIRecognitionResult> {
    return this.callAI(input, history);
  }

  private async callAI(input: AIRecognitionInput, history: string[]): Promise<AIRecognitionResult> {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(input, history);

    // TODO: 在 Sprint 4 中实现实际 HTTP 调用
    // 当前返回 mock 结果，确保接口定义正确
    return {
      predictedType: ContentType.PERSONAL_LESSON,
      title: input.fileName || '未命名',
      confidence: 0.85,
      extractedFields: {},
      summary: 'AI 识别结果（Mock）',
    };
  }

  private buildSystemPrompt(): string {
    return `你是一个教育内容分类助手。请识别教师提交的内容类型：
- personal_lesson: 个人备课（课件、教案、教学设计）
- reflection: 教学反思（课后总结、反思文字）
- group_lesson: 集体备课（多人参与的备课内容）
- plan_summary: 计划与总结（教学计划、教研计划、学期总结）

请返回 JSON 格式：{"type": "...", "title": "...", "confidence": 0.XX, "summary": "..."}`;
  }

  private buildUserPrompt(input: AIRecognitionInput, history: string[]): string {
    const parts: string[] = [];
    if (input.fileName) parts.push(`文件名: ${input.fileName}`);
    if (input.text) parts.push(`文本内容: ${input.text}`);
    if (input.fileContent) parts.push(`文件内容: ${input.fileContent}`);
    if (history.length > 0) {
      parts.push(`对话历史: ${history.join(' | ')}`);
    }
    return parts.join('\n');
  }
}
```

- [ ] **Step 6: 创建 packages/adapter-ai/src/adapters/index.ts**

```typescript
export { DeepSeekAdapter } from './deepseek.adapter';
```

- [ ] **Step 7: 创建 packages/adapter-ai/src/ai-adapter.factory.ts**

```typescript
import { IAIAdapter } from './ai-adapter.interface';
import { DeepSeekAdapter } from './adapters';

export type AIAdapterType = 'deepseek' | 'openai';

export interface AIAdapterConfig {
  type: AIAdapterType;
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

export function createAIAdapter(config: AIAdapterConfig): IAIAdapter {
  switch (config.type) {
    case 'deepseek':
      return new DeepSeekAdapter({
        apiKey: config.apiKey,
        model: config.model,
        baseUrl: config.baseUrl,
      });
    default:
      throw new Error(`Unsupported AI adapter type: ${config.type}`);
  }
}
```

- [ ] **Step 8: 创建 packages/adapter-ai/src/index.ts**

```typescript
export { IAIAdapter } from './ai-adapter.interface';
export * from './types';
export { createAIAdapter } from './ai-adapter.factory';
export type { AIAdapterConfig, AIAdapterType } from './ai-adapter.factory';
export { DeepSeekAdapter } from './adapters/deepseek.adapter';
```

- [ ] **Step 9: 构建验证**

```bash
cd packages/adapter-ai && pnpm install && pnpm run build
```

Expected: 构建成功

- [ ] **Step 10: Commit**

```bash
git add packages/adapter-ai/
git commit -m "feat: add @workspace/adapter-ai with IAIAdapter interface and DeepSeek implementation"
```

---

## Task 4: 创建 adapter-preview 包

**Files:**

- Create: `packages/adapter-preview/package.json`
- Create: `packages/adapter-preview/tsconfig.json`
- Create: `packages/adapter-preview/src/preview-adapter.interface.ts`
- Create: `packages/adapter-preview/src/types.ts`
- Create: `packages/adapter-preview/src/preview-adapter.factory.ts`
- Create: `packages/adapter-preview/src/adapters/libreoffice.adapter.ts`
- Create: `packages/adapter-preview/src/adapters/index.ts`
- Create: `packages/adapter-preview/src/index.ts`

- [ ] **Step 1: 创建 packages/adapter-preview/package.json**

```json
{
  "name": "@workspace/adapter-preview",
  "version": "1.0.0",
  "private": true,
  "description": "Preview adapter abstraction layer with LibreOffice implementation",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "clean": "rm -rf dist",
    "dev": "tsc --watch"
  },
  "devDependencies": {
    "typescript": "^5.5.0"
  }
}
```

- [ ] **Step 2: 创建 packages/adapter-preview/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: 创建 packages/adapter-preview/src/types.ts**

```typescript
export type PreviewType = 'html' | 'pdf' | 'image';

export interface PreviewInput {
  /** 原始文件路径 */
  filePath: string;
  /** 目标转换类型 */
  targetType: PreviewType;
  /** 输出目录 */
  outputDir: string;
}

export interface PreviewResult {
  /** 输出文件路径 */
  outputPath: string;
  /** 预览类型 */
  previewType: PreviewType;
  /** 页数 (PDF/HTML) */
  pageCount?: number;
}
```

- [ ] **Step 4: 创建 packages/adapter-preview/src/preview-adapter.interface.ts**

```typescript
import { PreviewInput, PreviewResult } from './types';

export interface IPreviewAdapter {
  /** 转换文件为预览格式 */
  convert(input: PreviewInput): Promise<PreviewResult>;

  /** 检查是否支持指定扩展名 */
  isSupported(extension: string): boolean;
}
```

- [ ] **Step 5: 创建 packages/adapter-preview/src/adapters/libreoffice.adapter.ts**

```typescript
import { IPreviewAdapter } from '../preview-adapter.interface';
import { PreviewInput, PreviewResult, PreviewType } from '../types';

export class LibreOfficeAdapter implements IPreviewAdapter {
  private libreOfficePath: string;

  constructor(config?: { libreOfficePath?: string }) {
    this.libreOfficePath = config?.libreOfficePath || 'libreoffice';
  }

  async convert(input: PreviewInput): Promise<PreviewResult> {
    // TODO: 在 Sprint 7 中实现实际 LibreOffice 调用
    // 当前返回 mock 结果
    const ext = input.targetType === 'html' ? 'html' : 'pdf';

    return {
      outputPath: `${input.outputDir}/output.${ext}`,
      previewType: input.targetType,
      pageCount: 1,
    };
  }

  isSupported(extension: string): boolean {
    const supported = ['doc', 'docx', 'ppt', 'pptx', 'pdf'];
    return supported.includes(extension.toLowerCase());
  }

  /**
   * 判断文件是否需要转换
   * PDF 和图片不需要转换，Word → HTML，PPT → PDF
   */
  getTargetType(extension: string): PreviewType | null {
    const ext = extension.toLowerCase();
    if (['doc', 'docx'].includes(ext)) return 'html';
    if (['ppt', 'pptx'].includes(ext)) return 'pdf';
    if (['pdf'].includes(ext)) return 'pdf';
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return 'image';
    return null;
  }
}
```

- [ ] **Step 6: 创建 packages/adapter-preview/src/adapters/index.ts**

```typescript
export { LibreOfficeAdapter } from './libreoffice.adapter';
```

- [ ] **Step 7: 创建 packages/adapter-preview/src/preview-adapter.factory.ts**

```typescript
import { IPreviewAdapter } from './preview-adapter.interface';
import { LibreOfficeAdapter } from './adapters';

export type PreviewAdapterType = 'libreoffice' | 'onlyoffice';

export interface PreviewAdapterConfig {
  type: PreviewAdapterType;
  libreOfficePath?: string;
}

export function createPreviewAdapter(config: PreviewAdapterConfig): IPreviewAdapter {
  switch (config.type) {
    case 'libreoffice':
      return new LibreOfficeAdapter({
        libreOfficePath: config.libreOfficePath,
      });
    default:
      throw new Error(`Unsupported preview adapter type: ${config.type}`);
  }
}
```

- [ ] **Step 8: 创建 packages/adapter-preview/src/index.ts**

```typescript
export { IPreviewAdapter } from './preview-adapter.interface';
export * from './types';
export { createPreviewAdapter } from './preview-adapter.factory';
export type { PreviewAdapterConfig, PreviewAdapterType } from './preview-adapter.factory';
export { LibreOfficeAdapter } from './adapters/libreoffice.adapter';
```

- [ ] **Step 9: 构建验证**

```bash
cd packages/adapter-preview && pnpm install && pnpm run build
```

Expected: 构建成功

- [ ] **Step 10: Commit**

```bash
git add packages/adapter-preview/
git commit -m "feat: add @workspace/adapter-preview with IPreviewAdapter interface and LibreOffice implementation"
```

---

## Task 5: 创建 adapter-storage 包

**Files:**

- Create: `packages/adapter-storage/package.json`
- Create: `packages/adapter-storage/tsconfig.json`
- Create: `packages/adapter-storage/src/storage-adapter.interface.ts`
- Create: `packages/adapter-storage/src/types.ts`
- Create: `packages/adapter-storage/src/storage-adapter.factory.ts`
- Create: `packages/adapter-storage/src/adapters/local.adapter.ts`
- Create: `packages/adapter-storage/src/adapters/index.ts`
- Create: `packages/adapter-storage/src/index.ts`

- [ ] **Step 1: 创建 packages/adapter-storage/package.json**

```json
{
  "name": "@workspace/adapter-storage",
  "version": "1.0.0",
  "private": true,
  "description": "Storage adapter abstraction layer with local filesystem implementation",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "clean": "rm -rf dist",
    "dev": "tsc --watch"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "^5.5.0"
  }
}
```

- [ ] **Step 2: 创建 packages/adapter-storage/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: 创建 packages/adapter-storage/src/types.ts**

```typescript
/// <reference types="node" />

export interface StoragePutOptions {
  key: string;
  body: Buffer;
  contentType?: string;
}

export interface StorageGetResult {
  body: Buffer;
  contentType?: string;
}
```

- [ ] **Step 4: 创建 packages/adapter-storage/src/storage-adapter.interface.ts**

```typescript
import { StoragePutOptions, StorageGetResult } from './types';

export interface IStorageAdapter {
  /** 上传文件，返回存储 key */
  put(options: StoragePutOptions): Promise<string>;

  /** 下载文件 */
  get(key: string): Promise<StorageGetResult>;

  /** 删除文件 */
  delete(key: string): Promise<void>;

  /** 获取可访问的 URL */
  getUrl(key: string): Promise<string>;

  /** 检查文件是否存在 */
  exists(key: string): Promise<boolean>;
}
```

- [ ] **Step 5: 创建 packages/adapter-storage/src/adapters/local.adapter.ts**

```typescript
import * as fs from 'fs/promises';
import * as path from 'path';
import { IStorageAdapter } from '../storage-adapter.interface';
import { StoragePutOptions, StorageGetResult } from '../types';

export class LocalStorageAdapter implements IStorageAdapter {
  private basePath: string;

  constructor(config: { basePath: string }) {
    this.basePath = config.basePath;
  }

  async put(options: StoragePutOptions): Promise<string> {
    const fullPath = path.join(this.basePath, options.key);
    const dir = path.dirname(fullPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(fullPath, options.body);
    return options.key;
  }

  async get(key: string): Promise<StorageGetResult> {
    const fullPath = path.join(this.basePath, key);
    const body = await fs.readFile(fullPath);
    return { body };
  }

  async delete(key: string): Promise<void> {
    const fullPath = path.join(this.basePath, key);
    try {
      await fs.unlink(fullPath);
    } catch (error: any) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }

  async getUrl(key: string): Promise<string> {
    const fullPath = path.join(this.basePath, key);
    return `file://${fullPath}`;
  }

  async exists(key: string): Promise<boolean> {
    const fullPath = path.join(this.basePath, key);
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }
}
```

- [ ] **Step 6: 创建 packages/adapter-storage/src/adapters/index.ts**

```typescript
export { LocalStorageAdapter } from './local.adapter';
```

- [ ] **Step 7: 创建 packages/adapter-storage/src/storage-adapter.factory.ts**

```typescript
import { IStorageAdapter } from './storage-adapter.interface';
import { LocalStorageAdapter } from './adapters';

export type StorageAdapterType = 'local' | 'minio' | 's3';

export interface StorageAdapterConfig {
  type: StorageAdapterType;
  basePath?: string; // local
  endpoint?: string; // minio/s3
  accessKey?: string;
  secretKey?: string;
  bucket?: string;
}

export function createStorageAdapter(config: StorageAdapterConfig): IStorageAdapter {
  switch (config.type) {
    case 'local':
      return new LocalStorageAdapter({
        basePath: config.basePath || './storage',
      });
    default:
      throw new Error(`Unsupported storage adapter type: ${config.type}`);
  }
}
```

- [ ] **Step 8: 创建 packages/adapter-storage/src/index.ts**

```typescript
export { IStorageAdapter } from './storage-adapter.interface';
export type { StoragePutOptions, StorageGetResult } from './types';
export { createStorageAdapter } from './storage-adapter.factory';
export type { StorageAdapterConfig, StorageAdapterType } from './storage-adapter.factory';
export { LocalStorageAdapter } from './adapters/local.adapter';
```

- [ ] **Step 9: 构建验证**

```bash
cd packages/adapter-storage && pnpm install && pnpm run build
```

Expected: 构建成功

- [ ] **Step 10: Commit**

```bash
git add packages/adapter-storage/
git commit -m "feat: add @workspace/adapter-storage with IStorageAdapter interface and local filesystem implementation"
```

---

## Task 6: 初始化 NestJS API (apps/api)

**Files:**

- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/nest-cli.json`
- Create: `apps/api/src/main.ts`
- Create: `apps/api/src/app.module.ts`
- Create: `apps/api/src/config/database.config.ts`
- Create: `apps/api/src/config/redis.config.ts`
- Create: `apps/api/src/config/bullmq.config.ts`
- Create: `apps/api/src/common/guards/roles.guard.ts`
- Create: `apps/api/src/common/decorators/roles.decorator.ts`
- Create: `apps/api/src/common/filters/http-exception.filter.ts`
- Create: `apps/api/src/common/interceptors/response.interceptor.ts`
- Create: `apps/api/src/common/pipes/validation.pipe.ts`
- Create: `apps/api/src/database/data-source.ts`
- Create: `apps/api/src/database/migrations/.gitkeep`
- Create: `apps/api/.env`

- [ ] **Step 1: 创建 apps/api/package.json**

```json
{
  "name": "@workspace/api",
  "version": "1.0.0",
  "private": true,
  "description": "AI Teacher Workspace REST API",
  "scripts": {
    "dev": "nest start --watch",
    "build": "nest build",
    "start": "node dist/main",
    "start:prod": "node dist/main",
    "clean": "rm -rf dist",
    "lint": "eslint \"src/**/*.ts\" --fix",
    "migration:generate": "typeorm-ts-node-commonjs migration:generate -d src/database/data-source.ts src/database/migrations/Migration",
    "migration:run": "typeorm-ts-node-commonjs migration:run -d src/database/data-source.ts",
    "migration:revert": "typeorm-ts-node-commonjs migration:revert -d src/database/data-source.ts"
  },
  "dependencies": {
    "@bull-board/api": "^6.0.0",
    "@bull-board/express": "^6.0.0",
    "@nestjs/bullmq": "^10.0.0",
    "@nestjs/common": "^10.0.0",
    "@nestjs/config": "^3.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/jwt": "^10.0.0",
    "@nestjs/passport": "^10.0.0",
    "@nestjs/platform-express": "^10.0.0",
    "@nestjs/typeorm": "^10.0.0",
    "@workspace/adapter-ai": "workspace:*",
    "@workspace/adapter-preview": "workspace:*",
    "@workspace/adapter-storage": "workspace:*",
    "@workspace/shared": "workspace:*",
    "bullmq": "^5.0.0",
    "class-transformer": "^0.5.0",
    "class-validator": "^0.14.0",
    "ioredis": "^5.0.0",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.0",
    "pg": "^8.0.0",
    "reflect-metadata": "^0.2.0",
    "rxjs": "^7.0.0",
    "typeorm": "^0.3.0"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.0.0",
    "@nestjs/schematics": "^10.0.0",
    "@nestjs/testing": "^10.0.0",
    "@types/express": "^5.0.0",
    "@types/node": "^22.0.0",
    "@types/passport-jwt": "^4.0.0",
    "ts-node": "^10.0.0",
    "typescript": "^5.5.0"
  }
}
```

- [ ] **Step 2: 创建 apps/api/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2022",
    "outDir": "./dist",
    "rootDir": "./src",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": true,
    "noImplicitAny": false,
    "strictBindCallApply": false,
    "forceConsistentCasingInFileNames": false,
    "noFallthroughCasesInSwitch": false
  },
  "include": ["src"]
}
```

- [ ] **Step 3: 创建 apps/api/nest-cli.json**

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true
  }
}
```

- [ ] **Step 4: 创建 apps/api/src/database/data-source.ts**

```typescript
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 加载 apps/api/.env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ai_teacher',
  entities: [path.join(__dirname, '../**/*.entity{.ts,.js}')],
  migrations: [path.join(__dirname, 'migrations/*{.ts,.js}')],
  synchronize: false, // MANDATORY: 禁止自动同步
  logging: process.env.NODE_ENV === 'development',
  migrationsTableName: 'typeorm_migrations',
});
```

- [ ] **Step 5: 创建 apps/api/src/config/database.config.ts**

```typescript
import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ai_teacher',
}));
```

- [ ] **Step 6: 创建 apps/api/src/config/redis.config.ts**

```typescript
import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => ({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
}));
```

- [ ] **Step 7: 创建 apps/api/src/config/bullmq.config.ts**

```typescript
import { registerAs } from '@nestjs/config';

export default registerAs('bullmq', () => ({
  connection: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  queues: {
    aiRecognition: 'ai-recognition',
    filePreview: 'file-preview',
    pdfExport: 'pdf-export',
  },
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 500,
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 1000,
    },
  },
}));
```

- [ ] **Step 8: 创建 apps/api/src/common/guards/roles.guard.ts**

```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@workspace/shared';

export const ROLES_KEY = 'roles';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.includes(user?.role);
  }
}
```

- [ ] **Step 9: 创建 apps/api/src/common/decorators/roles.decorator.ts**

```typescript
import { SetMetadata } from '@nestjs/common';
import { Role } from '@workspace/shared';
import { ROLES_KEY } from '../guards/roles.guard';

export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
```

- [ ] **Step 10: 创建 apps/api/src/common/filters/http-exception.filter.ts**

```typescript
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = '服务器异常';
    let code = 50000;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exResponse = exception.getResponse();
      message =
        typeof exResponse === 'string' ? exResponse : (exResponse as any).message || message;

      if (status === 400 || status === 422) code = 40001;
      else if (status === 401) code = 40100;
      else if (status === 403) code = 40300;
      else if (status === 404) code = 40400;
      else if (status === 409) code = 40900;
    }

    if (status >= 500) {
      this.logger.error(
        `[${request.method}] ${request.url}`,
        exception instanceof Error ? exception.stack : exception
      );
    }

    response.status(status).json({
      code,
      message: Array.isArray(message) ? message.join('; ') : message,
      data: null,
      requestId: request.headers['x-request-id'] || '',
    });
  }
}
```

- [ ] **Step 11: 创建 apps/api/src/common/interceptors/response.interceptor.ts**

```typescript
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

export interface WrappedResponse<T> {
  code: number;
  message: string;
  data: T;
  requestId: string;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, WrappedResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<WrappedResponse<T>> {
    const requestId = uuidv4();
    return next.handle().pipe(
      map((data) => ({
        code: 0,
        message: 'success',
        data,
        requestId,
      }))
    );
  }
}
```

- [ ] **Step 12: 创建 apps/api/src/common/pipes/validation.pipe.ts**

```typescript
import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class ValidationPipe implements PipeTransform<any> {
  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }
    const object = plainToInstance(metatype, value);
    const errors = await validate(object);
    if (errors.length > 0) {
      const messages = errors.map((err) => Object.values(err.constraints || {}).join(', '));
      throw new BadRequestException(messages);
    }
    return value;
  }

  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }
}
```

- [ ] **Step 13: 创建 apps/api/src/app.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import databaseConfig from './config/database.config';
import redisConfig from './config/redis.config';
import bullmqConfig from './config/bullmq.config';

@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
      load: [databaseConfig, redisConfig, bullmqConfig],
    }),
    // 数据库
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get('database.url'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false, // MANDATORY: 禁止自动同步，仅用 Migration
        logging: process.env.NODE_ENV === 'development',
      }),
      inject: [ConfigService],
    }),
    // BullMQ
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        connection: {
          url: config.get('redis.url'),
        },
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 500,
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
        },
      }),
      inject: [ConfigService],
    }),
    // 注册消息队列
    BullModule.registerQueue(
      { name: 'ai-recognition' },
      { name: 'file-preview' },
      { name: 'pdf-export' }
    ),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
```

- [ ] **Step 14: 创建 apps/api/src/main.ts**

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { ValidationPipe } from './common/pipes/validation.pipe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 全局前缀
  app.setGlobalPrefix('api');

  // CORS
  app.enableCors({
    origin: process.env.WEB_URL || 'http://localhost:8080',
    credentials: true,
  });

  // 全局管道/过滤器/拦截器
  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  const port = process.env.API_PORT || 3000;
  await app.listen(port);
  console.log(`API server running on http://localhost:${port}`);
}

bootstrap();
```

- [ ] **Step 15: 创建 apps/api/.env**

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ai_teacher
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-secret-change-in-production
JWT_EXPIRES_IN=7d
API_PORT=3000
NODE_ENV=development
```

- [ ] **Step 16: 创建 apps/api/src/database/migrations/.gitkeep**

```
# Migration files directory
```

- [ ] **Step 17: 安装依赖并验证编译**

```bash
cd apps/api && pnpm install && pnpm run build
```

Expected: 编译成功

- [ ] **Step 18: Commit**

```bash
git add apps/api/
git commit -m "feat: init NestJS API with TypeORM, BullMQ, Redis, config modules"
```

---

## Task 7: 初始化 Next.js 前端 (apps/web)

**Files:**

- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/next.config.ts`
- Create: `apps/web/src/app/layout.tsx`
- Create: `apps/web/src/app/page.tsx`
- Create: `apps/web/src/app/globals.css`
- Create: `apps/web/tailwind.config.ts`
- Create: `apps/web/postcss.config.mjs`

- [ ] **Step 1: 创建 apps/web/package.json**

```json
{
  "name": "@workspace/web",
  "version": "1.0.0",
  "private": true,
  "description": "AI Teacher Workspace Web Frontend",
  "scripts": {
    "dev": "next dev -p 8080",
    "build": "next build",
    "start": "next start -p 8080",
    "lint": "next lint",
    "clean": "rm -rf .next"
  },
  "dependencies": {
    "@workspace/shared": "workspace:*",
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.5.0"
  }
}
```

- [ ] **Step 2: 创建 apps/web/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: 创建 apps/web/next.config.ts**

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // API 代理
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3000/api/:path*',
      },
    ];
  },
};

export default nextConfig;
```

- [ ] **Step 4: 创建 apps/web/tailwind.config.ts**

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 5: 创建 apps/web/postcss.config.mjs**

```javascript
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};

export default config;
```

- [ ] **Step 6: 创建 apps/web/src/app/globals.css**

```css
@import 'tailwindcss';

:root {
  --background: #ffffff;
  --foreground: #171717;
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: Arial, Helvetica, sans-serif;
}
```

- [ ] **Step 7: 创建 apps/web/src/app/layout.tsx**

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI 教师工作空间',
  description: '学校备课资料共享与AI自动归档工作空间',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 8: 创建 apps/web/src/app/page.tsx**

```tsx
export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <h1 className="text-4xl font-bold">AI 教师工作空间</h1>
      <p className="mt-4 text-gray-600">基础架构搭建中...</p>
    </main>
  );
}
```

- [ ] **Step 9: 安装依赖并验证编译**

```bash
cd apps/web && pnpm install && pnpm run build
```

Expected: 编译成功

- [ ] **Step 10: Commit**

```bash
git add apps/web/
git commit -m "feat: init Next.js App Router frontend with Tailwind CSS"
```

---

## Task 8: 初始化 Worker 应用 (worker-ai, worker-preview, worker-export, worker-schedule)

**Files:**

- Create: `apps/worker-ai/package.json`
- Create: `apps/worker-ai/tsconfig.json`
- Create: `apps/worker-ai/src/main.ts`
- Create: `apps/worker-ai/src/processors/ai-recognition.processor.ts`

- Create: `apps/worker-preview/package.json`
- Create: `apps/worker-preview/tsconfig.json`
- Create: `apps/worker-preview/src/main.ts`
- Create: `apps/worker-preview/src/processors/word-to-html.processor.ts`
- Create: `apps/worker-preview/src/processors/ppt-to-pdf.processor.ts`

- Create: `apps/worker-export/package.json`
- Create: `apps/worker-export/tsconfig.json`
- Create: `apps/worker-export/src/main.ts`
- Create: `apps/worker-export/src/processors/pdf-export.processor.ts`

- Create: `apps/worker-schedule/package.json`
- Create: `apps/worker-schedule/tsconfig.json`
- Create: `apps/worker-schedule/src/main.ts`
- Create: `apps/worker-schedule/src/jobs/term-switch.job.ts`

- [ ] **Step 1: 创建 apps/worker-ai/package.json**

```json
{
  "name": "@workspace/worker-ai",
  "version": "1.0.0",
  "private": true,
  "description": "AI recognition async worker",
  "scripts": {
    "dev": "ts-node src/main.ts",
    "build": "tsc",
    "start": "node dist/main.js",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@workspace/adapter-ai": "workspace:*",
    "@workspace/shared": "workspace:*",
    "bullmq": "^5.0.0",
    "ioredis": "^5.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "ts-node": "^10.0.0",
    "typescript": "^5.5.0"
  }
}
```

- [ ] **Step 2: 创建 apps/worker-ai/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: 创建 apps/worker-ai/src/main.ts**

```typescript
import { Worker } from 'bullmq';
import { createAIAdapter } from '@workspace/adapter-ai';
import { AiRecognitionProcessor } from './processors/ai-recognition.processor';

async function bootstrap() {
  const connection = {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  };

  const aiAdapter = createAIAdapter({
    type: 'deepseek',
    apiKey: process.env.AI_API_KEY || '',
    model: process.env.AI_MODEL || 'deepseek-chat',
    baseUrl: process.env.AI_BASE_URL || 'https://api.deepseek.com/v1',
  });

  const processor = new AiRecognitionProcessor(aiAdapter);

  const worker = new Worker('ai-recognition', processor.process.bind(processor), {
    connection,
    concurrency: 3,
  });

  console.log('[Worker-AI] AI Recognition worker started');
  console.log('[Worker-AI] Listening on queue: ai-recognition');

  worker.on('completed', (job) => {
    console.log(`[Worker-AI] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Worker-AI] Job ${job?.id} failed:`, err.message);
  });
}

bootstrap().catch(console.error);
```

- [ ] **Step 4: 创建 apps/worker-ai/src/processors/ai-recognition.processor.ts**

```typescript
import { Job } from 'bullmq';
import { IAIAdapter } from '@workspace/adapter-ai';

export interface AiRecognitionJob {
  sessionId: number;
  messageId: number;
  fileId?: number;
  text?: string;
  fileName?: string;
  fileContent?: string;
  scope?: string;
}

export class AiRecognitionProcessor {
  constructor(private aiAdapter: IAIAdapter) {}

  async process(job: Job<AiRecognitionJob>) {
    const { text, fileName, fileContent, scope } = job.data;

    const result = await this.aiAdapter.recognize({
      text,
      fileName,
      fileContent,
      scope,
    });

    // TODO: 在 Sprint 4 中写入 ai_recognition_record 表
    console.log(
      `[Worker-AI] Job ${job.id}: recognized as ${result.predictedType} (${result.confidence})`
    );

    return result;
  }
}
```

- [ ] **Step 5: 创建 apps/worker-preview/package.json**

```json
{
  "name": "@workspace/worker-preview",
  "version": "1.0.0",
  "private": true,
  "description": "File preview conversion async worker",
  "scripts": {
    "dev": "ts-node src/main.ts",
    "build": "tsc",
    "start": "node dist/main.js",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@workspace/adapter-preview": "workspace:*",
    "@workspace/adapter-storage": "workspace:*",
    "bullmq": "^5.0.0",
    "ioredis": "^5.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "ts-node": "^10.0.0",
    "typescript": "^5.5.0"
  }
}
```

- [ ] **Step 6: 创建 apps/worker-preview/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

- [ ] **Step 7: 创建 apps/worker-preview/src/main.ts**

```typescript
import { Worker } from 'bullmq';
import { createPreviewAdapter } from '@workspace/adapter-preview';
import { WordToHtmlProcessor } from './processors/word-to-html.processor';
import { PptToPdfProcessor } from './processors/ppt-to-pdf.processor';

async function bootstrap() {
  const connection = {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  };

  const previewAdapter = createPreviewAdapter({
    type: 'libreoffice',
  });

  const wordProcessor = new WordToHtmlProcessor(previewAdapter);
  const pptProcessor = new PptToPdfProcessor(previewAdapter);

  const worker = new Worker(
    'file-preview',
    async (job) => {
      switch (job.name) {
        case 'convert-word-html':
          return wordProcessor.process(job);
        case 'convert-ppt-pdf':
          return pptProcessor.process(job);
        default:
          throw new Error(`Unknown job type: ${job.name}`);
      }
    },
    { connection, concurrency: 2 }
  );

  console.log('[Worker-Preview] Preview conversion worker started');
  console.log('[Worker-Preview] Listening on queue: file-preview');
}

bootstrap().catch(console.error);
```

- [ ] **Step 8: 创建 apps/worker-preview/src/processors/word-to-html.processor.ts**

```typescript
import { Job } from 'bullmq';
import { IPreviewAdapter } from '@workspace/adapter-preview';

export interface WordToHtmlJob {
  fileId: number;
  storageKey: string;
  outputDir: string;
}

export class WordToHtmlProcessor {
  constructor(private previewAdapter: IPreviewAdapter) {}

  async process(job: Job<WordToHtmlJob>) {
    const { fileId, storageKey, outputDir } = job.data;

    const result = await this.previewAdapter.convert({
      filePath: storageKey,
      targetType: 'html',
      outputDir,
    });

    // TODO: 在 Sprint 7 中更新 preview_file 表状态
    console.log(`[Worker-Preview] Job ${job.id}: HTML generated at ${result.outputPath}`);

    return result;
  }
}
```

- [ ] **Step 9: 创建 apps/worker-preview/src/processors/ppt-to-pdf.processor.ts**

```typescript
import { Job } from 'bullmq';
import { IPreviewAdapter } from '@workspace/adapter-preview';

export interface PptToPdfJob {
  fileId: number;
  storageKey: string;
  outputDir: string;
}

export class PptToPdfProcessor {
  constructor(private previewAdapter: IPreviewAdapter) {}

  async process(job: Job<PptToPdfJob>) {
    const { fileId, storageKey, outputDir } = job.data;

    const result = await this.previewAdapter.convert({
      filePath: storageKey,
      targetType: 'pdf',
      outputDir,
    });

    console.log(`[Worker-Preview] Job ${job.id}: PDF generated at ${result.outputPath}`);

    return result;
  }
}
```

- [ ] **Step 10: 创建 apps/worker-export/package.json**

```json
{
  "name": "@workspace/worker-export",
  "version": "1.0.0",
  "private": true,
  "description": "PDF export async worker",
  "scripts": {
    "dev": "ts-node src/main.ts",
    "build": "tsc",
    "start": "node dist/main.js",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@workspace/adapter-storage": "workspace:*",
    "bullmq": "^5.0.0",
    "ioredis": "^5.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "ts-node": "^10.0.0",
    "typescript": "^5.5.0"
  }
}
```

- [ ] **Step 11: 创建 apps/worker-export/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

- [ ] **Step 12: 创建 apps/worker-export/src/main.ts**

```typescript
import { Worker } from 'bullmq';
import { createStorageAdapter } from '@workspace/adapter-storage';
import { PdfExportProcessor } from './processors/pdf-export.processor';

async function bootstrap() {
  const connection = {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  };

  const storageAdapter = createStorageAdapter({
    type: 'local',
    basePath: process.env.STORAGE_LOCAL_PATH || './storage',
  });

  const processor = new PdfExportProcessor(storageAdapter);

  const worker = new Worker('pdf-export', processor.process.bind(processor), {
    connection,
    concurrency: 1,
  });

  console.log('[Worker-Export] PDF Export worker started');
  console.log('[Worker-Export] Listening on queue: pdf-export');

  worker.on('completed', (job) => {
    console.log(`[Worker-Export] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Worker-Export] Job ${job?.id} failed:`, err.message);
  });
}

bootstrap().catch(console.error);
```

- [ ] **Step 13: 创建 apps/worker-export/src/processors/pdf-export.processor.ts**

```typescript
import { Job } from 'bullmq';
import { IStorageAdapter } from '@workspace/adapter-storage';

export interface PdfExportJob {
  exportTaskId: number;
  teacherId: number;
  academicYear: string;
  semester: string;
  outputDir: string;
}

export class PdfExportProcessor {
  constructor(private storageAdapter: IStorageAdapter) {}

  async process(job: Job<PdfExportJob>) {
    const { exportTaskId, teacherId, academicYear, semester, outputDir } = job.data;

    console.log(
      `[Worker-Export] Job ${job.id}: Exporting PDF for teacher=${teacherId} ${academicYear} ${semester}`
    );

    // TODO: 在 Sprint 7 中使用 Playwright 生成 PDF
    // 当前返回 mock 结果
    return {
      exportTaskId,
      status: 'success',
      outputPath: `${outputDir}/export-${exportTaskId}.pdf`,
    };
  }
}
```

- [ ] **Step 14: 创建 apps/worker-schedule/package.json**

```json
{
  "name": "@workspace/worker-schedule",
  "version": "1.0.0",
  "private": true,
  "description": "Scheduled tasks worker (cron jobs)",
  "scripts": {
    "dev": "ts-node src/main.ts",
    "build": "tsc",
    "start": "node dist/main.js",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@workspace/shared": "workspace:*",
    "ioredis": "^5.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "ts-node": "^10.0.0",
    "typescript": "^5.5.0"
  }
}
```

- [ ] **Step 15: 创建 apps/worker-schedule/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

- [ ] **Step 16: 创建 apps/worker-schedule/src/main.ts**

```typescript
import { TermSwitchJob } from './jobs/term-switch.job';

async function bootstrap() {
  console.log('[Worker-Schedule] Scheduled tasks worker started');

  // 学年学期切换检查 (每小时)
  setInterval(
    () => {
      try {
        TermSwitchJob.check();
      } catch (error) {
        console.error('[Worker-Schedule] Term switch check failed:', error);
      }
    },
    60 * 60 * 1000
  );

  console.log('[Worker-Schedule] Registered jobs: term-switch-check (hourly)');

  // 启动时立即执行一次检查
  TermSwitchJob.check();
}

bootstrap().catch(console.error);
```

- [ ] **Step 17: 创建 apps/worker-schedule/src/jobs/term-switch.job.ts**

```typescript
import {
  ACADEMIC_YEAR_START_MONTH,
  ACADEMIC_YEAR_START_DAY,
  SEMESTER_FIRST,
  SEMESTER_SECOND,
} from '@workspace/shared';

export class TermSwitchJob {
  static check() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();

    let academicYear: string;
    if (month >= ACADEMIC_YEAR_START_MONTH) {
      academicYear = `${year}-${year + 1}学年`;
    } else {
      academicYear = `${year - 1}-${year}学年`;
    }

    // 简化版: 上学期 (9月~1月), 下学期 (2月~7月)
    const semester = month >= 9 || month <= 1 ? SEMESTER_FIRST : SEMESTER_SECOND;

    console.log(
      `[Worker-Schedule] Current term: ${academicYear} ${semester} (${now.toISOString()})`
    );

    // TODO: 在 Sprint 1 连接数据库后，检查并更新 content 表的 academic_year/semester
  }
}
```

- [ ] **Step 18: 安装所有 Worker 依赖并编译**

```bash
cd apps/worker-ai && pnpm install && pnpm run build && \
cd ../worker-preview && pnpm install && pnpm run build && \
cd ../worker-export && pnpm install && pnpm run build && \
cd ../worker-schedule && pnpm install && pnpm run build
```

Expected: 全部编译成功

- [ ] **Step 19: Commit**

```bash
git add apps/worker-ai/ apps/worker-preview/ apps/worker-export/ apps/worker-schedule/
git commit -m "feat: init 4 workers (ai, preview, export, schedule) with BullMQ processors"
```

---

## Task 9: 创建 Docker 编排文件

**Files:**

- Create: `docker/docker-compose.yml`
- Create: `docker/Dockerfile.api`
- Create: `docker/Dockerfile.web`
- Create: `docker/Dockerfile.worker`
- Create: `docker/nginx.conf`
- Create: `storage/uploads/.gitkeep`
- Create: `storage/previews/.gitkeep`
- Create: `storage/exports/.gitkeep`

- [ ] **Step 1: 创建 storage 占位文件**

```bash
mkdir -p storage/uploads storage/previews storage/exports
touch storage/uploads/.gitkeep storage/previews/.gitkeep storage/exports/.gitkeep
```

- [ ] **Step 2: 创建 docker/docker-compose.yml**

```yaml
version: '3.8'

services:
  # PostgreSQL
  postgres:
    image: postgres:15-alpine
    container_name: ai-teacher-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: ai_teacher
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U postgres']
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis
  redis:
    image: redis:7-alpine
    container_name: ai-teacher-redis
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 10s
      timeout: 5s
      retries: 5

  # NestJS API
  api:
    build:
      context: ..
      dockerfile: docker/Dockerfile.api
    container_name: ai-teacher-api
    ports:
      - '3000:3000'
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/ai_teacher
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET:-dev-secret}
      NODE_ENV: development
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ../storage:/app/storage

  # Next.js Web
  web:
    build:
      context: ..
      dockerfile: docker/Dockerfile.web
    container_name: ai-teacher-web
    ports:
      - '8080:8080'
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:3000
    depends_on:
      - api

  # Worker - AI Recognition
  worker-ai:
    build:
      context: ..
      dockerfile: docker/Dockerfile.worker
      args:
        WORKER_NAME: ai
    container_name: ai-teacher-worker-ai
    environment:
      REDIS_URL: redis://redis:6379
      AI_API_KEY: ${AI_API_KEY}
      AI_MODEL: ${AI_MODEL:-deepseek-chat}
      AI_BASE_URL: ${AI_BASE_URL:-https://api.deepseek.com/v1}
    depends_on:
      redis:
        condition: service_healthy

  # Worker - Preview Conversion
  worker-preview:
    build:
      context: ..
      dockerfile: docker/Dockerfile.worker
      args:
        WORKER_NAME: preview
    container_name: ai-teacher-worker-preview
    environment:
      REDIS_URL: redis://redis:6379
      STORAGE_LOCAL_PATH: /app/storage
    depends_on:
      redis:
        condition: service_healthy
    volumes:
      - ../storage:/app/storage

  # Worker - PDF Export
  worker-export:
    build:
      context: ..
      dockerfile: docker/Dockerfile.worker
      args:
        WORKER_NAME: export
    container_name: ai-teacher-worker-export
    environment:
      REDIS_URL: redis://redis:6379
      STORAGE_LOCAL_PATH: /app/storage
    depends_on:
      redis:
        condition: service_healthy
    volumes:
      - ../storage:/app/storage

  # Worker - Scheduled Tasks
  worker-schedule:
    build:
      context: ..
      dockerfile: docker/Dockerfile.worker
      args:
        WORKER_NAME: schedule
    container_name: ai-teacher-worker-schedule
    environment:
      REDIS_URL: redis://redis:6379
    depends_on:
      redis:
        condition: service_healthy

  # Nginx (可选: 生产环境反向代理)
  nginx:
    image: nginx:alpine
    container_name: ai-teacher-nginx
    ports:
      - '80:80'
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - api
      - web
    profiles:
      - production

volumes:
  postgres_data:
  redis_data:
```

- [ ] **Step 3: 创建 docker/Dockerfile.api**

```dockerfile
FROM node:22-alpine AS builder

WORKDIR /app

# pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# 复制 workspace 配置
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY tsconfig.base.json ./

# 复制包
COPY packages/shared/package.json packages/shared/
COPY packages/adapter-ai/package.json packages/adapter-ai/
COPY packages/adapter-preview/package.json packages/adapter-preview/
COPY packages/adapter-storage/package.json packages/adapter-storage/
COPY apps/api/package.json apps/api/

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源码
COPY packages/ packages/
COPY apps/api/ apps/api/

# 构建共享包
RUN pnpm --filter @workspace/shared build
RUN pnpm --filter @workspace/adapter-ai build
RUN pnpm --filter @workspace/adapter-preview build
RUN pnpm --filter @workspace/adapter-storage build

# 构建 API
RUN pnpm --filter @workspace/api build

FROM node:22-alpine AS runner

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

EXPOSE 3000

CMD ["node", "dist/apps/api/main.js"]
```

- [ ] **Step 4: 创建 docker/Dockerfile.web**

```dockerfile
FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY tsconfig.base.json ./

COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/

RUN pnpm install --frozen-lockfile

COPY packages/ packages/
COPY apps/web/ apps/web/

RUN pnpm --filter @workspace/shared build
RUN pnpm --filter @workspace/web build

FROM node:22-alpine AS runner

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY --from=builder /app/apps/web/.next ./.next
COPY --from=builder /app/apps/web/package.json ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 8080

CMD ["pnpm", "run", "start"]
```

- [ ] **Step 5: 创建 docker/Dockerfile.worker**

```dockerfile
FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY tsconfig.base.json ./

COPY packages/shared/package.json packages/shared/
COPY packages/adapter-ai/package.json packages/adapter-ai/
COPY packages/adapter-preview/package.json packages/adapter-preview/
COPY packages/adapter-storage/package.json packages/adapter-storage/
COPY apps/worker-ai/package.json apps/worker-ai/
COPY apps/worker-preview/package.json apps/worker-preview/
COPY apps/worker-export/package.json apps/worker-export/
COPY apps/worker-schedule/package.json apps/worker-schedule/

RUN pnpm install --frozen-lockfile

COPY packages/ packages/
COPY apps/ apps/

RUN pnpm --filter @workspace/shared build
RUN pnpm --filter @workspace/adapter-ai build
RUN pnpm --filter @workspace/adapter-preview build
RUN pnpm --filter @workspace/adapter-storage build

ARG WORKER_NAME=ai
RUN pnpm --filter @workspace/worker-${WORKER_NAME} build

FROM node:22-alpine AS runner

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

ARG WORKER_NAME=ai

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

CMD ["node", "dist/apps/worker-${WORKER_NAME}/main.js"]
```

- [ ] **Step 6: 创建 docker/nginx.conf**

```nginx
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    upstream api {
        server api:3000;
    }

    upstream web {
        server web:8080;
    }

    server {
        listen 80;
        server_name localhost;

        # API 代理
        location /api/ {
            proxy_pass http://api;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }

        # Web 前端
        location / {
            proxy_pass http://web;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
}
```

- [ ] **Step 7: Commit**

```bash
git add docker/ storage/
git commit -m "feat: add Docker Compose with all services, Dockerfiles, Nginx config, storage dirs"
```

---

## Task 10: ESLint + Prettier + Husky 配置

**Files:**

- Create: `.eslintrc.json`
- Create: `.prettierrc`
- Create: `.prettierignore`
- Create: `.husky/pre-commit`

- [ ] **Step 1: 创建根 .eslintrc.json**

```json
{
  "root": true,
  "env": {
    "node": true,
    "jest": true,
    "es2022": true
  },
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module",
    "project": "./tsconfig.base.json"
  },
  "plugins": ["@typescript-eslint"],
  "extends": ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  "rules": {
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
    "no-console": "off"
  },
  "ignorePatterns": ["dist", ".next", "node_modules", "*.js"]
}
```

- [ ] **Step 2: 创建 .prettierrc**

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always"
}
```

- [ ] **Step 3: 创建 .prettierignore**

```
node_modules/
dist/
.next/
pnpm-lock.yaml
*.log
```

- [ ] **Step 4: 根 package.json 添加 husky 和 lint-staged 依赖**

在 `package.json` 的 `devDependencies` 中添加：

```json
{
  "devDependencies": {
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "@typescript-eslint/parser": "^8.0.0",
    "eslint": "^9.0.0",
    "husky": "^9.0.0",
    "lint-staged": "^15.0.0",
    "prettier": "^3.0.0",
    "typescript": "^5.5.0"
  },
  "lint-staged": {
    "*.{ts,tsx}": ["prettier --write", "eslint --fix"],
    "*.{json,md,css}": ["prettier --write"]
  }
}
```

- [ ] **Step 5: 执行 husky 初始化**

```bash
cd ai-teacher-workspace
pnpm install
pnpm exec husky init
```

Expected: `.husky/` 目录生成

- [ ] **Step 6: 创建 .husky/pre-commit**

```bash
echo 'pnpm exec lint-staged' > .husky/pre-commit
```

- [ ] **Step 7: Commit**

```bash
git add .eslintrc.json .prettierrc .prettierignore .husky/ package.json
git commit -m "feat: add ESLint, Prettier, Husky with pre-commit lint-staged"
```

---

## Task 11: README.md

**Files:**

- Create: `README.md`

- [ ] **Step 1: 创建 README.md**

```markdown
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
│ ├── web/ # Next.js 前端 (8080)
│ ├── api/ # NestJS API (3000)
│ ├── worker-ai/ # AI 识别 Worker
│ ├── worker-preview/ # 预览转换 Worker
│ ├── worker-export/ # PDF 导出 Worker
│ └── worker-schedule/ # 定时任务 Worker
├── packages/
│ ├── shared/ # 共享类型、枚举、常量
│ ├── adapter-ai/ # AI 适配器 (DeepSeek)
│ ├── adapter-preview/ # 预览适配器 (LibreOffice)
│ └── adapter-storage/ # 存储适配器 (Local/MinIO)
├── storage/ # 文件存储目录
├── docker/ # Docker 编排
└── docs/ # 设计文档

````

## 快速开始

### 环境要求

- Node.js >= 22
- pnpm >= 9
- Docker & Docker Compose
- PostgreSQL 15 (或使用 Docker)
- Redis 7 (或使用 Docker)

### 安装依赖

```bash
pnpm install
````

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

### Git 提交

- Husky pre-commit: ESLint + Prettier 自动检查
- 禁止跨越 Sprint/Task 开发
- 先更新文档，再修改代码

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

````

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add project README with tech stack, structure, and quick start"
````

---

## Task 12: 最终验证与提交

- [ ] **Step 1: 根目录安装所有依赖**

```bash
cd ai-teacher-workspace
pnpm install
```

Expected: 所有包依赖安装成功

- [ ] **Step 2: 构建所有包**

```bash
pnpm --filter @workspace/shared build
pnpm --filter @workspace/adapter-ai build
pnpm --filter @workspace/adapter-preview build
pnpm --filter @workspace/adapter-storage build
pnpm --filter @workspace/api build
pnpm --filter @workspace/web build
pnpm --filter @workspace/worker-ai build
pnpm --filter @workspace/worker-preview build
pnpm --filter @workspace/worker-export build
pnpm --filter @workspace/worker-schedule build
```

Expected: 全部编译成功，无 TypeScript 错误

- [ ] **Step 3: 验证目录结构**

```bash
tree -L 3 -I 'node_modules|dist|.next|.git' ai-teacher-workspace/
```

Expected: 目录结构与设计文档一致

- [ ] **Step 4: 验证 Docker Compose 配置**

```bash
cd ai-teacher-workspace
docker compose -f docker/docker-compose.yml config
```

Expected: 配置解析成功，无语法错误

- [ ] **Step 5: 最终提交**

```bash
git add .
git status
# 确认无遗漏文件
git commit -m "feat: complete Sprint 0 - project infrastructure setup

- pnpm Workspace Monorepo
- 6 apps (api, web, 4 workers)
- 4 packages (shared, adapter-ai, adapter-preview, adapter-storage)
- Docker Compose with PostgreSQL, Redis, multi-service orchestration
- TypeORM migration-ready config (synchronize=false)
- BullMQ 3 queues (ai-recognition, file-preview, pdf-export)
- ESLint + Prettier + Husky
- Environment variable template"
```

Expected: Sprint 0 完整提交

---

## Sprint 0 验收清单

| #   | 验收项                              | 文件/命令                                    |
| --- | ----------------------------------- | -------------------------------------------- |
| 1   | pnpm Workspace 可用                 | `pnpm-workspace.yaml`, `pnpm install` 无错误 |
| 2   | `@workspace/shared` 可构建          | `packages/shared/dist/` 存在                 |
| 3   | `@workspace/adapter-ai` 可构建      | `packages/adapter-ai/dist/` 存在             |
| 4   | `@workspace/adapter-preview` 可构建 | `packages/adapter-preview/dist/` 存在        |
| 5   | `@workspace/adapter-storage` 可构建 | `packages/adapter-storage/dist/` 存在        |
| 6   | `@workspace/api` NestJS 可编译      | `apps/api/dist/` 存在                        |
| 7   | `@workspace/web` Next.js 可编译     | `apps/web/.next/` 存在                       |
| 8   | Worker 4 个可编译                   | `apps/worker-*/dist/` 存在                   |
| 9   | TypeORM DataSource 配置正确         | `synchronize: false`                         |
| 10  | BullMQ 3 队列注册                   | `app.module.ts` 检查                         |
| 11  | Docker Compose 语法正确             | `docker compose config` 通过                 |
| 12  | Dockerfile 3 个完整                 | `Dockerfile.api/web/worker`                  |
| 13  | ESLint + Prettier 配置              | `.eslintrc.json`, `.prettierrc`              |
| 14  | Husky pre-commit                    | `.husky/pre-commit`                          |
| 15  | .env.example 完整                   | 包含所有必需环境变量                         |
| 16  | README.md 完整                      | 快速开始指南可用                             |
| 17  | storage 目录结构                    | `storage/uploads/`, `previews/`, `exports/`  |
| 18  | 无业务模块代码                      | `apps/api/src/modules/` 仅存在公共模块       |

---

> **Sprint 0 完成。验收通过后进入 Sprint 1: Task-002~003 (数据库 Schema 迁移 + 登录鉴权)。**
