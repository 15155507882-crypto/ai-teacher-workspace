import { Job } from 'bullmq';
import { IPreviewAdapter } from '@workspace/adapter-preview';

export interface OfficeToPdfJob {
  fileId: number;
  storageKey: string;
  outputDir: string;
  fileExt: string;
}

export class OfficeToPdfProcessor {
  constructor(private previewAdapter: IPreviewAdapter) {}

  async process(job: Job<OfficeToPdfJob>) {
    const { fileId, storageKey, outputDir, fileExt } = job.data;

    console.log(`[Worker-Preview] Job ${job.id}: Converting file ${fileId} (${fileExt}) to PDF...`);

    const result = await this.previewAdapter.convert({
      filePath: storageKey,
      targetType: 'pdf',
      outputDir,
    });

    console.log(`[Worker-Preview] Job ${job.id}: PDF generated at ${result.outputPath}`);
    return result;
  }
}
