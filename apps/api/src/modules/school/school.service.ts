import { Injectable, NotFoundException } from '@nestjs/common';
import { SchoolRepository } from '../../database/repositories/school.repository';
import { UpdateSchoolDto, UpdateSchoolSettingsDto } from './school.dto';

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
        logo_data: dto.logo_data || null,
        login_bg_data: dto.login_bg_data || null,
      });
    } else {
      school.name = dto.name;
      school.short_name = dto.short_name;
      school.logo_file_id = dto.logo_file_id ?? school.logo_file_id;
      if (dto.logo_data !== undefined) {
        school.logo_data = dto.logo_data;
      }
      if (dto.login_bg_data !== undefined) {
        school.login_bg_data = dto.login_bg_data;
      }
    }

    return this.schoolRepo.save(school);
  }

  /** 更新学校设置(学年/学期等) */
  async updateSettings(dto: UpdateSchoolSettingsDto) {
    const school = await this.getSchool();
    const settings = school.settings || {};

    if (dto.academic_years !== undefined) settings.academic_years = dto.academic_years;
    if (dto.current_year !== undefined) settings.current_year = dto.current_year;
    if (dto.semesters !== undefined) settings.semesters = dto.semesters;
    if (dto.current_semester !== undefined) settings.current_semester = dto.current_semester;

    school.settings = settings;
    await this.schoolRepo.save(school);
    return settings;
  }
}
