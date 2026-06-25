export type PreviewType = 'html' | 'pdf' | 'image';

export interface PreviewInput {
  filePath: string;
  targetType: PreviewType;
  outputDir: string;
}

export interface PreviewResult {
  outputPath: string;
  previewType: PreviewType;
  pageCount?: number;
}
