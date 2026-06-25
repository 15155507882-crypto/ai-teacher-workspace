import { AppConfig, defaultConfig } from './app-config.interface';

export function loadConfig(): AppConfig {
  return {
    databaseUrl: process.env.DATABASE_URL || defaultConfig.databaseUrl,
    redisUrl: process.env.REDIS_URL || defaultConfig.redisUrl,
    jwtSecret: process.env.JWT_SECRET || defaultConfig.jwtSecret,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || defaultConfig.jwtExpiresIn,
    aiApiKey: process.env.AI_API_KEY || defaultConfig.aiApiKey,
    aiModel: process.env.AI_MODEL || defaultConfig.aiModel,
    aiBaseUrl: process.env.AI_BASE_URL || defaultConfig.aiBaseUrl,
    storageBackend:
      (process.env.STORAGE_BACKEND as AppConfig['storageBackend']) || defaultConfig.storageBackend,
    storageLocalPath: process.env.STORAGE_LOCAL_PATH || defaultConfig.storageLocalPath,
    previewEngine:
      (process.env.PREVIEW_ENGINE as AppConfig['previewEngine']) || defaultConfig.previewEngine,
    uploadMaxSizeMb:
      parseInt(process.env.UPLOAD_MAX_SIZE_MB || '', 10) || defaultConfig.uploadMaxSizeMb,
    apiPort: parseInt(process.env.API_PORT || '', 10) || defaultConfig.apiPort,
    webPort: parseInt(process.env.WEB_PORT || '', 10) || defaultConfig.webPort,
    nodeEnv: (process.env.NODE_ENV as AppConfig['nodeEnv']) || defaultConfig.nodeEnv,
  };
}

export function getConfig(): AppConfig {
  return loadConfig();
}
