import { StoragePutOptions, StorageGetResult } from './types';

export interface IStorageAdapter {
  put(options: StoragePutOptions): Promise<string>;
  get(key: string): Promise<StorageGetResult>;
  delete(key: string): Promise<void>;
  getUrl(key: string): Promise<string>;
  exists(key: string): Promise<boolean>;
}
