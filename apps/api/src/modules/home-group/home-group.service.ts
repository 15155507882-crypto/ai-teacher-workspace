import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { HomeGroup } from '../../database/entities/home-group.entity';

@Injectable()
export class HomeGroupService {
  constructor(@InjectRepository(HomeGroup) private readonly repo: Repository<HomeGroup>) {}

  findAll() {
    return this.repo.find({ where: { deleted_at: IsNull() }, order: { sort_order: 'ASC' } });
  }

  async create(data: Partial<HomeGroup>) {
    return this.repo.save(this.repo.create(data));
  }

  async update(id: number, data: Partial<HomeGroup>) {
    const g = await this.repo.findOne({ where: { id } });
    if (!g) throw new NotFoundException('不存在');
    Object.assign(g, data);
    return this.repo.save(g);
  }

  async toggleStatus(id: number) {
    const g = await this.repo.findOne({ where: { id } });
    if (!g) throw new NotFoundException('不存在');
    g.status = g.status === 'active' ? 'disabled' : 'active';
    return this.repo.save(g);
  }

  async softDelete(id: number) {
    const g = await this.repo.findOne({ where: { id } });
    if (!g) throw new NotFoundException('不存在');
    g.deleted_at = new Date();
    return this.repo.save(g);
  }

  /** 首页前端调用：只返回启用且首页可见的 */
  async getHomeVisible() {
    return this.repo.find({
      where: { status: 'active', is_home_visible: true, deleted_at: IsNull() },
      order: { sort_order: 'ASC' },
    });
  }
}
