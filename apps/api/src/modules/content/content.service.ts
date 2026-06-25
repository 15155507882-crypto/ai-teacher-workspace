import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ContentRepository } from '../../database/repositories/content.repository';
import { OperationLogRepository } from '../../database/repositories/operation-log.repository';
import { DeletedRecordRepository } from '../../database/repositories/deleted-record.repository';

@Injectable()
export class ContentService {
  constructor(
    private readonly contentRepo: ContentRepository,
    private readonly logRepo: OperationLogRepository,
    private readonly deletedRecordRepo: DeletedRecordRepository
  ) {}

  /** 获取某教师的所有内容 (全校可见) */
  async findByTeacher(teacherId: number, contentType?: string, page = 1, size = 20) {
    const all = await this.contentRepo.findByTeacher(teacherId, contentType);
    const items = all.filter((c) => !c.deleted_at);
    const start = (page - 1) * size;
    const paged = items.slice(start, start + size);

    return {
      items: paged.map((c) => ({
        id: c.id,
        teacher_id: c.teacher_id,
        department_id: c.department_id,
        content_type: c.content_type,
        title: c.title,
        summary: c.summary,
        academic_year: c.academic_year,
        semester: c.semester,
        status: c.status,
        created_at: c.created_at,
      })),
      total: items.length,
      page,
      pageSize: size,
    };
  }

  /** 获取内容详情 */
  async findById(id: number) {
    const content = await this.contentRepo.findById(id);
    if (!content || content.deleted_at) throw new NotFoundException('内容不存在');
    return content;
  }

  /** 删除内容 (教师本人或管理员) */
  async delete(id: number, operatorId: number, operatorRole: string, reason?: string) {
    const content = await this.contentRepo.findById(id);
    if (!content || content.deleted_at) throw new NotFoundException('内容不存在或已删除');

    // 非管理员只能删除自己的
    if (operatorRole !== 'admin' && content.teacher_id !== operatorId) {
      throw new ForbiddenException('您无权删除他人的资料');
    }

    await this.contentRepo.softDelete(id);

    // 记录操作日志
    const log = this.logRepo.create({
      operator_id: operatorId,
      action: 'delete',
      target_type: 'content',
      target_id: id,
      detail_json: { reason, content_type: content.content_type, title: content.title },
    });
    await this.logRepo.save(log);

    // 记录删除记录
    const record = this.deletedRecordRepo.create({
      operator_id: operatorId,
      target_type: 'content',
      target_id: id,
      reason: reason || null,
    });
    await this.deletedRecordRepo.save(record);

    return { message: '删除成功' };
  }
}
