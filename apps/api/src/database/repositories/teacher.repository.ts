import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Like, ILike } from 'typeorm';
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

  /** 分页 + 筛选查询 */
  async findPaginated(params: TeacherQueryParams) {
    const page = Math.max(1, params.page || 1);
    const size = Math.min(100, Math.max(1, params.size || 20));
    const skip = (page - 1) * size;

    const qb = this.repo.createQueryBuilder('teacher');

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

    qb.orderBy('teacher.id', 'ASC').skip(skip).take(size);

    const [items, total] = await qb.getManyAndCount();

    return {
      items: items.map((t) => ({
        id: t.id,
        school_id: t.school_id,
        department_id: t.department_id,
        mobile: t.mobile,
        name: t.name,
        employee_no: t.employee_no,
        avatar: t.avatar,
        role: t.role,
        status: t.status,
        last_login_at: t.last_login_at,
        created_at: t.created_at,
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
}
