import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AISession } from './ai-session.entity';

@Entity('ai_message')
export class AIMessage {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  session_id: number;

  @Column({ type: 'varchar', length: 20 })
  sender_type: string;

  @Column({ type: 'varchar', length: 20 })
  message_type: string;

  @Column({ type: 'text', nullable: true })
  text_content: string | null;

  @Column({ type: 'bigint', nullable: true })
  file_id: number | null;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => AISession)
  @JoinColumn({ name: 'session_id' })
  session: AISession;
}
