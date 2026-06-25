import { Controller, Get, Post, Put, Param, Body, Query, UseGuards } from '@nestjs/common';
import { DepartmentService } from './department.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from './department.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@workspace/shared';

@Controller('admin/departments')
@UseGuards(JwtAuthGuard)
@Roles(Role.ADMIN)
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  @Get()
  async list(@Query('school_id') schoolId: string) {
    const sid = parseInt(schoolId || '1', 10);
    return this.departmentService.getList(sid);
  }

  @Get('tree')
  async tree(@Query('school_id') schoolId: string) {
    const sid = parseInt(schoolId || '1', 10);
    return this.departmentService.getTree(sid);
  }

  @Post()
  async create(@Body() dto: CreateDepartmentDto) {
    return this.departmentService.create(dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateDepartmentDto) {
    return this.departmentService.update(parseInt(id, 10), dto);
  }

  @Post(':id/disable')
  async disable(@Param('id') id: string) {
    return this.departmentService.disable(parseInt(id, 10));
  }
}
