import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from '../../database/entities/conversation.entity';

@Injectable()
export class ConversationService {
  constructor(
    @InjectRepository(Conversation) private readonly repo: Repository<Conversation>
  ) {}

  /** 获取或创建今天的会话 */
  async getOrCreateToday(teacherId: number) {
    const today = new Date().toISOString().slice(0, 10);
    const existing = await this.repo.findOne({
      where: { teacher_id: teacherId, status: 'active' },
      order: { created_at: 'DESC' },
    });
    if (existing) {
      const existingDate = new Date(existing.created_at).toISOString().slice(0, 10);
      if (existingDate === today) {
        existing.last_active_at = new Date();
        await this.repo.save(existing);
        return existing;
      }
    }
    // 新建今天的会话
    const conv = this.repo.create({ teacher_id: teacherId, title: '新会话', last_active_at: new Date() });
    return this.repo.save(conv);
  }

  /** 会话列表 */
  async list(teacherId: number, keyword?: string) {
    const qb = this.repo.createQueryBuilder('c')
      .where('c.teacher_id = :teacherId', { teacherId })
      .andWhere('c.status = :status', { status: 'active' })
      .orderBy('c.last_active_at', 'DESC');
    if (keyword) {
      qb.andWhere('c.title LIKE :kw', { kw: `%${keyword}%` });
    }
    return qb.getMany();
  }

  /** 更新标题 */
  async updateTitle(id: number, teacherId: number, title: string) {
    const conv = await this.repo.findOne({ where: { id, teacher_id: teacherId } });
    if (!conv) throw new NotFoundException('会话不存在');
    conv.title = title;
    return this.repo.save(conv);
  }

  /** 更新总结 */
  async updateSummary(id: number, summary: string) {
    await this.repo.update({ id }, { summary });
  }

  /** 自动生成标题 */
  async autoTitle(id: number, firstMessage: string) {
    const conv = await this.repo.findOne({ where: { id } });
    if (!conv || conv.title !== '新会话') return;
    const short = firstMessage.slice(0, 30).replace(/[\.\?\！\？\，\。]/g, '').trim();
    await this.repo.update({ id }, { title: short || '新会话' });
  }

  /** 删除 */
  async remove(id: number, teacherId: number) {
    const conv = await this.repo.findOne({ where: { id, teacher_id: teacherId } });
    if (!conv) throw new NotFoundException('会话不存在');
    conv.status = 'deleted';
    return this.repo.save(conv);
  }
}
