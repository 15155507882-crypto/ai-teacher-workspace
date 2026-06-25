import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AIRecognitionRecord } from '../entities/ai-recognition-record.entity';

@Injectable()
export class AIRecognitionRecordRepository {
  constructor(
    @InjectRepository(AIRecognitionRecord)
    private readonly repo: Repository<AIRecognitionRecord>
  ) {}

  findById(id: number): Promise<AIRecognitionRecord | null> {
    return this.repo.findOne({ where: { id } });
  }

  findBySession(sessionId: number): Promise<AIRecognitionRecord[]> {
    return this.repo.find({ where: { session_id: sessionId }, order: { created_at: 'DESC' } });
  }

  findByFileId(fileId: number): Promise<AIRecognitionRecord[]> {
    return this.repo.find({ where: { file_id: fileId }, order: { created_at: 'DESC' } });
  }

  create(data: Partial<AIRecognitionRecord>): AIRecognitionRecord {
    return this.repo.create(data);
  }

  async save(entity: AIRecognitionRecord): Promise<AIRecognitionRecord> {
    return this.repo.save(entity);
  }
}
