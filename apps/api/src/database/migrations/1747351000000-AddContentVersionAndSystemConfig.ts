import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class AddContentVersionAndSystemConfig1747351000000 implements MigrationInterface {
  name = 'AddContentVersionAndSystemConfig1747351000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. content: add version and is_latest
    await queryRunner.query(`ALTER TABLE "content" ADD COLUMN "version" int NOT NULL DEFAULT 1`);
    await queryRunner.query(
      `ALTER TABLE "content" ADD COLUMN "is_latest" boolean NOT NULL DEFAULT true`
    );

    // 2. file_asset: add extension and size
    await queryRunner.query(`ALTER TABLE "file_asset" ADD COLUMN "extension" varchar(20)`);
    await queryRunner.query(`ALTER TABLE "file_asset" ADD COLUMN "size" bigint NOT NULL DEFAULT 0`);

    // 3. ai_session: add conversation_title
    await queryRunner.query(
      `ALTER TABLE "ai_session" ADD COLUMN "conversation_title" varchar(200)`
    );

    // 4. system_config table
    await queryRunner.createTable(
      new Table({
        name: 'system_config',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'config_key', type: 'varchar', length: '100' },
          { name: 'config_value', type: 'text' },
          { name: 'config_type', type: 'varchar', length: '50', isNullable: true },
          { name: 'description', type: 'varchar', length: '255', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true
    );
    await queryRunner.createIndex(
      'system_config',
      new TableIndex({ columnNames: ['config_key'], isUnique: true })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "content" DROP COLUMN "is_latest"`);
    await queryRunner.query(`ALTER TABLE "content" DROP COLUMN "version"`);
    await queryRunner.query(`ALTER TABLE "file_asset" DROP COLUMN "size"`);
    await queryRunner.query(`ALTER TABLE "file_asset" DROP COLUMN "extension"`);
    await queryRunner.query(`ALTER TABLE "ai_session" DROP COLUMN "conversation_title"`);
    await queryRunner.dropTable('system_config', true);
  }
}
