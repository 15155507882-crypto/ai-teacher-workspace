import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { SchoolService } from './school.service';
import { UpdateSchoolDto } from './school.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@workspace/shared';

@Controller('admin/school')
@UseGuards(JwtAuthGuard)
export class SchoolController {
  constructor(private readonly schoolService: SchoolService) {}

  @Get()
  async getSchool() {
    return this.schoolService.getSchool();
  }

  @Put()
  @Roles(Role.ADMIN)
  async updateSchool(@Body() dto: UpdateSchoolDto) {
    return this.schoolService.updateSchool(dto);
  }
}
