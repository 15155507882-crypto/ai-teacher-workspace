import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddTeacherMultiDeptRoles1748123000000 implements MigrationInterface {
  name = 'AddTeacherMultiDeptRoles1748123000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 新增逗号分隔的组织ID列表
    await queryRunner.addColumn(
      'teacher',
      new TableColumn({
        name: 'department_ids',
        type: 'varchar',
        length: '500',
        isNullable: true,
        default: null,
      })
    );
    // 扩大 role 字段以支持逗号分隔多角色
    await queryRunner.query(`ALTER TABLE "teacher" ALTER COLUMN "role" TYPE varchar(200)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('teacher', 'department_ids');
    await queryRunner.query(`ALTER TABLE "teacher" ALTER COLUMN "role" TYPE varchar(20)`);
  }
}
