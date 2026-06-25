import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeletedRecord } from '../entities/deleted-record.entity';

@Injectable()
export class DeletedRecordRepository {
  constructor(
    @InjectRepository(DeletedRecord)
    private readonly repo: Repository<DeletedRecord>
  ) {}

  findByTarget(targetType: string, targetId: number): Promise<DeletedRecord | null> {
    return this.repo.findOne({
      where: { target_type: targetType, target_id: targetId },
      order: { created_at: 'DESC' },
    });
  }

  create(data: Partial<DeletedRecord>): DeletedRecord {
    return this.repo.create(data);
  }

  async save(entity: DeletedRecord): Promise<DeletedRecord> {
    return this.repo.save(entity);
  }
}
