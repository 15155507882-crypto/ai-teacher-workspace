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

    // 记录 sessionId 供后续AI回复使用
    await this.redis.set(`ai_session:${savedMsg.id}`, String(session.id), 'EX', 600);

    await this.aiQueue.add('classify-content', {
      sessionId: session.id,
      messageId: savedMsg.id,
      teacherId,
      schoolId,
      text: dto.text,
      fileId: dto.file_id,
      scope: dto.scope || 'workspace',
    });

    return { sessionId: session.id, messageId: savedMsg.id, status: 'processing' };
  }

  /** 轮询识别结果，首次命中时自动创建AI回复消息 */
  async getRecognitionResult(messageId: number) {
    const raw = await this.redis.get(`ai_result:${messageId}`);
    if (!raw) return { status: 'pending' };

    const parsed = JSON.parse(raw);
    const alreadyCreated = await this.redis.get(`ai_msg_created:${messageId}`);

    if (!alreadyCreated) {
      const sid = await this.redis.get(`ai_session:${messageId}`);
      if (sid) {
        const aiMsg = this.messageRepo.create({
          session_id: parseInt(sid, 10),
          sender_type: 'ai',
          message_type: 'action',
          text_content: parsed.nl_reply,
        });
        await this.messageRepo.save(aiMsg);
        await this.redis.set(`ai_msg_created:${messageId}`, '1', 'EX', 600);
      }
    }

    return { status: 'completed', result: parsed };
  }

  async getMessages(sessionId: number) {
    return this.messageRepo.findBySession(sessionId);
  }

  async getActiveSession(teacherId: number) {
    return this.sessionRepo.findActiveByTeacher(teacherId);
  }
}
