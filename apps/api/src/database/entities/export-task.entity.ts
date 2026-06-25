import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('export_task')
export class ExportTask {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  teacher_id: number;

  @Column({ type: 'bigint' })
  operator_id: number;

  @Column({ type: 'varchar', length: 20 })
  academic_year: string;

  @Column({ type: 'varchar', length: 20 })
  semester: string;

  @Column({ type: 'varchar', length: 30 })
  export_type: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: string;

  @Column({ type: 'bigint', nullable: true })
  file_id: number | null;

  @Column({ type: 'text', nullable: true })
  error_message: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
