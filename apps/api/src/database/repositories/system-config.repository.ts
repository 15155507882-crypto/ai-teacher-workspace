import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemConfig } from '../entities/system-config.entity';

@Injectable()
export class SystemConfigRepository {
  constructor(
    @InjectRepository(SystemConfig)
    private readonly repo: Repository<SystemConfig>
  ) {}

  findByKey(key: string): Promise<SystemConfig | null> {
    return this.repo.findOne({ where: { config_key: key } });
  }

  findAll(): Promise<SystemConfig[]> {
    return this.repo.find();
  }

  create(data: Partial<SystemConfig>): SystemConfig {
    return this.repo.create(data);
  }

  async save(entity: SystemConfig): Promise<SystemConfig> {
    return this.repo.save(entity);
  }

  async upsert(key: string, value: string): Promise<void> {
    await this.repo.upsert({ config_key: key, config_value: value }, ['config_key']);
  }
}
