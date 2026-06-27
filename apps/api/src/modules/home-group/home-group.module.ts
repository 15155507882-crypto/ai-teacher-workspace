import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HomeGroup } from '../../database/entities/home-group.entity';
import { Teacher } from '../../database/entities/teacher.entity';
import { HomeGroupTeacher } from '../../database/entities/home-group-teacher.entity';
import { HomeGroupController } from './home-group.controller';
import { HomeGroupService } from './home-group.service';

@Module({
  imports: [TypeOrmModule.forFeature([HomeGroup, Teacher, HomeGroupTeacher])],
  controllers: [HomeGroupController],
  providers: [HomeGroupService],
})
export class HomeGroupModule {}
