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
  /** 版本处理: 'overwrite' | 'new_version' | undefined (需选择) */
  versionAction?: string;
  /** 要覆盖的目标 content id */
  overwriteTargetId?: number;
}

interface VersionCheck {
  hasConflict: boolean;
  existingContent?: { id: number; version: number; created_at: Date } | null;
}

@Injectable()
export class ActionEngineService {
  private redis: Redis;

  constructor(@InjectDataSource() private readonly ds: DataSource) {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  /** 检查是否存在同名备课（版本冲突检测） */
  async checkVersionConflict(teacherId: number, title: string): Promise<VersionCheck> {
    const existing = await this.ds.getRepository(Content).findOne({
      where: { teacher_id: teacherId, title, is_latest: true, deleted_at: null as any },
      order: { version: 'DESC' },
    });
    if (existing) {
      return {
        hasConflict: true,
        existingContent: {
          id: existing.id,
          version: existing.version,
          created_at: existing.created_at,
        },
      };
    }
    return { hasConflict: false };
  }

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
        },
        version_action: params.versionAction || 'new',
      },
      estimated_operations: 5,
    };
  }

  async execute(params: ActionParams, ctx: ActionContext) {
    const startTime = Date.now();
    const term = computeAcademicTerm();

    // 版本冲突检测
    if (!params.versionAction && params.type === 'personal_lesson') {
      const conflict = await this.checkVersionConflict(ctx.teacherId, params.title);
      if (conflict.hasConflict && conflict.existingContent) {
        return {
          conflict: true,
          existing: conflict.existingContent,
          message: `已存在同名备课「${params.title}」(版本${conflict.existingContent.version})。是覆盖原版本还是保存为新版本？`,
          options: ['overwrite', 'new_version'],
        };
      }
    }

    const createdIds: number[] = [];
    const actionRecord = this.ds.getRepository(ActionHistory).create({
      operator_id: ctx.teacherId,
      action_type: `ai_confirm_${params.type}`,
      target_type: params.type,
      status: 'running',
      input_snapshot: { ...params, version_action: params.versionAction },
    });

    try {
      await this.ds.transaction(async (manager) => {
        let contentVersion = 1;
        let existingContentId: number | null = null;

        // 版本处理
        if (params.versionAction === 'overwrite' && params.overwriteTargetId) {
          const target = await manager.findOne(Content, {
            where: { id: params.overwriteTargetId },
          });
          if (target) {
            contentVersion = target.version;
            // 标记旧版本非最新
            await manager.update(Content, { id: target.id }, { is_latest: false });
            existingContentId = target.id;
          }
        } else if (params.versionAction === 'new_version') {
          const latest = await manager.findOne(Content, {
            where: {
              teacher_id: ctx.teacherId,
              title: params.title,
              is_latest: true,
              deleted_at: null as any,
            },
            order: { version: 'DESC' },
          });
          if (latest) {
            contentVersion = latest.version + 1;
            await manager.update(Content, { id: latest.id }, { is_latest: false });
            existingContentId = latest.id;
          }
        }

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
          version: contentVersion,
          is_latest: true,
        });
        const savedContent = await manager.save(content);
        createdIds.push(savedContent.id);

        // Sub-table
        switch (params.type) {
          case 'personal_lesson':
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
          case 'reflection': {
            if (!params.linkedContentId) throw new BadRequestException('教学反思须关联备课');
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
          case 'group_lesson':
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
          case 'plan_summary':
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

        // Files
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

        // Recognition
        await manager
          .createQueryBuilder()
          .update(AIRecognitionRecord)
          .set({ status: 'confirmed', final_type: params.type, confirmed_by: ctx.teacherId })
          .where('message_id = :msgId', { msgId: params.messageId })
          .execute();

        // Logs
        await manager.save(
          manager.create(AIDecisionLog, {
            message_id: params.messageId,
            prompt_used: params.type,
            confirmed_type: params.type,
            confirmed_by: ctx.teacherId,
            confirm_status: 'confirmed',
          })
        );
        await manager.save(
          manager.create(OperationLog, {
            operator_id: ctx.teacherId,
            action: `ai_confirm_${params.type}`,
            target_type: 'content',
            target_id: savedContent.id,
            detail_json: { title: params.title, type: params.type, version: contentVersion },
          })
        );

        // Undo snapshot
        await this.redis.set(
          `undo:${params.messageId}`,
          JSON.stringify({ ids: createdIds, type: params.type, time: Date.now() }),
          'EX',
          300
        );

        // Action History
        actionRecord.target_id = savedContent.id;
        actionRecord.status = 'completed';
        actionRecord.output_snapshot = {
          content_id: savedContent.id,
          version: contentVersion,
          is_new_version: existingContentId ? true : false,
          overwritten_id: params.versionAction === 'overwrite' ? params.overwriteTargetId : null,
        };
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

    const successReply = buildSuccessReply(params.type, {
      title: params.title,
      linked_lesson_title: params.extractedEntities?.linked_lesson_title || '',
      academic_year: term.academic_year,
      semester: term.semester,
    });

    const sessionKey = await this.redis.get(`ai_session:${params.messageId}`);
    if (sessionKey) {
      await this.ds.getRepository(AIMessage).save(
        this.ds.getRepository(AIMessage).create({
          session_id: parseInt(sessionKey, 10),
          sender_type: 'ai',
          message_type: 'action',
          text_content: successReply,
        })
      );
    }

    return { success: true, nl_reply: successReply, actionId: actionRecord.id };
  }

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
        await manager
          .createQueryBuilder()
          .update(ActionHistory)
          .set({ reverted_at: new Date(), status: 'reverted' })
          .where('target_id IN (:...ids)', { ids: snapshot.ids })
          .execute();
      });
    }
    await this.redis.del(key);
    const reply = '已撤销刚才的保存操作。';
    const sessionKey = await this.redis.get(`ai_session:${messageId}`);
    if (sessionKey) {
      await this.ds.getRepository(AIMessage).save(
        this.ds.getRepository(AIMessage).create({
          session_id: parseInt(sessionKey, 10),
          sender_type: 'ai',
          message_type: 'action',
          text_content: reply,
        })
      );
    }
    return { success: true, nl_reply: reply };
  }
}
