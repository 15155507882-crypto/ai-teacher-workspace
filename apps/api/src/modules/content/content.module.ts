import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Content } from '../../database/entities/content.entity';
import { School } from '../../database/entities/school.entity';
import { OperationLog } from '../../database/entities/operation-log.entity';
import { DeletedRecord } from '../../database/entities/deleted-record.entity';
import { FileAsset } from '../../database/entities/file-asset.entity';
import { ContentRepository } from '../../database/repositories/content.repository';
import { SchoolRepository } from '../../database/repositories/school.repository';
import { OperationLogRepository } from '../../database/repositories/operation-log.repository';
import { DeletedRecordRepository } from '../../database/repositories/deleted-record.repository';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';

@Module({
  imports: [TypeOrmModule.forFeature([Content, School, OperationLog, DeletedRecord, FileAsset])],
  controllers: [ContentController],
  providers: [
    ContentService,
    ContentRepository,
    SchoolRepository,
    OperationLogRepository,
    DeletedRecordRepository,
  ],
  exports: [ContentService],
})
export class ContentModule {}
