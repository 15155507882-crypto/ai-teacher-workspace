import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Teacher } from '../../database/entities/teacher.entity';
import { TeacherStatusHistory } from '../../database/entities/teacher-status-history.entity';
import { TeacherRepository } from '../../database/repositories/teacher.repository';
import { TeacherStatusHistoryRepository } from '../../database/repositories/teacher-status-history.repository';
import { TeacherController } from './teacher.controller';
import { TeacherService } from './teacher.service';

@Module({
  imports: [TypeOrmModule.forFeature([Teacher, TeacherStatusHistory])],
  controllers: [TeacherController],
  providers: [TeacherService, TeacherRepository, TeacherStatusHistoryRepository],
  exports: [TeacherService],
})
export class TeacherModule {}
