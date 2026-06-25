export interface AppConfig {
  /** 数据库连接 URL */
  databaseUrl: string;

  /** Redis 连接 URL */
  redisUrl: string;

  /** JWT 密钥 */
  jwtSecret: string;

  /** JWT 过期时间 */
  jwtExpiresIn: string;

  /** AI API Key */
  aiApiKey: string;

  /** AI 模型名称 */
  aiModel: string;

  /** AI Base URL */
  aiBaseUrl: string;

  /** 存储后端类型 */
  storageBackend: 'local' | 'minio' | 's3';

  /** 本地存储路径 */
  storageLocalPath: string;

  /** 预览引擎 */
  previewEngine: 'libreoffice' | 'onlyoffice';

  /** 上传文件大小限制 (MB) */
  uploadMaxSizeMb: number;

  /** API 端口 */
  apiPort: number;

  /** Web 端口 */
  webPort: number;

  /** 运行环境 */
  nodeEnv: 'development' | 'production' | 'test';
}

export const defaultConfig: AppConfig = {
  databaseUrl: 'postgresql://postgres:postgres@localhost:5432/ai_teacher',
  redisUrl: 'redis://localhost:6379',
  jwtSecret: 'change-me-in-production',
  jwtExpiresIn: '7d',
  aiApiKey: '',
  aiModel: 'deepseek-chat',
  aiBaseUrl: 'https://api.deepseek.com/v1',
  storageBackend: 'local',
  storageLocalPath: './storage',
  previewEngine: 'libreoffice',
  uploadMaxSizeMb: 200,
  apiPort: 3000,
  webPort: 8080,
  nodeEnv: 'development',
};
