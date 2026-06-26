import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AiProvider } from './ai-provider.entity';

@Entity('ai_configs')
export class AiConfig {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint', default: 1 })
  school_id: number;

  @Column({ type: 'bigint' })
  provider_id: number;

  @Column({ type: 'varchar', length: 500 })
  api_key_encrypted: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  base_url: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  default_model: string | null;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @Column({ type: 'varchar', length: 20, nullable: true })
  last_test_status: string | null;

  @Column({ type: 'text', nullable: true })
  last_test_message: string | null;

  @Column({ type: 'timestamp', nullable: true })
  last_test_at: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => AiProvider)
  @JoinColumn({ name: 'provider_id' })
  provider: AiProvider;
}
