import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AIDecisionLog } from '../entities/ai-decision-log.entity';

@Injectable()
export class AIDecisionLogRepository {
  constructor(
    @InjectRepository(AIDecisionLog)
    private readonly repo: Repository<AIDecisionLog>
  ) {}

  create(data: Partial<AIDecisionLog>): AIDecisionLog {
    return this.repo.create(data);
  }

  async save(entity: AIDecisionLog): Promise<AIDecisionLog> {
    return this.repo.save(entity);
  }

  findBySession(sessionId: number): Promise<AIDecisionLog[]> {
    return this.repo.find({ where: { session_id: sessionId }, order: { created_at: 'DESC' } });
  }
}
