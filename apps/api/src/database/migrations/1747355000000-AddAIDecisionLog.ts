import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class AddAIDecisionLog1747355000000 implements MigrationInterface {
  name = 'AddAIDecisionLog1747355000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'ai_decision_log',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'session_id', type: 'bigint', isNullable: true },
          { name: 'message_id', type: 'bigint', isNullable: true },
          { name: 'prompt_used', type: 'varchar', length: '30' },
          { name: 'prompt_input', type: 'text', isNullable: true },
          { name: 'ai_raw_json', type: 'json', isNullable: true },
          { name: 'predicted_type', type: 'varchar', length: '30', isNullable: true },
          { name: 'confidence', type: 'decimal', precision: 5, scale: 2, default: 0 },
          { name: 'confirm_status', type: 'varchar', length: '20', default: "'pending'" },
          { name: 'confirmed_by', type: 'bigint', isNullable: true },
          { name: 'confirmed_type', type: 'varchar', length: '30', isNullable: true },
          { name: 'error_message', type: 'text', isNullable: true },
          { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true
    );
    await queryRunner.createIndex(
      'ai_decision_log',
      new TableIndex({ columnNames: ['session_id'] })
    );
    await queryRunner.createIndex(
      'ai_decision_log',
      new TableIndex({ columnNames: ['confirm_status'] })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('ai_decision_log', true);
  }
}
