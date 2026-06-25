import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTeacherSortAndHomeVisible1747354000000 implements MigrationInterface {
  name = 'AddTeacherSortAndHomeVisible1747354000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "teacher" ADD COLUMN "sort" int NOT NULL DEFAULT 0`);
    await queryRunner.query(
      `ALTER TABLE "teacher" ADD COLUMN "is_home_visible" boolean NOT NULL DEFAULT true`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "teacher" DROP COLUMN "is_home_visible"`);
    await queryRunner.query(`ALTER TABLE "teacher" DROP COLUMN "sort"`);
  }
}
