import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileAsset } from '../entities/file-asset.entity';

@Injectable()
export class FileAssetRepository {
  constructor(
    @InjectRepository(FileAsset)
    private readonly repo: Repository<FileAsset>
  ) {}

  findById(id: number): Promise<FileAsset | null> {
    return this.repo.findOne({ where: { id } });
  }

  findBySha256(sha256: string): Promise<FileAsset | null> {
    return this.repo.findOne({ where: { sha256 } });
  }

  findByUploader(uploaderId: number): Promise<FileAsset[]> {
    return this.repo.find({ where: { uploader_id: uploaderId }, order: { created_at: 'DESC' } });
  }

  create(data: Partial<FileAsset>): FileAsset {
    return this.repo.create(data);
  }

  async save(entity: FileAsset): Promise<FileAsset> {
    return this.repo.save(entity);
  }

  async softDelete(id: number): Promise<void> {
    await this.repo.update(id, { deleted_at: new Date(), status: 'deleted' } as any);
  }
}
