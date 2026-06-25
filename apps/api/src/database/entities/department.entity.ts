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
import { School } from './school.entity';
import { Teacher } from './teacher.entity';

@Entity('department')
export class Department {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  school_id: number;

  @Column({ type: 'bigint', nullable: true, default: 0 })
  parent_id: number | null;

  @Column({ type: 'varchar', length: 80 })
  name: string;

  @Column({ type: 'int', default: 0 })
  sort_order: number;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => School)
  @JoinColumn({ name: 'school_id' })
  school: School;

  @OneToMany(() => Teacher, (t) => t.department)
  teachers: Teacher[];
}
