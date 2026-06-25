import { Job } from 'bullmq';
import { IAIAdapter } from '@workspace/adapter-ai';

export interface AiRecognitionJob {
  sessionId: number;
  messageId: number;
  fileId?: number;
  text?: string;
  fileName?: string;
  fileContent?: string;
  scope?: string;
}

export class AiRecognitionProcessor {
  constructor(private aiAdapter: IAIAdapter) {}

  async process(job: Job<AiRecognitionJob>) {
    const { text, fileName, fileContent, scope } = job.data;

    const result = await this.aiAdapter.recognize({
      text,
      fileName,
      fileContent,
      scope,
    });

    console.log(
      `[Worker-AI] Job ${job.id}: recognized as ${result.predictedType} (${result.confidence})`
    );

    return result;
  }
}
