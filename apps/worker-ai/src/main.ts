import { Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { createAIAdapter } from '@workspace/adapter-ai';
import type { DeepSeekAdapter, DeepSeekCallResult } from '@workspace/adapter-ai';

interface WorkerConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
  providerId?: number;
  providerName?: string;
  providerType?: string;
}

async function fetchConfigFromApi(): Promise<WorkerConfig | null> {
  const apiHost = process.env.API_INTERNAL_URL || 'http://localhost:3000';
  try {
    const res = await fetch(`${apiHost}/api/admin/ai-configs/active/internal`, {
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
  }
) {
  const apiHost = process.env.API_INTERNAL_URL || 'http://localhost:3000';
  try {
    await fetch(`${apiHost}/api/admin/ai-configs/log-call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        aiConfigId: cfg.providerId || 1,
        providerName: cfg.providerName || cfg.providerType || 'env',
        providerType: cfg.providerType || 'custom',
        model: data.model,
        status: data.status,
        promptTokens: data.promptTokens,
        completionTokens: data.completionTokens,
        totalTokens: data.totalTokens,
        latencyMs: data.latencyMs,
        errorMessage: data.errorMessage,
        callType: 'recognize',
      }),
      signal: AbortSignal.timeout(3000),
    }).catch(() => {});
  } catch {}
}

/** 真正发 HTTP 请求调用大模型 */
async function callDeepSeekHttp(
  adapter: DeepSeekAdapter,
  text: string,
  fileName?: string,
  fileContent?: string
): Promise<DeepSeekCallResult & { usage?: any; latencyMs?: number }> {
  const params = adapter.buildRequest({ text, fileName, fileContent });
  const start = Date.now();

  // 无有效 Key → mock
  if (!params.apiKey || params.apiKey === 'sk-your-deepseek-api-key') {
    const mock = adapter.mockClassify({ text, fileName, fileContent });
    return { ...mock, fallback: true, latencyMs: 0 };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    const res = await fetch(`${params.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${params.apiKey}` },
      body: JSON.stringify({
        model: params.model,
        messages: [
          { role: 'system', content: params.systemPrompt },
          { role: 'user', content: params.userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 1000,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const latencyMs = Date.now() - start;

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      const mock = adapter.mockClassify({ text, fileName, fileContent });
      return {
        ...mock,
        fallback: true,
        latencyMs,
        error: `HTTP ${res.status}: ${errText.slice(0, 200)}`,
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

    const parsed = adapter.parseResponse(content, { text, fileName, fileContent });
    return { ...parsed, usage, latencyMs };
  } catch (e: any) {
    const latencyMs = Date.now() - start;
    const mock = adapter.mockClassify({ text, fileName, fileContent });
    return { ...mock, fallback: true, latencyMs, error: e.message?.slice(0, 200) };
  }
}

async function bootstrap() {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const connection = { url: redisUrl };
  const redis = new Redis(redisUrl);

  let config: WorkerConfig;
  const apiConfig = await fetchConfigFromApi();
  if (apiConfig) {
    config = apiConfig;
    console.log(`[Worker-AI] API配置: ${config.providerName} (${config.model})`);
  } else {
    config = {
      apiKey: process.env.AI_API_KEY || '',
      model: process.env.AI_MODEL || 'deepseek-chat',
      baseUrl: process.env.AI_BASE_URL || 'https://api.deepseek.com/v1',
      providerType: 'custom',
    };
    console.log('[Worker-AI] 环境变量配置 (fallback)');
  }

  const aiAdapter = createAIAdapter({
    type: 'deepseek',
    apiKey: config.apiKey,
    model: config.model,
    baseUrl: config.baseUrl,
  }) as DeepSeekAdapter;

  const worker = new Worker(
    'ai-recognition',
    async (job) => {
      const { text, fileName, fileContent, messageId, sessionId } = job.data;

      // 真实 HTTP 调用
      const aiResult = await callDeepSeekHttp(aiAdapter, text || '', fileName, fileContent);

      // 写入日志
      logCallToApi(config, {
        model: config.model,
        status: aiResult.error && !aiResult.fallback ? 'failed' : 'success',
        promptTokens: aiResult.usage?.prompt_tokens || 0,
        completionTokens: aiResult.usage?.completion_tokens || 0,
        totalTokens: aiResult.usage?.total_tokens || 0,
        latencyMs: aiResult.latencyMs,
        errorMessage: aiResult.error,
      });

      const result = {
        type: aiResult.predictedType || 'personal_lesson',
        title_candidate: aiResult.title || fileName || '未命名',
        subject: aiResult.subject || '',
        grade: aiResult.grade || '',
        summary: aiResult.summary || '',
        confidence: aiResult.confidence || 0,
        need_user_confirm: true,
        need_lesson_link: aiResult.predictedType === 'reflection',
        next_action: 'confirm_' + (aiResult.predictedType || 'personal_lesson'),
        extracted_entities: {},
        reason: aiResult.fallback ? `fallback: ${aiResult.error || 'mock'}` : 'AI识别',
        nl_reply: `识别完成: ${aiResult.predictedType} - ${aiResult.title}`,
      };

      await redis.set(`ai_result:${messageId}`, JSON.stringify(result), 'EX', 600);
      await redis.set(`ai_session:${messageId}`, String(sessionId), 'EX', 600);
      return result;
    },
    { connection, concurrency: 3 }
  );

  console.log('[Worker-AI] started on ai-recognition');
}

bootstrap().catch(console.error);
