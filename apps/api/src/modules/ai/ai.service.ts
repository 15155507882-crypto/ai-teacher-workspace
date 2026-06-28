import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { AISessionRepository } from '../../database/repositories/ai-session.repository';
import { AIMessageRepository } from '../../database/repositories/ai-message.repository';
import { AIDecisionLogRepository } from '../../database/repositories/ai-decision-log.repository';
import { PersonalLessonRepository } from '../../database/repositories/personal-lesson.repository';
import { FileAssetRepository } from '../../database/repositories/file-asset.repository';
import { ChatDto } from './ai.dto';

@Injectable()
export class AIService {
  private redis: Redis;

  constructor(
    private readonly sessionRepo: AISessionRepository,
    private readonly messageRepo: AIMessageRepository,
    private readonly decisionLogRepo: AIDecisionLogRepository,
    private readonly personalLessonRepo: PersonalLessonRepository,
    private readonly fileAssetRepo: FileAssetRepository,
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
      file_id: dto.file_id ? Number(dto.file_id) : null,
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

    // 读取附件内容
    let fileName = '';
    let fileContent = '';
    if (dto.file_id) {
      try {
        const fid = typeof dto.file_id === 'string' ? parseInt(dto.file_id, 10) : dto.file_id;
        const file = await this.fileAssetRepo.findById(fid);
        if (file) {
          fileName = file.original_name || '';
          console.log('[FILE-ASSET-LOAD]', {
            file_id: fid,
            original_name: fileName,
            mime_type: file.mime_type,
            storage_key: file.storage_key,
          });
          const fs = require('fs');
          const path = require('path');
          const filePath = path.resolve('./storage', file.storage_key || '');
          const exists = fs.existsSync(filePath);
          console.log('[FILE-PATH-CHECK]', {
            filePath,
            exists,
            size: exists ? fs.statSync(filePath).size : 0,
          });

          if (exists) {
            if (fileName.endsWith('.txt')) {
              fileContent = fs.readFileSync(filePath, 'utf-8').slice(0, 10000);
            } else if (fileName.endsWith('.docx')) {
              // docx: 解压ZIP，提取document.xml中的文本
              try {
                const AdmZip = require('adm-zip');
                const zip = new AdmZip(filePath);
                const docXml = zip.readAsText('word/document.xml');
                // 简单提取 <w:t> 标签内容
                const texts = docXml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
                fileContent = texts
                  .map((t: string) => t.replace(/<\/?w:t[^>]*>/g, ''))
                  .join('')
                  .slice(0, 10000);
                console.log('[DOCX-EXTRACT-RESULT]', {
                  textLength: fileContent.length,
                  textPreview: fileContent.slice(0, 100),
                });
              } catch (e: any) {
                console.error('[DOCX-EXTRACT-FAILED]', e.message?.slice(0, 200));
                fileContent = `[docx解析失败: ${e.message?.slice(0, 100)}]`;
              }
            } else if (fileName.endsWith('.pdf')) {
              // PDF: 用 pdf-parse 提取文本
              try {
                const pdfParse = require('pdf-parse');
                const dataBuffer = fs.readFileSync(filePath);
                const pdfData = await pdfParse(dataBuffer);
                fileContent = (pdfData.text || '').replace(/\s+/g, ' ').trim().slice(0, 10000);
                console.log('[PDF-EXTRACT-RESULT]', {
                  textLength: fileContent.length,
                  textPreview: fileContent.slice(0, 100),
                });
              } catch (e: any) {
                console.error('[PDF-EXTRACT-FAILED]', e.message?.slice(0, 200));
                // PDF 提取失败，尝试作为纯文本读取（某些PDF包含可读文本流）
                try {
                  const raw = fs.readFileSync(filePath, 'utf-8');
                  const textMatch = raw.match(/\/Text\s*\[([^\]]*)\]/g);
                  if (textMatch) fileContent = textMatch.join(' ').slice(0, 10000);
                } catch {}
              }
            }
          }
        }
      } catch (e: any) {
        console.error('[FILE-READ-ERROR]', e.message?.slice(0, 200));
      }
    }
    // Collect all file IDs for multi-file support
    const allFileIds = dto.file_ids?.length
      ? dto.file_ids.map(Number)
      : dto.file_id
        ? [Number(dto.file_id)]
        : [];
    console.log('[AI-JOB-ENQUEUE]', {
      text: (dto.text || '').slice(0, 50),
      file_id: dto.file_id,
      fileIds: allFileIds,
      fileName,
      fileContentLen: fileContent.length,
    });

    await this.aiQueue.add('classify-content', {
      sessionId: session.id,
      messageId: savedMsg.id,
      teacherId,
      schoolId,
      text: dto.text || (!dto.text && fileName ? '请分析这个文件内容' : ''),
      fileId: dto.file_id ? Number(dto.file_id) : allFileIds[0],
      fileIds: allFileIds,
      fileName,
      fileContent: fileContent?.slice(0, 10000) || '',
      mode: dto.mode || 'auto',
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
