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
import { Teacher } from './teacher.entity';
import { Department } from './department.entity';
import { PersonalLesson } from './personal-lesson.entity';
import { LessonAttachment } from './lesson-attachment.entity';
import { PreviewFile } from './preview-file.entity';
import { AIRecognitionRecord } from './ai-recognition-record.entity';

@Entity('content')
export class Content {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  school_id: number;

  @Column({ type: 'bigint' })
  teacher_id: number;

  @Column({ type: 'bigint' })
  department_id: number;

  @Column({ type: 'varchar', length: 30 })
  content_type: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  summary: string | null;

  @Column({ type: 'varchar', length: 20 })
  academic_year: string;

  @Column({ type: 'varchar', length: 20 })
  semester: string;

  @Column({ type: 'varchar', length: 20, default: 'chat' })
  source: string;

  @Column({ type: 'varchar', length: 20, default: 'school' })
  visibility: string;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ type: 'datetime', nullable: true })
  deleted_at: Date | null;

  @ManyToOne(() => Teacher)
  @JoinColumn({ name: 'teacher_id' })
  teacher: Teacher;

  @ManyToOne(() => Department)
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @OneToMany(() => PersonalLesson, (pl) => pl.content)
  personalLesson: PersonalLesson[];

  @OneToMany(() => LessonAttachment, (la) => la.content)
  attachments: LessonAttachment[];

  @OneToMany(() => PreviewFile, (pf) => pf.content)
  previews: PreviewFile[];

  @OneToMany(() => AIRecognitionRecord, (ar) => ar.content)
  aiRecords: AIRecognitionRecord[];
}
