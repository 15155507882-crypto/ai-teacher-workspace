import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PersonalLesson } from '../entities/personal-lesson.entity';

@Injectable()
export class PersonalLessonRepository {
  constructor(
    @InjectRepository(PersonalLesson)
    private readonly repo: Repository<PersonalLesson>
  ) {}

  findByContentId(contentId: number): Promise<PersonalLesson | null> {
    return this.repo.findOne({ where: { content_id: contentId } });
  }

  findByTeacher(teacherId: number): Promise<PersonalLesson[]> {
    return this.repo.find({ where: { teacher_id: teacherId }, order: { lesson_date: 'DESC' } });
  }

  findRecentByTeacher(teacherId: number, limit = 3): Promise<PersonalLesson[]> {
    return this.repo.find({
      where: { teacher_id: teacherId },
      order: { created_at: 'DESC' },
      take: limit,
    });
  }

  create(data: Partial<PersonalLesson>): PersonalLesson {
    return this.repo.create(data);
  }

  async save(entity: PersonalLesson): Promise<PersonalLesson> {
    return this.repo.save(entity);
  }
}
