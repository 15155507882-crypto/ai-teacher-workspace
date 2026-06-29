import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Find and load .env from the most likely locations.
 *
 * Resolution order (first match wins):
 *   1. Project root .env    — from __dirname: ../../../.env  (dist/ → apps/api/ → apps/ → root)
 *   2. apps/api/.env        — from __dirname: ../.env        (dist/ → apps/api/)
 *   3. CWD .env             — process.cwd()
 *   4. CWD ../../.env       — for monorepo nesting
 *
 * This eliminates the need for symlinks. Only the project root .env
 * needs to exist for any deployment (dev, PM2, Docker env vars).
 */
function loadEnvFile(): void {
  const candidates = [
    path.resolve(__dirname, '../../../.env'), // project root
    path.resolve(__dirname, '../.env'), // apps/api/
    path.resolve(process.cwd(), '.env'), // CWD
    path.resolve(process.cwd(), '../../.env'), // CWD up to root (monorepo)
  ];

  for (const envPath of candidates) {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
      console.log(`[Env] Loaded .env from: ${envPath}`);
      return;
    }
  }

  console.warn('[Env] No .env file found — using process.env only');
}

loadEnvFile();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { ValidationPipe } from './common/pipes/validation.pipe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors({ origin: process.env.WEB_URL || 'http://localhost:8080', credentials: true });
  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
  const port = process.env.API_PORT || 3000;
  await app.listen(port);
  console.log(`API server running on http://localhost:${port}`);
}
bootstrap();
