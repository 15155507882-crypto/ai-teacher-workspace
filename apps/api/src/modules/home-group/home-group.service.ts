import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, DataSource, In } from 'typeorm';
import { HomeGroup } from '../../database/entities/home-group.entity';
import { Teacher } from '../../database/entities/teacher.entity';
import { HomeGroupTeacher } from '../../database/entities/home-group-teacher.entity';

@Injectable()
export class HomeGroupService {
  constructor(
    @InjectRepository(HomeGroup) private readonly repo: Repository<HomeGroup>,
    @InjectRepository(Teacher) private readonly teacherRepo: Repository<Teacher>,
    @InjectRepository(HomeGroupTeacher) private readonly memberRepo: Repository<HomeGroupTeacher>,
    private readonly dataSource: DataSource
  ) {}

  async findAll() {
    const groups = await this.repo.find({
      where: { deleted_at: IsNull() },
      order: { sort_order: 'ASC' },
    });
    return this.enrichWithTeachers(groups);
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

  async getHomeVisible() {
    const groups = await this.repo.find({
      where: { status: 'active', is_home_visible: true, deleted_at: IsNull() },
      order: { sort_order: 'ASC' },
    });
    return this.enrichWithTeachers(groups);
  }

  /** 设置备课组老师绑定 */
  async setTeachers(groupId: number, teacherIds: number[]) {
    const group = await this.repo.findOne({ where: { id: groupId } });
    if (!group) throw new NotFoundException('备课组不存在');

    // 去重
    const ids = [...new Set(teacherIds.map(Number).filter((n) => n > 0))];

    // 校验老师存在
    if (ids.length > 0) {
      const existing = await this.teacherRepo.find({ where: { id: In(ids) } });
      if (existing.length !== ids.length) throw new NotFoundException('部分教师不存在');
    }

    await this.dataSource.transaction(async (mgr) => {
      await mgr.delete(HomeGroupTeacher, { home_group_id: groupId });
      if (ids.length > 0) {
        const rows = ids.map((tid) => ({
          home_group_id: groupId,
          teacher_id: tid,
          role: 'member',
        }));
        await mgr.insert(HomeGroupTeacher, rows);
      }
    });

    // 返回更新后的
    const updated = await this.repo.findOne({ where: { id: groupId } });
    return this.enrichOne(updated!);
  }

  /** 批量导入备课组及老师
   *  columns: 备课组名称数组（CSV表头）
   *  rows: 二维数组，每行为对应列的教师姓名
   *  示例: columns=['语文组','数学组'], rows=[['张老师','李老师'],['王老师','']]
   *  结果: 语文组→张老师、王老师，数学组→李老师
   */
  async batchImportWithTeachers(columns: string[], rows: string[][]) {
    const results: any[] = [];
    const allTeachers = await this.teacherRepo.find({
      where: { status: 'active' },
    });
    const teacherMap = new Map<string, number>();
    for (const t of allTeachers) {
      teacherMap.set(t.name, t.id);
      // Also map by mobile for flexibility
      if (t.mobile) teacherMap.set(t.mobile, t.id);
    }

    for (const colIdx of columns.keys()) {
      const groupName = columns[colIdx].trim();
      if (!groupName) continue;

      // Find or create the group
      let group = await this.repo.findOne({ where: { name: groupName, deleted_at: IsNull() } });
      if (!group) {
        group = this.repo.create({
          name: groupName,
          code: 'HG' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
          status: 'active',
          is_home_visible: true,
        });
        group = await this.repo.save(group);
      }

      // Collect teacher names from all rows for this column
      const teacherNames = new Set<string>();
      for (const row of rows) {
        const name = (row[colIdx] || '').trim();
        if (name) teacherNames.add(name);
      }

      // Resolve teacher IDs
      const foundIds: number[] = [];
      const notFound: string[] = [];
      for (const name of teacherNames) {
        const tid = teacherMap.get(name);
        if (tid) {
          foundIds.push(tid);
        } else {
          notFound.push(name);
        }
      }

      // Assign teachers to group (merge with existing, skip duplicates via unique constraint)
      if (foundIds.length > 0) {
        await this.dataSource.transaction(async (mgr) => {
          for (const tid of foundIds) {
            // Check if already assigned
            const exists = await mgr.findOne(HomeGroupTeacher, {
              where: { home_group_id: group!.id, teacher_id: tid },
            });
            if (!exists) {
              await mgr.insert(HomeGroupTeacher, {
                home_group_id: group!.id,
                teacher_id: tid,
                role: 'member',
              });
            }
          }
        });
      }

      results.push({
        group: groupName,
        groupId: group.id,
        created: !group.id ? false : true,
        assignedCount: foundIds.length,
        notFound: notFound.length > 0 ? notFound : undefined,
      });
    }

    return {
      groupsProcessed: results.length,
      totalAssigned: results.reduce((s, r) => s + r.assignedCount, 0),
      totalNotFound: results.reduce((s, r) => s + (r.notFound?.length || 0), 0),
      results,
    };
  }

  // ====== 辅助 ======

  private async enrichWithTeachers(groups: HomeGroup[]) {
    if (groups.length === 0) return [];
    const groupIds = groups.map((g) => g.id);
    const members = await this.memberRepo.find({ where: { home_group_id: In(groupIds) } });
    const teacherIds = [...new Set(members.map((m) => Number(m.teacher_id)))];

    const teachers =
      teacherIds.length > 0 ? await this.teacherRepo.find({ where: { id: In(teacherIds) } }) : [];
    const teacherMap = new Map(teachers.map((t) => [Number(t.id), t]));

    return groups.map((g) => {
      const groupMembers = members.filter((m) => Number(m.home_group_id) === Number(g.id));
      return this.mapGroup(g, groupMembers, teacherMap);
    });
  }

  private async enrichOne(g: HomeGroup) {
    const members = await this.memberRepo.find({ where: { home_group_id: g.id } });
    const teacherIds = [...new Set(members.map((m) => Number(m.teacher_id)))];
    const teachers =
      teacherIds.length > 0 ? await this.teacherRepo.find({ where: { id: In(teacherIds) } }) : [];
    const teacherMap = new Map(teachers.map((t) => [Number(t.id), t]));
    return this.mapGroup(g, members, teacherMap);
  }

  private mapGroup(g: HomeGroup, members: HomeGroupTeacher[], teacherMap: Map<number, Teacher>) {
    return {
      ...g,
      teacher_ids: members.map((m) => Number(m.teacher_id)),
      teachers: members
        .map((m) => {
          const t = teacherMap.get(Number(m.teacher_id));
          return t ? { id: Number(t.id), name: t.name } : null;
        })
        .filter(Boolean),
      teacher_count: members.length,
    };
  }
}
