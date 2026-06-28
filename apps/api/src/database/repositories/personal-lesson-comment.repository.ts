import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PersonalLessonComment } from '../entities/personal-lesson-comment.entity';

@Injectable()
export class PersonalLessonCommentRepository {
  constructor(
    @InjectRepository(PersonalLessonComment)
    private readonly repo: Repository<PersonalLessonComment>
  ) {}

  findByPersonalLesson(personalLessonId: number): Promise<PersonalLessonComment[]> {
    return this.repo.find({
      where: { personal_lesson_id: personalLessonId, deleted_at: null as any },
      relations: ['teacher', 'file'],
      order: { created_at: 'ASC' },
    });
  }

  findById(id: number): Promise<PersonalLessonComment | null> {
    return this.repo.findOne({ where: { id }, relations: ['teacher'] });
  }

  async softDelete(id: number): Promise<void> {
    await this.repo.update(id, { deleted_at: new Date() } as any);
  }

  create(data: Partial<PersonalLessonComment>): PersonalLessonComment {
    return this.repo.create(data);
  }

  async save(entity: PersonalLessonComment): Promise<PersonalLessonComment> {
    return this.repo.save(entity);
  }
}
