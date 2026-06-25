import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { AISession } from '../../database/entities/ai-session.entity';
import { AIMessage } from '../../database/entities/ai-message.entity';
import { FileAsset } from '../../database/entities/file-asset.entity';
import { AIDecisionLog } from '../../database/entities/ai-decision-log.entity';
import { AISessionRepository } from '../../database/repositories/ai-session.repository';
import { AIMessageRepository } from '../../database/repositories/ai-message.repository';
import { FileAssetRepository } from '../../database/repositories/file-asset.repository';
import { AIDecisionLogRepository } from '../../database/repositories/ai-decision-log.repository';
import { AIController } from './ai.controller';
import { AIService } from './ai.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([AISession, AIMessage, FileAsset, AIDecisionLog]),
    BullModule.registerQueue({ name: 'ai-recognition' }),
  ],
  controllers: [AIController],
  providers: [
    AIService,
    AISessionRepository,
    AIMessageRepository,
    FileAssetRepository,
    AIDecisionLogRepository,
  ],
  exports: [AIService],
})
export class AIModule {}
