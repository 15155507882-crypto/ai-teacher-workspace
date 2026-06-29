import { Controller, Post, Get, Body, Req, UseGuards, Res, Param } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { CaptchaService } from './captcha.service';
import { LoginDto, RefreshTokenDto } from './auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly captchaService: CaptchaService
  ) {}

  @Public()
  @Get('captcha')
  async getCaptcha(@Res() res: Response) {
    const result = await this.captchaService.generate();
    // Prevent caching
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      Pragma: 'no-cache',
    });
    res.json({ code: 0, message: 'success', data: result, requestId: '' });
  }

  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto, @Req() req: any) {
    const ip = req.ip || req.connection?.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // Verify captcha
    const captchaValid = await this.captchaService.verify(
      dto.captchaId || '',
      dto.captchaCode || ''
    );
    if (!captchaValid) {
      return { code: 40001, message: '验证码错误或已过期', data: null, requestId: '' };
    }

    return this.authService.login(dto, ip, userAgent);
  }

  @Public()
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
    return { message: '已退出登录' };
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @Req() req: any,
    @Body() body: { currentPassword: string; newPassword: string }
  ) {
    return this.authService.changePassword(
      req.user.teacherId,
      body.currentPassword,
      body.newPassword
    );
  }

  @Post(':teacherId/reset-password')
  @UseGuards(JwtAuthGuard)
  async resetPassword(@Param('teacherId') teacherId: string, @Req() req: any) {
    // 仅管理员可重置
    if (req.user.role !== 'admin') {
      return { code: 40300, message: '仅管理员可重置密码' };
    }
    return this.authService.resetPassword(parseInt(teacherId, 10), 'admin@2026');
  }
}
