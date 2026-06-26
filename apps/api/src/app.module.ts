import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { APP_GUARD } from '@nestjs/core';
import databaseConfig from './config/database.config';
import redisConfig from './config/redis.config';
import bullmqConfig from './config/bullmq.config';
import { AuthModule } from './modules/auth/auth.module';
import { SchoolModule } from './modules/school/school.module';
import { DepartmentModule } from './modules/department/department.module';
import { TeacherModule } from './modules/teacher/teacher.module';
import { ContentModule } from './modules/content/content.module';
import { AIModule } from './modules/ai/ai.module';
import { AiConfigModule } from './modules/ai-config/ai-config.module';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
      load: [databaseConfig, redisConfig, bullmqConfig],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get('database.url'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false,
        logging: process.env.NODE_ENV === 'development',
      }),
      inject: [ConfigService],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        connection: {
          url: config.get('redis.url'),
        },
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 500,
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      { name: 'ai-recognition' },
      { name: 'file-preview' },
      { name: 'pdf-export' },
      { name: 'notification' }
    ),

    // 业务模块
    AuthModule,
    SchoolModule,
    DepartmentModule,
    TeacherModule,
    ContentModule,
    AIModule,
    AiConfigModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
