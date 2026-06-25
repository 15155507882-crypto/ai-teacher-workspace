import { Job } from 'bullmq';
import { IPreviewAdapter } from '@workspace/adapter-preview';

export interface WordToHtmlJob {
  fileId: number;
  storageKey: string;
  outputDir: string;
}

export class WordToHtmlProcessor {
  constructor(private previewAdapter: IPreviewAdapter) {}

  async process(job: Job<WordToHtmlJob>) {
    const { storageKey, outputDir } = job.data;

    const result = await this.previewAdapter.convert({
      filePath: storageKey,
      targetType: 'html',
      outputDir,
    });

    console.log(`[Worker-Preview] Job ${job.id}: HTML at ${result.outputPath}`);
    return result;
  }
}
