import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { AISessionRepository } from '../../database/repositories/ai-session.repository';
import { AIMessageRepository } from '../../database/repositories/ai-message.repository';
import { AIDecisionLogRepository } from '../../database/repositories/ai-decision-log.repository';
import { PersonalLessonRepository } from '../../database/repositories/personal-lesson.repository';
import { ChatDto } from './ai.dto';

@Injectable()
export class AIService {
  private redis: Redis;

  constructor(
    private readonly sessionRepo: AISessionRepository,
    private readonly messageRepo: AIMessageRepository,
    private readonly decisionLogRepo: AIDecisionLogRepository,
    private readonly personalLessonRepo: PersonalLessonRepository,
    @InjectQueue('ai-recognition') private readonly aiQueue: Queue
  ) {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  getRedis(): Redis {
    return this.redis;
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

    await this.redis.set(`ai_session:${savedMsg.id}`, String(session.id), 'EX', 600);

    // 查询最近3次备课，供教学反思关联使用
    const recentLessons = await this.personalLessonRepo.findRecentByTeacher(teacherId, 3);
    const recentData = recentLessons.map((l) => ({
      id: l.content_id,
      title: l.content?.title || '未命名',
      date: l.lesson_date,
      subject: l.subject,
    }));

    await this.aiQueue.add('classify-content', {
      sessionId: session.id,
      messageId: savedMsg.id,
      teacherId,
      schoolId,
      text: dto.text,
      fileId: dto.file_id,
      scope: dto.scope || 'workspace',
      recentLessons: recentData,
    });

    return { sessionId: session.id, messageId: savedMsg.id, status: 'processing' };
  }

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
