import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('ai_call_logs')
export class AiCallLog {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint', default: 1 })
  school_id: number;

  @Column({ type: 'bigint', nullable: true })
  user_id: number | null;

  @Column({ type: 'bigint', nullable: true })
  provider_id: number | null;

  @Column({ type: 'bigint', nullable: true })
  ai_config_id: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  provider_name: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  provider_type: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  model: string | null;

  @Column({ type: 'int', default: 0 })
  prompt_tokens: number;

  @Column({ type: 'int', default: 0 })
  completion_tokens: number;

  @Column({ type: 'int', default: 0 })
  total_tokens: number;

  @Column({ type: 'int', nullable: true })
  latency_ms: number | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  call_type: string | null;

  @Column({ type: 'varchar', length: 20, default: 'success' })
  status: string;

  @Column({ type: 'text', nullable: true })
  error_message: string | null;

  @CreateDateColumn()
  created_at: Date;
}
