import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Content } from '../../database/entities/content.entity';
import { OperationLog } from '../../database/entities/operation-log.entity';
import { DeletedRecord } from '../../database/entities/deleted-record.entity';
import { FileAsset } from '../../database/entities/file-asset.entity';
import { ContentRepository } from '../../database/repositories/content.repository';
import { OperationLogRepository } from '../../database/repositories/operation-log.repository';
import { DeletedRecordRepository } from '../../database/repositories/deleted-record.repository';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';

@Module({
  imports: [TypeOrmModule.forFeature([Content, OperationLog, DeletedRecord, FileAsset])],
  controllers: [ContentController],
  providers: [ContentService, ContentRepository, OperationLogRepository, DeletedRecordRepository],
  exports: [ContentService],
})
export class ContentModule {}
