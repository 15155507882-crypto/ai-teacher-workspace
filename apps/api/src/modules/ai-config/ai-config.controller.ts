import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AiConfigService } from './ai-config.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@workspace/shared';

@Controller('admin/ai')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AiConfigController {
  constructor(private readonly svc: AiConfigService) {}

  @Get('providers')
  getProviders() {
    return this.svc.getProviders();
  }

  @Get('config')
  getConfig() {
    return this.svc.getConfig();
  }

  @Post('config')
  saveConfig(@Body() body: any) {
    return this.svc.saveConfig(body);
  }

  @Post('test-connection')
  testConnection(@Body() body: { configId: number }) {
    return this.svc.testConnection(body.configId);
  }

  @Get('token-stats')
  getTokenStats(@Req() req: any) {
    return this.svc.getTokenStats(req.query?.range || 'today');
  }
}
