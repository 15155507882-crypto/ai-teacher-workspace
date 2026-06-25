import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Content } from './content.entity';
import { FileAsset } from './file-asset.entity';

@Entity('lesson_attachment')
export class LessonAttachment {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  content_id: number;

  @Column({ type: 'bigint' })
  file_id: number;

  @Column({ type: 'varchar', length: 30, default: 'main' })
  attachment_role: string;

  @Column({ type: 'int', default: 0 })
  sort_order: number;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Content)
  @JoinColumn({ name: 'content_id' })
  content: Content;

  @ManyToOne(() => FileAsset)
  @JoinColumn({ name: 'file_id' })
  file: FileAsset;
}
