import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Teacher } from '../entities/teacher.entity';

export interface TeacherQueryParams {
  page?: number;
  size?: number;
  keyword?: string;
  department_id?: number;
  status?: string;
  role?: string;
  school_id?: number;
  exclude_status?: string;
  include_content_count?: boolean;
}

@Injectable()
export class TeacherRepository {
  constructor(
    @InjectRepository(Teacher)
    private readonly repo: Repository<Teacher>
  ) {}

  findById(id: number): Promise<Teacher | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByMobile(mobile: string): Promise<Teacher | null> {
    return this.repo.findOne({ where: { mobile } });
  }

  findByDepartment(departmentId: number): Promise<Teacher[]> {
    return this.repo.find({ where: { department_id: departmentId } });
  }

  findBySchool(schoolId: number): Promise<Teacher[]> {
    return this.repo.find({ where: { school_id: schoolId } });
  }

  findActive(): Promise<Teacher[]> {
    return this.repo.find({ where: { status: 'active' } });
  }

  async findPaginated(params: TeacherQueryParams) {
    const page = Math.max(1, params.page || 1);
    const size = Math.min(100, Math.max(1, params.size || 20));
    const skip = (page - 1) * size;

    const qb = this.repo.createQueryBuilder('teacher');

    if (params.include_content_count) {
      qb.loadRelationCountAndMap('teacher.hasContent', 'teacher.contents', 'contentCount', (qb2) =>
        qb2.where('contentCount.deleted_at IS NULL')
      );
      qb.leftJoin('teacher.contents', 'lastContent', 'lastContent.deleted_at IS NULL')
        .addSelect('MAX(lastContent.created_at)', 'teacher_last_content_at')
        .addGroupBy('teacher.id');
    }

    if (params.keyword) {
      qb.andWhere(
        '(teacher.name ILIKE :kw OR teacher.mobile ILIKE :kw OR teacher.employee_no ILIKE :kw)',
        { kw: `%${params.keyword}%` }
      );
    }
    if (params.department_id) {
      qb.andWhere('teacher.department_id = :deptId', { deptId: params.department_id });
    }
    if (params.status) {
      qb.andWhere('teacher.status = :status', { status: params.status });
    }
    if (params.role) {
      qb.andWhere('teacher.role = :role', { role: params.role });
    }
    if (params.school_id) {
      qb.andWhere('teacher.school_id = :schoolId', { schoolId: params.school_id });
    }
    if (params.exclude_status) {
      qb.andWhere('teacher.status != :exStatus', { exStatus: params.exclude_status });
    }

    qb.orderBy('teacher.sort', 'ASC').addOrderBy('teacher.id', 'ASC').skip(skip).take(size);

    const raw = await qb.getRawAndEntities();
    const items = raw.entities;
    const total = await qb.getCount();

    return {
      items: items.map((t: any, i: number) => ({
        id: t.id,
        school_id: t.school_id,
        department_id: t.department_id,
        department_ids: t.department_ids,
        mobile: t.mobile,
        name: t.name,
        employee_no: t.employee_no,
        gender: t.gender,
        avatar: t.avatar,
        avatar_file_id: t.avatar_file_id,
        role: t.role,
        status: t.status,
        sort: t.sort,
        is_home_visible: t.is_home_visible,
        last_login_at: t.last_login_at,
        created_at: t.created_at,
        hasContent: (t as any).hasContent !== undefined ? (t as any).hasContent > 0 : undefined,
        lastContentAt: raw.raw[i]?.teacher_last_content_at || null,
      })),
      total,
      page,
      pageSize: size,
    };
  }

  create(data: Partial<Teacher>): Teacher {
    return this.repo.create(data);
  }

  async save(entity: Teacher): Promise<Teacher> {
    return this.repo.save(entity);
  }

  async updateDepartmentBatch(teacherIds: number[], departmentId: number) {
    if (teacherIds.length === 0) return;
    await this.repo
      .createQueryBuilder()
      .update(Teacher)
      .set({ department_id: departmentId })
      .where('id IN (:...ids)', { ids: teacherIds })
      .execute();
  }
}
