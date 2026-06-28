import { Worker } from 'bullmq';
import { Redis } from 'ioredis';
import * as crypto from 'crypto';
import { createAIAdapter } from '@workspace/adapter-ai';
import type { DeepSeekAdapter, DeepSeekCallResult } from '@workspace/adapter-ai';
import { detectScene, SCENE_DETECTION_PROMPT, INTENT_PROMPT, TASK_PROMPT } from './prompts/prompt-registry';
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
    await new Promise(r => setTimeout(r, 5000));
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
  fileContent?: string
): Promise<DeepSeekCallResult & { usage?: any; latencyMs?: number }> {
  const params = adapter.buildRequest({ text, fileName, fileContent });
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
  fileContent?: string
): Promise<DeepSeekCallResult & { usage?: any; latencyMs?: number }> {
  let lastError: any;
  for (let i = 0; i <= CFG.maxRetries; i++) {
    try {
      return await callDeepSeekOnce(adapter, text, fileName, fileContent);
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
      const inputText = [text, fileName, fileContent?.slice(0, 500)].filter(Boolean).join(' ');
      const contentHash = crypto
        .createHash('md5')
        .update((text || '') + (fileName || ''))
        .digest('hex');
      const dedupKey = `ai:dedup:${userId}:${contentHash}`;
      const isDuplicate = await limiter.checkDedup(dedupKey, CFG.dedupWindowSec);
      if (isDuplicate) {
        const result = {
          type: 'duplicate', isBusinessScene: false,
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
          type: 'rate_limited', isBusinessScene: false,
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
          type: 'rate_limited', isBusinessScene: false,
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
          type: 'rate_limited', isBusinessScene: false,
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
          type: 'rate_limited', isBusinessScene: false,
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
      let intent = 'CHAT';
      if (job.data.mode && job.data.mode !== 'auto') {
        intent = job.data.mode === 'normal_chat' ? 'CHAT' : 'CREATE';
      } else if (config.apiKey && config.apiKey !== 'sk-your-deepseek-api-key') {
        try {
          const c = new AbortController(); const t = setTimeout(() => c.abort(), 8000);
          const r = await fetch(config.baseUrl + '/chat/completions'.replace('//v1','/v1'), { method:'POST', headers:{'Content-Type':'application/json', Authorization:'Bearer ' + config.apiKey}, body:JSON.stringify({ model:config.model, messages:[{role:'system',content:INTENT_PROMPT},{role:'user',content:inputText}], temperature:0.1, max_tokens:200, response_format:{type:'json_object'} }), signal:c.signal });
          clearTimeout(t);
          if (r.ok) { const j: any = await r.json(); intent = JSON.parse(j.choices?.[0]?.message?.content||'{}').intent||'CHAT'; }
        } catch {}
      }
      console.log('[INTENT-DETECT]', { messageId, intent });

      // CHAT/ASK → normal_chat（跳过所有业务Pipeline）
      if (intent === 'CHAT' || intent === 'ASK') {
        const ck2 = 'ai:chat_quota:' + userId + ':' + new Date().toISOString().slice(0,10);
        const cu2 = parseInt((await redis.get(ck2))||'0');
        const now = new Date().toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'});
        let nl = '';
        const hasKey = config.apiKey && config.apiKey !== 'sk-your-deepseek-api-key';
        try {
          if (hasKey) {
            const c = new AbortController(); const t = setTimeout(() => c.abort(), CFG.httpTimeout);
            const r = await fetch(config.baseUrl + '/chat/completions'.replace('//v1','/v1'), { method:'POST', headers:{'Content-Type':'application/json', Authorization:'Bearer '+config.apiKey}, body:JSON.stringify({ model:config.model, messages:[{role:'system',content:'你是AI教学助手。当前日期：'+now+'。问什么答什么。不说"整理成保存"。'},{role:'user',content:inputText}], temperature:0.7, max_tokens:800 }), signal:c.signal });
            clearTimeout(t);
            if (r.ok) { const j: any = await r.json(); nl = j.choices?.[0]?.message?.content||''; }
          }
        } catch {}
        if (!nl||nl.length<5) { nl = hasKey?'AI模型暂不可用，请稍后重试。':'AI模型未配置，请管理员配置。'; }
        const rs = { intent, isBusinessScene:false, type:'chat', title_candidate:'', summary:'', confidence:0.9, need_user_confirm:false, need_lesson_link:false, next_action:'none', extracted_entities:{}, reason:'Intent:'+intent, nl_reply:nl, chatQuota:{used:cu2,limit:100,remaining:Math.max(0,100-cu2)} };
        await redis.set('ai_result:'+messageId, JSON.stringify(rs), 'EX', 600);
        await redis.set('ai_session:'+messageId, String(sessionId), 'EX', 600);
        return rs;
      }

      // UPLOAD → 提示已分析
      if (intent === 'UPLOAD') {
        const rs = { intent, isBusinessScene:false, type:'upload_analyzed', title_candidate:fileName||'', summary:'', confidence:0.8, need_user_confirm:false, need_lesson_link:false, next_action:'none', extracted_entities:{}, reason:'文件已分析', nl_reply: fileName?'已分析「'+fileName+'」。你需要做什么：生成教案、优化、还是其他？':'文件已分析。你需要做什么？' };
        await redis.set('ai_result:'+messageId, JSON.stringify(rs), 'EX', 600);
        return rs;
      }

      // CREATE/EDIT → Task → NeedMoreInfo → 信息足进业务Pipeline
      let task = null;
      let needMoreInfo = false;
      if (config.apiKey && config.apiKey !== 'sk-your-deepseek-api-key') {
        try {
          const c = new AbortController(); const t = setTimeout(() => c.abort(), 8000);
          const r = await fetch(config.baseUrl + '/chat/completions'.replace('//v1','/v1'), { method:'POST', headers:{'Content-Type':'application/json', Authorization:'Bearer '+config.apiKey}, body:JSON.stringify({ model:config.model, messages:[{role:'system',content:TASK_PROMPT},{role:'user',content:inputText}], temperature:0.1, max_tokens:200, response_format:{type:'json_object'} }), signal:c.signal });
          clearTimeout(t);
          if (r.ok) { const j: any = await r.json(); task = JSON.parse(j.choices?.[0]?.message?.content||'{}').task||null; }
        } catch {}
      }
      const hasG = /[一二三四五六七八九]年级|一年级|二年级|三年级|四年级|五年级|六年级|七年级|八年级|九年级/.test(inputText);
      const hasS = /语文|数学|英语|物理|化学|生物|历史|地理|政治/.test(inputText);
      needMoreInfo = !hasG || !hasS;
      console.log('[TASK-DETECT]', { messageId, intent, task, needMoreInfo });

      if (needMoreInfo && task) {
        const info = { intent, isBusinessScene:false, type:'need_info', title_candidate:'', summary:'', confidence:0.6, need_user_confirm:false, need_lesson_link:false, next_action:'none', extracted_entities:{task}, reason:'信息不足', nl_reply: task==='Create Lesson'?'好的，帮你创建备课。请告诉我：①年级？②学科？③具体要求？':task==='Create Reflection'?'好的。请告诉我：①年级？②学科？③课堂效果如何？':'请补充：年级、学科、具体要求？' };
        await redis.set('ai_result:'+messageId, JSON.stringify(info), 'EX', 600);
        await redis.set('ai_session:'+messageId, String(sessionId), 'EX', 600);
        return info;
      }
      const scene = detectScene(inputText, job.data.mode);

      // auto 模式 + 关键词无法判断 → 调 AI 做场景识别
      if (scene.scene === 'unknown' && config.apiKey && config.apiKey !== 'sk-your-deepseek-api-key') {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 10000);
          const res = await fetch(`${config.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
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
        const aiResult = await callWithRetry(aiAdapter, text || '', fileName, fileContent);
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
          extracted_entities:
            scene.scene === 'semester_plan'
              ? { plan_subtype: 'teaching_plan' }
              : scene.scene === 'semester_summary'
                ? { plan_subtype: 'semester_summary' }
                : {},
          reason: aiResult.fallback ? `fallback: ${aiResult.error || 'mock'}` : 'AI识别',
          nl_reply: `识别完成: ${aiResult.predictedType} - ${aiResult.title}`,
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
