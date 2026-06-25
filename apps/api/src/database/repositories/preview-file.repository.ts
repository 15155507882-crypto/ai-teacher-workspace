import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PreviewFile } from '../entities/preview-file.entity';

@Injectable()
export class PreviewFileRepository {
  constructor(
    @InjectRepository(PreviewFile)
    private readonly repo: Repository<PreviewFile>
  ) {}

  findByFileId(fileId: number): Promise<PreviewFile | null> {
    return this.repo.findOne({ where: { file_id: fileId }, order: { created_at: 'DESC' } });
  }

  findById(id: number): Promise<PreviewFile | null> {
    return this.repo.findOne({ where: { id } });
  }

  create(data: Partial<PreviewFile>): PreviewFile {
    return this.repo.create(data);
  }

  async save(entity: PreviewFile): Promise<PreviewFile> {
    return this.repo.save(entity);
  }
}
