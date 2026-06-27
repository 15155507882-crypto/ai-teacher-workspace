import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { HomeGroup } from './home-group.entity';
import { Teacher } from './teacher.entity';

@Entity('home_group_teachers')
@Index(['home_group_id', 'teacher_id'], { unique: true })
export class HomeGroupTeacher {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  home_group_id: number;

  @Column({ type: 'bigint' })
  teacher_id: number;

  @Column({ type: 'varchar', length: 20, default: 'member' })
  role: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => HomeGroup)
  @JoinColumn({ name: 'home_group_id' })
  homeGroup: HomeGroup;

  @ManyToOne(() => Teacher)
  @JoinColumn({ name: 'teacher_id' })
  teacher: Teacher;
}
