import { Controller, Get, Post, Put, Delete, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('ai/conversations')
@UseGuards(JwtAuthGuard)
export class ConversationController {
  constructor(private readonly svc: ConversationService) {}

  @Get('today')
  getToday(@Req() req: any) {
    return this.svc.getOrCreateToday(req.user.teacherId);
  }

  @Get()
  list(@Req() req: any, @Query('keyword') keyword?: string) {
    return this.svc.list(req.user.teacherId, keyword);
  }

  @Put(':id/title')
  updateTitle(@Param('id') id: string, @Req() req: any, @Query('title') title: string) {
    return this.svc.updateTitle(+id, req.user.teacherId, title || '新会话');
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.svc.remove(+id, req.user.teacherId);
  }
}
