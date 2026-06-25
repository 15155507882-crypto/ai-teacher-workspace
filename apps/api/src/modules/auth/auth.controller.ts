import { Controller, Post, Get, Body, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RefreshTokenDto } from './auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto, @Req() req: any) {
    const ip = req.ip || req.connection?.remoteAddress;
    return this.authService.login(dto, ip);
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshTokenDto) {
    const tokenPair = await this.authService.refresh(dto.refreshToken);
    return { tokenPair };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: any) {
    return this.authService.getMe(req.user.teacherId);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout() {
    // 无状态 JWT，客户端删除 token 即可
    // 后续可加入 token 黑名单 (Redis)
    return { message: '已退出登录' };
  }
}
