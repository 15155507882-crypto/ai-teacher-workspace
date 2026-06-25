import { Worker } from 'bullmq';
import { createAIAdapter } from '@workspace/adapter-ai';
import { AiRecognitionProcessor } from './processors/ai-recognition.processor';

async function bootstrap() {
  const connection = { url: process.env.REDIS_URL || 'redis://localhost:6379' };

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
