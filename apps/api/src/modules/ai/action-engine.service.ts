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
import { ActionHistory } from '../../database/entities/action-history.entity';
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

  /** Dry Run: 返回将要写入的数据预览，不实际保存 */
  dryRun(params: ActionParams, ctx: ActionContext) {
    const term = computeAcademicTerm();
    return {
      preview: {
        content: {
          school_id: ctx.schoolId,
          teacher_id: ctx.teacherId,
          content_type: params.type,
          title: params.title,
          academic_year: term.academic_year,
          semester: term.semester,
          source: 'chat',
          status: 'confirmed',
        },
        sub_table: params.type,
        file_link: params.messageId ? 'from upload' : 'none',
      },
      estimated_operations: 5,
      will_create: {
        content: 1,
        [params.type]: 1,
        lesson_attachment: 'if file exists',
        logs: 2,
      },
    };
  }

  /** 统一执行入口 */
  async execute(params: ActionParams, ctx: ActionContext) {
    const startTime = Date.now();
    const term = computeAcademicTerm();
    const createdIds: number[] = [];

    const actionRecord = this.ds.getRepository(ActionHistory).create({
      operator_id: ctx.teacherId,
      action_type: `ai_confirm_${params.type}`,
      target_type: params.type,
      status: 'running',
      input_snapshot: params,
    });

    try {
      await this.ds.transaction(async (manager) => {
        // 1. content
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

        // 2. sub-table
        let linkedLessonTitle = '';
        switch (params.type) {
          case 'personal_lesson': {
            await manager.save(
              manager.create(PersonalLesson, {
                content_id: savedContent.id,
                teacher_id: ctx.teacherId,
                subject: params.subject || null,
                grade: params.grade || null,
                chapter: params.extractedEntities?.chapter || null,
                lesson_no: params.extractedEntities?.lesson_no || null,
                body_text: params.extractedEntities?.body_text || null,
                ai_title_confidence: params.extractedEntities?.confidence || 0,
              })
            );
            break;
          }
          case 'reflection': {
            if (!params.linkedContentId) throw new BadRequestException('教学反思须关联备课');
            const linked = await manager.findOne(Content, {
              where: { id: params.linkedContentId },
            });
            if (!linked || linked.content_type !== 'personal_lesson')
              throw new BadRequestException('关联的不是备课');
            linkedLessonTitle = linked.title;
            await manager.save(
              manager.create(Reflection, {
                content_id: savedContent.id,
                lesson_content_id: params.linkedContentId,
                teacher_id: ctx.teacherId,
                reflection_text: params.extractedEntities?.reflection_text || '',
                reflection_date: new Date().toISOString().slice(0, 10),
              })
            );
            break;
          }
          case 'group_lesson': {
            await manager.save(
              manager.create(GroupLesson, {
                content_id: savedContent.id,
                creator_id: ctx.teacherId,
                department_id: ctx.departmentId,
                topic: params.extractedEntities?.topic || params.title,
                subject: params.subject || null,
                grade: params.grade || null,
              })
            );
            break;
          }
          case 'plan_summary': {
            await manager.save(
              manager.create(PlanSummary, {
                content_id: savedContent.id,
                teacher_id: ctx.teacherId,
                plan_type: params.extractedEntities?.plan_subtype || 'other',
                body_text: params.extractedEntities?.body_text || null,
              })
            );
            break;
          }
          default:
            throw new BadRequestException('不支持的类型: ' + params.type);
        }

        // 3. files
        const originalMsg = await manager.findOne(AIMessage, { where: { id: params.messageId } });
        if (originalMsg?.file_id) {
          await manager.save(
            manager.create(LessonAttachment, {
              content_id: savedContent.id,
              file_id: originalMsg.file_id,
              attachment_role: 'main',
              sort_order: 0,
            })
          );
        }

        // 4. ai_recognition_record
        await manager
          .createQueryBuilder()
          .update(AIRecognitionRecord)
          .set({ status: 'confirmed', final_type: params.type, confirmed_by: ctx.teacherId })
          .where('message_id = :msgId', { msgId: params.messageId })
          .execute();

        // 5. ai_decision_log
        await manager.save(
          manager.create(AIDecisionLog, {
            message_id: params.messageId,
            prompt_used: params.type,
            confirmed_type: params.type,
            confirmed_by: ctx.teacherId,
            confirm_status: 'confirmed',
          })
        );

        // 6. operation_log
        await manager.save(
          manager.create(OperationLog, {
            operator_id: ctx.teacherId,
            action: `ai_confirm_${params.type}`,
            target_type: 'content',
            target_id: savedContent.id,
            detail_json: { title: params.title, type: params.type },
          })
        );

        // 7. undo snapshot (Redis 5min)
        await this.redis.set(
          `undo:${params.messageId}`,
          JSON.stringify({ ids: createdIds, type: params.type, time: Date.now() }),
          'EX',
          300
        );

        // 8. Action History
        actionRecord.target_id = savedContent.id;
        actionRecord.status = 'completed';
        actionRecord.output_snapshot = { content_id: savedContent.id, created_ids: createdIds };
        actionRecord.duration_ms = Date.now() - startTime;
        await manager.save(actionRecord);
      });
    } catch (error: any) {
      actionRecord.status = 'failed';
      actionRecord.error_message = error.message;
      actionRecord.duration_ms = Date.now() - startTime;
      await this.ds.getRepository(ActionHistory).save(actionRecord);
      throw error;
    }

    // NL reply
    const successReply = buildSuccessReply(params.type, {
      title: params.title,
      linked_lesson_title: params.extractedEntities?.linked_lesson_title || '',
      academic_year: term.academic_year,
      semester: term.semester,
    });

    const sessionKey = await this.redis.get(`ai_session:${params.messageId}`);
    if (sessionKey) {
      const aiMsg = this.ds.getRepository(AIMessage).create({
        session_id: parseInt(sessionKey, 10),
        sender_type: 'ai',
        message_type: 'action',
        text_content: successReply,
      });
      await this.ds.getRepository(AIMessage).save(aiMsg);
    }

    return { success: true, nl_reply: successReply, actionId: actionRecord.id };
  }

  /** 撤销 */
  async undo(messageId: number, teacherId: number) {
    const key = `undo:${messageId}`;
    const raw = await this.redis.get(key);
    if (!raw) throw new BadRequestException('已超过撤销时限（5分钟）');

    const snapshot = JSON.parse(raw);
    if (Date.now() - snapshot.time > 300000) {
      await this.redis.del(key);
      throw new BadRequestException('已超过撤销时限（5分钟）');
    }

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
        // Mark original action as reverted
        await manager
          .createQueryBuilder()
          .update(ActionHistory)
          .set({ reverted_at: new Date(), status: 'reverted' })
          .where('target_id IN (:...ids)', { ids: snapshot.ids })
          .execute();
      });
    }

    await this.redis.del(key);
    const reply = '已撤销刚才的保存操作。你可以重新编辑后再保存。';
    const sessionKey = await this.redis.get(`ai_session:${messageId}`);
    if (sessionKey) {
      const aiMsg = this.ds.getRepository(AIMessage).create({
        session_id: parseInt(sessionKey, 10),
        sender_type: 'ai',
        message_type: 'action',
        text_content: reply,
      });
      await this.ds.getRepository(AIMessage).save(aiMsg);
    }

    return { success: true, nl_reply: reply };
  }
}
