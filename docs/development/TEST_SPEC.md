# 测试规范 (Test Spec)

> **版本**：1.0.0 | **生效日期**：2026-06-28
> **依赖**：本文件服从 `DEVELOPMENT_CONSTITUTION.md`

---

## 一、测试策略总览

```
                    ┌──────────────┐
                    │  E2E Tests   │  ← Playwright (页面级)
                    │  (最少)      │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  API Tests   │  ← supertest (接口级)
                    │  (重要)      │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │  Service  │ │  Worker   │ │  Prompt  │
        │  Tests    │ │  Tests   │ │  Tests   │
        │  (核心)   │ │  (核心)  │ │  (必要)  │
        └──────────┘ └──────────┘ └──────────┘
```

**测试金字塔**（由多到少）：
1. 单元测试（Service / Repository / StateMachine / Util）
2. Worker 集成测试（Processor + Mock Adapter）
3. API 接口测试（supertest + 真实 DB）
4. E2E 测试（Playwright）

---

## 二、单元测试规范

### 2.1 必须测试的层

| 测试对象       | 测试框架 | 要求     |
| -------------- | -------- | -------- |
| Service 层     | Jest     | 必须测试 |
| Repository 层  | Jest     | 必须测试 |
| StateMachine   | Jest     | 必须测试 |
| ActionEngine   | Jest     | 必须测试 |
| DTO 验证       | Jest     | 必须测试 |
| Util 工具函数  | Jest     | 推荐测试 |

### 2.2 Service 测试模式

```typescript
// ai.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from './ai.service';

describe('AiService', () => {
  let service: AiService;
  let mockAiSessionRepo: any;
  let mockActionEngine: any;
  let mockAiQueue: any;

  beforeEach(async () => {
    // 创建 mock
    mockAiSessionRepo = { findByWorkspaceId: jest.fn(), create: jest.fn() };
    mockActionEngine = { execute: jest.fn() };
    mockAiQueue = { add: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: 'AiSessionRepository', useValue: mockAiSessionRepo },
        { provide: 'ActionEngineService', useValue: mockActionEngine },
        { provide: 'BullQueue_ai-recognition', useValue: mockAiQueue },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
  });

  it('should create a new workspace session', async () => {
    // Arrange
    const dto = { text: '帮我备课', workspace_id: undefined };
    mockAiSessionRepo.create.mockResolvedValue({ id: 'session-1', workspaceId: 'ws-1' });
    mockAiQueue.add.mockResolvedValue({ id: 'job-1' });

    // Act
    const result = await service.processChat(dto, 'user-1');

    // Assert
    expect(result.workspace_id).toBe('ws-1');
    expect(mockAiQueue.add).toHaveBeenCalledWith('recognize', expect.any(Object));
  });
});
```

### 2.3 StateMachine 测试模式

```typescript
// conversation-state-machine.spec.ts
describe('ConversationStateMachine', () => {
  let sm: ConversationStateMachine;

  beforeEach(() => {
    sm = new ConversationStateMachine();
  });

  it('should allow valid state transition: idle → waiting', () => {
    expect(() => sm.transition('idle', 'waiting')).not.toThrow();
  });

  it('should reject invalid state transition: done → waiting', () => {
    expect(() => sm.transition('done', 'waiting')).toThrow('Invalid transition');
  });

  it('should list all valid transitions for a state', () => {
    const transitions = sm.getAllowedTransitions('idle');
    expect(transitions).toContain('waiting');
  });
});
```

---

## 三、API 接口测试规范

### 3.1 使用 supertest

```typescript
// ai.controller.spec.ts
import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';

describe('AiController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AiModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  it('POST /api/ai/chat - should return workspace_id', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/ai/chat')
      .set('Authorization', 'Bearer test-token')
      .send({ text: '帮我备课' })
      .expect(201);

    expect(res.body.code).toBe(0);
    expect(res.body.data.workspace_id).toBeDefined();
  });

  afterAll(async () => {
    await app.close();
  });
});
```

### 3.2 接口测试要求

- 每个 POST 接口至少 2 个测试：正常 + 参数错误
- 每个 GET 接口至少 2 个测试：正常 + 分页/空列表
- 需要认证的接口必须有 401 测试
- 不依赖外部服务（AI/文件转换需要 mock）

---

## 四、Worker 测试规范

### 4.1 Processor 测试

```typescript
// ai-recognition.processor.spec.ts
describe('AiRecognitionProcessor', () => {
  let processor: AiRecognitionProcessor;
  let mockAiAdapter: any;
  let mockContentRepo: any;

  beforeEach(() => {
    mockAiAdapter = { chat: jest.fn() };
    mockContentRepo = { create: jest.fn() };
    processor = new AiRecognitionProcessor(mockAiAdapter, mockContentRepo);
  });

  it('should recognize lesson type and create content', async () => {
    const job = {
      data: {
        workspaceId: 'ws-1',
        userId: 'user-1',
        text: '今天的语文课教案',
        fileIds: [],
      },
    };

    mockAiAdapter.chat.mockResolvedValue({
      scene: 'personal_lesson',
      content: { title: '语文课', type: 'lesson_plan' },
    });

    await processor.process(job as any);

    expect(mockContentRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'lesson_plan' })
    );
  });
});
```

### 4.2 Worker 测试要求

- 每个 Processor 的 `process()` 方法必须单独测试
- Mock Adapter 接口（不调用真实 AI）
- 测试正常流程 + 错误处理 + 重试
- 测试队列 job.data 的 schema 验证

---

## 五、Prompt 测试规范

### 5.1 Prompt 回归测试

```typescript
// prompt-registry.spec.ts
describe('PromptRegistry', () => {
  it('should return valid prompt for normal_chat scene', () => {
    const prompt = PromptRegistry.get('normal_chat');
    expect(prompt).toBeDefined();
    expect(prompt.template).toContain('{user_input}');
    expect(prompt.version).toBeDefined();
  });

  it('all prompts should have required variables present', () => {
    for (const [name, prompt] of Object.entries(PromptRegistry.getAll())) {
      const variables = extractVariables(prompt.template);
      for (const v of variables) {
        expect(prompt.requiredVariables).toContain(v);
      }
    }
  });

  it('detect_scene prompt should output valid JSON', async () => {
    const prompt = PromptRegistry.get('detect_scene');
    const filled = fillTemplate(prompt.template, { user_input: '帮我备课' });
    // 验证 prompt 格式正确
    expect(filled).not.toContain('{user_input}');  // 所有变量已填充
  });
});
```

---

## 六、测试覆盖率要求

| 层级            | 最低覆盖率 | 说明                     |
| --------------- | ---------- | ------------------------ |
| Service 层      | 80%        | 核心业务逻辑             |
| Repository 层   | 70%        | 数据库操作封装           |
| StateMachine    | 100%       | 状态转换必须全覆盖       |
| ActionEngine    | 80%        | Action 注册和分发        |
| Worker Processor | 70%       | 异步处理逻辑             |
| Prompt Registry | 100%       | Prompt 模板完整性        |
| 整体            | 70%        | 项目整体覆盖率           |

---

## 七、禁止事项

- ❌ 不写测试直接提交（违反宪法 D14）
- ❌ 提交跳过测试的 CI 配置
- ❌ 用 `test.skip` 绕过失败的测试
- ❌ 测试中包含真实 API Key / Token
- ❌ 测试依赖外部网络（AI API 等必须 mock）

---

## 八、修订记录

| 版本  | 日期       | 修改内容       |
| ----- | ---------- | -------------- |
| 1.0.0 | 2026-06-28 | 初始版本       |
