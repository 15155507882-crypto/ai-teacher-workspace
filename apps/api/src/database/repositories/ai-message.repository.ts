import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AIMessage } from '../entities/ai-message.entity';

@Injectable()
export class AIMessageRepository {
  constructor(
    @InjectRepository(AIMessage)
    private readonly repo: Repository<AIMessage>
  ) {}

  findBySession(sessionId: number): Promise<AIMessage[]> {
    return this.repo.find({ where: { session_id: sessionId }, order: { created_at: 'ASC' } });
  }

  create(data: Partial<AIMessage>): AIMessage {
    return this.repo.create(data);
  }

  async save(entity: AIMessage): Promise<AIMessage> {
    return this.repo.save(entity);
  }
}
