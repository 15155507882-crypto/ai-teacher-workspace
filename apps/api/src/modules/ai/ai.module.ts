import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { AISession } from '../../database/entities/ai-session.entity';
import { AIMessage } from '../../database/entities/ai-message.entity';
import { FileAsset } from '../../database/entities/file-asset.entity';
import { AISessionRepository } from '../../database/repositories/ai-session.repository';
import { AIMessageRepository } from '../../database/repositories/ai-message.repository';
import { FileAssetRepository } from '../../database/repositories/file-asset.repository';
import { AIController } from './ai.controller';
import { AIService } from './ai.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([AISession, AIMessage, FileAsset]),
    BullModule.registerQueue({ name: 'ai-recognition' }),
  ],
  controllers: [AIController],
  providers: [AIService, AISessionRepository, AIMessageRepository, FileAssetRepository],
  exports: [AIService],
})
export class AIModule {}
