import { Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { createAIAdapter } from '@workspace/adapter-ai';
import { AiRecognitionProcessor } from './processors/ai-recognition.processor';

async function bootstrap() {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const connection = { url: redisUrl };
  const redis = new Redis(redisUrl);

  const aiAdapter = createAIAdapter({
    type: 'deepseek',
    apiKey: process.env.AI_API_KEY || '',
    model: process.env.AI_MODEL || 'deepseek-chat',
    baseUrl: process.env.AI_BASE_URL || 'https://api.deepseek.com/v1',
  });

  const processor = new AiRecognitionProcessor(aiAdapter);

  const worker = new Worker(
    'ai-recognition',
    async (job) => {
      const result = await processor.process(job);
      const key = `ai_result:${job.data.messageId}`;
      await redis.set(key, JSON.stringify(result), 'EX', 600);
      // Store sessionId for API message creation
      await redis.set(`ai_session:${job.data.messageId}`, String(job.data.sessionId), 'EX', 600);
      return result;
    },
    { connection, concurrency: 3 }
  );

  console.log('[Worker-AI] AI Recognition worker started');
  console.log('[Worker-AI] Listening on queue: ai-recognition');
}

bootstrap().catch(console.error);
