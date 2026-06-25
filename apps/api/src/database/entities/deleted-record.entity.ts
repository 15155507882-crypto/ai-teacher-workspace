import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('deleted_record')
export class DeletedRecord {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  operator_id: number;

  @Column({ type: 'varchar', length: 50 })
  target_type: string;

  @Column({ type: 'bigint' })
  target_id: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reason: string | null;

  @CreateDateColumn()
  created_at: Date;
}
