import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { AISession } from '../../database/entities/ai-session.entity';
import { AIMessage } from '../../database/entities/ai-message.entity';
import { FileAsset } from '../../database/entities/file-asset.entity';
import { AIDecisionLog } from '../../database/entities/ai-decision-log.entity';
import { PersonalLesson } from '../../database/entities/personal-lesson.entity';
import { Content } from '../../database/entities/content.entity';
import { AISessionRepository } from '../../database/repositories/ai-session.repository';
import { AIMessageRepository } from '../../database/repositories/ai-message.repository';
import { FileAssetRepository } from '../../database/repositories/file-asset.repository';
import { AIDecisionLogRepository } from '../../database/repositories/ai-decision-log.repository';
import { PersonalLessonRepository } from '../../database/repositories/personal-lesson.repository';
import { AIController } from './ai.controller';
import { AIService } from './ai.service';
import { ActionEngineService } from './action-engine.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AISession,
      AIMessage,
      FileAsset,
      AIDecisionLog,
      PersonalLesson,
      Content,
    ]),
    BullModule.registerQueue({ name: 'ai-recognition' }),
  ],
  controllers: [AIController],
  providers: [
    AIService,
    ActionEngineService,
    AISessionRepository,
    AIMessageRepository,
    FileAssetRepository,
    AIDecisionLogRepository,
    PersonalLessonRepository,
  ],
  exports: [AIService, ActionEngineService],
})
export class AIModule {}
