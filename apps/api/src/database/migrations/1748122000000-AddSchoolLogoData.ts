import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddSchoolLogoData1748122000000 implements MigrationInterface {
  name = 'AddSchoolLogoData1748122000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'school',
      new TableColumn({
        name: 'logo_data',
        type: 'text',
        isNullable: true,
        default: null,
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('school', 'logo_data');
  }
}
