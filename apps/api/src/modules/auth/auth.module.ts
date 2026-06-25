import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Teacher } from '../../database/entities/teacher.entity';
import { LoginLog } from '../../database/entities/login-log.entity';
import { TeacherRepository } from '../../database/repositories/teacher.repository';
import { LoginLogRepository } from '../../database/repositories/login-log.repository';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CaptchaService } from './captcha.service';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev-secret',
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '1h' },
    }),
    TypeOrmModule.forFeature([Teacher, LoginLog]),
  ],
  controllers: [AuthController],
  providers: [AuthService, CaptchaService, JwtStrategy, TeacherRepository, LoginLogRepository],
  exports: [AuthService, JwtModule, PassportModule],
})
export class AuthModule {}
