import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class AddActionHistory1747356000000 implements MigrationInterface {
  name = 'AddActionHistory1747356000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'action_history',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'operator_id', type: 'bigint' },
          { name: 'action_type', type: 'varchar', length: '50' },
          { name: 'target_type', type: 'varchar', length: '50' },
          { name: 'target_id', type: 'bigint', isNullable: true },
          { name: 'status', type: 'varchar', length: '20', default: "'completed'" },
          { name: 'input_snapshot', type: 'json', isNullable: true },
          { name: 'output_snapshot', type: 'json', isNullable: true },
          { name: 'revert_target_id', type: 'bigint', isNullable: true },
          { name: 'reverted_at', type: 'timestamp', isNullable: true },
          { name: 'error_message', type: 'varchar', length: '255', isNullable: true },
          { name: 'duration_ms', type: 'int', default: 0 },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true
    );
    await queryRunner.createIndex(
      'action_history',
      new TableIndex({ columnNames: ['operator_id'] })
    );
    await queryRunner.createIndex(
      'action_history',
      new TableIndex({ columnNames: ['action_type'] })
    );
    await queryRunner.createIndex(
      'action_history',
      new TableIndex({ columnNames: ['created_at'] })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('action_history', true);
  }
}
