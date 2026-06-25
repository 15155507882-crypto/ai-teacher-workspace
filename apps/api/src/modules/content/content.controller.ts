import { Controller, Get, Delete, Param, Query, Req, Body, UseGuards } from '@nestjs/common';
import { ContentService } from './content.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller()
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

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
}
