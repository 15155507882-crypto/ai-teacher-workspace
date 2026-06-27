import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiProvider } from '../../database/entities/ai-provider.entity';
import { AiConfig } from '../../database/entities/ai-config.entity';
import { AiCallLog } from '../../database/entities/ai-call-log.entity';
import { AiConfigController } from './ai-config.controller';
import { AiConfigService } from './ai-config.service';
import { AiConfigV2Controller } from './ai-config-v2.controller';
import { AiConfigV2Service } from './ai-config-v2.service';

@Module({
  imports: [TypeOrmModule.forFeature([AiProvider, AiConfig, AiCallLog])],
  controllers: [AiConfigController, AiConfigV2Controller],
  providers: [AiConfigService, AiConfigV2Service],
  exports: [AiConfigV2Service],
})
export class AiConfigModule {}
