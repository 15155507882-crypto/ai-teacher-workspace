import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddTeacherGender1748121000000 implements MigrationInterface {
  name = 'AddTeacherGender1748121000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'teacher',
      new TableColumn({
        name: 'gender',
        type: 'varchar',
        length: '10',
        isNullable: true,
        default: null,
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('teacher', 'gender');
  }
}
