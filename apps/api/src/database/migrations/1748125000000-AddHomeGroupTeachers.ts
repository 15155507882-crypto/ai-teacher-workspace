import { MigrationInterface, QueryRunner, Table, TableIndex, TableUnique } from 'typeorm';

export class AddHomeGroupTeachers1748125000000 implements MigrationInterface {
  name = 'AddHomeGroupTeachers1748125000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'home_group_teachers',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'home_group_id', type: 'bigint' },
          { name: 'teacher_id', type: 'bigint' },
          { name: 'role', type: 'varchar', length: '20', default: `'member'` },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
          { name: 'updated_at', type: 'timestamp', default: 'now()' },
        ],
      }),
      true
    );

    await queryRunner.createUniqueConstraint(
      'home_group_teachers',
      new TableUnique({ columnNames: ['home_group_id', 'teacher_id'] })
    );

    await queryRunner.createIndex(
      'home_group_teachers',
      new TableIndex({ columnNames: ['home_group_id'] })
    );
    await queryRunner.createIndex(
      'home_group_teachers',
      new TableIndex({ columnNames: ['teacher_id'] })
    );

    // 不再自动迁移 teacher.department_id → home_group_teachers
    // 备课组成员通过管理后台手动配置
    console.log('[Migration] home_group_teachers table ready (no auto-migration)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('home_group_teachers', true);
  }
}
