import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
  Req,
  Body,
  Put,
  UseGuards,
  Res,
  Post,
} from '@nestjs/common';
import { Response } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContentService } from './content.service';
import { SchoolRepository } from '../../database/repositories/school.repository';
import { GroupLessonCommentRepository } from '../../database/repositories/group-lesson-comment.repository';
import { PersonalLessonCommentRepository } from '../../database/repositories/personal-lesson-comment.repository';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FileAsset } from '../../database/entities/file-asset.entity';
import { GroupLessonComment } from '../../database/entities/group-lesson-comment.entity';
import { GroupLesson } from '../../database/entities/group-lesson.entity';
import { PersonalLesson } from '../../database/entities/personal-lesson.entity';
import { Content } from '../../database/entities/content.entity';
import { Reflection } from '../../database/entities/reflection.entity';
import { createStorageAdapter } from '@workspace/adapter-storage';
import * as fs from 'fs';
import * as path from 'path';

@Controller()
export class ContentController {
  private storage = createStorageAdapter({
    type: 'local',
    basePath: process.env.STORAGE_LOCAL_PATH || './storage',
  });

  constructor(
    private readonly contentService: ContentService,
    private readonly schoolRepo: SchoolRepository,
    private readonly commentRepo: GroupLessonCommentRepository,
    private readonly plCommentRepo: PersonalLessonCommentRepository,
    @InjectRepository(FileAsset) private readonly fileRepo: Repository<FileAsset>,
    @InjectRepository(GroupLesson) private readonly glRepo: Repository<GroupLesson>,
    @InjectRepository(PersonalLesson) private readonly plRepo: Repository<PersonalLesson>,
    @InjectRepository(Content) private readonly contentRepo: Repository<Content>,
    @InjectRepository(Reflection) private readonly reflectionRepo: Repository<Reflection>
  ) {}

  @Get('teachers/:teacherId/contents')
  @UseGuards(JwtAuthGuard)
  async listByTeacher(
    @Param('teacherId') teacherId: string,
    @Query('content_type') contentType: string,
    @Query('page') page: string,
    @Query('size') size: string
  ) {
    return this.contentService.findByTeacher(
      parseInt(teacherId, 10),
      contentType,
      parseInt(page || '1', 10),
      parseInt(size || '20', 10)
    );
  }

  @Get('teachers/:teacherId/content-stats')
  @UseGuards(JwtAuthGuard)
  async contentStats(@Param('teacherId') teacherId: string, @Req() req: any) {
    // 调用来源追踪日志
    const caller = req.headers['x-caller'] || req.headers['referer'] || 'unknown';
    console.log(
      `[content-stats] teacherId=${teacherId} caller=${caller} time=${new Date().toISOString()}`
    );

    // Get current school settings for semester filter
    let academicYear: string | undefined;
    let semester: string | undefined;
    try {
      const schools = await this.schoolRepo.findAll();
      if (schools.length > 0 && schools[0].settings) {
        academicYear = schools[0].settings.current_year;
        semester = schools[0].settings.current_semester;
      }
    } catch {}
    return this.contentService.getContentStats(parseInt(teacherId, 10), academicYear, semester);
  }

  // V2.8: 批量教师统计接口，解决首页 N+1 请求问题
  @Get('home/teachers-stats')
  @UseGuards(JwtAuthGuard)
  async batchTeacherStats(@Query('school_id') schoolId: string) {
    const sid = parseInt(schoolId || '1', 10);

    // 一条 SQL 完成所有教师的内容聚合统计
    const raw = await this.contentRepo
      .createQueryBuilder('c')
      .select('c.teacher_id', 'teacher_id')
      .addSelect(
        "COUNT(CASE WHEN c.content_type = 'personal_lesson' THEN 1 END)",
        'personal_lesson'
      )
      .addSelect("COUNT(CASE WHEN c.content_type = 'reflection' THEN 1 END)", 'reflection')
      .addSelect("COUNT(CASE WHEN c.content_type = 'group_lesson' THEN 1 END)", 'group_lesson')
      .addSelect("COUNT(CASE WHEN c.content_type = 'plan_summary' THEN 1 END)", 'plan_summary')
      .where('c.school_id = :sid', { sid })
      .andWhere('c.deleted_at IS NULL')
      .groupBy('c.teacher_id')
      .getRawMany<{
        teacher_id: string;
        personal_lesson: string;
        reflection: string;
        group_lesson: string;
        plan_summary: string;
      }>();

    // Build map: teacher_id → stats
    const result: Record<string, any> = {};
    for (const row of raw) {
      result[row.teacher_id] = {
        personal_lesson: parseInt(row.personal_lesson) || 0,
        reflection: parseInt(row.reflection) || 0,
        group_lesson: parseInt(row.group_lesson) || 0,
        plan_summary: parseInt(row.plan_summary) || 0,
      };
    }
    return { code: 0, message: 'success', data: result, requestId: '' };
  }

  @Get('contents/:id')
  @UseGuards(JwtAuthGuard)
  async detail(@Param('id') id: string) {
    return this.contentService.findById(parseInt(id, 10));
  }

  @Delete('contents/:id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id') id: string, @Req() req: any, @Body('reason') reason?: string) {
    return this.contentService.delete(parseInt(id, 10), req.user.teacherId, req.user.role, reason);
  }

  @Get('files/:id/download')
  @UseGuards(JwtAuthGuard)
  async downloadFile(@Param('id') id: string, @Res() res: Response) {
    try {
      const file = await this.fileRepo.findOne({ where: { id: parseInt(id) } });
      if (!file) return res.status(404).json({ code: 40400, message: '文件不存在' });
      const result = await this.storage.get(file.storage_key);
      if (result?.body) {
        res.setHeader('Content-Type', result.contentType || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${file.original_name}"`);
        res.send(result.body);
        return;
      }
    } catch {}
    res.status(404).json({ code: 40400, message: '文件不存在' });
  }

  @Get('files/:id/preview')
  async previewFile(@Param('id') id: string, @Res() res: Response) {
    try {
      const file = await this.fileRepo.findOne({ where: { id: parseInt(id) } });
      if (!file) return res.status(404).json({ code: 40400, message: '文件不存在' });

      // V2: If preview PDF exists, serve it
      if ((file as any).preview_status === 'SUCCESS' && (file as any).preview_url) {
        const previewResult = await this.storage.get((file as any).preview_url);
        if (previewResult?.body) {
          res.setHeader('Content-Type', 'application/pdf');
          res.send(previewResult.body);
          return;
        }
      }

      // V2: If preview is processing, return status
      if ((file as any).preview_status === 'PROCESSING') {
        return res.json({
          code: 0,
          message: '正在生成预览...',
          data: { previewStatus: 'PROCESSING' },
        });
      }

      if ((file as any).preview_status === 'FAILED') {
        return res.json({
          code: 0,
          message: '预览生成失败，可下载原文件',
          data: { previewStatus: 'FAILED', error: (file as any).preview_error },
        });
      }

      // V2: For Office docs without preview, return status instead of raw file
      const officeExts = ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'];
      if (officeExts.includes((file as any).file_ext || '')) {
        return res.json({
          code: 0,
          message: '正在生成预览...',
          data: { previewStatus: 'PENDING' },
        });
      }

      // Fallback: images, PDFs serve directly
      const result = await this.storage.get(file.storage_key);
      if (result?.body) {
        res.setHeader(
          'Content-Type',
          file.mime_type || result.contentType || 'application/octet-stream'
        );
        res.send(result.body);
        return;
      }
    } catch {}
    res.status(404).json({ code: 40400, message: '文件不存在' });
  }

  // V2: Admin endpoint to update preview status (called by worker)
  @Put('admin/files/:id/preview-status')
  async updatePreviewStatus(
    @Param('id') id: string,
    @Body() body: { status: string; previewUrl?: string; error?: string }
  ) {
    const file = await this.fileRepo.findOne({ where: { id: parseInt(id) } });
    if (!file) return { code: 40400, message: '文件不存在' };

    (file as any).preview_status = body.status;
    if (body.previewUrl) (file as any).preview_url = body.previewUrl;
    if (body.error) (file as any).preview_error = body.error;
    (file as any).preview_updated_at = new Date();

    await this.fileRepo.save(file);
    return {
      code: 0,
      message: 'success',
      data: { id: file.id, previewStatus: (file as any).preview_status },
    };
  }

  // ====== 集体备课评论 ======
  @Get('group-lessons/:contentId/comments')
  @UseGuards(JwtAuthGuard)
  async listComments(@Param('contentId') contentId: string) {
    const cid = parseInt(contentId, 10);
    const gl = await this.glRepo.findOne({ where: { content_id: cid } });
    if (!gl) return { items: [] };
    const comments = await this.commentRepo.findByGroupLesson(gl.id);
    return {
      items: comments.map((c) => ({
        id: c.id,
        teacher_id: c.teacher_id,
        teacher_name: c.teacher?.name || '未知',
        comment_text: c.comment_text,
        file_id: c.file_id,
        file_name: c.file?.original_name || null,
        created_at: c.created_at,
      })),
    };
  }

  @Post('group-lessons/:contentId/comments')
  @UseGuards(JwtAuthGuard)
  async addComment(
    @Param('contentId') contentId: string,
    @Req() req: any,
    @Body() body: { comment_text?: string; file_id?: number }
  ) {
    const cid = parseInt(contentId, 10);
    let gl = await this.glRepo.findOne({ where: { content_id: cid } });
    if (!gl) {
      gl = this.glRepo.create({
        content_id: cid,
        creator_id: req.user.teacherId,
        department_id: req.user.departmentId || 0,
        topic: '',
      });
      gl = await this.glRepo.save(gl);
    }
    if (!body.comment_text?.trim() && !body.file_id) {
      return { code: 40000, message: '评论内容或附件不能为空' };
    }
    // 时间限制：集体备课超过3天关闭留言
    const glContent = await this.contentRepo.findOne({ where: { id: cid } });
    if (glContent) {
      const daysSince = (Date.now() - new Date(glContent.created_at).getTime()) / 86400000;
      if (daysSince > 3 && req.user.role !== 'admin') {
        return { code: 40300, message: '集体备课超过3天，留言通道已关闭' };
      }
    }
    const comment = this.commentRepo.create({
      group_lesson_id: gl.id,
      teacher_id: req.user.teacherId,
      comment_text: body.comment_text?.trim() || null,
      file_id: body.file_id || null,
    });
    const saved = await this.commentRepo.save(comment);
    return { id: saved.id, created_at: saved.created_at };
  }

  @Delete('group-lessons/comments/:id')
  @UseGuards(JwtAuthGuard)
  async deleteComment(@Param('id') id: string, @Req() req: any) {
    const comment = await this.commentRepo.findById(parseInt(id, 10));
    if (!comment || comment.deleted_at) return { code: 40400, message: '评论不存在' };
    const isAdmin = req.user.role === 'admin';
    const isAuthor = comment.teacher_id === req.user.teacherId;
    const daysSinceCreated = (Date.now() - new Date(comment.created_at).getTime()) / 86400000;
    if (!isAdmin && !(isAuthor && daysSinceCreated <= 3)) {
      return { code: 40300, message: '仅作者可在3天内删除，或联系管理员' };
    }
    await this.commentRepo.softDelete(comment.id);
    return { message: '删除成功' };
  }

  // ====== 个人备课评论（教学反思留言）======
  @Get('personal-lessons/:contentId/comments')
  @UseGuards(JwtAuthGuard)
  async listPlComments(@Param('contentId') contentId: string) {
    const cid = parseInt(contentId, 10);
    const pl = await this.plRepo.findOne({ where: { content_id: cid } });
    if (!pl) return { items: [] };
    const comments = await this.plCommentRepo.findByPersonalLesson(pl.id);
    return {
      items: comments.map((c) => ({
        id: c.id,
        teacher_id: c.teacher_id,
        teacher_name: c.teacher?.name || '未知',
        comment_text: c.comment_text,
        file_id: c.file_id,
        file_name: c.file?.original_name || null,
        created_at: c.created_at,
      })),
    };
  }

  @Post('personal-lessons/:contentId/comments')
  @UseGuards(JwtAuthGuard)
  async addPlComment(
    @Param('contentId') contentId: string,
    @Req() req: any,
    @Body() body: { comment_text?: string; file_id?: number }
  ) {
    const cid = parseInt(contentId, 10);
    let pl = await this.plRepo.findOne({ where: { content_id: cid } });
    if (!pl) {
      pl = this.plRepo.create({ content_id: cid, teacher_id: req.user.teacherId });
      pl = await this.plRepo.save(pl);
    }
    // 权限检查：个人备课只允许本人留言
    const content = await this.contentRepo.findOne({ where: { id: cid } });
    if (content && req.user.teacherId !== content.teacher_id && req.user.role !== 'admin') {
      return { code: 40300, message: '个人备课仅允许本人留言' };
    }
    // 时间限制：个人备课超过7天关闭留言
    if (content) {
      const daysSince = (Date.now() - new Date(content.created_at).getTime()) / 86400000;
      if (daysSince > 7 && req.user.role !== 'admin') {
        return { code: 40300, message: '个人备课超过7天，留言通道已关闭' };
      }
    }
    if (!body.comment_text?.trim() && !body.file_id) {
      return { code: 40000, message: '评论内容或附件不能为空' };
    }
    const comment = this.plCommentRepo.create({
      personal_lesson_id: pl.id,
      teacher_id: req.user.teacherId,
      comment_text: body.comment_text?.trim() || null,
      file_id: body.file_id || null,
    });
    const saved = await this.plCommentRepo.save(comment);

    // 自动创建教学反思记录（关联到该备课）
    if (content) {
      const existingReflection = await this.reflectionRepo.findOne({
        where: { lesson_content_id: cid, teacher_id: req.user.teacherId },
      });
      if (!existingReflection) {
        const reflection = this.reflectionRepo.create({
          content_id: 0, // will be set by save
          lesson_content_id: cid,
          teacher_id: req.user.teacherId,
          reflection_text: body.comment_text?.trim() || '教学反思互动',
          reflection_date: new Date().toISOString().slice(0, 10),
        });
        // We need to create a content record for the reflection
        const contentRepo2 = this.contentRepo;
        const newContent = contentRepo2.create({
          school_id: content.school_id,
          teacher_id: req.user.teacherId,
          department_id: content.department_id,
          content_type: 'reflection',
          title: `${content.title} - 教学反思`,
          academic_year: content.academic_year,
          semester: content.semester,
          source: 'comment',
          visibility: 'school',
          status: 'confirmed',
          version: 1,
          is_latest: true,
        });
        const savedContent = await contentRepo2.save(newContent);
        reflection.content_id = savedContent.id;
        await this.reflectionRepo.save(reflection);
      }
    }

    return { id: saved.id, created_at: saved.created_at };
  }

  @Delete('personal-lessons/comments/:id')
  @UseGuards(JwtAuthGuard)
  async deletePlComment(@Param('id') id: string, @Req() req: any) {
    const comment = await this.plCommentRepo.findById(parseInt(id, 10));
    if (!comment || comment.deleted_at) return { code: 40400, message: '评论不存在' };
    const isAdmin = req.user.role === 'admin';
    const isAuthor = comment.teacher_id === req.user.teacherId;
    const daysSinceCreated = (Date.now() - new Date(comment.created_at).getTime()) / 86400000;
    if (!isAdmin && !(isAuthor && daysSinceCreated <= 3)) {
      return { code: 40300, message: '仅作者可在3天内删除，或联系管理员' };
    }
    await this.plCommentRepo.softDelete(comment.id);
    return { message: '删除成功' };
  }
}
