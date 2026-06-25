import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { DepartmentRepository } from '../../database/repositories/department.repository';
import { TeacherRepository } from '../../database/repositories/teacher.repository';
import { CreateDepartmentDto, UpdateDepartmentDto } from './department.dto';

@Injectable()
export class DepartmentService {
  constructor(
    private readonly departmentRepo: DepartmentRepository,
    private readonly teacherRepo: TeacherRepository
  ) {}

  /** 按学校获取组织树列表 */
  async getTree(schoolId: number) {
    const departments = await this.departmentRepo.findBySchool(schoolId);
    return this.buildTree(departments);
  }

  /** 平铺列表 */
  async getList(schoolId: number) {
    return this.departmentRepo.findBySchool(schoolId);
  }

  /** 创建组织 */
  async create(dto: CreateDepartmentDto) {
    const department = this.departmentRepo.create({
      school_id: dto.school_id,
      parent_id: dto.parent_id || 0,
      name: dto.name,
      sort_order: dto.sort_order || 0,
    });
    return this.departmentRepo.save(department);
  }

  /** 更新组织 */
  async update(id: number, dto: UpdateDepartmentDto) {
    const department = await this.departmentRepo.findById(id);
    if (!department) throw new NotFoundException('组织不存在');

    if (dto.name !== undefined) department.name = dto.name;
    if (dto.parent_id !== undefined) department.parent_id = dto.parent_id;
    if (dto.sort_order !== undefined) department.sort_order = dto.sort_order;
    if (dto.status !== undefined) department.status = dto.status;

    return this.departmentRepo.save(department);
  }

  /** 停用前检查是否有在职教师 */
  async disable(id: number) {
    const department = await this.departmentRepo.findById(id);
    if (!department) throw new NotFoundException('组织不存在');

    const teachers = await this.teacherRepo.findByDepartment(id);
    const activeTeachers = teachers.filter((t) => t.status === 'active');
    if (activeTeachers.length > 0) {
      throw new ConflictException(`该组织下还有 ${activeTeachers.length} 名在职教师，无法停用`);
    }

    department.status = 'disabled';
    return this.departmentRepo.save(department);
  }

  private buildTree(departments: any[]) {
    const map = new Map<number, any>();
    const roots: any[] = [];

    departments.forEach((d) => {
      map.set(d.id, { ...d, children: [] });
    });

    departments.forEach((d) => {
      const node = map.get(d.id);
      if (d.parent_id && d.parent_id !== 0 && map.has(d.parent_id)) {
        map.get(d.parent_id).children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }
}
