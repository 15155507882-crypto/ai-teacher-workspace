import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { TeacherRepository } from '../../database/repositories/teacher.repository';
import { LoginLogRepository } from '../../database/repositories/login-log.repository';
import { LoginDto } from './auth.dto';
import { Role } from '@workspace/shared';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface JwtPayload {
  sub: number;
  teacherId: number;
  schoolId: number;
  departmentId: number;
  role: Role;
  mobile: string;
  name: string;
  tokenVersion: number;
  type: 'access' | 'refresh';
}

@Injectable()
export class AuthService {
  constructor(
    private readonly teacherRepo: TeacherRepository,
    private readonly loginLogRepo: LoginLogRepository,
    private readonly jwtService: JwtService
  ) {}

  async login(
    dto: LoginDto,
    ip?: string,
    userAgent?: string
  ): Promise<{ tokenPair: TokenPair; teacher: any }> {
    const teacher = await this.teacherRepo.findByMobile(dto.mobile);
    const deviceInfo = this.parseUserAgent(userAgent);

    if (!teacher || teacher.status !== 'active') {
      await this.recordLoginLog(dto.mobile, null, 'failed', '账号不存在或已禁用', ip, deviceInfo);
      throw new UnauthorizedException('账号或密码错误');
    }

    const valid = await bcrypt.compare(dto.password, teacher.password_hash);
    if (!valid) {
      await this.recordLoginLog(dto.mobile, teacher.id, 'failed', '密码错误', ip, deviceInfo);
      throw new UnauthorizedException('账号或密码错误');
    }

    const payload: Omit<JwtPayload, 'type'> = {
      sub: teacher.id,
      teacherId: teacher.id,
      schoolId: teacher.school_id,
      departmentId: teacher.department_id,
      role: teacher.role as Role,
      mobile: teacher.mobile,
      name: teacher.name,
      tokenVersion: teacher.token_version,
    };

    const tokenPair = this.generateTokenPair(payload);

    // 更新最后登录时间
    teacher.last_login_at = new Date();
    await this.teacherRepo.save(teacher);

    await this.recordLoginLog(dto.mobile, teacher.id, 'success', undefined, ip, deviceInfo);

    return {
      tokenPair,
      teacher: {
        id: teacher.id,
        name: teacher.name,
        mobile: teacher.mobile,
        role: teacher.role,
        schoolId: teacher.school_id,
        departmentId: teacher.department_id,
      },
    };
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'dev-secret',
      });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('无效的刷新令牌');
      }

      const teacher = await this.teacherRepo.findById(payload.teacherId);
      if (!teacher || teacher.status !== 'active') {
        throw new UnauthorizedException('账号已失效');
      }

      const newPayload: Omit<JwtPayload, 'type'> = {
        sub: teacher.id,
        teacherId: teacher.id,
        schoolId: teacher.school_id,
        departmentId: teacher.department_id,
        role: teacher.role as Role,
        mobile: teacher.mobile,
        name: teacher.name,
        tokenVersion: teacher.token_version,
      };

      return this.generateTokenPair(newPayload);
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('刷新令牌无效或已过期');
    }
  }

  async getMe(teacherId: number) {
    const teacher = await this.teacherRepo.findById(teacherId);
    if (!teacher) throw new UnauthorizedException('用户不存在');

    return {
      id: teacher.id,
      name: teacher.name,
      mobile: teacher.mobile,
      role: teacher.role,
      schoolId: teacher.school_id,
      departmentId: teacher.department_id,
      avatarFileId: teacher.avatar_file_id,
      status: teacher.status,
      lastLoginAt: teacher.last_login_at,
    };
  }

  private generateTokenPair(payload: Omit<JwtPayload, 'type'>): TokenPair {
    const accessToken = this.jwtService.sign(
      { ...payload, type: 'access' },
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );

    const refreshToken = this.jwtService.sign(
      { ...payload, type: 'refresh' },
      {
        secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'dev-secret',
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      }
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600, // 1h in seconds
    };
  }

  private async recordLoginLog(
    mobile: string,
    teacherId: number | null,
    status: string,
    failReason?: string,
    ip?: string,
    deviceInfo?: { device?: string; browser?: string; os?: string }
  ) {
    const log = this.loginLogRepo.create({
      mobile,
      teacher_id: teacherId,
      status,
      fail_reason: failReason || null,
      ip: ip || null,
      device: deviceInfo?.device || null,
      browser: deviceInfo?.browser || null,
      os: deviceInfo?.os || null,
    });
    await this.loginLogRepo.save(log);
  }

  private parseUserAgent(ua?: string): { device?: string; browser?: string; os?: string } {
    if (!ua) return {};
    const info: { device?: string; browser?: string; os?: string } = {};

    // OS detection (simplified)
    if (ua.includes('Windows NT')) info.os = 'Windows';
    else if (ua.includes('Mac OS X')) info.os = 'macOS';
    else if (ua.includes('Linux')) info.os = 'Linux';
    else if (ua.includes('Android')) info.os = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) info.os = 'iOS';

    // Device detection
    if (ua.includes('Mobile')) info.device = 'Mobile';
    else if (ua.includes('Tablet')) info.device = 'Tablet';
    else info.device = 'Desktop';

    // Browser detection (simplified)
    if (ua.includes('Edg/')) info.browser = 'Edge';
    else if (ua.includes('Chrome/')) info.browser = 'Chrome';
    else if (ua.includes('Safari/') && !ua.includes('Chrome/')) info.browser = 'Safari';
    else if (ua.includes('Firefox/')) info.browser = 'Firefox';

    return info;
  }
}
