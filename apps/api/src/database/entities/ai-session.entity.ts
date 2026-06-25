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
import { AIMessage } from './ai-message.entity';

@Entity('ai_session')
export class AISession {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  teacher_id: number;

  @Column({ type: 'varchar', length: 30, default: 'workspace' })
  scope: string;

  @Column({ type: 'bigint', nullable: true })
  context_content_id: number | null;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Teacher)
  @JoinColumn({ name: 'teacher_id' })
  teacher: Teacher;

  @OneToMany(() => AIMessage, (m) => m.session)
  messages: AIMessage[];
}
