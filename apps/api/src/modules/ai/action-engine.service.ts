import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';
import { Content } from '../../database/entities/content.entity';
import { PersonalLesson } from '../../database/entities/personal-lesson.entity';
import { Reflection } from '../../database/entities/reflection.entity';
import { GroupLesson } from '../../database/entities/group-lesson.entity';
import { PlanSummary } from '../../database/entities/plan-summary.entity';
import { LessonAttachment } from '../../database/entities/lesson-attachment.entity';
import { AIRecognitionRecord } from '../../database/entities/ai-recognition-record.entity';
import { AIMessage } from '../../database/entities/ai-message.entity';
import { AIDecisionLog } from '../../database/entities/ai-decision-log.entity';
import { OperationLog } from '../../database/entities/operation-log.entity';
import { buildSuccessReply, computeAcademicTerm } from '@workspace/shared';

export interface ActionContext {
  teacherId: number;
  schoolId: number;
  departmentId: number;
  operatorName: string;
}

export interface ActionParams {
  messageId: number;
  type: string;
  title: string;
  subject?: string;
  grade?: string;
  linkedContentId?: number;
  extractedEntities?: Record<string, any>;
}

@Injectable()
export class ActionEngineService {
  private redis: Redis;

  constructor(@InjectDataSource() private readonly ds: DataSource) {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  /** 统一执行入口 */
  async execute(params: ActionParams, ctx: ActionContext) {
    const term = computeAcademicTerm();
    const createdIds: number[] = [];

    // 事务执行所有写入
    await this.ds.transaction(async (manager) => {
      // 1. content 主表
      const content = manager.create(Content, {
        school_id: ctx.schoolId,
        teacher_id: ctx.teacherId,
        department_id: ctx.departmentId,
        content_type: params.type,
        title: params.title,
        academic_year: term.academic_year,
        semester: term.semester,
        source: 'chat',
        visibility: 'school',
        status: 'confirmed',
      });
      const savedContent = await manager.save(content);
      createdIds.push(savedContent.id);

      // 2. 子表写入
      let linkedLessonTitle = '';
      switch (params.type) {
        case 'personal_lesson': {
          const pl = manager.create(PersonalLesson, {
            content_id: savedContent.id,
            teacher_id: ctx.teacherId,
            subject: params.subject || null,
            grade: params.grade || null,
            chapter: params.extractedEntities?.chapter || null,
            lesson_no: params.extractedEntities?.lesson_no || null,
            body_text: params.extractedEntities?.body_text || null,
            ai_title_confidence: params.extractedEntities?.confidence || 0,
          });
          await manager.save(pl);
          createdIds.push(savedContent.id);
          break;
        }

        case 'reflection': {
          if (!params.linkedContentId) {
            throw new BadRequestException('教学反思必须关联一条个人备课');
          }
          const linkedContent = await manager.findOne(Content, {
            where: { id: params.linkedContentId },
          });
          if (!linkedContent || linkedContent.content_type !== 'personal_lesson') {
            throw new BadRequestException('关联的内容不是个人备课');
          }
          linkedLessonTitle = linkedContent.title;

          const r = manager.create(Reflection, {
            content_id: savedContent.id,
            lesson_content_id: params.linkedContentId,
            teacher_id: ctx.teacherId,
            reflection_text: params.extractedEntities?.reflection_text || '',
            reflection_date: new Date().toISOString().slice(0, 10),
          });
          await manager.save(r);
          createdIds.push(savedContent.id);
          break;
        }

        case 'group_lesson': {
          const gl = manager.create(GroupLesson, {
            content_id: savedContent.id,
            creator_id: ctx.teacherId,
            department_id: ctx.departmentId,
            topic: params.extractedEntities?.topic || params.title,
            subject: params.subject || null,
            grade: params.grade || null,
          });
          await manager.save(gl);
          createdIds.push(savedContent.id);
          break;
        }

        case 'plan_summary': {
          const ps = manager.create(PlanSummary, {
            content_id: savedContent.id,
            teacher_id: ctx.teacherId,
            plan_type: params.extractedEntities?.plan_subtype || 'other',
            body_text: params.extractedEntities?.body_text || null,
          });
          await manager.save(ps);
          createdIds.push(savedContent.id);
          break;
        }

        default:
          throw new BadRequestException(`不支持的内容类型: ${params.type}`);
      }

      // 3. 文件关联（从原消息中找到file_id）
      const originalMsg = await manager.findOne(AIMessage, { where: { id: params.messageId } });
      if (originalMsg?.file_id) {
        const att = manager.create(LessonAttachment, {
          content_id: savedContent.id,
          file_id: originalMsg.file_id,
          attachment_role: 'main',
          sort_order: 0,
        });
        await manager.save(att);
      }

      // 4. AI 识别记录更新
      await manager
        .createQueryBuilder()
        .update(AIRecognitionRecord)
        .set({ status: 'confirmed', final_type: params.type, confirmed_by: ctx.teacherId })
        .where('message_id = :msgId', { msgId: params.messageId })
        .execute();

      // 5. AI 决策日志
      const log = manager.create(AIDecisionLog, {
        message_id: params.messageId,
        prompt_used: params.type,
        confirmed_type: params.type,
        confirmed_by: ctx.teacherId,
        confirm_status: 'confirmed',
      });
      await manager.save(log);

      // 6. 操作日志
      const opLog = manager.create(OperationLog, {
        operator_id: ctx.teacherId,
        action: `ai_confirm_${params.type}`,
        target_type: 'content',
        target_id: savedContent.id,
        detail_json: { title: params.title, type: params.type },
      });
      await manager.save(opLog);
    });

    // 7. 保存撤销快照 (Redis, 5min TTL)
    const undoKey = `undo:${params.messageId}`;
    await this.redis.set(
      undoKey,
      JSON.stringify({ ids: createdIds, type: params.type, time: Date.now() }),
      'EX',
      300
    );

    // 8. 自然语言成功回复
    const successReply = buildSuccessReply(params.type, {
      title: params.title,
      linked_lesson_title: params.extractedEntities?.linked_lesson_title || '',
      academic_year: term.academic_year,
      semester: term.semester,
    });

    // 保存AI回复消息
    const aiMsgRepo = this.ds.getRepository(AIMessage);
    const sessionKey = await this.redis.get(`ai_session:${params.messageId}`);
    if (sessionKey) {
      const aiMsg = aiMsgRepo.create({
        session_id: parseInt(sessionKey, 10),
        sender_type: 'ai',
        message_type: 'action',
        text_content: successReply,
      });
      await aiMsgRepo.save(aiMsg);
    }

    return { success: true, nl_reply: successReply, undoKey };
  }

  /** 撤销操作 */
  async undo(messageId: number, teacherId: number) {
    const key = `undo:${messageId}`;
    const raw = await this.redis.get(key);
    if (!raw) throw new BadRequestException('已超过撤销时限（5分钟），无法撤销');

    const snapshot = JSON.parse(raw);
    if (Date.now() - snapshot.time > 300000) {
      await this.redis.del(key);
      throw new BadRequestException('已超过撤销时限（5分钟），无法撤销');
    }

    // 按倒序删除创建的数据
    if (snapshot.ids) {
      await this.ds.transaction(async (manager) => {
        for (const id of snapshot.ids.reverse()) {
          await manager.delete(PersonalLesson, { content_id: id });
          await manager.delete(Reflection, { content_id: id });
          await manager.delete(GroupLesson, { content_id: id });
          await manager.delete(PlanSummary, { content_id: id });
          await manager.delete(LessonAttachment, { content_id: id });
          await manager.delete(Content, { id });
        }
      });
    }

    await this.redis.del(key);

    const reply = '已撤销刚才的保存操作。资料已恢复为未保存状态，你可以重新编辑后再保存。';
    const aiMsgRepo = this.ds.getRepository(AIMessage);
    const sessionKey = await this.redis.get(`ai_session:${messageId}`);
    if (sessionKey) {
      const aiMsg = aiMsgRepo.create({
        session_id: parseInt(sessionKey, 10),
        sender_type: 'ai',
        message_type: 'action',
        text_content: reply,
      });
      await aiMsgRepo.save(aiMsg);
    }

    return { success: true, nl_reply: reply };
  }
}
