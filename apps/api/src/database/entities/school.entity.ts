import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Department } from './department.entity';

@Entity('school')
export class School {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({ type: 'varchar', length: 50 })
  short_name: string;

  @Column({ type: 'bigint', nullable: true })
  logo_file_id: number | null;

  @Column({ type: 'json', nullable: true })
  settings: {
    academic_years?: string[];
    current_year?: string;
    semesters?: { name: string; start: string; end: string }[];
    current_semester?: string;
  } | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => Department, (d) => d.school)
  departments: Department[];
}
