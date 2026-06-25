import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OperationLog } from '../entities/operation-log.entity';

@Injectable()
export class OperationLogRepository {
  constructor(
    @InjectRepository(OperationLog)
    private readonly repo: Repository<OperationLog>
  ) {}

  findByOperator(operatorId: number): Promise<OperationLog[]> {
    return this.repo.find({ where: { operator_id: operatorId }, order: { created_at: 'DESC' } });
  }

  findByTarget(targetType: string, targetId: number): Promise<OperationLog[]> {
    return this.repo.find({
      where: { target_type: targetType, target_id: targetId },
      order: { created_at: 'DESC' },
    });
  }

  create(data: Partial<OperationLog>): OperationLog {
    return this.repo.create(data);
  }

  async save(entity: OperationLog): Promise<OperationLog> {
    return this.repo.save(entity);
  }
}
