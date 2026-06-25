import { IStorageAdapter } from './storage-adapter.interface';
import { LocalStorageAdapter } from './adapters';

export type StorageAdapterType = 'local' | 'minio' | 's3';

export interface StorageAdapterConfig {
  type: StorageAdapterType;
  basePath?: string;
  endpoint?: string;
  accessKey?: string;
  secretKey?: string;
  bucket?: string;
}

export function createStorageAdapter(config: StorageAdapterConfig): IStorageAdapter {
  switch (config.type) {
    case 'local':
      return new LocalStorageAdapter({
        basePath: config.basePath || './storage',
      });
    default:
      throw new Error(`Unsupported storage adapter type: ${config.type}`);
  }
}
