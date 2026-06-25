import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { AISessionRepository } from '../../database/repositories/ai-session.repository';
import { AIMessageRepository } from '../../database/repositories/ai-message.repository';
import { AIDecisionLogRepository } from '../../database/repositories/ai-decision-log.repository';
import { ChatDto } from './ai.dto';

@Injectable()
export class AIService {
  private redis: Redis;

  constructor(
    private readonly sessionRepo: AISessionRepository,
    private readonly messageRepo: AIMessageRepository,
    private readonly decisionLogRepo: AIDecisionLogRepository,
    @InjectQueue('ai-recognition') private readonly aiQueue: Queue
  ) {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  async chat(teacherId: number, schoolId: number, dto: ChatDto) {
    let session = await this.sessionRepo.findActiveByTeacher(teacherId);
    if (!session) {
      session = this.sessionRepo.create({
        teacher_id: teacherId,
        scope: dto.scope || 'workspace',
        status: 'active',
      });
      session = await this.sessionRepo.save(session);
    }

    const message = this.messageRepo.create({
      session_id: session.id,
      sender_type: 'teacher',
      message_type: dto.file_id ? 'file' : 'text',
      text_content: dto.text || null,
      file_id: dto.file_id || null,
    });
    const savedMsg = await this.messageRepo.save(message);

    const job = await this.aiQueue.add('classify-content', {
      sessionId: session.id,
      messageId: savedMsg.id,
      teacherId,
      schoolId,
      text: dto.text,
      fileId: dto.file_id,
      scope: dto.scope || 'workspace',
    });

    return {
      sessionId: session.id,
      messageId: savedMsg.id,
      jobId: job.id,
      status: 'processing',
    };
  }

  /** 轮询 AI 识别结果 (从 Redis 读取) */
  async getRecognitionResult(messageId: number) {
    const key = `ai_result:${messageId}`;
    const raw = await this.redis.get(key);
    if (!raw) return { status: 'pending' };
    const result = JSON.parse(raw);
    return { status: 'completed', result };
  }

  async getMessages(sessionId: number) {
    return this.messageRepo.findBySession(sessionId);
  }

  async getActiveSession(teacherId: number) {
    return this.sessionRepo.findActiveByTeacher(teacherId);
  }
}
