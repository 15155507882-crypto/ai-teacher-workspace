import { Controller, Post, Put, Param, Body, Req, UseGuards } from '@nestjs/common';
import { TeacherService } from './teacher.service';
import {
  CreateTeacherDto,
  UpdateTeacherDto,
  ResetPasswordDto,
  StatusChangeDto,
} from './teacher.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@workspace/shared';

@Controller('admin/teachers')
@UseGuards(JwtAuthGuard)
@Roles(Role.ADMIN)
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) {}

  @Post()
  async create(@Body() dto: CreateTeacherDto) {
    return this.teacherService.create(dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTeacherDto, @Req() req: any) {
    return this.teacherService.update(parseInt(id, 10), dto, req.user.teacherId);
  }

  @Post(':id/reset-password')
  async resetPassword(@Param('id') id: string, @Body() dto: ResetPasswordDto) {
    return this.teacherService.resetPassword(parseInt(id, 10), dto);
  }

  @Post(':id/disable')
  async disable(@Param('id') id: string, @Body() dto: StatusChangeDto, @Req() req: any) {
    return this.teacherService.disable(parseInt(id, 10), req.user.teacherId, dto.reason);
  }

  @Post(':id/resign')
  async resign(@Param('id') id: string, @Body() dto: StatusChangeDto, @Req() req: any) {
    return this.teacherService.resign(parseInt(id, 10), req.user.teacherId, dto.reason);
  }

  @Post(':id/restore')
  async restore(@Param('id') id: string, @Body() dto: StatusChangeDto, @Req() req: any) {
    return this.teacherService.restore(parseInt(id, 10), req.user.teacherId, dto.reason);
  }
}
