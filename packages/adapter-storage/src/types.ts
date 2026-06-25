/// <reference types="node" />

export interface StoragePutOptions {
  key: string;
  body: Buffer;
  contentType?: string;
}

export interface StorageGetResult {
  body: Buffer;
  contentType?: string;
}
