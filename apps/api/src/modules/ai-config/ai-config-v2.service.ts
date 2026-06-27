import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { AiConfig } from '../../database/entities/ai-config.entity';
import { AiCallLog } from '../../database/entities/ai-call-log.entity';
import { encrypt, decrypt } from '../../common/crypto/aes';

const DEFAULT_URLS: Record<string, string> = {
  deepseek: 'https://api.deepseek.com/v1',
  openai: 'https://api.openai.com/v1',
  qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
};

@Injectable()
export class AiConfigV2Service {
  constructor(
    @InjectRepository(AiConfig) private readonly repo: Repository<AiConfig>,
    @InjectRepository(AiCallLog) private readonly logRepo: Repository<AiCallLog>,
    private readonly dataSource: DataSource
  ) {}

  /** 获取所有 Provider 配置列表（不含完整 API Key） */
  async list() {
    const list = await this.repo.find({ order: { is_active: 'DESC', id: 'ASC' } });
    return list.map((c) => this.maskConfig(c));
  }

  /** 获取当前激活的 Provider（内部使用，返回解密后的 apiKey） */
  async getActive(): Promise<{ config: AiConfig; apiKey: string } | null> {
    const config = await this.repo.findOne({ where: { enabled: true, is_active: true } });
    if (!config) return null;
    if (!config.api_key_encrypted) throw new BadRequestException('当前Provider未配置API Key');
    let apiKey: string;
    try {
      apiKey = decrypt(config.api_key_encrypted);
    } catch {
      throw new BadRequestException('AI Provider密钥解密失败，请重新配置API Key');
    }
    return { config, apiKey };
  }

  /** 创建 Provider */
  async create(dto: any) {
    if (!dto.api_key) throw new BadRequestException('API Key 不能为空');
    if (!dto.name) throw new BadRequestException('配置名称不能为空');
    if (!dto.base_url) dto.base_url = DEFAULT_URLS[dto.provider_type] || '';
    if (!dto.base_url) throw new BadRequestException('Base URL 不能为空');
    if (!dto.default_model) throw new BadRequestException('默认模型不能为空');

    const config = this.repo.create({
      school_id: 1,
      provider_id: 1,
      name: dto.name,
      provider_type: dto.provider_type || 'custom',
      api_key_encrypted: encrypt(dto.api_key),
      api_key_last4: dto.api_key.slice(-4),
      base_url: dto.base_url,
      default_model: dto.default_model,
      models: dto.models || null,
      enabled: dto.enabled !== false,
      is_active: false,
      remark: dto.remark || null,
    });

    const saved = await this.repo.save(config);

    if (dto.is_active) {
      await this.setActive(saved.id);
      saved.is_active = true;
    }

    return this.maskConfig(saved);
  }

  /** 更新 Provider */
  async update(id: number, dto: any) {
    const config = await this.repo.findOne({ where: { id } });
    if (!config) throw new NotFoundException('Provider不存在');

    if (dto.name !== undefined) config.name = dto.name;
    if (dto.provider_type !== undefined) config.provider_type = dto.provider_type;
    if (dto.base_url !== undefined) config.base_url = dto.base_url;
    if (dto.default_model !== undefined) config.default_model = dto.default_model;
    if (dto.models !== undefined) config.models = dto.models || null;
    if (dto.enabled !== undefined) config.enabled = dto.enabled;
    if (dto.remark !== undefined) config.remark = dto.remark || null;

    // API Key：只有填写新值时才更新
    if (dto.api_key) {
      config.api_key_encrypted = encrypt(dto.api_key);
      config.api_key_last4 = dto.api_key.slice(-4);
    }

    const saved = await this.repo.save(config);

    if (dto.is_active && saved.enabled) {
      await this.setActive(saved.id);
      saved.is_active = true;
    }

    return this.maskConfig(saved);
  }

  /** 删除 Provider */
  async remove(id: number) {
    const config = await this.repo.findOne({ where: { id } });
    if (!config) throw new NotFoundException('Provider不存在');
    await this.repo.remove(config);
    return { success: true };
  }

  /** 设为当前使用（事务） */
  async setActive(id: number) {
    return this.dataSource.transaction(async (mgr) => {
      const config = await mgr.findOne(AiConfig, { where: { id } });
      if (!config) throw new NotFoundException('Provider不存在');
      if (!config.enabled) throw new BadRequestException('已停用的Provider不能设为当前使用');

      // 先清空所有 is_active
      await mgr.update(AiConfig, {}, { is_active: false });
      // 设当前
      await mgr.update(AiConfig, { id }, { is_active: true });
      return { success: true };
    });
  }

  /** 启用 */
  async enable(id: number) {
    await this.repo.update({ id }, { enabled: true });
    const enabled = await this.repo.findOne({ where: { id } });
    return this.maskConfig(enabled!);
  }

  /** 停用 */
  async disable(id: number) {
    await this.repo.update({ id }, { enabled: false, is_active: false });
    const disabled = await this.repo.findOne({ where: { id } });
    return this.maskConfig(disabled!);
  }

  /** 测试连接 */
  async testConnection(id: number) {
    const config = await this.repo.findOne({ where: { id } });
    if (!config) throw new NotFoundException('Provider不存在');
    if (!config.api_key_encrypted) return this.saveTestResult(config, false, 'API Key未配置');

    let apiKey: string;
    try {
      apiKey = decrypt(config.api_key_encrypted);
    } catch {
      return this.saveTestResult(config, false, 'API Key解密失败，请重新配置');
    }

    const baseUrl =
      config.base_url || DEFAULT_URLS[config.provider_type] || 'https://api.deepseek.com/v1';
    const model = config.default_model || 'deepseek-chat';

    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 5,
          temperature: 0,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const latency = Date.now() - start;

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        const reason =
          res.status === 401
            ? 'API Key无效'
            : res.status === 404
              ? '模型不存在或Base URL错误'
              : `HTTP ${res.status}`;
        return this.saveTestResult(
          config,
          false,
          `${reason}${text ? ': ' + text.slice(0, 100) : ''}`
        );
      }

      await res.json();
      return this.saveTestResult(config, true, `连接成功 (${latency}ms)`);
    } catch (e: any) {
      if (e.name === 'AbortError') {
        return this.saveTestResult(config, false, '请求超时');
      }
      const msg =
        e.cause?.code === 'ECONNREFUSED'
          ? 'Base URL不可访问'
          : e.message?.includes('fetch')
            ? 'Base URL不可访问'
            : e.message?.slice(0, 200) || '未知错误';
      return this.saveTestResult(config, false, msg);
    }
  }

  /** 写入 Token 统计日志 */
  async logCall(data: {
    aiConfigId: number;
    providerName?: string;
    providerType?: string;
    model: string;
    status: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    latencyMs?: number;
    errorMessage?: string;
    userId?: number;
    callType?: string;
  }) {
    return this.logRepo.save({
      school_id: 1,
      user_id: data.userId || null,
      provider_id: data.aiConfigId,
      ai_config_id: data.aiConfigId,
      provider_name: data.providerName || null,
      provider_type: data.providerType || null,
      model: data.model,
      status: data.status,
      prompt_tokens: data.promptTokens || 0,
      completion_tokens: data.completionTokens || 0,
      total_tokens: data.totalTokens || 0,
      latency_ms: data.latencyMs || null,
      error_message: data.errorMessage || null,
      call_type: data.callType || 'chat',
    } as AiCallLog);
  }

  // ========= Private =========

  private maskConfig(c: AiConfig) {
    return {
      id: c.id,
      name: c.name || '未命名',
      provider_type: c.provider_type || 'custom',
      api_key_last4: c.api_key_last4 || null,
      api_key_masked: c.api_key_last4 ? `已配置，尾号${c.api_key_last4}` : '未配置',
      base_url: c.base_url || '',
      default_model: c.default_model || '',
      models: c.models || '',
      enabled: c.enabled,
      is_active: c.is_active,
      remark: c.remark || '',
      last_test_status: c.last_test_status || 'unknown',
      last_test_message: c.last_test_message || '',
      last_test_at: c.last_test_at || null,
      created_at: c.created_at,
      updated_at: c.updated_at,
    };
  }

  private async saveTestResult(config: AiConfig, success: boolean, message: string) {
    config.last_test_status = success ? 'success' : 'failed';
    config.last_test_message = message;
    config.last_test_at = new Date();
    await this.repo.save(config);
    return { success, message };
  }
}
