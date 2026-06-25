import { IPreviewAdapter } from '../preview-adapter.interface';
import { PreviewInput, PreviewResult, PreviewType } from '../types';

export class LibreOfficeAdapter implements IPreviewAdapter {
  private libreOfficePath: string;

  constructor(config?: { libreOfficePath?: string }) {
    this.libreOfficePath = config?.libreOfficePath || 'libreoffice';
  }

  async convert(input: PreviewInput): Promise<PreviewResult> {
    // TODO: 在 Sprint 7 中实现实际 LibreOffice 调用
    const ext = input.targetType === 'html' ? 'html' : 'pdf';
    return {
      outputPath: `${input.outputDir}/output.${ext}`,
      previewType: input.targetType,
      pageCount: 1,
    };
  }

  isSupported(extension: string): boolean {
    const supported = ['doc', 'docx', 'ppt', 'pptx', 'pdf'];
    return supported.includes(extension.toLowerCase());
  }

  getTargetType(extension: string): PreviewType | null {
    const ext = extension.toLowerCase();
    if (['doc', 'docx'].includes(ext)) return 'html';
    if (['ppt', 'pptx'].includes(ext)) return 'pdf';
    if (['pdf'].includes(ext)) return 'pdf';
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return 'image';
    return null;
  }
}
