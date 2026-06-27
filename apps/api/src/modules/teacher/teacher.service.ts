import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { TeacherRepository } from '../../database/repositories/teacher.repository';
import { DepartmentRepository } from '../../database/repositories/department.repository';
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
    private readonly departmentRepo: DepartmentRepository,
    private readonly historyRepo: TeacherStatusHistoryRepository
  ) {}

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

  async publicList(schoolId: number, departmentId?: number, keyword?: string) {
    return this.teacherRepo.findPaginated({
      page: 1,
      size: 500,
      keyword,
      department_id: departmentId,
      school_id: schoolId,
      exclude_status: 'resigned',
      include_content_count: true,
    });
  }

  async create(dto: CreateTeacherDto) {
    const existing = await this.teacherRepo.findByMobile(dto.mobile);
    if (existing) throw new ConflictException('手机号已存在');
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const teacher = this.teacherRepo.create({
      school_id: dto.school_id,
      department_id: dto.department_id,
      department_ids: dto.department_ids || null,
      mobile: dto.mobile,
      password_hash: passwordHash,
      name: dto.name,
      employee_no: dto.employee_no || null,
      gender: dto.gender || null,
      role: dto.role || 'teacher',
      status: 'active',
      sort: dto.sort || 0,
      is_home_visible: dto.is_home_visible ?? true,
    });
    return this.teacherRepo.save(teacher);
  }

  async update(id: number, dto: UpdateTeacherDto, operatorId: number) {
    const teacher = await this.teacherRepo.findById(id);
    if (!teacher) throw new NotFoundException('教师不存在');
    if (dto.department_id !== undefined) teacher.department_id = dto.department_id;
    if (dto.department_ids !== undefined) teacher.department_ids = dto.department_ids || null;
    if (dto.name !== undefined) teacher.name = dto.name;
    if (dto.employee_no !== undefined) teacher.employee_no = dto.employee_no;
    if (dto.gender !== undefined) teacher.gender = dto.gender || null;
    if (dto.role !== undefined) teacher.role = dto.role;
    if (dto.sort !== undefined) teacher.sort = dto.sort;
    if (dto.is_home_visible !== undefined) teacher.is_home_visible = dto.is_home_visible;
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

  async batchImport(rows: any[]) {
    const results: any[] = [];
    for (const row of rows) {
      try {
        const existing = await this.teacherRepo.findByMobile(row.mobile);
        if (existing) {
          results.push({ mobile: row.mobile, status: '跳过', reason: '手机号已存在' });
          continue;
        }
        // Resolve department: support name string, ID number, or /-separated names
        let departmentId = row.department_id;
        if (typeof departmentId === 'string' && isNaN(Number(departmentId))) {
          // Department name (or /-separated names) — resolve to first matching ID
          const names = String(departmentId)
            .split('/')
            .map((s) => s.trim())
            .filter(Boolean);
          for (const name of names) {
            const depts = await this.departmentRepo.findBySchool(row.school_id || 1);
            const dept = depts.find((d) => d.name === name || d.name.includes(name));
            if (dept) {
              departmentId = dept.id;
              break;
            }
          }
          if (typeof departmentId === 'string') departmentId = 1; // fallback
        }
        // Role mapping: Chinese → English
        const roleMap: Record<string, string> = { 教师: 'teacher', 管理员: 'admin' };
        const role = roleMap[row.role] || row.role || 'teacher';
        // Gender mapping
        const genderMap: Record<string, string> = { 男: 'male', 女: 'female' };
        const gender = genderMap[row.gender] || row.gender || null;
        const passwordHash = await bcrypt.hash(row.password || '123456', 10);
        const teacher = this.teacherRepo.create({
          school_id: row.school_id || 1,
          department_id: Number(departmentId) || 1,
          department_ids: row.department_ids || null,
          mobile: row.mobile,
          password_hash: passwordHash,
          name: row.name,
          employee_no: row.employee_no || null,
          gender,
          role,
          status: 'active',
        });
        await this.teacherRepo.save(teacher);
        results.push({ mobile: row.mobile, status: '成功', name: row.name });
      } catch (e: any) {
        results.push({ mobile: row.mobile, status: '失败', reason: e.message });
      }
    }
    return { total: rows.length, results };
  }

  /** 教师自服务：更新个人资料 */
  async updateProfile(
    teacherId: number,
    body: { name?: string; mobile?: string; gender?: string; employee_no?: string }
  ) {
    const teacher = await this.teacherRepo.findById(teacherId);
    if (!teacher) throw new NotFoundException('教师不存在');
    if (body.name !== undefined) teacher.name = body.name;
    if (body.mobile !== undefined) teacher.mobile = body.mobile;
    if (body.gender !== undefined) teacher.gender = body.gender || null;
    if (body.employee_no !== undefined) teacher.employee_no = body.employee_no || null;
    await this.teacherRepo.save(teacher);
    return { id: teacher.id, name: teacher.name, mobile: teacher.mobile, gender: teacher.gender };
  }

  /** 教师自服务：修改密码 */
  async changePassword(teacherId: number, oldPassword: string, newPassword: string) {
    const teacher = await this.teacherRepo.findById(teacherId);
    if (!teacher) throw new NotFoundException('教师不存在');
    const valid = await bcrypt.compare(oldPassword, teacher.password_hash);
    if (!valid) throw new BadRequestException('当前密码错误');
    if (newPassword.length < 6) throw new BadRequestException('新密码至少6位');
    teacher.password_hash = await bcrypt.hash(newPassword, 10);
    teacher.token_version = (teacher.token_version || 1) + 1;
    await this.teacherRepo.save(teacher);
    return { success: true };
  }

  /** 教师自服务：更新头像 */
  async updateAvatar(teacherId: number, fileId: number) {
    const teacher = await this.teacherRepo.findById(teacherId);
    if (!teacher) throw new NotFoundException('教师不存在');
    teacher.avatar_file_id = fileId;
    await this.teacherRepo.save(teacher);
    return { avatar_file_id: fileId };
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
