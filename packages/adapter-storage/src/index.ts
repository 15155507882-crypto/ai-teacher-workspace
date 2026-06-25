export { IStorageAdapter } from './storage-adapter.interface';
export type { StoragePutOptions, StorageGetResult } from './types';
export { createStorageAdapter } from './storage-adapter.factory';
export type { StorageAdapterConfig, StorageAdapterType } from './storage-adapter.factory';
export { LocalStorageAdapter } from './adapters/local.adapter';
