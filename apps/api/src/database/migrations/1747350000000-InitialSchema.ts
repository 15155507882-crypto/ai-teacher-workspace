import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class InitialSchema1747350000000 implements MigrationInterface {
  name = 'InitialSchema1747350000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // DB-001: school
    await queryRunner.createTable(
      new Table({
        name: 'school',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'name', type: 'varchar', length: '100' },
          { name: 'short_name', type: 'varchar', length: '50' },
          { name: 'logo_file_id', type: 'bigint', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true
    );
    await queryRunner.createIndex(
      'school',
      new TableIndex({ columnNames: ['name'], isUnique: true })
    );

    // DB-002: department
    await queryRunner.createTable(
      new Table({
        name: 'department',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'school_id', type: 'bigint' },
          { name: 'parent_id', type: 'bigint', isNullable: true, default: 0 },
          { name: 'name', type: 'varchar', length: '80' },
          { name: 'sort_order', type: 'int', default: 0 },
          { name: 'status', type: 'varchar', length: '20', default: "'active'" },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true
    );
    await queryRunner.createIndex('department', new TableIndex({ columnNames: ['school_id'] }));
    await queryRunner.createIndex('department', new TableIndex({ columnNames: ['parent_id'] }));
    await queryRunner.createIndex(
      'department',
      new TableIndex({ columnNames: ['school_id', 'parent_id', 'name'], isUnique: true })
    );

    // DB-003: teacher
    await queryRunner.createTable(
      new Table({
        name: 'teacher',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'school_id', type: 'bigint' },
          { name: 'department_id', type: 'bigint' },
          { name: 'mobile', type: 'varchar', length: '20' },
          { name: 'password_hash', type: 'varchar', length: '255' },
          { name: 'name', type: 'varchar', length: '50' },
          { name: 'avatar_file_id', type: 'bigint', isNullable: true },
          { name: 'role', type: 'varchar', length: '20', default: "'teacher'" },
          { name: 'status', type: 'varchar', length: '20', default: "'active'" },
          { name: 'last_login_at', type: 'timestamp', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'deleted_at', type: 'timestamp', isNullable: true },
        ],
      }),
      true
    );
    await queryRunner.createIndex(
      'teacher',
      new TableIndex({ columnNames: ['mobile'], isUnique: true })
    );
    await queryRunner.createIndex(
      'teacher',
      new TableIndex({ columnNames: ['school_id', 'department_id'] })
    );
    await queryRunner.createIndex('teacher', new TableIndex({ columnNames: ['status'] }));

    // DB-004: teacher_status_history
    await queryRunner.createTable(
      new Table({
        name: 'teacher_status_history',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'teacher_id', type: 'bigint' },
          { name: 'from_status', type: 'varchar', length: '20', isNullable: true },
          { name: 'to_status', type: 'varchar', length: '20' },
          { name: 'operator_id', type: 'bigint' },
          { name: 'reason', type: 'varchar', length: '255', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true
    );
    await queryRunner.createIndex(
      'teacher_status_history',
      new TableIndex({ columnNames: ['teacher_id'] })
    );
    await queryRunner.createIndex(
      'teacher_status_history',
      new TableIndex({ columnNames: ['created_at'] })
    );

    // DB-005: content
    await queryRunner.createTable(
      new Table({
        name: 'content',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'school_id', type: 'bigint' },
          { name: 'teacher_id', type: 'bigint' },
          { name: 'department_id', type: 'bigint' },
          { name: 'content_type', type: 'varchar', length: '30' },
          { name: 'title', type: 'varchar', length: '200' },
          { name: 'summary', type: 'text', isNullable: true },
          { name: 'academic_year', type: 'varchar', length: '20' },
          { name: 'semester', type: 'varchar', length: '20' },
          { name: 'source', type: 'varchar', length: '20', default: "'chat'" },
          { name: 'visibility', type: 'varchar', length: '20', default: "'school'" },
          { name: 'status', type: 'varchar', length: '20', default: "'draft'" },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'deleted_at', type: 'timestamp', isNullable: true },
        ],
      }),
      true
    );
    await queryRunner.createIndex(
      'content',
      new TableIndex({ columnNames: ['teacher_id', 'content_type'] })
    );
    await queryRunner.createIndex('content', new TableIndex({ columnNames: ['department_id'] }));
    await queryRunner.createIndex(
      'content',
      new TableIndex({ columnNames: ['academic_year', 'semester'] })
    );

    // DB-006: personal_lesson
    await queryRunner.createTable(
      new Table({
        name: 'personal_lesson',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'content_id', type: 'bigint' },
          { name: 'teacher_id', type: 'bigint' },
          { name: 'lesson_date', type: 'date', isNullable: true },
          { name: 'grade', type: 'varchar', length: '30', isNullable: true },
          { name: 'subject', type: 'varchar', length: '30', isNullable: true },
          { name: 'chapter', type: 'varchar', length: '100', isNullable: true },
          { name: 'lesson_no', type: 'varchar', length: '50', isNullable: true },
          { name: 'body_text', type: 'text', isNullable: true },
          { name: 'ai_title_confidence', type: 'decimal', precision: 5, scale: 2, default: 0 },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true
    );
    await queryRunner.createIndex(
      'personal_lesson',
      new TableIndex({ columnNames: ['content_id'], isUnique: true })
    );
    await queryRunner.createIndex(
      'personal_lesson',
      new TableIndex({ columnNames: ['teacher_id', 'lesson_date'] })
    );
    await queryRunner.createIndex(
      'personal_lesson',
      new TableIndex({ columnNames: ['subject', 'grade'] })
    );

    // DB-007: lesson_attachment
    await queryRunner.createTable(
      new Table({
        name: 'lesson_attachment',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'content_id', type: 'bigint' },
          { name: 'file_id', type: 'bigint' },
          { name: 'attachment_role', type: 'varchar', length: '30', default: "'main'" },
          { name: 'sort_order', type: 'int', default: 0 },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true
    );
    await queryRunner.createIndex(
      'lesson_attachment',
      new TableIndex({ columnNames: ['content_id'] })
    );
    await queryRunner.createIndex(
      'lesson_attachment',
      new TableIndex({ columnNames: ['file_id'] })
    );

    // DB-008: reflection
    await queryRunner.createTable(
      new Table({
        name: 'reflection',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'content_id', type: 'bigint' },
          { name: 'lesson_content_id', type: 'bigint' },
          { name: 'teacher_id', type: 'bigint' },
          { name: 'reflection_text', type: 'text' },
          { name: 'reflection_date', type: 'date', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true
    );
    await queryRunner.createIndex(
      'reflection',
      new TableIndex({ columnNames: ['content_id'], isUnique: true })
    );
    await queryRunner.createIndex(
      'reflection',
      new TableIndex({ columnNames: ['lesson_content_id'] })
    );
    await queryRunner.createIndex(
      'reflection',
      new TableIndex({ columnNames: ['teacher_id', 'reflection_date'] })
    );

    // DB-009: group_lesson
    await queryRunner.createTable(
      new Table({
        name: 'group_lesson',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'content_id', type: 'bigint' },
          { name: 'creator_id', type: 'bigint' },
          { name: 'department_id', type: 'bigint' },
          { name: 'topic', type: 'varchar', length: '200' },
          { name: 'grade', type: 'varchar', length: '30', isNullable: true },
          { name: 'subject', type: 'varchar', length: '30', isNullable: true },
          { name: 'activity_date', type: 'date', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true
    );
    await queryRunner.createIndex(
      'group_lesson',
      new TableIndex({ columnNames: ['content_id'], isUnique: true })
    );
    await queryRunner.createIndex('group_lesson', new TableIndex({ columnNames: ['creator_id'] }));
    await queryRunner.createIndex(
      'group_lesson',
      new TableIndex({ columnNames: ['department_id'] })
    );

    // DB-010: group_lesson_comment
    await queryRunner.createTable(
      new Table({
        name: 'group_lesson_comment',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'group_lesson_id', type: 'bigint' },
          { name: 'teacher_id', type: 'bigint' },
          { name: 'comment_text', type: 'text', isNullable: true },
          { name: 'file_id', type: 'bigint', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'deleted_at', type: 'timestamp', isNullable: true },
        ],
      }),
      true
    );
    await queryRunner.createIndex(
      'group_lesson_comment',
      new TableIndex({ columnNames: ['group_lesson_id'] })
    );
    await queryRunner.createIndex(
      'group_lesson_comment',
      new TableIndex({ columnNames: ['teacher_id'] })
    );
    await queryRunner.createIndex(
      'group_lesson_comment',
      new TableIndex({ columnNames: ['created_at'] })
    );

    // DB-011: plan_summary
    await queryRunner.createTable(
      new Table({
        name: 'plan_summary',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'content_id', type: 'bigint' },
          { name: 'teacher_id', type: 'bigint' },
          { name: 'plan_type', type: 'varchar', length: '30' },
          { name: 'body_text', type: 'text', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true
    );
    await queryRunner.createIndex(
      'plan_summary',
      new TableIndex({ columnNames: ['content_id'], isUnique: true })
    );
    await queryRunner.createIndex(
      'plan_summary',
      new TableIndex({ columnNames: ['teacher_id', 'plan_type'] })
    );

    // DB-012: file_asset
    await queryRunner.createTable(
      new Table({
        name: 'file_asset',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'school_id', type: 'bigint' },
          { name: 'uploader_id', type: 'bigint' },
          { name: 'original_name', type: 'varchar', length: '255' },
          { name: 'storage_key', type: 'varchar', length: '500' },
          { name: 'mime_type', type: 'varchar', length: '100', isNullable: true },
          { name: 'file_ext', type: 'varchar', length: '20', isNullable: true },
          { name: 'file_size', type: 'bigint', default: 0 },
          { name: 'sha256', type: 'varchar', length: '128', isNullable: true },
          { name: 'status', type: 'varchar', length: '20', default: "'uploaded'" },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'deleted_at', type: 'timestamp', isNullable: true },
        ],
      }),
      true
    );
    await queryRunner.createIndex('file_asset', new TableIndex({ columnNames: ['uploader_id'] }));
    await queryRunner.createIndex('file_asset', new TableIndex({ columnNames: ['sha256'] }));
    await queryRunner.createIndex('file_asset', new TableIndex({ columnNames: ['status'] }));

    // DB-013: preview_file
    await queryRunner.createTable(
      new Table({
        name: 'preview_file',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'file_id', type: 'bigint' },
          { name: 'preview_type', type: 'varchar', length: '30' },
          { name: 'preview_storage_key', type: 'varchar', length: '500' },
          { name: 'convert_engine', type: 'varchar', length: '50', default: "'libreoffice'" },
          { name: 'status', type: 'varchar', length: '20', default: "'pending'" },
          { name: 'error_message', type: 'text', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true
    );
    await queryRunner.createIndex('preview_file', new TableIndex({ columnNames: ['file_id'] }));
    await queryRunner.createIndex('preview_file', new TableIndex({ columnNames: ['status'] }));

    // DB-014: ai_session
    await queryRunner.createTable(
      new Table({
        name: 'ai_session',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'teacher_id', type: 'bigint' },
          { name: 'scope', type: 'varchar', length: '30', default: "'workspace'" },
          { name: 'context_content_id', type: 'bigint', isNullable: true },
          { name: 'status', type: 'varchar', length: '20', default: "'active'" },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true
    );
    await queryRunner.createIndex(
      'ai_session',
      new TableIndex({ columnNames: ['teacher_id', 'status'] })
    );
    await queryRunner.createIndex(
      'ai_session',
      new TableIndex({ columnNames: ['context_content_id'] })
    );

    // DB-015: ai_message
    await queryRunner.createTable(
      new Table({
        name: 'ai_message',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'session_id', type: 'bigint' },
          { name: 'sender_type', type: 'varchar', length: '20' },
          { name: 'message_type', type: 'varchar', length: '20' },
          { name: 'text_content', type: 'text', isNullable: true },
          { name: 'file_id', type: 'bigint', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true
    );
    await queryRunner.createIndex('ai_message', new TableIndex({ columnNames: ['session_id'] }));
    await queryRunner.createIndex('ai_message', new TableIndex({ columnNames: ['created_at'] }));

    // DB-016: ai_recognition_record
    await queryRunner.createTable(
      new Table({
        name: 'ai_recognition_record',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'session_id', type: 'bigint', isNullable: true },
          { name: 'message_id', type: 'bigint', isNullable: true },
          { name: 'file_id', type: 'bigint', isNullable: true },
          { name: 'predicted_type', type: 'varchar', length: '30', isNullable: true },
          { name: 'final_type', type: 'varchar', length: '30', isNullable: true },
          { name: 'confidence', type: 'decimal', precision: 5, scale: 2, default: 0 },
          { name: 'extracted_json', type: 'json', isNullable: true },
          { name: 'status', type: 'varchar', length: '20', default: "'pending'" },
          { name: 'confirmed_by', type: 'bigint', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true
    );
    await queryRunner.createIndex(
      'ai_recognition_record',
      new TableIndex({ columnNames: ['session_id'] })
    );
    await queryRunner.createIndex(
      'ai_recognition_record',
      new TableIndex({ columnNames: ['file_id'] })
    );
    await queryRunner.createIndex(
      'ai_recognition_record',
      new TableIndex({ columnNames: ['status'] })
    );

    // DB-017: export_task
    await queryRunner.createTable(
      new Table({
        name: 'export_task',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'teacher_id', type: 'bigint' },
          { name: 'operator_id', type: 'bigint' },
          { name: 'academic_year', type: 'varchar', length: '20' },
          { name: 'semester', type: 'varchar', length: '20' },
          { name: 'export_type', type: 'varchar', length: '30' },
          { name: 'status', type: 'varchar', length: '20', default: "'pending'" },
          { name: 'file_id', type: 'bigint', isNullable: true },
          { name: 'error_message', type: 'text', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true
    );
    await queryRunner.createIndex('export_task', new TableIndex({ columnNames: ['teacher_id'] }));
    await queryRunner.createIndex('export_task', new TableIndex({ columnNames: ['status'] }));

    // DB-018: operation_log
    await queryRunner.createTable(
      new Table({
        name: 'operation_log',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'operator_id', type: 'bigint', isNullable: true },
          { name: 'action', type: 'varchar', length: '80' },
          { name: 'target_type', type: 'varchar', length: '50', isNullable: true },
          { name: 'target_id', type: 'bigint', isNullable: true },
          { name: 'detail_json', type: 'json', isNullable: true },
          { name: 'ip', type: 'varchar', length: '64', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true
    );
    await queryRunner.createIndex(
      'operation_log',
      new TableIndex({ columnNames: ['operator_id'] })
    );
    await queryRunner.createIndex('operation_log', new TableIndex({ columnNames: ['action'] }));
    await queryRunner.createIndex('operation_log', new TableIndex({ columnNames: ['created_at'] }));

    // DB-019: login_log
    await queryRunner.createTable(
      new Table({
        name: 'login_log',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'mobile', type: 'varchar', length: '20' },
          { name: 'teacher_id', type: 'bigint', isNullable: true },
          { name: 'status', type: 'varchar', length: '20' },
          { name: 'fail_reason', type: 'varchar', length: '255', isNullable: true },
          { name: 'ip', type: 'varchar', length: '64', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true
    );
    await queryRunner.createIndex('login_log', new TableIndex({ columnNames: ['mobile'] }));
    await queryRunner.createIndex('login_log', new TableIndex({ columnNames: ['status'] }));
    await queryRunner.createIndex('login_log', new TableIndex({ columnNames: ['created_at'] }));

    // DB-020: deleted_record
    await queryRunner.createTable(
      new Table({
        name: 'deleted_record',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'operator_id', type: 'bigint' },
          { name: 'target_type', type: 'varchar', length: '50' },
          { name: 'target_id', type: 'bigint' },
          { name: 'reason', type: 'varchar', length: '255', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true
    );
    await queryRunner.createIndex(
      'deleted_record',
      new TableIndex({ columnNames: ['operator_id'] })
    );
    await queryRunner.createIndex(
      'deleted_record',
      new TableIndex({ columnNames: ['target_type', 'target_id'] })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tables = [
      'deleted_record',
      'login_log',
      'operation_log',
      'export_task',
      'ai_recognition_record',
      'ai_message',
      'ai_session',
      'preview_file',
      'file_asset',
      'plan_summary',
      'group_lesson_comment',
      'group_lesson',
      'reflection',
      'lesson_attachment',
      'personal_lesson',
      'content',
      'teacher_status_history',
      'teacher',
      'department',
      'school',
    ];
    for (const table of tables) {
      await queryRunner.dropTable(table, true);
    }
  }
}
