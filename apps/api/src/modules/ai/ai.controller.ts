import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AIService } from './ai.service';
import { ActionEngineService } from './action-engine.service';
import { ChatDto, ConfirmActionDto } from './ai.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { createStorageAdapter } from '@workspace/adapter-storage';
import { FileAssetRepository } from '../../database/repositories/file-asset.repository';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AIController {
  private storage = createStorageAdapter({
    type: 'local',
    basePath: process.env.STORAGE_LOCAL_PATH || './storage',
  });

  constructor(
    private readonly aiService: AIService,
    private readonly actionEngine: ActionEngineService,
    private readonly fileRepo: FileAssetRepository
  ) {}

  @Post('chat')
  async chat(@Req() req: any, @Body() dto: ChatDto) {
    return this.aiService.chat(req.user.teacherId, req.user.schoolId, dto);
  }

  @Get('recognition/:messageId')
  async getRecognition(@Param('messageId') messageId: string) {
    return this.aiService.getRecognitionResult(parseInt(messageId, 10));
  }

  /** Dry Run: 预览确认后将要写入的内容 */
  @Post('confirm/dry-run')
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

  /** 确认保存（统一 Action Engine 入口） */
  @Post('confirm')
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

  /** 撤销操作（5分钟内） */
  @Post('undo/:messageId')
  async undo(@Param('messageId') messageId: string, @Req() req: any) {
    return this.actionEngine.undo(parseInt(messageId, 10), req.user.teacherId);
  }

  @Post('upload')
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

  @Get('session')
  async getSession(@Req() req: any) {
    return this.aiService.getActiveSession(req.user.teacherId);
  }

  @Get('session/:sessionId/messages')
  async getMessages(@Param('sessionId') sessionId: string) {
    return this.aiService.getMessages(parseInt(sessionId, 10));
  }
}
