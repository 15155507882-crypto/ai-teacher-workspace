import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Department } from './department.entity';
import { Content } from './content.entity';

@Entity('teacher')
export class Teacher {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  school_id: number;

  @Column({ type: 'bigint' })
  department_id: number;

  @Column({ type: 'varchar', length: 20, unique: true })
  mobile: string;

  @Column({ type: 'varchar', length: 255 })
  password_hash: string;

  @Column({ type: 'varchar', length: 50 })
  name: string;

  @Column({ type: 'bigint', nullable: true })
  avatar_file_id: number | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  employee_no: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatar: string | null;

  @Column({ type: 'int', default: 0 })
  sort: number;

  @Column({ type: 'boolean', default: true })
  is_home_visible: boolean;

  @Column({ type: 'varchar', length: 20, default: 'teacher' })
  role: string;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: string;

  @Column({ type: 'timestamp', nullable: true })
  last_login_at: Date | null;

  @Column({ type: 'int', default: 1 })
  token_version: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  deleted_at: Date | null;

  @ManyToOne(() => Department)
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @OneToMany(() => Content, (c) => c.teacher)
  contents: Content[];
}
