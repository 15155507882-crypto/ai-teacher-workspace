import * as fs from 'fs/promises';
import * as path from 'path';
import { IStorageAdapter } from '../storage-adapter.interface';
import { StoragePutOptions, StorageGetResult } from '../types';

export class LocalStorageAdapter implements IStorageAdapter {
  private basePath: string;

  constructor(config: { basePath: string }) {
    this.basePath = config.basePath;
  }

  async put(options: StoragePutOptions): Promise<string> {
    const fullPath = path.join(this.basePath, options.key);
    const dir = path.dirname(fullPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(fullPath, options.body);
    return options.key;
  }

  async get(key: string): Promise<StorageGetResult> {
    const fullPath = path.join(this.basePath, key);
    const body = await fs.readFile(fullPath);
    return { body };
  }

  async delete(key: string): Promise<void> {
    const fullPath = path.join(this.basePath, key);
    try {
      await fs.unlink(fullPath);
    } catch (error: any) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }

  async getUrl(key: string): Promise<string> {
    const fullPath = path.join(this.basePath, key);
    return `file://${fullPath}`;
  }

  async exists(key: string): Promise<boolean> {
    const fullPath = path.join(this.basePath, key);
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }
}
