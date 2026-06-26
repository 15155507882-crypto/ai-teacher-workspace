import { Controller, Get, Post, Put, Param, Body, Query, Req, UseGuards } from '@nestjs/common';
import { TeacherService } from './teacher.service';
import {
  CreateTeacherDto,
  UpdateTeacherDto,
  TeacherQueryDto,
  ResetPasswordDto,
  StatusChangeDto,
} from './teacher.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Role } from '@workspace/shared';

@Controller()
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) {}

  // ==================== Admin Endpoints ====================

  @Get('admin/teachers')
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN)
  async list(@Query() query: TeacherQueryDto) {
    return this.teacherService.list(query);
  }

  @Post('admin/teachers')
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN)
  async create(@Body() dto: CreateTeacherDto) {
    return this.teacherService.create(dto);
  }

  @Put('admin/teachers/:id')
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN)
  async update(@Param('id') id: string, @Body() dto: UpdateTeacherDto, @Req() req: any) {
    return this.teacherService.update(parseInt(id, 10), dto, req.user.teacherId);
  }

  @Post('admin/teachers/:id/reset-password')
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN)
  async resetPassword(@Param('id') id: string, @Body() dto: ResetPasswordDto) {
    return this.teacherService.resetPassword(parseInt(id, 10), dto);
  }

  @Post('admin/teachers/:id/disable')
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN)
  async disable(@Param('id') id: string, @Body() dto: StatusChangeDto, @Req() req: any) {
    return this.teacherService.disable(parseInt(id, 10), req.user.teacherId, dto.reason);
  }

  @Post('admin/teachers/:id/resign')
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN)
  async resign(@Param('id') id: string, @Body() dto: StatusChangeDto, @Req() req: any) {
    return this.teacherService.resign(parseInt(id, 10), req.user.teacherId, dto.reason);
  }

  @Post('admin/teachers/:id/restore')
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN)
  async restore(@Param('id') id: string, @Body() dto: StatusChangeDto, @Req() req: any) {
    return this.teacherService.restore(parseInt(id, 10), req.user.teacherId, dto.reason);
  }

  // ==================== Public Endpoint ====================

  @Get('home/teachers')
  @UseGuards(JwtAuthGuard)
  async publicList(
    @Query('school_id') schoolId: string,
    @Query('department_id') departmentId: string,
    @Query('keyword') keyword: string
  ) {
    const sid = parseInt(schoolId || '1', 10);
    const did = departmentId ? parseInt(departmentId, 10) : undefined;
    return this.teacherService.publicList(sid, did, keyword);
  }

  @Post('admin/teachers/batch-import')
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN)
  async batchImport(@Body() body: { teachers: any[] }) {
    return this.teacherService.batchImport(body.teachers || []);
  }
}
