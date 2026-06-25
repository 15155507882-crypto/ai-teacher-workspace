import { Job } from 'bullmq';
import { IStorageAdapter } from '@workspace/adapter-storage';

export interface PdfExportJob {
  exportTaskId: number;
  teacherId: number;
  academicYear: string;
  semester: string;
  outputDir: string;
}

export class PdfExportProcessor {
  constructor(private storageAdapter: IStorageAdapter) {}

  async process(job: Job<PdfExportJob>) {
    const { exportTaskId, teacherId, academicYear, semester, outputDir } = job.data;

    console.log(
      `[Worker-Export] Job ${job.id}: Export PDF for teacher=${teacherId} ${academicYear} ${semester}`
    );

    return {
      exportTaskId,
      status: 'success',
      outputPath: `${outputDir}/export-${exportTaskId}.pdf`,
    };
  }
}
