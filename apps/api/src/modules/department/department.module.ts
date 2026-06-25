import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Department } from '../../database/entities/department.entity';
import { Teacher } from '../../database/entities/teacher.entity';
import { DepartmentRepository } from '../../database/repositories/department.repository';
import { TeacherRepository } from '../../database/repositories/teacher.repository';
import { DepartmentController } from './department.controller';
import { DepartmentService } from './department.service';

@Module({
  imports: [TypeOrmModule.forFeature([Department, Teacher])],
  controllers: [DepartmentController],
  providers: [DepartmentService, DepartmentRepository, TeacherRepository],
  exports: [DepartmentService],
})
export class DepartmentModule {}
