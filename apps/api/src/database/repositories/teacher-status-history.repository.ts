import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherStatusHistory } from '../entities/teacher-status-history.entity';

@Injectable()
export class TeacherStatusHistoryRepository {
  constructor(
    @InjectRepository(TeacherStatusHistory)
    private readonly repo: Repository<TeacherStatusHistory>
  ) {}

  findByTeacher(teacherId: number): Promise<TeacherStatusHistory[]> {
    return this.repo.find({ where: { teacher_id: teacherId }, order: { created_at: 'DESC' } });
  }

  create(data: Partial<TeacherStatusHistory>): TeacherStatusHistory {
    return this.repo.create(data);
  }

  async save(entity: TeacherStatusHistory): Promise<TeacherStatusHistory> {
    return this.repo.save(entity);
  }
}
