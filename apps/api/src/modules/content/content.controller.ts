import { Controller, Get, Delete, Param, Query, Req, Body, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContentService } from './content.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FileAsset } from '../../database/entities/file-asset.entity';
import { createStorageAdapter } from '@workspace/adapter-storage';
import * as fs from 'fs';
import * as path from 'path';

@Controller()
export class ContentController {
  private storage = createStorageAdapter({ type: 'local', basePath: process.env.STORAGE_LOCAL_PATH || './storage' });

  constructor(
    private readonly contentService: ContentService,
    @InjectRepository(FileAsset) private readonly fileRepo: Repository<FileAsset>,
  ) {}

  @Get('teachers/:teacherId/contents')
  @UseGuards(JwtAuthGuard)
  async listByTeacher(@Param('teacherId') teacherId: string, @Query('content_type') contentType: string, @Query('page') page: string, @Query('size') size: string) {
    return this.contentService.findByTeacher(parseInt(teacherId, 10), contentType, parseInt(page || '1', 10), parseInt(size || '20', 10));
  }

  @Get('teachers/:teacherId/content-stats')
  @UseGuards(JwtAuthGuard)
  async contentStats(@Param('teacherId') teacherId: string) {
    return this.contentService.getContentStats(parseInt(teacherId, 10));
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
      const result = await this.storage.get(file.storage_key);
      if (result?.body) {
        res.setHeader('Content-Type', file.mime_type || result.contentType || 'application/octet-stream');
        res.send(result.body);
        return;
      }
    } catch {}
    res.status(404).json({ code: 40400, message: '文件不存在' });
  }
}
