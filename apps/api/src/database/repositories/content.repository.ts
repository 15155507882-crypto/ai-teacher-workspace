import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Content } from '../entities/content.entity';

@Injectable()
export class ContentRepository {
  constructor(
    @InjectRepository(Content)
    private readonly repo: Repository<Content>
  ) {}

  findById(id: number): Promise<Content | null> {
    return this.repo.findOne({
      where: { id },
      relations: [
        'attachments',
        'attachments.file',
        'personalLesson',
        'reflection',
        'groupLesson',
        'planSummary',
      ],
    });
  }

  findByTeacher(teacherId: number, contentType?: string): Promise<Content[]> {
    const where: any = { teacher_id: teacherId };
    if (contentType) where.content_type = contentType;
    return this.repo.find({ where, order: { created_at: 'DESC' } });
  }

  findByDepartment(departmentId: number): Promise<Content[]> {
    return this.repo.find({
      where: { department_id: departmentId },
      order: { created_at: 'DESC' },
    });
  }

  findByAcademicYear(academicYear: string, semester?: string): Promise<Content[]> {
    const where: any = { academic_year: academicYear };
    if (semester) where.semester = semester;
    return this.repo.find({ where, order: { created_at: 'DESC' } });
  }

  create(data: Partial<Content>): Content {
    return this.repo.create(data);
  }

  async save(entity: Content): Promise<Content> {
    return this.repo.save(entity);
  }

  async softDelete(id: number): Promise<void> {
    await this.repo.update(id, { deleted_at: new Date(), status: 'deleted' } as any);
  }
}
