import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class AddAiWorkspace1748200000000 implements MigrationInterface {
  name = 'AddAiWorkspace1748200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'ai_workspace',
        columns: [
          { name: 'id', type: 'bigint', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'session_id', type: 'bigint' },
          { name: 'teacher_id', type: 'bigint' },
          { name: 'state', type: 'varchar', length: '30', default: `'idle'` },
          { name: 'version', type: 'int', default: 1 },
          { name: 'title', type: 'varchar', length: '200', isNullable: true },
          { name: 'current_content', type: 'text', isNullable: true },
          { name: 'current_task', type: 'varchar', length: '50', isNullable: true },
          { name: 'current_save_type', type: 'varchar', length: '50', isNullable: true },
          { name: 'current_file_id', type: 'bigint', isNullable: true },
          { name: 'current_file_name', type: 'varchar', length: '255', isNullable: true },
          { name: 'current_prompt_version', type: 'varchar', length: '50', isNullable: true },
          { name: 'context', type: 'json', isNullable: true },
          { name: 'history_versions', type: 'json', isNullable: true },
          { name: 'last_error', type: 'varchar', length: '50', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
          { name: 'updated_at', type: 'timestamp', default: 'now()' },
        ],
      }),
      true
    );

    await queryRunner.createIndex('ai_workspace', new TableIndex({ columnNames: ['session_id'] }));
    await queryRunner.createIndex('ai_workspace', new TableIndex({ columnNames: ['teacher_id'] }));
    console.log('[Migration] ai_workspace table created');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('ai_workspace', true);
  }
}
