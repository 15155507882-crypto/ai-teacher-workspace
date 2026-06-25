import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AISession } from './ai-session.entity';
import { Content } from './content.entity';

@Entity('ai_recognition_record')
export class AIRecognitionRecord {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint', nullable: true })
  session_id: number | null;

  @Column({ type: 'bigint', nullable: true })
  message_id: number | null;

  @Column({ type: 'bigint', nullable: true })
  file_id: number | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  predicted_type: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  final_type: string | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  confidence: number;

  @Column({ type: 'json', nullable: true })
  extracted_json: Record<string, any> | null;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: string;

  @Column({ type: 'bigint', nullable: true })
  confirmed_by: number | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => AISession)
  @JoinColumn({ name: 'session_id' })
  session: AISession;

  @ManyToOne(() => Content)
  @JoinColumn({ name: 'file_id' })
  content: Content;
}
