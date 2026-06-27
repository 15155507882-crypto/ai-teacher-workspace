import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { HomeGroupService } from './home-group.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller()
export class HomeGroupController {
  constructor(private readonly svc: HomeGroupService) {}

  @Get('admin/home-groups')
  @UseGuards(JwtAuthGuard)
  adminFindAll() {
    return this.svc.findAll();
  }

  @Post('admin/home-groups')
  @UseGuards(JwtAuthGuard)
  adminCreate(@Body() body: any) {
    return this.svc.create(body);
  }

  @Put('admin/home-groups/:id')
  @UseGuards(JwtAuthGuard)
  adminUpdate(@Param('id') id: string, @Body() body: any) {
    return this.svc.update(+id, body);
  }

  @Post('admin/home-groups/:id/toggle')
  @UseGuards(JwtAuthGuard)
  adminToggle(@Param('id') id: string) {
    return this.svc.toggleStatus(+id);
  }

  @Delete('admin/home-groups/:id')
  @UseGuards(JwtAuthGuard)
  adminDelete(@Param('id') id: string) {
    return this.svc.softDelete(+id);
  }

  @Put('admin/home-groups/:id/teachers')
  @UseGuards(JwtAuthGuard)
  adminSetTeachers(@Param('id') id: string, @Body() body: { teacher_ids: number[] }) {
    return this.svc.setTeachers(+id, body.teacher_ids || []);
  }

  @Get('home/groups')
  @UseGuards(JwtAuthGuard)
  homeGroups() {
    return this.svc.getHomeVisible();
  }
}
