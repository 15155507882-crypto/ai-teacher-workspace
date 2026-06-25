import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Teacher } from '../entities/teacher.entity';

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

  create(data: Partial<Teacher>): Teacher {
    return this.repo.create(data);
  }

  async save(entity: Teacher): Promise<Teacher> {
    return this.repo.save(entity);
  }
}
