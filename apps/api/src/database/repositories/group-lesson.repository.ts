import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GroupLesson } from '../entities/group-lesson.entity';

@Injectable()
export class GroupLessonRepository {
  constructor(
    @InjectRepository(GroupLesson)
    private readonly repo: Repository<GroupLesson>
  ) {}

  findByContentId(contentId: number): Promise<GroupLesson | null> {
    return this.repo.findOne({ where: { content_id: contentId } });
  }

  findByCreator(creatorId: number): Promise<GroupLesson[]> {
    return this.repo.find({ where: { creator_id: creatorId }, order: { created_at: 'DESC' } });
  }

  findByDepartment(departmentId: number): Promise<GroupLesson[]> {
    return this.repo.find({
      where: { department_id: departmentId },
      order: { created_at: 'DESC' },
    });
  }

  create(data: Partial<GroupLesson>): GroupLesson {
    return this.repo.create(data);
  }

  async save(entity: GroupLesson): Promise<GroupLesson> {
    return this.repo.save(entity);
  }
}
