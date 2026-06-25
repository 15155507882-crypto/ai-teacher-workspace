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
