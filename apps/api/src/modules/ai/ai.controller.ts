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
import { ChatDto } from './ai.dto';
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
    private readonly fileRepo: FileAssetRepository
  ) {}

  /** 统一 AI 聊天入口 */
  @Post('chat')
  async chat(@Req() req: any, @Body() dto: ChatDto) {
    return this.aiService.chat(req.user.teacherId, req.user.schoolId, dto);
  }

  /** 文件上传 (AI 上下文) */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@Req() req: any, @UploadedFile() file: any) {
    if (!file) throw new BadRequestException('请选择文件');

    const allowed = ['doc', 'docx', 'ppt', 'pptx', 'pdf', 'jpg', 'jpeg', 'png', 'gif', 'txt'];
    const ext = file.originalname.split('.').pop()?.toLowerCase() || '';
    if (!allowed.includes(ext)) {
      throw new BadRequestException(`不支持的文件类型: ${ext}`);
    }

    const maxSize = parseInt(process.env.UPLOAD_MAX_SIZE_MB || '200', 10) * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException(`文件超过 ${process.env.UPLOAD_MAX_SIZE_MB || 200}MB 限制`);
    }

    const storageKey = `original/${Date.now()}_${file.originalname}`;
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

  /** 获取当前活跃会话 */
  @Get('session')
  async getSession(@Req() req: any) {
    return this.aiService.getActiveSession(req.user.teacherId);
  }

  /** 获取会话消息 */
  @Get('session/:sessionId/messages')
  async getMessages(@Param('sessionId') sessionId: string) {
    return this.aiService.getMessages(parseInt(sessionId, 10));
  }
}
