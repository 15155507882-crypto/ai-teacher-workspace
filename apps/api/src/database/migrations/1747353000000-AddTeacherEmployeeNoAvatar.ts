import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTeacherEmployeeNoAvatar1747353000000 implements MigrationInterface {
  name = 'AddTeacherEmployeeNoAvatar1747353000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "teacher" ADD COLUMN "employee_no" varchar(50)`);
    await queryRunner.query(`ALTER TABLE "teacher" ADD COLUMN "avatar" varchar(500)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "teacher" DROP COLUMN "avatar"`);
    await queryRunner.query(`ALTER TABLE "teacher" DROP COLUMN "employee_no"`);
  }
}
