import { IPreviewAdapter } from './preview-adapter.interface';
import { LibreOfficeAdapter } from './adapters';

export type PreviewAdapterType = 'libreoffice' | 'onlyoffice';

export interface PreviewAdapterConfig {
  type: PreviewAdapterType;
  libreOfficePath?: string;
}

export function createPreviewAdapter(config: PreviewAdapterConfig): IPreviewAdapter {
  switch (config.type) {
    case 'libreoffice':
      return new LibreOfficeAdapter({
        libreOfficePath: config.libreOfficePath,
      });
    default:
      throw new Error(`Unsupported preview adapter type: ${config.type}`);
  }
}
