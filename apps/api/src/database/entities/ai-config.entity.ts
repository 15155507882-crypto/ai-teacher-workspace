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

  /** Provider 配置名称，如 "DeepSeek" */
  @Column({ type: 'varchar', length: 100, nullable: true })
  name: string | null;

  /** Provider 类型：deepseek / openai / qwen / custom */
  @Column({ type: 'varchar', length: 30, nullable: true, default: 'custom' })
  provider_type: string;

  @Column({ type: 'varchar', length: 500 })
  api_key_encrypted: string;

  /** API Key 后四位，用于脱敏展示 */
  @Column({ type: 'varchar', length: 10, nullable: true })
  api_key_last4: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  base_url: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  default_model: string | null;

  /** 可用模型列表，JSON数组字符串 */
  @Column({ type: 'text', nullable: true })
  models: string | null;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  /** 是否当前使用（系统唯一） */
  @Column({ type: 'boolean', default: false })
  is_active: boolean;

  @Column({ type: 'varchar', length: 500, nullable: true })
  remark: string | null;

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
