import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Content } from './content.entity';
import { Teacher } from './teacher.entity';

@Entity('reflection')
export class Reflection {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint', unique: true })
  content_id: number;

  @Column({ type: 'bigint' })
  lesson_content_id: number;

  @Column({ type: 'bigint' })
  teacher_id: number;

  @Column({ type: 'longtext' })
  reflection_text: string;

  @Column({ type: 'date', nullable: true })
  reflection_date: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Content)
  @JoinColumn({ name: 'content_id' })
  content: Content;

  @ManyToOne(() => Content)
  @JoinColumn({ name: 'lesson_content_id' })
  lessonContent: Content;

  @ManyToOne(() => Teacher)
  @JoinColumn({ name: 'teacher_id' })
  teacher: Teacher;
}
