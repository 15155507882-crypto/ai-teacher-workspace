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
      where: { group_lesson_id: groupLessonId, deleted_at: null as any },
      relations: ['teacher', 'file'],
      order: { created_at: 'ASC' },
    });
  }

  findById(id: number): Promise<GroupLessonComment | null> {
    return this.repo.findOne({ where: { id }, relations: ['teacher'] });
  }

  async softDelete(id: number): Promise<void> {
    await this.repo.update(id, { deleted_at: new Date() } as any);
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
