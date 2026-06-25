import { PreviewInput, PreviewResult } from './types';

export interface IPreviewAdapter {
  convert(input: PreviewInput): Promise<PreviewResult>;
  isSupported(extension: string): boolean;
}
