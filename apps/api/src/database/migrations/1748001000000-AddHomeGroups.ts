import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class AddHomeGroups1748001000000 implements MigrationInterface {
  name = 'AddHomeGroups1748001000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'home_groups',
        columns: [
          { name: 'id', type: 'bigint', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'name', type: 'varchar', length: '80' },
          { name: 'code', type: 'varchar', length: '30', isNullable: true },
          { name: 'parent_id', type: 'bigint', default: 0 },
          { name: 'sort_order', type: 'int', default: 0 },
          { name: 'is_home_visible', type: 'boolean', default: true },
          { name: 'status', type: 'varchar', length: '20', default: "'active'" },
          { name: 'remark', type: 'varchar', length: '200', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
          { name: 'updated_at', type: 'timestamp', default: 'now()' },
          { name: 'deleted_at', type: 'timestamp', isNullable: true },
        ],
      }),
      true,
    );
    await queryRunner.createIndex('home_groups', new TableIndex({ columnNames: ['parent_id'] }));
    await queryRunner.createIndex('home_groups', new TableIndex({ columnNames: ['status', 'is_home_visible'] }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('home_groups', true);
  }
}
