import { Worker } from 'bullmq';
import { Redis } from 'ioredis';
import * as crypto from 'crypto';
import { createAIAdapter } from '@workspace/adapter-ai';
import type { DeepSeekAdapter, DeepSeekCallResult } from '@workspace/adapter-ai';
import {
  detectScene,
  SCENE_DETECTION_PROMPT,
  INTENT_PROMPT,
  TASK_PROMPT,
  classifyByKeyword,
  getPrompt,
  UNIFIED_UPLOAD_PROMPT,
} from './prompts/prompt-registry';
import { resolveSaveType } from './tasks/task-registry';

// ======= 配置 =======
const CFG = {
  maxConcurrent: parseInt(process.env.AI_MAX_CONCURRENT_REQUESTS || '5'),
  queueMaxSize: parseInt(process.env.AI_QUEUE_MAX_SIZE || '100'),
  userLimitPerMin: parseInt(process.env.AI_USER_RATE_LIMIT_PER_MINUTE || '5'),
  userLimitPerDay: parseInt(process.env.AI_USER_RATE_LIMIT_PER_DAY || '100'),
  globalLimitPerMin: parseInt(process.env.AI_GLOBAL_RATE_LIMIT_PER_MINUTE || '60'),
  globalLimitPerDay: parseInt(process.env.AI_GLOBAL_RATE_LIMIT_PER_DAY || '5000'),
  httpTimeout: parseInt(process.env.AI_HTTP_TIMEOUT_MS || '60000'),
  dedupWindowSec: 30,
  maxRetries: 2,
};

interface WorkerConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
  providerId?: number;
  providerName?: string;
  providerType?: string;
}

// ======= 并发控制 =======
class ConcurrencyGuard {
  private running = 0;
  constructor(private max: number) {}
  async acquire(): Promise<boolean> {
    if (this.running >= this.max) return false;
    this.running++;
    return true;
  }
  release() {
    if (this.running > 0) this.running--;
  }
  active() {
    return this.running;
  }
}

// ======= 限流器 (Redis) =======
class RateLimiter {
  constructor(private redis: Redis) {}

  async check(
    key: string,
    maxPerWindow: number,
    windowSec: number
  ): Promise<{ allowed: boolean; current: number }> {
    const now = Math.floor(Date.now() / 1000);
    const windowKey = `${key}:${Math.floor(now / windowSec)}`;
    const count = await this.redis.incr(windowKey);
    if (count === 1) await this.redis.expire(windowKey, windowSec + 1);
    return { allowed: count <= maxPerWindow, current: count };
  }

  async checkDay(key: string, maxPerDay: number): Promise<{ allowed: boolean; current: number }> {
    const today = new Date().toISOString().slice(0, 10);
    const dayKey = `${key}:day:${today}`;
    const count = await this.redis.incr(dayKey);
    if (count === 1) await this.redis.expire(dayKey, 86400);
    return { allowed: count <= maxPerDay, current: count };
  }

  async checkDedup(key: string, windowSec: number): Promise<boolean> {
    const exists = await this.redis.get(key);
    if (exists) return true;
    await this.redis.set(key, '1', 'EX', windowSec);
    return false;
  }
}

// ======= API 通信 =======
async function fetchConfigFromApi(): Promise<WorkerConfig | null> {
  const host = process.env.API_INTERNAL_URL || 'http://localhost:3000';
  for (let i = 0; i < 5; i++) {
    try {
      const res = await fetch(`${host}/api/admin/ai-configs/active/internal`, {
        signal: AbortSignal.timeout(5000),
      });
      const json: any = await res.json();
      if (json.code === 0 && json.data?.api_key) {
        return {
          apiKey: json.data.api_key,
          model: json.data.default_model || 'deepseek-chat',
          baseUrl: json.data.base_url || 'https://api.deepseek.com/v1',
          providerId: json.data.id,
          providerName: json.data.name,
          providerType: json.data.provider_type,
        };
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 5000));
  }
  return null;
}

async function logCallToApi(
  cfg: WorkerConfig,
  data: {
    model: string;
    status: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    latencyMs?: number;
    errorMessage?: string;
    userId?: number;
  }
) {
  const host = process.env.API_INTERNAL_URL || 'http://localhost:3000';
  try {
    await fetch(`${host}/api/admin/ai-configs/log-call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        aiConfigId: cfg.providerId || 1,
        providerName: cfg.providerName || 'env',
        providerType: cfg.providerType || 'custom',
        model: data.model,
        status: data.status,
        promptTokens: data.promptTokens,
        completionTokens: data.completionTokens,
        totalTokens: data.totalTokens,
        latencyMs: data.latencyMs,
        errorMessage: data.errorMessage,
        callType: 'recognize',
        userId: data.userId,
      }),
      signal: AbortSignal.timeout(3000),
    }).catch(() => {});
  } catch {}
}

// ======= 核心 HTTP 调用 =======
async function callDeepSeekOnce(
  adapter: DeepSeekAdapter,
  text: string,
  fileName?: string,
  fileContent?: string,
  systemPromptOverride?: string
): Promise<DeepSeekCallResult & { usage?: any; latencyMs?: number }> {
  const params = adapter.buildRequest({ text, fileName, fileContent }, systemPromptOverride);
  const start = Date.now();

  if (!params.apiKey || params.apiKey === 'sk-your-deepseek-api-key') {
    return {
      ...adapter.mockClassify({ text, fileName, fileContent }),
      fallback: true,
      latencyMs: 0,
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CFG.httpTimeout);

  try {
    const res = await fetch(`${params.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${params.apiKey}` },
      body: JSON.stringify({
        model: params.model,
        temperature: 0.1,
        max_tokens: 1000,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: params.systemPrompt },
          { role: 'user', content: params.userPrompt },
        ],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const latencyMs = Date.now() - start;

    if (!res.ok) {
      throw {
        status: res.status,
        message: await res.text().catch(() => ''),
        retryable: res.status === 429 || res.status >= 502,
      };
    }

    const json: any = await res.json();
    const content = json.choices?.[0]?.message?.content || '';
    const usage = json.usage
      ? {
          prompt_tokens: json.usage.prompt_tokens || 0,
          completion_tokens: json.usage.completion_tokens || 0,
          total_tokens: json.usage.total_tokens || 0,
        }
      : { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

    return { ...adapter.parseResponse(content, { text, fileName, fileContent }), usage, latencyMs };
  } catch (e: any) {
    clearTimeout(timeout);
    const latencyMs = Date.now() - start;
    const retryable =
      e.retryable ||
      e.name === 'AbortError' ||
      e.name === 'TimeoutError' ||
      e.code === 'ECONNRESET';
    throw {
      retryable,
      message: e.message?.slice(0, 200) || 'AI调用失败',
      status: e.status,
      latencyMs,
    };
  }
}

/** 带重试的调用 */
async function callWithRetry(
  adapter: DeepSeekAdapter,
  text: string,
  fileName?: string,
  fileContent?: string,
  systemPrompt?: string
): Promise<DeepSeekCallResult & { usage?: any; latencyMs?: number }> {
  let lastError: any;
  for (let i = 0; i <= CFG.maxRetries; i++) {
    try {
      return await callDeepSeekOnce(adapter, text, fileName, fileContent, systemPrompt);
    } catch (e: any) {
      lastError = e;
      if (!e.retryable || i >= CFG.maxRetries) break;
      await new Promise((r) => setTimeout(r, (i + 1) * 2000));
    }
  }
  return {
    ...adapter.mockClassify({ text, fileName, fileContent }),
    fallback: true,
    latencyMs: lastError?.latencyMs,
    error: lastError?.message,
  };
}

// ======= 主流程 =======
async function bootstrap() {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const redis = new Redis(redisUrl);
  const limiter = new RateLimiter(redis);
  const guard = new ConcurrencyGuard(CFG.maxConcurrent);

  let config: WorkerConfig;
  const apiConfig = await fetchConfigFromApi();
  if (apiConfig) {
    config = apiConfig;
    console.log(`[Worker-AI] API: ${config.providerName} (${config.model})`);
  } else {
    config = {
      apiKey: process.env.AI_API_KEY || '',
      model: process.env.AI_MODEL || 'deepseek-chat',
      baseUrl: process.env.AI_BASE_URL || 'https://api.deepseek.com/v1',
      providerType: 'custom',
    };
    console.log('[Worker-AI] ENV fallback');
  }
  console.log(
    `[Worker-AI] 并发=${CFG.maxConcurrent} 用户限流=${CFG.userLimitPerMin}/min ${CFG.userLimitPerDay}/day 全局限流=${CFG.globalLimitPerMin}/min`
  );

  const aiAdapter = createAIAdapter({
    type: 'deepseek',
    apiKey: config.apiKey,
    model: config.model,
    baseUrl: config.baseUrl,
  }) as DeepSeekAdapter;

  const worker = new Worker(
    'ai-recognition',
    async (job) => {
      const { text, fileContent, fileName, messageId, sessionId, teacherId } = job.data;
      const userId = teacherId || 0;

      // V2.1: 读取 Workspace 上下文（多轮对话 + 文件引用）
      const wsKey = `ai:workspace:${sessionId}`;
      const wsRaw = await redis.get(wsKey);
      const workspace = wsRaw ? JSON.parse(wsRaw) : {};
      const pendingTask = workspace.pendingTask || null;
      const workspaceFile = workspace.currentFile || null;

      // 如果有上传文件，更新 workspace
      if (job.data.fileId && fileName) {
        workspace.currentFile = { fileId: Number(job.data.fileId), fileName };
        workspace.fileIds = (job.data.fileIds || []).map(Number);
        workspace.pendingTask = null; // 新文件重置pending task
        await redis.set(wsKey, JSON.stringify(workspace), 'EX', 86400);
      }

      // 如果前一次是 UPLOAD intent 且当前消息简短，视为对上传后提问的回答
      if (workspace.lastIntent === 'UPLOAD' && workspace.currentFile && text && text.length < 30) {
        // 简短回答 → 视为对"需要做什么"的回答，映射为 CREATE
        const taskMap: Record<string, string> = {
          备课: 'Create Lesson',
          个人备课: 'Create Lesson',
          教案: 'Create Lesson',
          反思: 'Create Reflection',
          教学反思: 'Create Reflection',
          总结: 'Create Summary',
          计划: 'Create Plan',
          优化: 'Optimize',
          修改: 'Optimize',
        };
        let mappedTask = 'Create Lesson'; // 默认
        for (const [kw, tk] of Object.entries(taskMap)) {
          if (text.includes(kw)) {
            mappedTask = tk;
            break;
          }
        }
        workspace.pendingTask = mappedTask;
        workspace.lastIntent = 'CREATE';
        await redis.set(wsKey, JSON.stringify(workspace), 'EX', 86400);
        // 强制进入 CREATE 流程
        job.data.mode = 'auto';
        console.log(
          '[WORKSPACE] multi-turn: UPLOAD→CREATE, task:',
          mappedTask,
          'file:',
          workspaceFile?.fileName
        );
      }

      const inputText = [text, fileName, fileContent?.slice(0, 500)].filter(Boolean).join(' ');
      const contentHash = crypto
        .createHash('md5')
        .update((text || '') + (fileName || ''))
        .digest('hex');
      const dedupKey = `ai:dedup:${userId}:${contentHash}`;
      const isDuplicate = await limiter.checkDedup(dedupKey, CFG.dedupWindowSec);
      if (isDuplicate) {
        const result = {
          type: 'duplicate',
          isBusinessScene: false,
          title_candidate: '',
          summary: '',
          confidence: 0,
          need_user_confirm: false,
          need_lesson_link: false,
          next_action: 'skip',
          extracted_entities: {},
          reason: '重复提交',
          nl_reply: '相同内容正在处理中，请勿重复提交',
        };
        await redis.set(`ai_result:${messageId}`, JSON.stringify(result), 'EX', 600);
        return result;
      }

      // 2. 用户级限流
      const userMin = await limiter.check(`ai:user:${userId}:min`, CFG.userLimitPerMin, 60);
      if (!userMin.allowed) {
        logCallToApi(config, {
          model: config.model,
          status: 'rate_limited',
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          errorMessage: `用户分钟限流(${userMin.current}/${CFG.userLimitPerMin})`,
          userId,
        });
        const result = {
          type: 'rate_limited',
          isBusinessScene: false,
          title_candidate: '',
          summary: '',
          confidence: 0,
          need_user_confirm: false,
          need_lesson_link: false,
          next_action: 'skip',
          extracted_entities: {},
          reason: 'rate_limited',
          nl_reply: 'AI 请求过于频繁，请稍后再试',
        };
        await redis.set(`ai_result:${messageId}`, JSON.stringify(result), 'EX', 600);
        return result;
      }
      const userDay = await limiter.checkDay(`ai:user:${userId}`, CFG.userLimitPerDay);
      if (!userDay.allowed) {
        logCallToApi(config, {
          model: config.model,
          status: 'rate_limited',
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          errorMessage: `用户日限流(${userDay.current}/${CFG.userLimitPerDay})`,
          userId,
        });
        const result = {
          type: 'rate_limited',
          isBusinessScene: false,
          title_candidate: '',
          summary: '',
          confidence: 0,
          need_user_confirm: false,
          need_lesson_link: false,
          next_action: 'skip',
          extracted_entities: {},
          reason: 'rate_limited',
          nl_reply: '今日 AI 使用次数已达上限，请明天再试',
        };
        await redis.set(`ai_result:${messageId}`, JSON.stringify(result), 'EX', 600);
        return result;
      }

      // 3. 全局限流
      const globalMin = await limiter.check('ai:global:min', CFG.globalLimitPerMin, 60);
      if (!globalMin.allowed) {
        logCallToApi(config, {
          model: config.model,
          status: 'rate_limited',
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          errorMessage: `全局限流(${globalMin.current}/${CFG.globalLimitPerMin})`,
          userId,
        });
        const result = {
          type: 'rate_limited',
          isBusinessScene: false,
          title_candidate: '',
          summary: '',
          confidence: 0,
          need_user_confirm: false,
          need_lesson_link: false,
          next_action: 'skip',
          extracted_entities: {},
          reason: 'rate_limited',
          nl_reply: '当前 AI 服务使用人数较多，请稍后再试',
        };
        await redis.set(`ai_result:${messageId}`, JSON.stringify(result), 'EX', 600);
        return result;
      }
      const globalDay = await limiter.checkDay('ai:global', CFG.globalLimitPerDay);
      if (!globalDay.allowed) {
        logCallToApi(config, {
          model: config.model,
          status: 'rate_limited',
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          errorMessage: `全局限流(${globalDay.current}/${CFG.globalLimitPerDay})`,
          userId,
        });
        const result = {
          type: 'rate_limited',
          isBusinessScene: false,
          title_candidate: '',
          summary: '',
          confidence: 0,
          need_user_confirm: false,
          need_lesson_link: false,
          next_action: 'skip',
          extracted_entities: {},
          reason: 'rate_limited',
          nl_reply: '当前 AI 服务使用人数较多，请稍后再试',
        };
        await redis.set(`ai_result:${messageId}`, JSON.stringify(result), 'EX', 600);
        return result;
      }

      // 4. 场景识别
      // 4a. Intent Detection（V2.1新增）
      // 有文件上传 → 直接判定 UPLOAD，不走 AI 意图检测
      let intent = 'CHAT';
      if (job.data.fileId && fileName) {
        intent = 'UPLOAD';
        workspace.lastIntent = 'UPLOAD';
        await redis.set(wsKey, JSON.stringify(workspace), 'EX', 86400);
      } else if (job.data.mode && job.data.mode !== 'auto') {
        intent = job.data.mode === 'normal_chat' ? 'CHAT' : 'CREATE';
      } else if (config.apiKey && config.apiKey !== 'sk-your-deepseek-api-key') {
        try {
          const c = new AbortController();
          const t = setTimeout(() => c.abort(), 8000);
          const r = await fetch(config.baseUrl + '/chat/completions'.replace('//v1', '/v1'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer ' + config.apiKey,
            },
            body: JSON.stringify({
              model: config.model,
              messages: [
                { role: 'system', content: INTENT_PROMPT },
                { role: 'user', content: inputText },
              ],
              temperature: 0.1,
              max_tokens: 200,
              response_format: { type: 'json_object' },
            }),
            signal: c.signal,
          });
          clearTimeout(t);
          if (r.ok) {
            const j: any = await r.json();
            intent = JSON.parse(j.choices?.[0]?.message?.content || '{}').intent || 'CHAT';
          }
        } catch {}
      }
      console.log('[INTENT-DETECT]', { messageId, intent });

      // CHAT/ASK → normal_chat（跳过所有业务Pipeline）
      if (intent === 'CHAT' || intent === 'ASK') {
        const ck2 = 'ai:chat_quota:' + userId + ':' + new Date().toISOString().slice(0, 10);
        const cu2 = parseInt((await redis.get(ck2)) || '0');
        const now = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
        let nl = '';
        const hasKey = config.apiKey && config.apiKey !== 'sk-your-deepseek-api-key';
        try {
          if (hasKey) {
            const c = new AbortController();
            const t = setTimeout(() => c.abort(), CFG.httpTimeout);
            const r = await fetch(config.baseUrl + '/chat/completions'.replace('//v1', '/v1'), {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + config.apiKey,
              },
              body: JSON.stringify({
                model: config.model,
                messages: [
                  {
                    role: 'system',
                    content:
                      '你是AI教学助手。当前日期：' + now + '。问什么答什么。不说"整理成保存"。',
                  },
                  { role: 'user', content: inputText },
                ],
                temperature: 0.7,
                max_tokens: 800,
              }),
              signal: c.signal,
            });
            clearTimeout(t);
            if (r.ok) {
              const j: any = await r.json();
              nl = j.choices?.[0]?.message?.content || '';
            }
          }
        } catch {}
        if (!nl || nl.length < 5) {
          nl = hasKey ? 'AI模型暂不可用，请稍后重试。' : 'AI模型未配置，请管理员配置。';
        }
        // 检测聊天中是否包含可沉淀的教学反思内容
        const isReflection =
          /课堂|上课|学生|教学|反思|效果|改进|不足/.test(inputText) && inputText.length > 30;
        const suggestSave = isReflection ? 'reflection' : null;
        if (suggestSave) {
          nl += '\n\n💡 我注意到您描述了一段课堂教学内容。是否需要保存为【教学反思】？';
        }
        const todayStr = new Date().toISOString().slice(0, 10);
        const rs = {
          intent,
          isBusinessScene: false,
          type: suggestSave ? 'suggest_reflection' : 'chat',
          suggestType: suggestSave,
          suggestLabel: '教学反思',
          title_candidate: '',
          summary: '',
          confidence: 0.9,
          need_user_confirm: !!suggestSave,
          need_lesson_link: false,
          next_action: suggestSave ? 'suggest_save' : 'none',
          extracted_entities: {},
          reason: 'Intent:' + intent,
          nl_reply: nl,
          chatQuota: { used: cu2, limit: 100, remaining: Math.max(0, 100 - cu2) },
          actions: suggestSave ? ['保存教学反思', '继续聊天'] : [],
          // 为 suggest_reflection 提供基本 metadata
          ...(suggestSave
            ? {
                metadata_title:
                  '教学反思 - ' +
                  (fileName
                    ? fileName.replace(/\.(docx?|pdf|pptx?|txt)$/i, '')
                    : new Date().toLocaleDateString('zh-CN')),
                content_date: todayStr,
                source: fileName ? '文件' : '聊天',
                subject: '',
                grade: '',
                modules:
                  inputText.length > 100
                    ? [{ label: '反思内容', content: inputText.slice(0, 500) }]
                    : [],
                recognition_reasons: ['包含教学描述', '包含反思内容'],
              }
            : {}),
        };
        await redis.set('ai_result:' + messageId, JSON.stringify(rs), 'EX', 600);
        await redis.set('ai_session:' + messageId, String(sessionId), 'EX', 600);
        return rs;
      }

      // UPLOAD → 完整AI识别 → 生成Metadata → 预览卡片
      if (intent === 'UPLOAD') {
        const acquired = await guard.acquire();
        if (!acquired) {
          const rs = {
            intent,
            isBusinessScene: false,
            type: 'suggest_save',
            suggestType: 'personal_lesson',
            suggestLabel: '个人备课',
            title_candidate: fileName || '',
            summary: '',
            confidence: 0.5,
            need_user_confirm: true,
            need_lesson_link: false,
            next_action: 'suggest_save',
            extracted_entities: {},
            reason: '并发已满',
            nl_reply: '当前AI排队人数较多，请稍后再试。',
            actions: ['继续聊天'],
          };
          await redis.set('ai_result:' + messageId, JSON.stringify(rs), 'EX', 600);
          await redis.set('ai_session:' + messageId, String(sessionId), 'EX', 600);
          return rs;
        }
        try {
          // 对上传文件内容进行完整AI识别（使用统一分类 Prompt，避免单一类型偏向）
          const aiResult = await callWithRetry(
            aiAdapter,
            text || '',
            fileName,
            fileContent,
            UNIFIED_UPLOAD_PROMPT
          );
          const callStatus = aiResult.error && !aiResult.fallback ? 'failed' : 'success';
          logCallToApi(config, {
            model: config.model,
            status: callStatus,
            promptTokens: aiResult.usage?.prompt_tokens || 0,
            completionTokens: aiResult.usage?.completion_tokens || 0,
            totalTokens: aiResult.usage?.total_tokens || 0,
            latencyMs: aiResult.latencyMs,
            errorMessage: aiResult.error,
            userId,
          });

          const predictedType =
            aiResult.predictedType && aiResult.predictedType !== 'unknown'
              ? aiResult.predictedType
              : 'personal_lesson';
          // 标题：AI识别标题 > 清理后的文件名 > 未命名
          const rawTitle =
            aiResult.title && aiResult.title !== '未命名'
              ? aiResult.title
              : fileName
                ? fileName.replace(/\.(docx?|pdf|pptx?|txt)$/i, '').replace(/[_-]/g, ' ')
                : '未识别到标题，请老师填写';
          const metadataTitle = cleanTitle(rawTitle, predictedType);
          const now = new Date().toISOString().slice(0, 10);
          const recognitionReasons = getRecognitionReasons(predictedType, aiResult);
          const modules = getTypeModules(predictedType, aiResult);
          const sourceLabel = fileName
            ? fileName.endsWith('.docx') || fileName.endsWith('.doc')
              ? 'Word'
              : fileName.endsWith('.pdf')
                ? 'PDF'
                : fileName.endsWith('.pptx') || fileName.endsWith('.ppt')
                  ? 'PPT'
                  : '文件'
            : '聊天';

          const typeLabel: Record<string, string> = {
            personal_lesson: '个人备课',
            reflection: '教学反思',
            group_lesson: '集体备课',
            plan_summary: '计划总结',
          };
          const suggestLabel = typeLabel[predictedType] || '个人备课';
          const confidencePct = Math.round((aiResult.confidence || 0.85) * 100);

          const result = {
            type: predictedType,
            suggestType: predictedType,
            suggestLabel,
            title_candidate: metadataTitle,
            subject: aiResult.subject || '',
            grade: aiResult.grade || '',
            summary: aiResult.summary || '',
            confidence: aiResult.confidence || 0.85,
            need_user_confirm: true,
            need_lesson_link: predictedType === 'reflection',
            next_action: 'preview',
            extracted_entities: aiResult.extractedFields ? { ...aiResult.extractedFields } : {},
            reason: aiResult.fallback ? `fallback: ${aiResult.error || 'mock'}` : 'AI文件分析',
            nl_reply: `已完成文件分析。识别结果：${suggestLabel}（${confidencePct}%）。是否保存到资料库？`,
            // V2.1 Metadata
            metadata_title: metadataTitle,
            content_date: aiResult.extractedFields?.doc_date || now,
            source: sourceLabel,
            modules,
            recognition_reasons: recognitionReasons,
            showPreviewCard: true,
            isBusinessScene: true,
            fileIds: (job.data.fileIds || []).map(Number),
            actions: undefined, // 直接进预览卡片，不显示按钮
          };
          // 写入 Workspace 上下文
          workspace.currentMetadata = {
            type: predictedType,
            title: metadataTitle,
            subject: aiResult.subject || '',
            grade: aiResult.grade || '',
            content_date: aiResult.extractedFields?.doc_date || now,
            source: sourceLabel,
            modules,
            recognition_reasons: recognitionReasons,
            confidence: aiResult.confidence || 0.85,
            fileId: job.data.fileId,
            fileIds: (job.data.fileIds || []).map(Number),
            fileName,
          };
          await redis.set(wsKey, JSON.stringify(workspace), 'EX', 86400);
          await redis.set('ai_result:' + messageId, JSON.stringify(result), 'EX', 600);
          await redis.set('ai_session:' + messageId, String(sessionId), 'EX', 600);
          console.log(
            `[Worker-AI] UPLOAD job=${job.id} user=${userId} type=${result.type} tokens=${aiResult.usage?.total_tokens} concurrent=${guard.active()}`
          );
          return result;
        } finally {
          guard.release();
        }
      }

      // CREATE/EDIT → Task → NeedMoreInfo → 信息足进业务Pipeline
      let task = null;
      let needMoreInfo = false;
      if (config.apiKey && config.apiKey !== 'sk-your-deepseek-api-key') {
        try {
          const c = new AbortController();
          const t = setTimeout(() => c.abort(), 8000);
          const r = await fetch(config.baseUrl + '/chat/completions'.replace('//v1', '/v1'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer ' + config.apiKey,
            },
            body: JSON.stringify({
              model: config.model,
              messages: [
                { role: 'system', content: TASK_PROMPT },
                { role: 'user', content: inputText },
              ],
              temperature: 0.1,
              max_tokens: 200,
              response_format: { type: 'json_object' },
            }),
            signal: c.signal,
          });
          clearTimeout(t);
          if (r.ok) {
            const j: any = await r.json();
            task = JSON.parse(j.choices?.[0]?.message?.content || '{}').task || null;
          }
        } catch {}
      }
      const hasG =
        /[一二三四五六七八九]年级|一年级|二年级|三年级|四年级|五年级|六年级|七年级|八年级|九年级/.test(
          inputText
        );
      const hasS = /语文|数学|英语|物理|化学|生物|历史|地理|政治/.test(inputText);
      needMoreInfo = !hasG || !hasS;
      console.log('[TASK-DETECT]', { messageId, intent, task, needMoreInfo });

      if (needMoreInfo && task) {
        const info = {
          intent,
          isBusinessScene: false,
          type: 'need_info',
          title_candidate: '',
          summary: '',
          confidence: 0.6,
          need_user_confirm: false,
          need_lesson_link: false,
          next_action: 'none',
          extracted_entities: { task },
          reason: '信息不足',
          nl_reply:
            task === 'Create Lesson'
              ? '好的，帮你创建备课。请告诉我：①年级？②学科？③具体要求？'
              : task === 'Create Reflection'
                ? '好的。请告诉我：①年级？②学科？③课堂效果如何？'
                : '请补充：年级、学科、具体要求？',
        };
        await redis.set('ai_result:' + messageId, JSON.stringify(info), 'EX', 600);
        await redis.set('ai_session:' + messageId, String(sessionId), 'EX', 600);
        return info;
      }
      const scene = detectScene(inputText, job.data.mode);

      // auto 模式 + 关键词无法判断 → 调 AI 做场景识别
      if (
        scene.scene === 'unknown' &&
        config.apiKey &&
        config.apiKey !== 'sk-your-deepseek-api-key'
      ) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 10000);
          const res = await fetch(`${config.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${config.apiKey}`,
            },
            body: JSON.stringify({
              model: config.model,
              messages: [
                { role: 'system', content: SCENE_DETECTION_PROMPT },
                { role: 'user', content: inputText },
              ],
              temperature: 0.1,
              max_tokens: 200,
              response_format: { type: 'json_object' },
            }),
            signal: controller.signal,
          });
          clearTimeout(timeout);
          if (res.ok) {
            const json: any = await res.json();
            const aiScene = JSON.parse(json.choices?.[0]?.message?.content || '{}');
            if (aiScene.scene && aiScene.confidence >= 0.6) {
              scene.scene = aiScene.scene;
              scene.confidence = aiScene.confidence;
              scene.reason = aiScene.reason || 'AI判断';
              scene.ruleBased = false;
            } else {
              scene.scene = 'normal_chat';
              scene.confidence = 0.5;
              scene.reason = aiScene.reason || 'AI低置信度，默认普通聊天';
            }
          } else {
            scene.scene = 'normal_chat';
            scene.confidence = 0.3;
            scene.reason = 'AI判断失败';
          }
        } catch {
          scene.scene = 'normal_chat';
          scene.confidence = 0.3;
          scene.reason = 'AI判断异常';
        }
      } else if (scene.scene === 'unknown') {
        scene.scene = 'normal_chat';
        scene.confidence = 0.3;
        scene.reason = '无API Key，默认普通聊天';
      }

      // CHAT/ASK intent → 强制 normal_chat，跳过业务场景
      if (intent === 'CHAT' || intent === 'ASK') {
        scene.scene = 'normal_chat';
        scene.confidence = 0.9;
        scene.reason = `Intent: ${intent}`;
      }

      const isBusinessScene = scene.scene !== 'normal_chat' && scene.scene !== 'unknown';

      // 4b. 业务场景：执行原有 AI 识别
      const acquired = await guard.acquire();
      if (!acquired) {
        logCallToApi(config, {
          model: config.model,
          status: 'queue_full',
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          errorMessage: '并发已满',
          userId,
        });
        const result = {
          type: 'queue_full',
          title_candidate: '',
          summary: '',
          confidence: 0,
          need_user_confirm: false,
          need_lesson_link: false,
          next_action: 'skip',
          extracted_entities: {},
          reason: 'queue_full',
          nl_reply: '当前 AI 请求排队人数较多，请稍后再试',
        };
        await redis.set(`ai_result:${messageId}`, JSON.stringify(result), 'EX', 600);
        return result;
      }

      try {
        // 使用场景对应的增强 Prompt
        const bizPrompt = getPrompt(
          scene.scene !== 'normal_chat' && scene.scene !== 'unknown'
            ? scene.scene
            : 'personal_lesson'
        );
        const aiResult = await callWithRetry(
          aiAdapter,
          text || '',
          fileName,
          fileContent,
          bizPrompt?.systemPrompt
        );
        const status = aiResult.error && !aiResult.fallback ? 'failed' : 'success';
        logCallToApi(config, {
          model: config.model,
          status,
          promptTokens: aiResult.usage?.prompt_tokens || 0,
          completionTokens: aiResult.usage?.completion_tokens || 0,
          totalTokens: aiResult.usage?.total_tokens || 0,
          latencyMs: aiResult.latencyMs,
          errorMessage: aiResult.error,
          userId,
        });

        const predictedType =
          aiResult.predictedType && aiResult.predictedType !== 'unknown'
            ? aiResult.predictedType
            : 'personal_lesson';
        // Metadata Builder: 生成结构化元数据
        // 标题优先级: AI识别标题 > 清理后的文件名 > 未识别提示
        const rawTitle =
          aiResult.title && aiResult.title !== '未命名'
            ? aiResult.title
            : fileName
              ? fileName.replace(/\.(docx?|pdf|pptx?|txt)$/i, '').replace(/[_-]/g, ' ')
              : inputText?.slice(0, 30) || '未识别到标题，请老师填写';
        const metadataTitle = cleanTitle(rawTitle, predictedType);
        const now = new Date().toISOString().slice(0, 10);
        const recognitionReasons = getRecognitionReasons(predictedType, aiResult);
        const modules = getTypeModules(predictedType, aiResult);
        const sourceLabel = fileName
          ? fileName.endsWith('.docx') || fileName.endsWith('.doc')
            ? 'Word'
            : fileName.endsWith('.pdf')
              ? 'PDF'
              : fileName.endsWith('.pptx') || fileName.endsWith('.ppt')
                ? 'PPT'
                : '文件'
          : '聊天';

        const result = {
          // 原有字段
          type: predictedType,
          title_candidate: metadataTitle,
          subject: aiResult.subject || '',
          grade: aiResult.grade || '',
          summary: aiResult.summary || '',
          confidence: aiResult.confidence || 0,
          need_user_confirm: true,
          need_lesson_link: predictedType === 'reflection',
          next_action: 'preview',
          extracted_entities: {
            ...aiResult.extractedFields,
            ...(scene.scene === 'semester_plan'
              ? { plan_subtype: 'teaching_plan' }
              : scene.scene === 'semester_summary'
                ? { plan_subtype: 'semester_summary' }
                : {}),
          },
          reason: aiResult.fallback ? `fallback: ${aiResult.error || 'mock'}` : 'AI识别',
          nl_reply: `资料预览已生成`,
          // V2.1 Metadata
          metadata_title: metadataTitle,
          content_date: now,
          source: sourceLabel,
          modules,
          recognition_reasons: recognitionReasons,
          showPreviewCard: true,
          isBusinessScene: true,
          fileIds: (job.data.fileIds || []).map(Number),
        };
        await redis.set(`ai_result:${messageId}`, JSON.stringify(result), 'EX', 600);
        await redis.set(`ai_session:${messageId}`, String(sessionId), 'EX', 600);
        console.log(
          `[Worker-AI] job=${job.id} user=${userId} type=${result.type} tokens=${aiResult.usage?.total_tokens} concurrent=${guard.active()}`
        );
        return result;
      } finally {
        guard.release();
      }
    },
    { connection: { url: redisUrl }, concurrency: CFG.maxConcurrent }
  );

  console.log('[Worker-AI] started on ai-recognition');
}

bootstrap().catch(console.error);

// ======= Metadata Helpers =======
function getRecognitionReasons(type: string, aiResult: any): string[] {
  const fullText = [
    aiResult.summary || '',
    aiResult.title || '',
    JSON.stringify(aiResult.extractedFields || {}),
  ]
    .join(' ')
    .toLowerCase();

  const reasonChecks: Record<string, { label: string; keywords: string[] }[]> = {
    personal_lesson: [
      { label: '包含教学目标', keywords: ['教学目标', '教学目标', '目标'] },
      { label: '包含教学重点', keywords: ['教学重点', '重点', '重难点'] },
      { label: '包含教学难点', keywords: ['教学难点', '难点'] },
      { label: '包含教学过程', keywords: ['教学过程', '教学过程', '过程', '导入', '新授', '讲授'] },
      { label: '包含课堂练习', keywords: ['课堂练习', '练习', '习题', '作业'] },
      { label: '包含板书设计', keywords: ['板书设计', '板书'] },
    ],
    reflection: [
      { label: '包含课堂描述', keywords: ['课堂', '上课', '教学'] },
      { label: '包含改进建议', keywords: ['改进', '建议', '优化'] },
      { label: '包含效果分析', keywords: ['效果', '分析', '表现'] },
    ],
    group_lesson: [
      { label: '包含研讨主题', keywords: ['主题', '课题', '研讨'] },
      { label: '包含参与人员', keywords: ['参与', '教师', '老师'] },
      { label: '包含达成共识', keywords: ['共识', '结论', '决定'] },
    ],
    plan_summary: [
      { label: '包含工作目标', keywords: ['目标', '计划', '安排'] },
      { label: '包含完成情况', keywords: ['完成', '情况', '进度'] },
      { label: '包含改进计划', keywords: ['改进', '计划', '下一步'] },
    ],
  };

  const checks = reasonChecks[type] || [{ label: 'AI自动识别', keywords: [] }];
  const results: string[] = [];
  for (const check of checks) {
    if (check.keywords.length === 0) {
      results.push(check.label);
    } else {
      const matched = check.keywords.some((kw) => fullText.includes(kw));
      if (matched) results.push(check.label);
    }
  }
  if (results.length === 0) results.push('AI自动识别');
  return results;
}

function getTypeModules(type: string, aiResult: any): { label: string; content: string }[] {
  const ef = aiResult.extractedFields || {};
  const summary = aiResult.summary || '';

  // 尝试从 summary 中按中文冒号/换行分段提取
  function extractFromSummary(label: string, keywords: string[]): string {
    if (!summary) return '';
    // 先尝试从 extractedFields 中取
    const camelKey = label.replace(/[教学\s]/g, '');
    if (ef[label] || ef[camelKey]) return ef[label] || ef[camelKey];

    // 从 summary 中按关键词匹配分段
    const lines = summary.split(/[。\n；;]/);
    for (const kw of keywords) {
      for (const line of lines) {
        if (line.includes(kw)) {
          // 提取冒号后的内容
          const parts = line.split(/[：:]/);
          if (parts.length >= 2) return parts.slice(1).join(':').trim();
          return line.trim();
        }
      }
    }
    return '';
  }

  const moduleDefs: Record<string, { label: string; keywords: string[] }[]> = {
    personal_lesson: [
      { label: '教学目标', keywords: ['教学目标', '教学目标', '教学目的', '目标'] },
      { label: '教学重点', keywords: ['教学重点', '重点', '重难点'] },
      { label: '教学难点', keywords: ['教学难点', '难点'] },
      { label: '教学过程', keywords: ['教学过程', '教学过程', '过程', '环节', '导入'] },
      { label: '课堂练习', keywords: ['课堂练习', '练习', '习题', '巩固'] },
      { label: '板书设计', keywords: ['板书设计', '板书'] },
    ],
    reflection: [
      { label: '课堂描述', keywords: ['课堂', '教学', '上课'] },
      { label: '成功经验', keywords: ['成功', '亮点', '好的'] },
      { label: '存在问题', keywords: ['问题', '不足', '缺点'] },
      { label: '改进措施', keywords: ['改进', '措施', '优化', '建议'] },
    ],
    group_lesson: [
      { label: '研讨课题', keywords: ['课题', '主题', '内容'] },
      { label: '研讨重点', keywords: ['重点', '焦点', '核心'] },
      { label: '参与人员', keywords: ['参与', '人员', '教师'] },
      { label: '达成共识', keywords: ['共识', '结论', '决定'] },
    ],
    plan_summary: [
      { label: '工作目标', keywords: ['目标', '计划', '任务'] },
      { label: '完成情况', keywords: ['完成', '情况', '进度'] },
      { label: '存在问题', keywords: ['问题', '不足', '困难'] },
      { label: '改进计划', keywords: ['改进', '措施', '安排', '下一步'] },
    ],
  };

  const defs = moduleDefs[type] || [{ label: '概要', keywords: [] }];
  const modules: { label: string; content: string }[] = [];

  for (const def of defs) {
    let content = '';
    // 1. 尝试从 extractedFields 直接取（中文键名）
    const camelKey = def.label.replace(/[教学课堂研讨工作\s]/g, '');
    content = ef[def.label] || ef[camelKey] || '';
    // 1b. 尝试英文键名（unified prompt 新字段）
    const enKeyMap: Record<string, string> = {
      研讨课题: 'topic',
      研讨重点: 'focus',
      参与人员: 'participants',
      达成共识: 'consensus',
      教学目标: 'objectives',
      教学重点: 'key_points',
      教学难点: 'difficult_points',
      教学过程: 'process',
      课堂练习: 'exercises',
      板书设计: 'board_design',
      工作目标: 'goals',
      完成情况: 'completion',
      存在问题: 'problems',
      改进计划: 'improvements',
      成功经验: 'success',
      改进措施: 'improvements',
    };
    if (!content && enKeyMap[def.label]) {
      content = ef[enKeyMap[def.label]] || '';
    }
    // 2. 尝试从 summary 智能提取
    if (!content && summary) {
      content = extractFromSummary(def.label, def.keywords);
    }
    // 3. 如果 summary 本身很短（<200字），且没有结构化字段，用 summary 作为第一个模块的内容
    if (!content && def === defs[0] && summary && summary.length < 500) {
      content = summary;
    }
    if (content) {
      modules.push({ label: def.label, content: content.slice(0, 500) });
    }
  }

  // 如果没有提取到任何模块，但 summary 有内容，用概要做为唯一条目
  if (modules.length === 0 && summary) {
    modules.push({ label: '概要', content: summary.slice(0, 500) });
  }

  return modules;
}

/** 清洗 AI 生成的标题，去掉冗余的类型后缀 */
function cleanTitle(title: string, type: string): string {
  if (!title) return title;
  let cleaned = title.trim();
  // 去掉书名号
  cleaned = cleaned.replace(/^[《〈]/g, '').replace(/[》〉]$/g, '');
  // 去掉末尾的类型后缀（如 "个人备课"、"教学反思" 等）
  const typeSuffixes: Record<string, string[]> = {
    personal_lesson: ['个人备课', '教案', '教学设计', '课时计划'],
    reflection: ['教学反思', '课后反思', '课堂反思'],
    group_lesson: ['集体备课', '教研记录', '集体备课记录'],
    plan_summary: ['计划总结', '工作总结', '学期总结', '学期计划', '教学计划'],
  };
  const suffixes = typeSuffixes[type] || [];
  for (const suffix of suffixes) {
    cleaned = cleaned
      .replace(new RegExp('\\s*[—–-]?\\s*' + suffix + '\\s*$'), '')
      .replace(new RegExp('^' + suffix + '\\s*[—–-]?\\s*'), '');
  }
  cleaned = cleaned.trim();
  // 如果清理后为空，返回去掉所有括号的版本
  if (!cleaned)
    cleaned = title
      .replace(/[《〈〉》]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  return cleaned || title;
}
