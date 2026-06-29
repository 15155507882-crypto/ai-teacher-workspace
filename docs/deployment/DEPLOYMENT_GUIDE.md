# AI 教师工作空间 - 生产部署指南

> **适用于**: Linux 云服务器（阿里云/腾讯云/华为云等）  
> **部署方式**: Docker Compose + 预构建镜像（源码不落服务器）  
> **镜像仓库**: Docker Hub (`15155507882-crypto/ai-teacher-*`)

---

## 一、架构概览

```
┌─────────────────────────────────────────────────┐
│                    Nginx (:80)                    │
│             反向代理 + SSL 终端                    │
└──────────┬──────────────────────┬────────────────┘
           │ /api/*               │ /*
           ▼                       ▼
┌──────────────────┐   ┌──────────────────┐
│  NestJS API      │   │  Next.js Web     │
│  (:3000 内部)     │   │  (:8080 内部)     │
└────────┬─────────┘   └──────────────────┘
         │
    ┌────┼────┬──────────┬──────────┐
    ▼    ▼    ▼          ▼          ▼
┌──────┐ ┌──────┐ ┌────────┐ ┌──────────┐
│PostgreSQL│Redis │ │Worker-AI│ │Worker-   │
│  :5432  │:6379 │ │        │ │Preview   │
└─────────┘└──────┘ └────────┘ └──────────┘
                    ┌────────┐ ┌──────────┐
                    │Worker- │ │Worker-   │
                    │Export  │ │Schedule  │
                    └────────┘ └──────────┘
```

---

## 二、前置要求

### 服务器要求

| 项目           | 最低配置                  | 推荐配置     |
| -------------- | ------------------------- | ------------ |
| CPU            | 2 核                      | 4 核         |
| 内存           | 4 GB                      | 8 GB         |
| 磁盘           | 20 GB                     | 50 GB+       |
| 系统           | Ubuntu 20.04+ / CentOS 8+ | Ubuntu 22.04 |
| Docker         | 24.0+                     | 27.0+        |
| Docker Compose | v2.20+                    | v2.27+       |

### 安装 Docker（如未安装）

```bash
# Ubuntu
curl -fsSL https://get.docker.com | bash
sudo usermod -aG docker $USER
# 重新登录使权限生效

# 验证
docker --version
docker compose version
```

---

## 三、部署步骤

### Step 1: 上传部署文件

将以下文件上传到服务器（放到同一目录，如 `/opt/ai-teacher/`）:

| 文件                      | 说明               |
| ------------------------- | ------------------ |
| `docker-compose.prod.yml` | 生产环境编排文件   |
| `nginx.conf`              | Nginx 反向代理配置 |
| `deploy.sh`               | 一键部署脚本       |
| `.env.production.example` | 环境变量模板       |

```bash
# 本地执行（替换 YOUR_SERVER_IP）
scp docker/docker-compose.prod.yml root@YOUR_SERVER_IP:/opt/ai-teacher/
scp docker/nginx.conf root@YOUR_SERVER_IP:/opt/ai-teacher/
scp docker/deploy.sh root@YOUR_SERVER_IP:/opt/ai-teacher/
scp docker/.env.production.example root@YOUR_SERVER_IP:/opt/ai-teacher/
```

### Step 2: 配置环境变量

```bash
# 在服务器上执行
cd /opt/ai-teacher
cp .env.production.example .env
nano .env  # 或 vim .env
```

**必须修改的变量**（带 `CHANGE_ME` 占位符）:

| 变量                 | 说明             | 生成方式                      |
| -------------------- | ---------------- | ----------------------------- |
| `POSTGRES_PASSWORD`  | 数据库密码       | `openssl rand -base64 16`     |
| `JWT_SECRET`         | JWT 签名密钥     | `openssl rand -base64 32`     |
| `JWT_REFRESH_SECRET` | JWT 刷新密钥     | `openssl rand -base64 32`     |
| `ENCRYPTION_KEY`     | AES-256 加密密钥 | `openssl rand -base64 32`     |
| `WEB_URL`            | 前端域名         | 如 `https://your-domain.com`  |
| `AI_API_KEY`         | DeepSeek API Key | 从 platform.deepseek.com 获取 |

### Step 3: 配置域名和 SSL（可选但推荐）

#### 3a. DNS 配置

将域名 A 记录指向服务器 IP。

#### 3b. SSL 证书（使用 Let's Encrypt）

```bash
# 安装 certbot
sudo apt install certbot -y

# 先停止 Nginx
docker compose -f docker-compose.prod.yml stop nginx

# 获取证书
sudo certbot certonly --standalone -d your-domain.com

# 证书路径
# /etc/letsencrypt/live/your-domain.com/fullchain.pem
# /etc/letsencrypt/live/your-domain.com/privkey.pem

# 复制到项目目录
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ./ssl/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ./ssl/

# 编辑 nginx.conf，取消 HTTPS server 块的注释
# 然后重启 Nginx
docker compose -f docker-compose.prod.yml restart nginx
```

### Step 4: 一键部署

```bash
cd /opt/ai-teacher
bash deploy.sh
```

脚本会自动:

1. 检查 Docker 环境
2. 验证 `.env` 配置
3. 拉取最新 Docker 镜像
4. 启动所有服务
5. 等待服务就绪
6. 运行数据库迁移

### Step 5: 验证部署

```bash
# 检查服务状态
docker compose -f docker-compose.prod.yml ps

# 查看日志
docker compose -f docker-compose.prod.yml logs -f

# 测试 API
curl http://localhost:3000/api/health

# 测试前端
curl http://localhost:8080
```

---

## 四、设置 GitHub Actions

### 4.1 添加 GitHub Secrets

在 GitHub 仓库 `Settings → Secrets and variables → Actions` 中添加:

| Secret Name       | 说明                           |
| ----------------- | ------------------------------ |
| `DOCKER_USERNAME` | Docker Hub 用户名              |
| `DOCKER_PASSWORD` | Docker Hub 密码或 Access Token |

### 4.2 触发构建

- **自动触发**: Push 到 `main` 分支
- **手动触发**: GitHub Actions → `Build and Push Docker Images` → `Run workflow`

### 4.3 CI/CD 流程

```
Push main → GitHub Actions 构建 6 个镜像 → 推送到 Docker Hub
```

---

## 五、日常运维

### 更新部署

```bash
cd /opt/ai-teacher
bash deploy.sh
```

### 查看服务日志

```bash
# 所有服务
docker compose -f docker-compose.prod.yml logs -f

# 特定服务
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f web
docker compose -f docker-compose.prod.yml logs -f worker-ai
```

### 重启服务

```bash
docker compose -f docker-compose.prod.yml restart api
```

### 进入容器

```bash
docker compose -f docker-compose.prod.yml exec api sh
```

### 数据库备份

```bash
docker compose -f docker-compose.prod.yml exec postgres pg_dump -U postgres ai_teacher > backup.sql
```

### 数据库恢复

```bash
cat backup.sql | docker compose -f docker-compose.prod.yml exec -T postgres psql -U postgres ai_teacher
```

### 停止服务

```bash
docker compose -f docker-compose.prod.yml down
```

### 完全清理（含数据卷）

```bash
docker compose -f docker-compose.prod.yml down -v
# ⚠️ 警告: 会删除所有数据！
```

---

## 六、服务端口映射

| 服务       | 内部端口 | 外部端口       | 说明         |
| ---------- | -------- | -------------- | ------------ |
| Nginx      | 80, 443  | 80, 443        | 反向代理入口 |
| API        | 3000     | 127.0.0.1:3000 | 仅本地访问   |
| Web        | 8080     | 127.0.0.1:8080 | 仅本地访问   |
| PostgreSQL | 5432     | 127.0.0.1:5432 | 仅本地访问   |
| Redis      | 6379     | 127.0.0.1:6379 | 仅本地访问   |

> 应用端口绑定到 `127.0.0.1`，外部只能通过 Nginx 访问，提升安全性。

---

## 七、故障排查

### 服务无法启动

```bash
# 查看具体错误
docker compose -f docker-compose.prod.yml logs api

# 常见原因:
# 1. .env 中数据库密码未修改（CHANGE_ME）
# 2. 端口被占用
# 3. 镜像拉取失败（检查 Docker Hub 登录）
```

### API 返回 500

```bash
# 检查数据库连接
docker compose -f docker-compose.prod.yml exec api sh
# 在容器内测试数据库连接
wget -O- http://postgres:5432
```

### 前端页面空白

```bash
# 检查前端容器日志
docker compose -f docker-compose.prod.yml logs web

# 检查 API 代理
curl http://localhost:8080/api/health
```

### Worker 不处理任务

```bash
# 检查 Redis 连接
docker compose -f docker-compose.prod.yml exec redis redis-cli ping

# 查看 Worker 日志
docker compose -f docker-compose.prod.yml logs worker-ai
```

---

## 八、安全建议

1. **防火墙**: 仅开放 80/443 端口，其他端口仅允许 127.0.0.1

   ```bash
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   ```

2. **密码强度**: 所有密码使用 `openssl rand -base64 32` 生成

3. **定期备份**: 设置 cron 定时备份数据库

   ```bash
   # 每天凌晨 2 点备份
   0 2 * * * cd /opt/ai-teacher && docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U postgres ai_teacher > /backup/ai_teacher_$(date +\%Y\%m\%d).sql
   ```

4. **日志轮转**: compose 文件已配置 `max-size` 和 `max-file`

5. **非 root 运行**: 容器已配置 `USER nodejs`，不使用 root 权限

---

## 九、回滚

如需回滚到上一个版本：

```bash
# 使用特定版本标签
IMAGE_TAG=<commit-sha> docker compose -f docker-compose.prod.yml up -d

# 或查看可用标签
# 在 Docker Hub 上查看: https://hub.docker.com/r/15155507882-crypto/ai-teacher-api/tags
```
