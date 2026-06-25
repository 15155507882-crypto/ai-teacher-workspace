import { Worker } from 'bullmq';
import { createStorageAdapter } from '@workspace/adapter-storage';
import { PdfExportProcessor } from './processors/pdf-export.processor';

async function bootstrap() {
  const connection = { url: process.env.REDIS_URL || 'redis://localhost:6379' };

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
