import { Injectable, NotFoundException } from '@nestjs/common';
import { SchoolRepository } from '../../database/repositories/school.repository';
import { UpdateSchoolDto } from './school.dto';

@Injectable()
export class SchoolService {
  constructor(private readonly schoolRepo: SchoolRepository) {}

  /** 获取学校信息 (取第一条，单学校模式) */
  async getSchool() {
    const schools = await this.schoolRepo.findAll();
    if (schools.length === 0) {
      throw new NotFoundException('学校信息尚未配置');
    }
    return schools[0];
  }

  /** 更新或创建学校信息 */
  async updateSchool(dto: UpdateSchoolDto) {
    const schools = await this.schoolRepo.findAll();
    let school = schools[0];

    if (!school) {
      school = this.schoolRepo.create({
        name: dto.name,
        short_name: dto.short_name,
        logo_file_id: dto.logo_file_id || null,
      });
    } else {
      school.name = dto.name;
      school.short_name = dto.short_name;
      school.logo_file_id = dto.logo_file_id ?? school.logo_file_id;
    }

    return this.schoolRepo.save(school);
  }
}
