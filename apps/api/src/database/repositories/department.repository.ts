import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from '../entities/department.entity';

@Injectable()
export class DepartmentRepository {
  constructor(
    @InjectRepository(Department)
    private readonly repo: Repository<Department>
  ) {}

  findBySchool(schoolId: number): Promise<Department[]> {
    return this.repo.find({ where: { school_id: schoolId }, order: { sort_order: 'ASC' } });
  }

  findById(id: number): Promise<Department | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByParent(parentId: number): Promise<Department[]> {
    return this.repo.find({ where: { parent_id: parentId }, order: { sort_order: 'ASC' } });
  }

  create(data: Partial<Department>): Department {
    return this.repo.create(data);
  }

  async save(entity: Department): Promise<Department> {
    return this.repo.save(entity);
  }
}
