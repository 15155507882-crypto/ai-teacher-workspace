import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiProvider } from '../../database/entities/ai-provider.entity';
import { AiConfig } from '../../database/entities/ai-config.entity';
import { AiCallLog } from '../../database/entities/ai-call-log.entity';

@Injectable()
export class AiConfigService {
  constructor(
    @InjectRepository(AiProvider) private readonly providerRepo: Repository<AiProvider>,
    @InjectRepository(AiConfig) private readonly configRepo: Repository<AiConfig>,
    @InjectRepository(AiCallLog) private readonly logRepo: Repository<AiCallLog>
  ) {}

  getProviders() {
    return this.providerRepo.find({ where: { enabled: true }, order: { sort_order: 'ASC' } });
  }

  getConfig() {
    return this.configRepo.findOne({ where: { school_id: 1 }, relations: ['provider'] });
  }

  async saveConfig(data: {
    provider_id: number;
    api_key_encrypted: string;
    base_url?: string;
    default_model?: string;
  }) {
    let config = await this.configRepo.findOne({ where: { school_id: 1 } });
    if (!config) config = this.configRepo.create({ school_id: 1, ...data });
    else Object.assign(config, data);
    return this.configRepo.save(config);
  }

  async testConnection(configId: number) {
    const config = await this.configRepo.findOne({
      where: { id: configId },
      relations: ['provider'],
    });
    if (!config) return { success: false, message: '配置不存在' };

    try {
      // TODO: real API call
      return {
        success: true,
        message: '连接成功（Mock）',
        models: ['deepseek-chat', 'deepseek-reasoner'],
      };
    } catch (e: any) {
      return { success: false, message: e.message || '连接失败' };
    }
  }

  async getTokenStats(range: string) {
    // TODO: real stats query
    return {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
      call_count: 0,
      estimated_cost: 0,
      range,
    };
  }
}
