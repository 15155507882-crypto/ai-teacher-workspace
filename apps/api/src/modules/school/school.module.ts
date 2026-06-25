import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { School } from '../../database/entities/school.entity';
import { SchoolRepository } from '../../database/repositories/school.repository';
import { SchoolController } from './school.controller';
import { SchoolService } from './school.service';

@Module({
  imports: [TypeOrmModule.forFeature([School])],
  controllers: [SchoolController],
  providers: [SchoolService, SchoolRepository],
  exports: [SchoolService],
})
export class SchoolModule {}
