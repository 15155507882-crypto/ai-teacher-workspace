import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LessonAttachment } from '../entities/lesson-attachment.entity';

@Injectable()
export class LessonAttachmentRepository {
  constructor(
    @InjectRepository(LessonAttachment)
    private readonly repo: Repository<LessonAttachment>
  ) {}

  findByContentId(contentId: number): Promise<LessonAttachment[]> {
    return this.repo.find({ where: { content_id: contentId }, order: { sort_order: 'ASC' } });
  }

  create(data: Partial<LessonAttachment>): LessonAttachment {
    return this.repo.create(data);
  }

  async save(entity: LessonAttachment): Promise<LessonAttachment> {
    return this.repo.save(entity);
  }
}
