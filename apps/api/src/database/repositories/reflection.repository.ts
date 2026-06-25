import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reflection } from '../entities/reflection.entity';

@Injectable()
export class ReflectionRepository {
  constructor(
    @InjectRepository(Reflection)
    private readonly repo: Repository<Reflection>
  ) {}

  findByContentId(contentId: number): Promise<Reflection | null> {
    return this.repo.findOne({ where: { content_id: contentId } });
  }

  findByLessonContentId(lessonContentId: number): Promise<Reflection[]> {
    return this.repo.find({ where: { lesson_content_id: lessonContentId } });
  }

  findByTeacher(teacherId: number): Promise<Reflection[]> {
    return this.repo.find({ where: { teacher_id: teacherId }, order: { reflection_date: 'DESC' } });
  }

  create(data: Partial<Reflection>): Reflection {
    return this.repo.create(data);
  }

  async save(entity: Reflection): Promise<Reflection> {
    return this.repo.save(entity);
  }
}
