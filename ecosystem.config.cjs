/**
 * PM2 Ecosystem 配置
 *
 * 使用方式：
 *   pnpm build                  # 先构建所有包
 *   pm2 start ecosystem.config.cjs
 *   pm2 save                    # 保存进程列表（重启后自动恢复）
 *   pm2 startup                 # 设置开机自启
 *
 * 常用命令：
 *   pm2 status                  # 查看所有进程状态
 *   pm2 logs                    # 查看所有日志
 *   pm2 logs worker-ai          # 查看 worker-ai 日志
 *   pm2 restart all             # 重启所有进程
 *   pm2 stop all                # 停止所有进程
 *   pm2 delete all              # 删除所有进程
 */

module.exports = {
  apps: [
    // ==================== API ====================
    {
      name: 'api',
      cwd: './apps/api',
      script: 'node',
      args: 'dist/main.js',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production',
        API_PORT: '3000',
      },
      // 自动重启
      autorestart: true,
      restart_delay: 3000,
      max_restarts: 10,
      min_uptime: '10s',
      // 日志
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // 资源限制
      max_memory_restart: '512M',
      // 等待就绪后启动 web
      wait_ready: false,
      listen_timeout: 10000,
      kill_timeout: 5000,
    },

    // ==================== Web ====================
    {
      name: 'web',
      cwd: './apps/web',
      script: 'node_modules/.bin/next',
      args: 'start -p 8080',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production',
        PORT: '8080',
      },
      autorestart: true,
      restart_delay: 3000,
      max_restarts: 10,
      min_uptime: '10s',
      error_file: './logs/web-error.log',
      out_file: './logs/web-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '512M',
      kill_timeout: 5000,
      // 依赖 API 先启动
      depends_on: ['api'],
    },

    // ==================== Worker-AI ====================
    {
      name: 'worker-ai',
      cwd: './apps/worker-ai',
      script: 'node',
      args: 'dist/main.js',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production',
      },
      autorestart: true,
      restart_delay: 3000,
      max_restarts: 10,
      min_uptime: '10s',
      error_file: './logs/worker-ai-error.log',
      out_file: './logs/worker-ai-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '512M',
      kill_timeout: 10000,
      // 依赖基础设施（Redis），但不阻塞启动
    },

    // ==================== Worker-Preview ====================
    {
      name: 'worker-preview',
      cwd: './apps/worker-preview',
      script: 'node',
      args: 'dist/main.js',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production',
      },
      autorestart: true,
      restart_delay: 3000,
      max_restarts: 10,
      min_uptime: '10s',
      error_file: './logs/worker-preview-error.log',
      out_file: './logs/worker-preview-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '512M',
      kill_timeout: 10000,
    },

    // ==================== Worker-Export ====================
    {
      name: 'worker-export',
      cwd: './apps/worker-export',
      script: 'node',
      args: 'dist/main.js',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production',
      },
      autorestart: true,
      restart_delay: 3000,
      max_restarts: 10,
      min_uptime: '10s',
      error_file: './logs/worker-export-error.log',
      out_file: './logs/worker-export-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '512M',
      kill_timeout: 10000,
    },

    // ==================== Worker-Schedule ====================
    {
      name: 'worker-schedule',
      cwd: './apps/worker-schedule',
      script: 'node',
      args: 'dist/main.js',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production',
      },
      autorestart: true,
      restart_delay: 3000,
      max_restarts: 10,
      min_uptime: '10s',
      error_file: './logs/worker-schedule-error.log',
      out_file: './logs/worker-schedule-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '256M',
      kill_timeout: 5000,
    },
  ],
};
