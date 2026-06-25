import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AISession } from '../entities/ai-session.entity';

@Injectable()
export class AISessionRepository {
  constructor(
    @InjectRepository(AISession)
    private readonly repo: Repository<AISession>
  ) {}

  findById(id: number): Promise<AISession | null> {
    return this.repo.findOne({ where: { id } });
  }

  findActiveByTeacher(teacherId: number): Promise<AISession | null> {
    return this.repo.findOne({
      where: { teacher_id: teacherId, status: 'active' },
      order: { created_at: 'DESC' },
    });
  }

  create(data: Partial<AISession>): AISession {
    return this.repo.create(data);
  }

  async save(entity: AISession): Promise<AISession> {
    return this.repo.save(entity);
  }

  async close(id: number): Promise<void> {
    await this.repo.update(id, { status: 'closed' } as any);
  }
}
