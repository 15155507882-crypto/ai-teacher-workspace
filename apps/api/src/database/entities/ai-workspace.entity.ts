import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/** AI 工作空间：持久化会话状态 */
@Entity('ai_workspace')
export class AiWorkspace {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  session_id: number;

  @Column({ type: 'bigint' })
  teacher_id: number;

  @Column({ type: 'varchar', length: 30, default: 'idle' })
  state: string;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ type: 'varchar', length: 200, nullable: true })
  title: string | null;

  @Column({ type: 'text', nullable: true })
  current_content: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  current_task: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  current_save_type: string | null;

  @Column({ type: 'bigint', nullable: true })
  current_file_id: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  current_file_name: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  current_prompt_version: string | null;

  @Column({ type: 'json', nullable: true })
  context: any;

  @Column({ type: 'json', nullable: true })
  history_versions: any;

  @Column({ type: 'varchar', length: 50, nullable: true })
  last_error: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
