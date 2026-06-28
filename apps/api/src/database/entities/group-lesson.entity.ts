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
import { Content } from './content.entity';
import { Teacher } from './teacher.entity';
import { Department } from './department.entity';
import { GroupLessonComment } from './group-lesson-comment.entity';

@Entity('group_lesson')
export class GroupLesson {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint', unique: true })
  content_id: number;

  @Column({ type: 'bigint' })
  creator_id: number;

  @Column({ type: 'bigint' })
  department_id: number;

  @Column({ type: 'varchar', length: 200 })
  topic: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  grade: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  subject: string | null;

  @Column({ type: 'date', nullable: true })
  activity_date: string | null;

  @Column({ type: 'text', nullable: true })
  body_text: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Content)
  @JoinColumn({ name: 'content_id' })
  content: Content;

  @ManyToOne(() => Teacher)
  @JoinColumn({ name: 'creator_id' })
  creator: Teacher;

  @ManyToOne(() => Department)
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @OneToMany(() => GroupLessonComment, (c) => c.groupLesson)
  comments: GroupLessonComment[];
}
