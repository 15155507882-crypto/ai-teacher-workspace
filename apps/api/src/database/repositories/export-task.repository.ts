import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExportTask } from '../entities/export-task.entity';

@Injectable()
export class ExportTaskRepository {
  constructor(
    @InjectRepository(ExportTask)
    private readonly repo: Repository<ExportTask>
  ) {}

  findById(id: number): Promise<ExportTask | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByTeacher(teacherId: number): Promise<ExportTask[]> {
    return this.repo.find({ where: { teacher_id: teacherId }, order: { created_at: 'DESC' } });
  }

  create(data: Partial<ExportTask>): ExportTask {
    return this.repo.create(data);
  }

  async save(entity: ExportTask): Promise<ExportTask> {
    return this.repo.save(entity);
  }
}
