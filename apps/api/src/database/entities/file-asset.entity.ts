import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('file_asset')
export class FileAsset {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  school_id: number;

  @Column({ type: 'bigint' })
  uploader_id: number;

  @Column({ type: 'varchar', length: 255 })
  original_name: string;

  @Column({ type: 'varchar', length: 500 })
  storage_key: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  mime_type: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  file_ext: string | null;

  @Column({ type: 'bigint', default: 0 })
  file_size: number;

  @Column({ type: 'varchar', length: 128, nullable: true })
  sha256: string | null;

  @Column({ type: 'varchar', length: 20, default: 'uploaded' })
  status: string;

  @CreateDateColumn()
  created_at: Date;

  @Column({ type: 'datetime', nullable: true })
  deleted_at: Date | null;
}
