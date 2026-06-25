import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('operation_log')
export class OperationLog {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint', nullable: true })
  operator_id: number | null;

  @Column({ type: 'varchar', length: 80 })
  action: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  target_type: string | null;

  @Column({ type: 'bigint', nullable: true })
  target_id: number | null;

  @Column({ type: 'json', nullable: true })
  detail_json: Record<string, any> | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ip: string | null;

  @CreateDateColumn()
  created_at: Date;
}
