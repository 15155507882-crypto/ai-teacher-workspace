import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { FileAsset } from './file-asset.entity';
import { Content } from './content.entity';

@Entity('preview_file')
export class PreviewFile {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  file_id: number;

  @Column({ type: 'varchar', length: 30 })
  preview_type: string;

  @Column({ type: 'varchar', length: 500 })
  preview_storage_key: string;

  @Column({ type: 'varchar', length: 50, default: 'libreoffice' })
  convert_engine: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: string;

  @Column({ type: 'text', nullable: true })
  error_message: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => FileAsset)
  @JoinColumn({ name: 'file_id' })
  file: FileAsset;

  @ManyToOne(() => Content)
  @JoinColumn({ name: 'file_id' })
  content: Content;
}
