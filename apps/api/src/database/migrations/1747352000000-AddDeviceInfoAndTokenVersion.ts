import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeviceInfoAndTokenVersion1747352000000 implements MigrationInterface {
  name = 'AddDeviceInfoAndTokenVersion1747352000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // login_log: device, browser, os
    await queryRunner.query(`ALTER TABLE "login_log" ADD COLUMN "device" varchar(50)`);
    await queryRunner.query(`ALTER TABLE "login_log" ADD COLUMN "browser" varchar(50)`);
    await queryRunner.query(`ALTER TABLE "login_log" ADD COLUMN "os" varchar(50)`);

    // teacher: token_version
    await queryRunner.query(
      `ALTER TABLE "teacher" ADD COLUMN "token_version" int NOT NULL DEFAULT 1`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "teacher" DROP COLUMN "token_version"`);
    await queryRunner.query(`ALTER TABLE "login_log" DROP COLUMN "os"`);
    await queryRunner.query(`ALTER TABLE "login_log" DROP COLUMN "browser"`);
    await queryRunner.query(`ALTER TABLE "login_log" DROP COLUMN "device"`);
  }
}
