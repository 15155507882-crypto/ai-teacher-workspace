import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { SchoolService } from './school.service';
import { UpdateSchoolDto, UpdateSchoolSettingsDto } from './school.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Role } from '@workspace/shared';

@Controller()
export class SchoolController {
  constructor(private readonly schoolService: SchoolService) {}

  /** 公开接口：登录页、首页、PDF导出获取学校信息 */
  @Get('public/school')
  @Public()
  async getPublicSchool() {
    return this.schoolService.getSchool();
  }

  /** 管理端：获取学校信息 */
  @Get('admin/school')
  @UseGuards(JwtAuthGuard)
  async getSchool() {
    return this.schoolService.getSchool();
  }

  /** 管理端：更新学校信息 */
  @Put('admin/school')
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN)
  async updateSchool(@Body() dto: UpdateSchoolDto) {
    return this.schoolService.updateSchool(dto);
  }

  /** 管理端：获取学校设置(学年/学期等) */
  @Get('admin/school/settings')
  @UseGuards(JwtAuthGuard)
  async getSettings() {
    const school = await this.schoolService.getSchool();
    return school.settings || {};
  }

  /** 管理端：更新学校设置(学年/学期等) */
  @Put('admin/school/settings')
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN)
  async updateSettings(@Body() dto: UpdateSchoolSettingsDto) {
    return this.schoolService.updateSettings(dto);
  }
}
