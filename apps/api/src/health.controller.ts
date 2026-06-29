import { Controller, Get } from '@nestjs/common';
import Redis from 'ioredis';
import { DataSource } from 'typeorm';

@Controller('health')
export class HealthController {
  private redis: Redis;

  constructor(private readonly dataSource: DataSource) {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  @Get()
  async check() {
    const checks: Record<string, any> = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };

    // Redis 连通性检查
    try {
      const redisPing = await this.redis.ping();
      checks.redis = redisPing === 'PONG' ? 'connected' : 'error';
    } catch (e: any) {
      checks.redis = 'disconnected';
      checks.redis_error = e.message?.slice(0, 200);
      checks.status = 'degraded';
    }

    // 数据库连通性检查
    try {
      if (this.dataSource && this.dataSource.isInitialized) {
        await this.dataSource.query('SELECT 1');
        checks.database = 'connected';
      } else {
        checks.database = 'not_initialized';
        checks.status = 'degraded';
      }
    } catch (e: any) {
      checks.database = 'disconnected';
      checks.database_error = e.message?.slice(0, 200);
      checks.status = 'degraded';
    }

    // BullMQ 队列状态检查
    try {
      const queueNames = ['ai-recognition', 'file-preview', 'pdf-export', 'notification'];
      const queues: Record<string, any> = {};

      for (const name of queueNames) {
        try {
          // BullMQ uses different types: waiting=list, active=list, completed=zset, failed=list, delayed=zset
          const getLen = async (key: string) => {
            try {
              const type = await this.redis.type(key);
              if (type === 'list') return await this.redis.llen(key);
              if (type === 'zset') return await this.redis.zcard(key);
              if (type === 'none') return 0;
              return 0; // unknown type
            } catch {
              return 0;
            }
          };

          const waiting = await getLen(`bull:${name}:wait`);
          const active = await getLen(`bull:${name}:active`);
          const completed = await getLen(`bull:${name}:completed`);
          const failed = await getLen(`bull:${name}:failed`);
          const delayed = await getLen(`bull:${name}:delayed`);

          queues[name] = {
            waiting,
            active,
            completed,
            failed,
            delayed,
          };

          // 队列积压告警
          if (waiting > 50 || active > 10) {
            checks.status = checks.status === 'ok' ? 'degraded' : checks.status;
          }
        } catch {
          queues[name] = { error: 'check_failed' };
        }
      }
      checks.queues = queues;
    } catch (e: any) {
      checks.queues_error = e.message?.slice(0, 200);
    }

    // Worker 活性检查（最近 5 分钟是否有 ai_result 写入）
    try {
      const aiResultKeys = await this.redis.keys('ai_result:*');
      if (aiResultKeys.length > 0) {
        // 抽样检查最近一个 key 的 TTL
        const latestKey = aiResultKeys.sort().pop();
        const ttl = await this.redis.ttl(latestKey!);
        checks.worker_activity = {
          ai_result_keys_count: aiResultKeys.length,
          latest_key_ttl_seconds: ttl,
          status: ttl > 0 ? 'active' : 'stale',
        };
      } else {
        checks.worker_activity = {
          ai_result_keys_count: 0,
          status: 'no_recent_activity',
        };
      }
    } catch (e: any) {
      checks.worker_activity_error = e.message?.slice(0, 200);
    }

    return checks;
  }
}
