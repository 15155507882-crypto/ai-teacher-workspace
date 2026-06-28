import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class AddConversation1748201000000 implements MigrationInterface {
  name = 'AddConversation1748201000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'conversation',
        columns: [
          { name: 'id', type: 'bigint', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'teacher_id', type: 'bigint' },
          { name: 'title', type: 'varchar', length: '200', default: `'新会话'` },
          { name: 'summary', type: 'text', isNullable: true },
          { name: 'status', type: 'varchar', length: '20', default: `'active'` },
          { name: 'last_active_at', type: 'timestamp', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
          { name: 'updated_at', type: 'timestamp', default: 'now()' },
        ],
      }),
      true
    );
    await queryRunner.createIndex('conversation', new TableIndex({ columnNames: ['teacher_id'] }));
    console.log('[Migration] conversation table created');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('conversation', true);
  }
}
