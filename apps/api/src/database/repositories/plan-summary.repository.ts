import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlanSummary } from '../entities/plan-summary.entity';

@Injectable()
export class PlanSummaryRepository {
  constructor(
    @InjectRepository(PlanSummary)
    private readonly repo: Repository<PlanSummary>
  ) {}

  findByContentId(contentId: number): Promise<PlanSummary | null> {
    return this.repo.findOne({ where: { content_id: contentId } });
  }

  findByTeacher(teacherId: number, planType?: string): Promise<PlanSummary[]> {
    const where: any = { teacher_id: teacherId };
    if (planType) where.plan_type = planType;
    return this.repo.find({ where, order: { created_at: 'DESC' } });
  }

  create(data: Partial<PlanSummary>): PlanSummary {
    return this.repo.create(data);
  }

  async save(entity: PlanSummary): Promise<PlanSummary> {
    return this.repo.save(entity);
  }
}
