import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { GroupLesson } from './group-lesson.entity';
import { Teacher } from './teacher.entity';
import { FileAsset } from './file-asset.entity';

@Entity('group_lesson_comment')
export class GroupLessonComment {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  group_lesson_id: number;

  @Column({ type: 'bigint' })
  teacher_id: number;

  @Column({ type: 'longtext', nullable: true })
  comment_text: string | null;

  @Column({ type: 'bigint', nullable: true })
  file_id: number | null;

  @CreateDateColumn()
  created_at: Date;

  @Column({ type: 'datetime', nullable: true })
  deleted_at: Date | null;

  @ManyToOne(() => GroupLesson)
  @JoinColumn({ name: 'group_lesson_id' })
  groupLesson: GroupLesson;

  @ManyToOne(() => Teacher)
  @JoinColumn({ name: 'teacher_id' })
  teacher: Teacher;

  @ManyToOne(() => FileAsset)
  @JoinColumn({ name: 'file_id' })
  file: FileAsset;
}
