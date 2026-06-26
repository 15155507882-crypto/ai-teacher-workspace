import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class V22AddAiTables1748000000000 implements MigrationInterface {
  name = 'V22AddAiTables1748000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ai_providers
    await queryRunner.createTable(
      new Table({
        name: 'ai_providers',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'name', type: 'varchar', length: '50' },
          { name: 'code', type: 'varchar', length: '30' },
          { name: 'default_base_url', type: 'varchar', length: '255', isNullable: true },
          { name: 'enabled', type: 'boolean', default: true },
          { name: 'sort_order', type: 'int', default: 0 },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
          { name: 'updated_at', type: 'timestamp', default: 'now()' },
        ],
      }),
      true
    );
    await queryRunner.createIndex(
      'ai_providers',
      new TableIndex({ columnNames: ['code'], isUnique: true })
    );

    // ai_configs
    await queryRunner.createTable(
      new Table({
        name: 'ai_configs',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'school_id', type: 'bigint', default: 1 },
          { name: 'provider_id', type: 'bigint' },
          { name: 'api_key_encrypted', type: 'varchar', length: '500' },
          { name: 'base_url', type: 'varchar', length: '255', isNullable: true },
          { name: 'default_model', type: 'varchar', length: '50', isNullable: true },
          { name: 'enabled', type: 'boolean', default: true },
          { name: 'last_test_status', type: 'varchar', length: '20', isNullable: true },
          { name: 'last_test_message', type: 'text', isNullable: true },
          { name: 'last_test_at', type: 'timestamp', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
          { name: 'updated_at', type: 'timestamp', default: 'now()' },
        ],
      }),
      true
    );

    // ai_call_logs
    await queryRunner.createTable(
      new Table({
        name: 'ai_call_logs',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'school_id', type: 'bigint', default: 1 },
          { name: 'user_id', type: 'bigint', isNullable: true },
          { name: 'provider_id', type: 'bigint', isNullable: true },
          { name: 'model', type: 'varchar', length: '50', isNullable: true },
          { name: 'prompt_tokens', type: 'int', default: 0 },
          { name: 'completion_tokens', type: 'int', default: 0 },
          { name: 'total_tokens', type: 'int', default: 0 },
          { name: 'call_type', type: 'varchar', length: '30', isNullable: true },
          { name: 'status', type: 'varchar', length: '20', default: "'success'" },
          { name: 'error_message', type: 'text', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
        ],
      }),
      true
    );
    await queryRunner.createIndex(
      'ai_call_logs',
      new TableIndex({ columnNames: ['school_id', 'created_at'] })
    );
    await queryRunner.createIndex(
      'ai_call_logs',
      new TableIndex({ columnNames: ['user_id', 'created_at'] })
    );

    // Field additions to existing tables
    await queryRunner.query(
      `ALTER TABLE personal_lesson ADD COLUMN IF NOT EXISTS "week_no" int DEFAULT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE group_lesson ADD COLUMN IF NOT EXISTS "week_no" int DEFAULT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE group_lesson ADD COLUMN IF NOT EXISTS "group_lesson_type" varchar(30) DEFAULT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE reflection ADD COLUMN IF NOT EXISTS "match_score" decimal(5,2) DEFAULT 0`
    );
    await queryRunner.query(
      `ALTER TABLE file_asset ADD COLUMN IF NOT EXISTS "parsed_text" text DEFAULT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE file_asset ADD COLUMN IF NOT EXISTS "preview_status" varchar(20) DEFAULT 'none'`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE file_asset DROP COLUMN IF EXISTS "preview_status"`);
    await queryRunner.query(`ALTER TABLE file_asset DROP COLUMN IF EXISTS "parsed_text"`);
    await queryRunner.query(`ALTER TABLE reflection DROP COLUMN IF EXISTS "match_score"`);
    await queryRunner.query(`ALTER TABLE group_lesson DROP COLUMN IF EXISTS "group_lesson_type"`);
    await queryRunner.query(`ALTER TABLE group_lesson DROP COLUMN IF EXISTS "week_no"`);
    await queryRunner.query(`ALTER TABLE personal_lesson DROP COLUMN IF EXISTS "week_no"`);
    await queryRunner.dropTable('ai_call_logs', true);
    await queryRunner.dropTable('ai_configs', true);
    await queryRunner.dropTable('ai_providers', true);
  }
}
