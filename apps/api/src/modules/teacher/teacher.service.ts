import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { TeacherRepository } from '../../database/repositories/teacher.repository';
import { TeacherStatusHistoryRepository } from '../../database/repositories/teacher-status-history.repository';
import {
  CreateTeacherDto,
  UpdateTeacherDto,
  ResetPasswordDto,
  TeacherQueryDto,
} from './teacher.dto';

@Injectable()
export class TeacherService {
  constructor(
    private readonly teacherRepo: TeacherRepository,
    private readonly historyRepo: TeacherStatusHistoryRepository
  ) {}

  /** 教师列表 (管理端，支持分页/搜索/筛选) */
  async list(query: TeacherQueryDto) {
    return this.teacherRepo.findPaginated({
      page: query.page,
      size: query.size,
      keyword: query.keyword,
      department_id: query.department_id,
      status: query.status,
      role: query.role,
    });
  }

  /** 教师公开列表 (首页/教师空间，排除离职教师) */
  async publicList(schoolId: number, departmentId?: number, keyword?: string) {
    return this.teacherRepo.findPaginated({
      page: 1,
      size: 500,
      keyword,
      department_id: departmentId,
      school_id: schoolId,
      exclude_status: 'resigned',
    });
  }

  async create(dto: CreateTeacherDto) {
    const existing = await this.teacherRepo.findByMobile(dto.mobile);
    if (existing) {
      throw new ConflictException('手机号已存在');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const teacher = this.teacherRepo.create({
      school_id: dto.school_id,
      department_id: dto.department_id,
      mobile: dto.mobile,
      password_hash: passwordHash,
      name: dto.name,
      employee_no: dto.employee_no || null,
      role: dto.role || 'teacher',
      status: 'active',
    });
    return this.teacherRepo.save(teacher);
  }

  async update(id: number, dto: UpdateTeacherDto, operatorId: number) {
    const teacher = await this.teacherRepo.findById(id);
    if (!teacher) throw new NotFoundException('教师不存在');
    if (dto.department_id !== undefined) teacher.department_id = dto.department_id;
    if (dto.name !== undefined) teacher.name = dto.name;
    if (dto.employee_no !== undefined) teacher.employee_no = dto.employee_no;
    if (dto.role !== undefined) teacher.role = dto.role;
    return this.teacherRepo.save(teacher);
  }

  async resetPassword(id: number, dto: ResetPasswordDto) {
    const teacher = await this.teacherRepo.findById(id);
    if (!teacher) throw new NotFoundException('教师不存在');
    teacher.password_hash = await bcrypt.hash(dto.password, 10);
    teacher.token_version = (teacher.token_version || 1) + 1;
    return this.teacherRepo.save(teacher);
  }

  async disable(id: number, operatorId: number, reason?: string) {
    const teacher = await this.teacherRepo.findById(id);
    if (!teacher) throw new NotFoundException('教师不存在');
    if (teacher.status === 'disabled') throw new BadRequestException('该教师已停用');
    const fromStatus = teacher.status;
    teacher.status = 'disabled';
    await this.teacherRepo.save(teacher);
    await this.recordHistory(teacher.id, fromStatus, 'disabled', operatorId, reason);
    return teacher;
  }

  async resign(id: number, operatorId: number, reason?: string) {
    const teacher = await this.teacherRepo.findById(id);
    if (!teacher) throw new NotFoundException('教师不存在');
    if (teacher.status === 'resigned') throw new BadRequestException('该教师已离职');
    const fromStatus = teacher.status;
    teacher.status = 'resigned';
    teacher.token_version = (teacher.token_version || 1) + 1;
    await this.teacherRepo.save(teacher);
    await this.recordHistory(teacher.id, fromStatus, 'resigned', operatorId, reason);
    return teacher;
  }

  async restore(id: number, operatorId: number, reason?: string) {
    const teacher = await this.teacherRepo.findById(id);
    if (!teacher) throw new NotFoundException('教师不存在');
    if (teacher.status !== 'resigned' && teacher.status !== 'disabled') {
      throw new BadRequestException('该教师不在离职或停用状态');
    }
    const fromStatus = teacher.status;
    teacher.status = 'active';
    await this.teacherRepo.save(teacher);
    await this.recordHistory(teacher.id, fromStatus, 'active', operatorId, reason);
    return teacher;
  }

  private async recordHistory(
    teacherId: number,
    fromStatus: string,
    toStatus: string,
    operatorId: number,
    reason?: string
  ) {
    const history = this.historyRepo.create({
      teacher_id: teacherId,
      from_status: fromStatus,
      to_status: toStatus,
      operator_id: operatorId,
      reason: reason || null,
    });
    await this.historyRepo.save(history);
  }
}
