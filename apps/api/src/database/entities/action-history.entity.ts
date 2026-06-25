import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('action_history')
export class ActionHistory {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  operator_id: number;

  @Column({ type: 'varchar', length: 50 })
  action_type: string;

  @Column({ type: 'varchar', length: 50 })
  target_type: string;

  @Column({ type: 'bigint', nullable: true })
  target_id: number | null;

  @Column({ type: 'varchar', length: 20, default: 'completed' })
  status: string;

  @Column({ type: 'json', nullable: true })
  input_snapshot: Record<string, any> | null;

  @Column({ type: 'json', nullable: true })
  output_snapshot: Record<string, any> | null;

  @Column({ type: 'int', nullable: true })
  revert_target_id: number | null;

  @Column({ type: 'datetime', nullable: true })
  reverted_at: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  error_message: string | null;

  @Column({ type: 'int', default: 0 })
  duration_ms: number;

  @CreateDateColumn()
  created_at: Date;
}
