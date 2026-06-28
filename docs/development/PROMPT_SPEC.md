# Prompt 规范 (Prompt Spec)

> **版本**：1.0.0 | **生效日期**：2026-06-28
> **依赖**：本文件服从 `DEVELOPMENT_CONSTITUTION.md`

---

## 一、Prompt 管理原则

### 1.1 集中管理

所有 AI Prompt 统一定义在：

```
apps/worker-ai/src/prompts/prompt-registry.ts
```

**铁律**：
- ❌ 禁止在业务代码、Service、Controller 中硬编码 Prompt
- ❌ 禁止在多个文件中定义相同的 Prompt
- ✅ 所有 Prompt 必须通过 `PromptRegistry` 获取

### 1.2 Prompt 结构

每个 Prompt 定义必须包含：

```typescript
interface PromptDefinition {
  name: string;                // 唯一标识符
  version: string;             // 语义化版本号
  description: string;         // 用途说明
  template: string;            // Prompt 模板（使用 {variable_name} 占位）
  requiredVariables: string[]; // 必须填充的变量列表
  outputFormat?: string;       // 期望的输出格式说明
  temperature?: number;        // 推荐 temperature
  maxTokens?: number;          // 推荐 max_tokens
}
```

### 1.3 Prompt 示例

```typescript
const NORMAL_CHAT_PROMPT: PromptDefinition = {
  name: 'normal_chat',
  version: '1.0.0',
  description: '通用对话场景，用户自由提问',
  template: `你是一个教学助手。请根据以下对话历史回答用户问题。

对话历史：
{conversation_history}

用户输入：
{user_input}

请用中文回复。`,
  requiredVariables: ['conversation_history', 'user_input'],
  outputFormat: '纯文本回复',
  temperature: 0.7,
  maxTokens: 2048,
};
```

---

## 二、Prompt 场景映射

### 2.1 场景检测 → Prompt 映射

```
detectScene(user_input, file_ids)
    │
    ├── scene = "normal_chat"      → NORMAL_CHAT_PROMPT
    ├── scene = "lesson_plan"      → LESSON_PLAN_PROMPT
    ├── scene = "group_lesson"     → GROUP_LESSON_PROMPT
    ├── scene = "reflection"       → REFLECTION_PROMPT
    ├── scene = "plan_summary"     → PLAN_SUMMARY_PROMPT
    ├── scene = "file_upload"      → FILE_UPLOAD_PROMPT
    └── scene = "classification"   → CLASSIFICATION_PROMPT
```

### 2.2 场景定义

| 场景               | 触发条件                           | 使用 Prompt          |
| ------------------ | ---------------------------------- | -------------------- |
| normal_chat        | 无法识别为特定场景的通用对话       | NORMAL_CHAT_PROMPT   |
| lesson_plan        | 用户上传/讨论个人备课内容          | LESSON_PLAN_PROMPT   |
| group_lesson       | 用户上传/讨论集体备课内容          | GROUP_LESSON_PROMPT  |
| reflection         | 用户上传/讨论教学反思              | REFLECTION_PROMPT    |
| plan_summary       | 用户上传/讨论计划总结              | PLAN_SUMMARY_PROMPT  |
| file_upload        | 用户上传文件，触发 AI 识别         | FILE_UPLOAD_PROMPT   |
| classification     | AI 识别后的内容分类推荐            | CLASSIFICATION_PROMPT |

---

## 三、Prompt 修改流程

```
1. 打开 prompt-registry.ts
         │
2. 找到对应 Prompt 定义
         │
3. 修改 version（如 1.0.0 → 1.1.0）
         │
4. 修改 template 内容
         │
5. 更新 requiredVariables（如有变化）
         │
6. 运行 Prompt 单元测试
   pnpm --filter @workspace/worker-ai test
         │
7. 测试通过后提交
         │
8. Commit message 格式：
   feat(worker-ai): update {prompt_name} prompt v{new_version}
```

### 3.1 禁止的操作

- ❌ 不更新 version 直接修改 template
- ❌ 修改 prompt 但不运行测试
- ❌ 在 Controller/Service 中临时拼接 prompt 字符串
- ❌ 将 prompt 内容写在环境变量中

---

## 四、Prompt 测试要求

### 4.1 必须测试项

1. **变量完整性**：填充后不包含未替换的 `{variable_name}`
2. **格式正确性**：模板语法正确，无残留占位符
3. **长度检查**：填充后 token 数不超过模型限制
4. **中英文检查**：不影响模型输出质量

### 4.2 回归测试

每次 Prompt 修改后，必须对比新旧 Prompt 在同一输入下的输出差异：

```typescript
// prompt-regression.spec.ts
it('should produce similar output after prompt update', async () => {
  const oldPrompt = PromptRegistry.get('normal_chat', '1.0.0');
  const newPrompt = PromptRegistry.get('normal_chat', '1.1.0');

  const input = { user_input: '帮我备课', conversation_history: '' };

  const oldResult = await mockAiAdapter.chat([{ role: 'user', content: fillTemplate(oldPrompt.template, input) }]);
  const newResult = await mockAiAdapter.chat([{ role: 'user', content: fillTemplate(newPrompt.template, input) }]);

  // 新 prompt 的输出质量不应明显下降
  expect(newResult.length).toBeGreaterThan(10);
  // 语义相似度检查（可选）
});
```

---

## 五、Prompt 版本管理

### 5.1 版本号规范

使用语义化版本号：`MAJOR.MINOR.PATCH`

- **MAJOR**：Prompt 策略/结构完全改变（如从单轮改为多轮）
- **MINOR**：新增变量、调整角色设定
- **PATCH**：措辞优化、格式调整

### 5.2 多版本共存

当需要 A/B 测试时，可以在 registry 中保留多个版本：

```typescript
const PromptRegistry = {
  'normal_chat': {
    '1.0.0': { ... },
    '1.1.0': { ... },  // 实验版本
  },
  get(name: string, version?: string): PromptDefinition {
    const versions = this[name];
    if (version) return versions[version];
    // 返回最新版本
    return versions[Object.keys(versions).sort().pop()!];
  }
};
```

---

## 六、系统级 Prompt（System Prompt）

### 6.1 角色设定

```typescript
const SYSTEM_PROMPT: PromptDefinition = {
  name: 'system',
  version: '1.0.0',
  description: 'AI 教师助手的系统角色设定',
  template: `你是一个专业的教师工作助手，帮助教师完成以下工作：
1. 识别和分类教学资料（课件、教案、反思、计划总结）
2. 回答教学相关问题
3. 协助整理和归档教学材料

你需要：
- 所有回复使用中文
- 保持专业、友好的语气
- 不确定的分类不要强行猜测，可以询问教师确认
- 识别出教学资料后，给出分类建议并等待教师确认`,
  requiredVariables: [],
  temperature: 0.7,
  maxTokens: 4096,
};
```

### 6.2 使用规则

- 系统 Prompt 仅在最顶层定义一次
- 每个场景 Prompt 是增量叠加，不重复系统 Prompt 内容
- 最终发送给 AI 的消息顺序：`[System Prompt] + [Scene Prompt] + [User Input]`

---

## 七、禁止事项

- ❌ 在 Service/Controller 中直接拼接 prompt 字符串
- ❌ 将 prompt 作为 API 参数传入（安全风险）
- ❌ 将 prompt 版本号写死在前端
- ❌ 修改 prompt 后不运行回归测试
- ❌ 在 prompt 中硬编码具体教师姓名/学校名称

---

## 八、修订记录

| 版本  | 日期       | 修改内容       |
| ----- | ---------- | -------------- |
| 1.0.0 | 2026-06-28 | 初始版本       |
