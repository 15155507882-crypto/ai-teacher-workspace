import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';
import * as crypto from 'crypto';

function encryptApiKey(plain: string): string {
  const secret = process.env.ENCRYPTION_KEY || 'ai-teacher-workspace-default-key-32!';
  const key = crypto.createHash('sha256').update(secret).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(plain, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

export class ExpandAiConfigs1748124000000 implements MigrationInterface {
  name = 'ExpandAiConfigs1748124000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. 扩展 ai_configs 表
    const aiConfigsCols: TableColumn[] = [
      new TableColumn({ name: 'name', type: 'varchar', length: '100', isNullable: true }),
      new TableColumn({
        name: 'provider_type',
        type: 'varchar',
        length: '30',
        isNullable: true,
        default: `'custom'`,
      }),
      new TableColumn({ name: 'api_key_last4', type: 'varchar', length: '10', isNullable: true }),
      new TableColumn({ name: 'models', type: 'text', isNullable: true }),
      new TableColumn({ name: 'is_active', type: 'boolean', default: false }),
      new TableColumn({ name: 'remark', type: 'varchar', length: '500', isNullable: true }),
    ];
    for (const col of aiConfigsCols) {
      await queryRunner.addColumn('ai_configs', col);
    }

    // 2. 扩展 ai_call_logs 表
    const logCols: TableColumn[] = [
      new TableColumn({ name: 'ai_config_id', type: 'bigint', isNullable: true }),
      new TableColumn({ name: 'provider_name', type: 'varchar', length: '100', isNullable: true }),
      new TableColumn({ name: 'provider_type', type: 'varchar', length: '30', isNullable: true }),
      new TableColumn({ name: 'latency_ms', type: 'int', isNullable: true }),
    ];
    for (const col of logCols) {
      await queryRunner.addColumn('ai_call_logs', col);
    }

    // 3. 迁移旧配置
    const oldConfigs: any[] = await queryRunner.query(
      `SELECT ac.*, ap.name as provider_name, ap.code as provider_code, ap.default_base_url
       FROM ai_configs ac
       LEFT JOIN ai_providers ap ON ac.provider_id = ap.id`
    );

    if (oldConfigs.length > 0) {
      for (const row of oldConfigs) {
        const name = row.provider_name || '默认Provider';
        const providerType = row.provider_code || 'custom';
        let apiKeyLast4: string | null = null;

        // 尝试获取 api_key 明文（旧逻辑中 api_key_encrypted 可能存的是明文）
        try {
          const { decrypt } = require('../../common/crypto/aes');
          const decrypted = decrypt(row.api_key_encrypted);
          if (decrypted && decrypted.length >= 4) {
            apiKeyLast4 = decrypted.slice(-4);
            // 确保是加密存储
            const reEncrypted = encryptApiKey(decrypted);
            if (reEncrypted !== row.api_key_encrypted) {
              await queryRunner.query(
                `UPDATE ai_configs SET api_key_encrypted = $1 WHERE id = $2`,
                [reEncrypted, row.id]
              );
            }
          }
        } catch {
          // 可能是明文，直接加密
          if (row.api_key_encrypted && row.api_key_encrypted.length >= 4) {
            apiKeyLast4 = row.api_key_encrypted.slice(-4);
            const encrypted = encryptApiKey(row.api_key_encrypted);
            await queryRunner.query(`UPDATE ai_configs SET api_key_encrypted = $1 WHERE id = $2`, [
              encrypted,
              row.id,
            ]);
          }
        }

        await queryRunner.query(
          `UPDATE ai_configs SET
            name = $1,
            provider_type = $2,
            api_key_last4 = $3,
            is_active = $4,
            base_url = COALESCE(NULLIF(base_url, ''), $5),
            enabled = true
           WHERE id = $6`,
          [
            name,
            providerType,
            apiKeyLast4,
            true, // is_active for first config
            row.default_base_url || null,
            row.id,
          ]
        );
      }

      // 确保只有一个 is_active
      const activeRows: any[] = await queryRunner.query(
        `SELECT id FROM ai_configs WHERE is_active = true ORDER BY id ASC`
      );
      for (let i = 1; i < activeRows.length; i++) {
        await queryRunner.query(`UPDATE ai_configs SET is_active = false WHERE id = $1`, [
          activeRows[i].id,
        ]);
      }
    }

    console.log(`[Migration] Expanded ai_configs, migrated ${oldConfigs.length} configs`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 移除扩展列
    await queryRunner.dropColumn('ai_configs', 'remark');
    await queryRunner.dropColumn('ai_configs', 'is_active');
    await queryRunner.dropColumn('ai_configs', 'models');
    await queryRunner.dropColumn('ai_configs', 'api_key_last4');
    await queryRunner.dropColumn('ai_configs', 'provider_type');
    await queryRunner.dropColumn('ai_configs', 'name');

    await queryRunner.dropColumn('ai_call_logs', 'latency_ms');
    await queryRunner.dropColumn('ai_call_logs', 'provider_type');
    await queryRunner.dropColumn('ai_call_logs', 'provider_name');
    await queryRunner.dropColumn('ai_call_logs', 'ai_config_id');
  }
}
