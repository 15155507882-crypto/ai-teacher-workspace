import { Job } from 'bullmq';
import { IPreviewAdapter } from '@workspace/adapter-preview';

export interface PptToPdfJob {
  fileId: number;
  storageKey: string;
  outputDir: string;
}

export class PptToPdfProcessor {
  constructor(private previewAdapter: IPreviewAdapter) {}

  async process(job: Job<PptToPdfJob>) {
    const { storageKey, outputDir } = job.data;

    const result = await this.previewAdapter.convert({
      filePath: storageKey,
      targetType: 'pdf',
      outputDir,
    });

    console.log(`[Worker-Preview] Job ${job.id}: PDF at ${result.outputPath}`);
    return result;
  }
}
