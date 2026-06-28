import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/** AI 工作台会话 */
@Entity('conversation')
export class Conversation {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  teacher_id: number;

  @Column({ type: 'varchar', length: 200, default: '新会话' })
  title: string;

  @Column({ type: 'text', nullable: true })
  summary: string | null;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: string;

  @Column({ type: 'timestamp', nullable: true })
  last_active_at: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
