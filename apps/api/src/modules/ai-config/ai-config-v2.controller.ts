import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Res,
  HttpCode,
} from '@nestjs/common';
import { AiConfigV2Service } from './ai-config-v2.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Role } from '@workspace/shared';

@Controller('admin/ai-configs')
@UseGuards(JwtAuthGuard)
@Roles(Role.ADMIN)
export class AiConfigV2Controller {
  constructor(private readonly svc: AiConfigV2Service) {}

  @Get()
  list() {
    return this.svc.list();
  }

  @Post()
  create(@Body() body: any) {
    return this.svc.create(body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.svc.update(+id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(+id);
  }

  @Post(':id/test')
  testConnection(@Param('id') id: string) {
    return this.svc.testConnection(+id);
  }

  @Post(':id/activate')
  setActive(@Param('id') id: string) {
    return this.svc.setActive(+id);
  }

  @Post(':id/enable')
  enable(@Param('id') id: string) {
    return this.svc.enable(+id);
  }

  @Post(':id/disable')
  disable(@Param('id') id: string) {
    return this.svc.disable(+id);
  }

  @Get('stats')
  getStats(@Query('range') range: string) {
    return this.svc.getTokenStats(range || 'month');
  }

  @Get('stats/users')
  getStatsByUser(@Query('range') range: string) {
    return this.svc.getTokenStatsByUser(range || 'month');
  }

  // ======= Internal endpoint for Worker =======

  /** Worker 内部调用：获取当前生效的 AI 配置（含解密后的 API Key） */
  @Public()
  @Get('/active/internal')
  async getActiveInternal(@Res() res: any) {
    try {
      const active = await this.svc.getActive();
      if (!active) return res.json({ code: -1, message: '暂无当前生效的 Provider' });
      return res.json({
        code: 0,
        data: {
          id: active.config.id,
          name: active.config.name,
          provider_type: active.config.provider_type,
          api_key: active.apiKey,
          base_url: active.config.base_url,
          default_model: active.config.default_model,
        },
      });
    } catch (e: any) {
      return res.json({ code: -1, message: e.message || '获取配置失败' });
    }
  }

  /** Worker 内部调用：写入调用日志 */
  @Public()
  @Post('/log-call')
  @HttpCode(200)
  async logCall(@Body() body: any) {
    await this.svc.logCall(body);
    return { code: 0 };
  }
}
