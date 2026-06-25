import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { School } from '../entities/school.entity';

@Injectable()
export class SchoolRepository {
  constructor(
    @InjectRepository(School)
    private readonly repo: Repository<School>
  ) {}

  findAll(): Promise<School[]> {
    return this.repo.find();
  }

  findById(id: number): Promise<School | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByName(name: string): Promise<School | null> {
    return this.repo.findOne({ where: { name } });
  }

  create(data: Partial<School>): School {
    return this.repo.create(data);
  }

  async save(entity: School): Promise<School> {
    return this.repo.save(entity);
  }
}
