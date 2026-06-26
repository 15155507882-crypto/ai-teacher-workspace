import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiProvider } from '../../database/entities/ai-provider.entity';
import { AiConfig } from '../../database/entities/ai-config.entity';
import { AiCallLog } from '../../database/entities/ai-call-log.entity';
import { AiConfigController } from './ai-config.controller';
import { AiConfigService } from './ai-config.service';

@Module({
  imports: [TypeOrmModule.forFeature([AiProvider, AiConfig, AiCallLog])],
  controllers: [AiConfigController],
  providers: [AiConfigService],
})
export class AiConfigModule {}
