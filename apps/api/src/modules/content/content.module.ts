import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Content } from '../../database/entities/content.entity';
import { School } from '../../database/entities/school.entity';
import { OperationLog } from '../../database/entities/operation-log.entity';
import { DeletedRecord } from '../../database/entities/deleted-record.entity';
import { FileAsset } from '../../database/entities/file-asset.entity';
import { GroupLessonComment } from '../../database/entities/group-lesson-comment.entity';
import { PersonalLessonComment } from '../../database/entities/personal-lesson-comment.entity';
import { GroupLesson } from '../../database/entities/group-lesson.entity';
import { PersonalLesson } from '../../database/entities/personal-lesson.entity';
import { Reflection } from '../../database/entities/reflection.entity';
import { ContentRepository } from '../../database/repositories/content.repository';
import { SchoolRepository } from '../../database/repositories/school.repository';
import { OperationLogRepository } from '../../database/repositories/operation-log.repository';
import { DeletedRecordRepository } from '../../database/repositories/deleted-record.repository';
import { GroupLessonCommentRepository } from '../../database/repositories/group-lesson-comment.repository';
import { PersonalLessonCommentRepository } from '../../database/repositories/personal-lesson-comment.repository';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Content,
      School,
      OperationLog,
      DeletedRecord,
      FileAsset,
      GroupLessonComment,
      PersonalLessonComment,
      GroupLesson,
      PersonalLesson,
      Reflection,
    ]),
  ],
  controllers: [ContentController],
  providers: [
    ContentService,
    ContentRepository,
    SchoolRepository,
    OperationLogRepository,
    DeletedRecordRepository,
    GroupLessonCommentRepository,
    PersonalLessonCommentRepository,
  ],
  exports: [ContentService],
})
export class ContentModule {}
