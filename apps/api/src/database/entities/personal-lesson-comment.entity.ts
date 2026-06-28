import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PersonalLesson } from './personal-lesson.entity';
import { Teacher } from './teacher.entity';
import { FileAsset } from './file-asset.entity';

@Entity('personal_lesson_comment')
export class PersonalLessonComment {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  personal_lesson_id: number;

  @Column({ type: 'bigint' })
  teacher_id: number;

  @Column({ type: 'text', nullable: true })
  comment_text: string | null;

  @Column({ type: 'bigint', nullable: true })
  file_id: number | null;

  @CreateDateColumn()
  created_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  deleted_at: Date | null;

  @ManyToOne(() => PersonalLesson)
  @JoinColumn({ name: 'personal_lesson_id' })
  personalLesson: PersonalLesson;

  @ManyToOne(() => Teacher)
  @JoinColumn({ name: 'teacher_id' })
  teacher: Teacher;

  @ManyToOne(() => FileAsset)
  @JoinColumn({ name: 'file_id' })
  file: FileAsset;
}
