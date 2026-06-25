import { Worker } from 'bullmq';
import { createPreviewAdapter } from '@workspace/adapter-preview';
import { WordToHtmlProcessor } from './processors/word-to-html.processor';
import { PptToPdfProcessor } from './processors/ppt-to-pdf.processor';

async function bootstrap() {
  const connection = { url: process.env.REDIS_URL || 'redis://localhost:6379' };

  const previewAdapter = createPreviewAdapter({ type: 'libreoffice' });

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

  worker.on('completed', (job) => {
    console.log(`[Worker-Preview] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Worker-Preview] Job ${job?.id} failed:`, err.message);
  });
}

bootstrap().catch(console.error);
