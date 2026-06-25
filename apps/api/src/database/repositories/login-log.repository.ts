import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoginLog } from '../entities/login-log.entity';

@Injectable()
export class LoginLogRepository {
  constructor(
    @InjectRepository(LoginLog)
    private readonly repo: Repository<LoginLog>
  ) {}

  findByMobile(mobile: string): Promise<LoginLog[]> {
    return this.repo.find({ where: { mobile }, order: { created_at: 'DESC' }, take: 50 });
  }

  create(data: Partial<LoginLog>): LoginLog {
    return this.repo.create(data);
  }

  async save(entity: LoginLog): Promise<LoginLog> {
    return this.repo.save(entity);
  }
}
