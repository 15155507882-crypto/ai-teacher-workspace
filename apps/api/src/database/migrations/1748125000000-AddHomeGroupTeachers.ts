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

    // 迁移旧数据：teacher.department_id → home_group_teachers
    const rows: any[] = await queryRunner.query(
      `SELECT t.id as teacher_id, t.department_id
       FROM teacher t
       INNER JOIN home_groups hg ON t.department_id = hg.id
       WHERE t.department_id > 0`
    );

    if (rows.length > 0) {
      // 去重后插入
      const seen = new Set<string>();
      for (const r of rows) {
        const key = `${r.department_id}_${r.teacher_id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        await queryRunner.query(
          `INSERT INTO home_group_teachers (home_group_id, teacher_id, role)
           VALUES ($1, $2, 'member')
           ON CONFLICT (home_group_id, teacher_id) DO NOTHING`,
          [r.department_id, r.teacher_id]
        );
      }
    }

    console.log(`[Migration] home_group_teachers created, migrated ${rows.length} relations`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('home_group_teachers', true);
  }
}
