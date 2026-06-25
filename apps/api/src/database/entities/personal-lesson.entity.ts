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

@Entity('personal_lesson')
export class PersonalLesson {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint', unique: true })
  content_id: number;

  @Column({ type: 'bigint' })
  teacher_id: number;

  @Column({ type: 'date', nullable: true })
  lesson_date: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  grade: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  subject: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  chapter: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  lesson_no: string | null;

  @Column({ type: 'text', nullable: true })
  body_text: string | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  ai_title_confidence: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Content)
  @JoinColumn({ name: 'content_id' })
  content: Content;

  @ManyToOne(() => Teacher)
  @JoinColumn({ name: 'teacher_id' })
  teacher: Teacher;
}
