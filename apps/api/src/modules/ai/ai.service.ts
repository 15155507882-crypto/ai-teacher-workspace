import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AISessionRepository } from '../../database/repositories/ai-session.repository';
import { AIMessageRepository } from '../../database/repositories/ai-message.repository';
import { ChatDto } from './ai.dto';

@Injectable()
export class AIService {
  constructor(
    private readonly sessionRepo: AISessionRepository,
    private readonly messageRepo: AIMessageRepository,
    @InjectQueue('ai-recognition') private readonly aiQueue: Queue
  ) {}

  /** 聊天入口：创建/获取会话，保存消息，入队 AI 识别，立即返回 */
  async chat(teacherId: number, schoolId: number, dto: ChatDto) {
    // 获取或创建活跃会话
    let session = await this.sessionRepo.findActiveByTeacher(teacherId);
    if (!session) {
      session = this.sessionRepo.create({
        teacher_id: teacherId,
        scope: dto.scope || 'workspace',
        status: 'active',
      });
      session = await this.sessionRepo.save(session);
    }

    // 保存用户消息
    const message = this.messageRepo.create({
      session_id: session.id,
      sender_type: 'teacher',
      message_type: dto.file_id ? 'file' : 'text',
      text_content: dto.text || null,
      file_id: dto.file_id || null,
    });
    const savedMsg = await this.messageRepo.save(message);

    // 异步入队 AI 识别
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

  /** 获取会话消息列表 */
  async getMessages(sessionId: number) {
    return this.messageRepo.findBySession(sessionId);
  }

  /** 获取教师活跃会话 */
  async getActiveSession(teacherId: number) {
    return this.sessionRepo.findActiveByTeacher(teacherId);
  }
}
