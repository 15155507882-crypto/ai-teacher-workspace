import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import Redis from 'ioredis';

export interface CaptchaResult {
  captchaId: string;
  imageBase64: string;
}

@Injectable()
export class CaptchaService {
  private redis: Redis;
  private readonly EXPIRE_SECONDS = 300; // 5 min

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  /** Generate a math captcha (simple arithmetic) */
  async generate(): Promise<CaptchaResult> {
    const provider = process.env.AUTH_CAPTCHA_PROVIDER || 'image';

    switch (provider) {
      case 'none':
        return { captchaId: 'none', imageBase64: '' };
      case 'image':
      default:
        return this.generateImageCaptcha();
    }
  }

  private async generateImageCaptcha(): Promise<CaptchaResult> {
    const a = Math.floor(Math.random() * 20) + 1;
    const b = Math.floor(Math.random() * 20) + 1;
    const ops = ['+', '-', '×'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let answer: number;
    let text: string;
    switch (op) {
      case '+':
        answer = a + b;
        text = `${a} + ${b} = ?`;
        break;
      case '-':
        answer = a - b;
        text = `${Math.max(a, b)} - ${Math.min(a, b)} = ?`;
        break;
      default:
        answer = a * b;
        text = `${a} × ${b} = ?`;
        break;
    }

    const captchaId = crypto.randomUUID();
    await this.redis.set(`captcha:${captchaId}`, String(answer), 'EX', this.EXPIRE_SECONDS);

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="50" viewBox="0 0 160 50">
  <rect width="160" height="50" fill="#f8fafc" rx="8" />
  <rect x="2" y="2" width="156" height="46" fill="none" stroke="#e2e8f0" stroke-width="2" rx="6" />
  <text x="80" y="32" text-anchor="middle" font-family="monospace" font-size="18" font-weight="bold" fill="#334155">${text}</text>
  <line x1="10" y1="38" x2="150" y2="38" stroke="#3b82f6" stroke-width="0.5" opacity="0.3" />
</svg>`;
    const base64 = Buffer.from(svg).toString('base64');
    return { captchaId, imageBase64: `data:image/svg+xml;base64,${base64}` };
  }

  /** Verify captcha */
  async verify(captchaId: string, code: string): Promise<boolean> {
    if (captchaId === 'none') return true;
    if (!captchaId || !code) return false;
    const stored = await this.redis.get(`captcha:${captchaId}`);
    if (!stored) return false;
    await this.redis.del(`captcha:${captchaId}`);
    return stored === code.trim();
  }
}
