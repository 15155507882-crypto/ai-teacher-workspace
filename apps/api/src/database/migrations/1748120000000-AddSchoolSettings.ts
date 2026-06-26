import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddSchoolSettings1748120000000 implements MigrationInterface {
  name = 'AddSchoolSettings1748120000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'school',
      new TableColumn({
        name: 'settings',
        type: 'json',
        isNullable: true,
        default: null,
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('school', 'settings');
  }
}
