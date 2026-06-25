import { Controller, Get, Delete, Param, Query, Req, Body, UseGuards } from '@nestjs/common';
import { ContentService } from './content.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OwnerResource } from '../../common/decorators/owner-resource.decorator';
import { OwnershipGuard } from '../../common/guards/ownership.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@workspace/shared';

@Controller()
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  /** 教师空间：获取某教师的内容列表 (全校可查看) */
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

  /** 内容详情 */
  @Get('contents/:id')
  @UseGuards(JwtAuthGuard)
  async detail(@Param('id') id: string) {
    return this.contentService.findById(parseInt(id, 10));
  }

  /** 删除内容 (本人或管理员) */
  @Delete('contents/:id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id') id: string, @Req() req: any, @Body('reason') reason?: string) {
    return this.contentService.delete(parseInt(id, 10), req.user.teacherId, req.user.role, reason);
  }
}
