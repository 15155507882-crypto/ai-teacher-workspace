import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('ai_decision_log')
export class AIDecisionLog {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint', nullable: true })
  session_id: number | null;

  @Column({ type: 'bigint', nullable: true })
  message_id: number | null;

  @Column({ type: 'varchar', length: 30 })
  prompt_used: string;

  @Column({ type: 'text', nullable: true })
  prompt_input: string | null;

  @Column({ type: 'json', nullable: true })
  ai_raw_json: Record<string, any> | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  predicted_type: string | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  confidence: number;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  confirm_status: string;

  @Column({ type: 'bigint', nullable: true })
  confirmed_by: number | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  confirmed_type: string | null;

  @Column({ type: 'text', nullable: true })
  error_message: string | null;

  @CreateDateColumn()
  created_at: Date;
}
