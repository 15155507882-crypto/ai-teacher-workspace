import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GroupLessonComment } from '../entities/group-lesson-comment.entity';

@Injectable()
export class GroupLessonCommentRepository {
  constructor(
    @InjectRepository(GroupLessonComment)
    private readonly repo: Repository<GroupLessonComment>
  ) {}

  findByGroupLesson(groupLessonId: number): Promise<GroupLessonComment[]> {
    return this.repo.find({
      where: { group_lesson_id: groupLessonId },
      order: { created_at: 'ASC' },
    });
  }

  findByTeacher(teacherId: number): Promise<GroupLessonComment[]> {
    return this.repo.find({ where: { teacher_id: teacherId }, order: { created_at: 'DESC' } });
  }

  create(data: Partial<GroupLessonComment>): GroupLessonComment {
    return this.repo.create(data);
  }

  async save(entity: GroupLessonComment): Promise<GroupLessonComment> {
    return this.repo.save(entity);
  }
}
