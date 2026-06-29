import { Worker } from 'bullmq';
import { createPreviewAdapter } from '@workspace/adapter-preview';
import { LocalStorageAdapter } from '@workspace/adapter-storage';
import { OfficeToPdfProcessor } from './processors/word-to-pdf.processor';

// Internal API helper to update preview status
async function updatePreviewStatus(
  fileId: number,
  status: string,
  previewUrl?: string,
  error?: string
) {
  const apiUrl = process.env.API_URL || 'http://localhost:3000';
  try {
    await fetch(`${apiUrl}/api/admin/files/${fileId}/preview-status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, previewUrl, error }),
    });
  } catch (e) {
    console.error(`[Worker-Preview] Failed to update preview status for file ${fileId}:`, e);
  }
}

async function bootstrap() {
  const connection = { url: process.env.REDIS_URL || 'redis://localhost:6379' };

  const previewAdapter = createPreviewAdapter({ type: 'libreoffice' });

  // Storage adapter for reading/writing files
  const storageBasePath = process.env.STORAGE_LOCAL_PATH || './storage';
  const storage = new LocalStorageAdapter({ basePath: storageBasePath });

  const officeProcessor = new OfficeToPdfProcessor(previewAdapter);

  const worker = new Worker(
    'file-preview',
    async (job) => {
      const { fileId, storageKey, outputDir } = job.data;

      // Update status to PROCESSING
      await updatePreviewStatus(fileId, 'PROCESSING');

      try {
        // Read original file from storage
        const fileBuffer = await storage.get(storageKey);
        const fs = await import('fs/promises');
        const path = await import('path');
        const os = await import('os');

        // Write to temp dir for LibreOffice
        const tempDir = path.join(os.tmpdir(), `preview-${fileId}-${Date.now()}`);
        const inputPath = path.join(tempDir, path.basename(storageKey));
        await fs.mkdir(tempDir, { recursive: true });
        await fs.writeFile(inputPath, fileBuffer);

        // Also ensure output dir exists
        await fs.mkdir(outputDir, { recursive: true });

        // Convert
        const result = await officeProcessor.process({
          ...job,
          data: {
            ...job.data,
            fileExt: path.extname(storageKey),
          },
        } as any);

        // Move result to storage
        const previewBuffer = await fs.readFile(result.outputPath);
        const previewKey = `preview/${fileId}_preview.pdf`;
        await storage.put({ key: previewKey, body: previewBuffer, contentType: 'application/pdf' });

        // Cleanup temp files
        await fs.rm(tempDir, { recursive: true, force: true });

        // Update status to SUCCESS with preview URL
        await updatePreviewStatus(fileId, 'SUCCESS', previewKey);

        console.log(`[Worker-Preview] Job ${job.id}: file ${fileId} converted successfully`);
        return result;
      } catch (err: any) {
        console.error(`[Worker-Preview] Job ${job.id}: file ${fileId} failed:`, err.message);
        await updatePreviewStatus(fileId, 'FAILED', undefined, err.message);
        throw err;
      }
    },
    {
      connection,
      concurrency: 2,
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 5000 },
      },
    }
  );

  console.log('[Worker-Preview] Preview conversion worker started');
  console.log('[Worker-Preview] Listening on queue: file-preview');
  console.log('[Worker-Preview] LibreOffice path:', process.env.LIBREOFFICE_PATH || 'libreoffice');

  worker.on('completed', (job) => {
    console.log(`[Worker-Preview] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Worker-Preview] Job ${job?.id} failed:`, err.message);
  });
}

bootstrap().catch(console.error);
