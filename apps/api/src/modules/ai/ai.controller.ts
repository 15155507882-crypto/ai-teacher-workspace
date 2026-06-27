import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Req,
  UseGuards,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AIService } from './ai.service';
import { ActionEngineService } from './action-engine.service';
import { ChatDto, ConfirmActionDto } from './ai.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@workspace/shared';
import { ActionHistory } from '../../database/entities/action-history.entity';
import { createStorageAdapter } from '@workspace/adapter-storage';
import { FileAssetRepository } from '../../database/repositories/file-asset.repository';

@Controller()
@UseGuards(JwtAuthGuard)
export class AIController {
  private storage = createStorageAdapter({
    type: 'local',
    basePath: process.env.STORAGE_LOCAL_PATH || './storage',
  });

  constructor(
    private readonly aiService: AIService,
    private readonly actionEngine: ActionEngineService,
    private readonly fileRepo: FileAssetRepository,
    @InjectRepository(ActionHistory) private readonly actionHistoryRepo: Repository<ActionHistory>
  ) {}

  @Post('ai/chat')
  async chat(@Req() req: any, @Body() dto: ChatDto) {
    return this.aiService.chat(req.user.teacherId, req.user.schoolId, dto);
  }

  @Get('ai/recognition/:messageId')
  async getRecognition(@Param('messageId') messageId: string) {
    return this.aiService.getRecognitionResult(parseInt(messageId, 10));
  }

  @Post('ai/confirm/dry-run')
  async dryRun(@Req() req: any, @Body() dto: ConfirmActionDto) {
    return this.actionEngine.dryRun(
      {
        messageId: dto.messageId,
        type: dto.type,
        title: dto.title,
        subject: dto.subject,
        grade: dto.grade,
        linkedContentId: dto.linkedContentId,
        extractedEntities: dto.extractedEntities,
      },
      {
        teacherId: req.user.teacherId,
        schoolId: req.user.schoolId,
        departmentId: req.user.departmentId || 0,
        operatorName: req.user.name,
      }
    );
  }

  @Post('ai/confirm')
  async confirm(@Req() req: any, @Body() dto: ConfirmActionDto) {
    return this.actionEngine.execute(
      {
        messageId: dto.messageId,
        type: dto.type,
        title: dto.title,
        subject: dto.subject,
        grade: dto.grade,
        linkedContentId: dto.linkedContentId,
        extractedEntities: dto.extractedEntities,
      },
      {
        teacherId: req.user.teacherId,
        schoolId: req.user.schoolId,
        departmentId: req.user.departmentId || 0,
        operatorName: req.user.name,
      }
    );
  }

  @Post('ai/undo/:messageId')
  async undo(@Param('messageId') messageId: string, @Req() req: any) {
    return this.actionEngine.undo(parseInt(messageId, 10), req.user.teacherId);
  }

  @Post('ai/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@Req() req: any, @UploadedFile() file: any) {
    if (!file) throw new BadRequestException('请选择文件');
    const allowed = ['doc', 'docx', 'ppt', 'pptx', 'pdf', 'jpg', 'jpeg', 'png', 'gif', 'txt'];
    const ext = file.originalname.split('.').pop()?.toLowerCase() || '';
    if (!allowed.includes(ext)) throw new BadRequestException('不支持的文件类型: ' + ext);
    const maxSize = parseInt(process.env.UPLOAD_MAX_SIZE_MB || '200', 10) * 1024 * 1024;
    if (file.size > maxSize) throw new BadRequestException('文件超过限制');
    const storageKey = 'original/' + Date.now() + '_' + file.originalname;
    await this.storage.put({ key: storageKey, body: file.buffer, contentType: file.mimetype });
    const asset = this.fileRepo.create({
      school_id: req.user.schoolId,
      uploader_id: req.user.teacherId,
      original_name: file.originalname,
      storage_key: storageKey,
      mime_type: file.mimetype,
      file_ext: ext,
      file_size: file.size,
      status: 'uploaded',
    });
    const saved = await this.fileRepo.save(asset);
    return {
      file_id: saved.id,
      original_name: saved.original_name,
      mime_type: saved.mime_type,
      file_ext: saved.file_ext,
      file_size: saved.file_size,
    };
  }

  @Get('ai/session')
  async getSession(@Req() req: any) {
    return this.aiService.getActiveSession(req.user.teacherId);
  }

  @Get('ai/session/:sessionId/messages')
  async getMessages(@Param('sessionId') sessionId: string) {
    return this.aiService.getMessages(parseInt(sessionId, 10));
  }

  @Get('ai/chat-quota')
  async getChatQuota(@Req() req: any) {
    const redis = this.aiService.getRedis();
    const today = new Date().toISOString().slice(0, 10);
    const key = `ai:chat_quota:${req.user.teacherId}:${today}`;
    const used = parseInt((await redis.get(key)) || '0', 10);
    return { used, limit: 10, remaining: Math.max(0, 10 - used), date: today };
  }

  // Admin: AI Action History
  @Get('admin/ai-actions')
  @Roles(Role.ADMIN)
  async listActions(@Query('size') size: string) {
    const take = Math.min(parseInt(size || '50', 10), 200);
    const items = await this.actionHistoryRepo.find({
      order: { created_at: 'DESC' },
      take,
    });
    return { items, total: items.length };
  }
}
