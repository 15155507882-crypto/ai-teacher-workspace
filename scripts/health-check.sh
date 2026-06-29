#!/usr/bin/env bash
# ============================================================
# AI 教师工作空间 - 部署后健康检查脚本
#
# 使用方法:
#   bash scripts/health-check.sh
#
# 自动检测使用 PM2 还是 Docker Compose
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASS="${GREEN}✅${NC}"
FAIL="${RED}❌${NC}"
WARN="${YELLOW}⚠️${NC}"

API_URL="${API_URL:-http://localhost:3000}"
WEB_URL="${WEB_URL:-http://localhost:8080}"

echo ""
echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}   AI 教师工作空间 - 健康检查${NC}"
echo -e "${BLUE}   $(date '+%Y-%m-%d %H:%M:%S')${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""

# ==================== 检测部署方式 ====================

DEPLOY_TYPE="unknown"
if command -v pm2 &> /dev/null && pm2 list &> /dev/null; then
    if pm2 list 2>/dev/null | grep -q 'worker-ai\|api'; then
        DEPLOY_TYPE="pm2"
    fi
fi

if [ "$DEPLOY_TYPE" = "unknown" ] && command -v docker &> /dev/null; then
    # Check for docker compose files
    if [ -f "$PROJECT_DIR/docker/docker-compose.prod.yml" ]; then
        COMPOSE_FILE="$PROJECT_DIR/docker/docker-compose.prod.yml"
        COMPOSE_PROJECT_DIR="$PROJECT_DIR/docker"
        if docker compose -f "$COMPOSE_FILE" ps 2>/dev/null | grep -q 'ai-teacher'; then
            DEPLOY_TYPE="docker"
        fi
    fi
fi

echo -e "${BLUE}部署方式:${NC} ${DEPLOY_TYPE:-未检测到}"
echo ""

# ==================== 1. 基础设施检查 ====================

echo -e "${BLUE}━━━ 基础设施 ━━━${NC}"

# Redis
echo -n "  Redis:     "
if command -v redis-cli &> /dev/null; then
    REDIS_URL="${REDIS_URL:-redis://localhost:6379}"
    REDIS_HOST=$(echo "$REDIS_URL" | sed -n 's|.*://\(.*\):.*|\1|p')
    if [ -z "$REDIS_HOST" ]; then REDIS_HOST="localhost"; fi
    REDIS_PORT=$(echo "$REDIS_URL" | sed -n 's|.*:\([0-9]*\)$|\1|p')
    if [ -z "$REDIS_PORT" ]; then REDIS_PORT="6379"; fi

    if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping 2>/dev/null | grep -q PONG; then
        echo -e "${PASS} 运行中 (${REDIS_HOST}:${REDIS_PORT})"
    else
        echo -e "${FAIL} 无法连接"
    fi
else
    # Try curl to API health endpoint
    HEALTH=$(curl -s "$API_URL/api/health" 2>/dev/null || echo '{}')
    REDIS_STATUS=$(echo "$HEALTH" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('redis','unknown'))" 2>/dev/null || echo 'unknown')
    if [ "$REDIS_STATUS" = "connected" ]; then
        echo -e "${PASS} 运行中 (通过 API 健康检查)"
    else
        echo -e "${WARN} 无法直接检查"
    fi
fi

# PostgreSQL
echo -n "  PostgreSQL:"
if command -v psql &> /dev/null; then
    DB_URL="${DATABASE_URL:-postgresql://localhost:5432/ai_teacher}"
    if psql "$DB_URL" -c "SELECT 1" &>/dev/null; then
        echo -e "${PASS} 运行中"
    else
        echo -e "${FAIL} 无法连接"
    fi
else
    HEALTH=$(curl -s "$API_URL/api/health" 2>/dev/null || echo '{}')
    DB_STATUS=$(echo "$HEALTH" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('database','unknown'))" 2>/dev/null || echo 'unknown')
    if [ "$DB_STATUS" = "connected" ]; then
        echo -e "${PASS} 运行中 (通过 API 健康检查)"
    else
        echo -e "${WARN} 无法直接检查"
    fi
fi

echo ""

# ==================== 2. 应用服务检查 ====================

echo -e "${BLUE}━━━ 应用服务 ━━━${NC}"

# API
echo -n "  API (3000): "
API_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/health" 2>/dev/null || echo "000")
if [ "$API_RESPONSE" = "200" ]; then
    echo -e "${PASS} HTTP $API_RESPONSE"
else
    echo -e "${FAIL} HTTP $API_RESPONSE"
fi

# Web
echo -n "  Web (8080): "
WEB_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$WEB_URL" 2>/dev/null || echo "000")
if [ "$WEB_RESPONSE" = "200" ] || [ "$WEB_RESPONSE" = "304" ] || [ "$WEB_RESPONSE" = "302" ]; then
    echo -e "${PASS} HTTP $WEB_RESPONSE"
else
    echo -e "${FAIL} HTTP $WEB_RESPONSE"
fi

# Worker-AI
echo -n "  Worker-AI: "
if [ "$DEPLOY_TYPE" = "pm2" ]; then
    WORKER_AI_STATUS=$(pm2 jlist 2>/dev/null | python3 -c "
import sys,json
try:
    for p in json.load(sys.stdin):
        if p.get('name') == 'worker-ai':
            print(p.get('pm2_env',{}).get('status','unknown'))
            break
    else:
        print('not_found')
except:
    print('error')
" 2>/dev/null)
    if [ "$WORKER_AI_STATUS" = "online" ]; then
        echo -e "${PASS} PM2 online"
    else
        echo -e "${FAIL} PM2 status: ${WORKER_AI_STATUS:-unknown}"
    fi
elif [ "$DEPLOY_TYPE" = "docker" ]; then
    CONTAINER_STATUS=$(docker compose -f "$COMPOSE_FILE" ps --format json 2>/dev/null | python3 -c "
import sys,json
for line in sys.stdin:
    try:
        c = json.loads(line)
        if 'worker-ai' in c.get('Name',''):
            print(c.get('State','unknown'))
            break
    except: pass
else:
    print('not_found')
" 2>/dev/null)
    if echo "$CONTAINER_STATUS" | grep -q 'running'; then
        echo -e "${PASS} Docker ${CONTAINER_STATUS}"
    else
        echo -e "${FAIL} Docker status: ${CONTAINER_STATUS:-unknown}"
    fi
else
    # Check via process list
    if pgrep -f "worker-ai.*main" &>/dev/null; then
        echo -e "${PASS} 进程运行中"
    else
        echo -e "${FAIL} 未检测到进程"
    fi
fi

# Worker-Preview
echo -n "  Worker-Preview:"
if [ "$DEPLOY_TYPE" = "pm2" ]; then
    STATUS=$(pm2 jlist 2>/dev/null | python3 -c "
import sys,json
for p in json.load(sys.stdin):
    if p.get('name') == 'worker-preview':
        print(p.get('pm2_env',{}).get('status','unknown'))
" 2>/dev/null)
    if [ "$STATUS" = "online" ]; then echo -e "${PASS} PM2 online"
    else echo -e "${WARN} PM2 status: ${STATUS:-unknown}"
    fi
elif [ "$DEPLOY_TYPE" = "docker" ]; then
    STATUS=$(docker compose -f "$COMPOSE_FILE" ps --format json 2>/dev/null | python3 -c "
import sys,json
for line in sys.stdin:
    try:
        c = json.loads(line)
        if 'worker-preview' in c.get('Name',''):
            print(c.get('State',''))
    except: pass
" 2>/dev/null)
    if echo "$STATUS" | grep -q 'running'; then echo -e "${PASS} Docker $STATUS"
    else echo -e "${WARN} Docker status: ${STATUS:-unknown}"
    fi
else
    if pgrep -f "worker-preview.*main" &>/dev/null; then echo -e "${PASS} 进程运行中"
    else echo -e "${WARN} 未检测到进程"
    fi
fi

# Worker-Export
echo -n "  Worker-Export: "
if [ "$DEPLOY_TYPE" = "pm2" ]; then
    STATUS=$(pm2 jlist 2>/dev/null | python3 -c "
import sys,json
for p in json.load(sys.stdin):
    if p.get('name') == 'worker-export':
        print(p.get('pm2_env',{}).get('status','unknown'))
" 2>/dev/null)
    if [ "$STATUS" = "online" ]; then echo -e "${PASS} PM2 online"
    else echo -e "${WARN} PM2 status: ${STATUS:-unknown}"
    fi
elif [ "$DEPLOY_TYPE" = "docker" ]; then
    STATUS=$(docker compose -f "$COMPOSE_FILE" ps --format json 2>/dev/null | python3 -c "
import sys,json
for line in sys.stdin:
    try:
        c = json.loads(line)
        if 'worker-export' in c.get('Name',''):
            print(c.get('State',''))
    except: pass
" 2>/dev/null)
    if echo "$STATUS" | grep -q 'running'; then echo -e "${PASS} Docker $STATUS"
    else echo -e "${WARN} Docker status: ${STATUS:-unknown}"
    fi
else
    if pgrep -f "worker-export.*main" &>/dev/null; then echo -e "${PASS} 进程运行中"
    else echo -e "${WARN} 未检测到进程"
    fi
fi

# Worker-Schedule
echo -n "  Worker-Schedule:"
if [ "$DEPLOY_TYPE" = "pm2" ]; then
    STATUS=$(pm2 jlist 2>/dev/null | python3 -c "
import sys,json
for p in json.load(sys.stdin):
    if p.get('name') == 'worker-schedule':
        print(p.get('pm2_env',{}).get('status','unknown'))
" 2>/dev/null)
    if [ "$STATUS" = "online" ]; then echo -e "${PASS} PM2 online"
    else echo -e "${WARN} PM2 status: ${STATUS:-unknown}"
    fi
elif [ "$DEPLOY_TYPE" = "docker" ]; then
    STATUS=$(docker compose -f "$COMPOSE_FILE" ps --format json 2>/dev/null | python3 -c "
import sys,json
for line in sys.stdin:
    try:
        c = json.loads(line)
        if 'worker-schedule' in c.get('Name',''):
            print(c.get('State',''))
    except: pass
" 2>/dev/null)
    if echo "$STATUS" | grep -q 'running'; then echo -e "${PASS} Docker $STATUS"
    else echo -e "${WARN} Docker status: ${STATUS:-unknown}"
    fi
else
    if pgrep -f "worker-schedule.*main" &>/dev/null; then echo -e "${PASS} 进程运行中"
    else echo -e "${WARN} 未检测到进程"
    fi
fi

echo ""

# ==================== 3. BullMQ 队列检查 ====================

echo -e "${BLUE}━━━ BullMQ 队列 ━━━${NC}"

for queue in "ai-recognition" "file-preview" "pdf-export"; do
    echo -n "  $queue: "

    # 从 API health 端点获取队列状态
    QUEUE_DATA=$(curl -s "$API_URL/api/health" 2>/dev/null | python3 -c "
import sys,json
try:
    d = json.load(sys.stdin)
    q = d.get('queues',{}).get('${queue}',{})
    waiting = q.get('waiting',0)
    active = q.get('active',0)
    failed = q.get('failed',0)
    print(f'{waiting}w/{active}a/{failed}f')
except:
    print('unknown')
" 2>/dev/null || echo 'unknown')

    if [ "$QUEUE_DATA" = "unknown" ]; then
        echo -e "${WARN} 无法获取队列状态"
    else
        # 解析数字进行比较
        WAITING=$(echo "$QUEUE_DATA" | cut -d'w' -f1)
        ACTIVE=$(echo "$QUEUE_DATA" | cut -d'/' -f1 | cut -d'w' -f2)
        FAILED=$(echo "$QUEUE_DATA" | awk -F'/' '{print $NF}' | tr -d 'f')

        if [ "$WAITING" -gt 20 ] 2>/dev/null; then
            echo -e "${WARN} ${QUEUE_DATA} (积压: ${WAITING})"
        elif [ "$FAILED" -gt 0 ] 2>/dev/null; then
            echo -e "${WARN} ${QUEUE_DATA} (失败: ${FAILED})"
        else
            echo -e "${PASS} ${QUEUE_DATA}"
        fi
    fi
done

echo ""

# ==================== 4. 总结 ====================

echo -e "${BLUE}━━━ 总结 ━━━${NC}"

# 统计状态
OK_COUNT=0
FAIL_COUNT=0

# 简单判断关键服务
CRITICAL_CHECKS=0
CRITICAL_OK=0

# API
if [ "${API_RESPONSE:-000}" = "200" ]; then
    CRITICAL_OK=$((CRITICAL_OK + 1))
fi
CRITICAL_CHECKS=$((CRITICAL_CHECKS + 1))

# Web
if [ "${WEB_RESPONSE:-000}" = "200" ] || [ "${WEB_RESPONSE:-000}" = "304" ] || [ "${WEB_RESPONSE:-000}" = "302" ]; then
    CRITICAL_OK=$((CRITICAL_OK + 1))
fi
CRITICAL_CHECKS=$((CRITICAL_CHECKS + 1))

# Worker-AI
if [ "${WORKER_AI_STATUS:-unknown}" = "online" ] || echo "${CONTAINER_STATUS:-not_found}" | grep -q 'running' 2>/dev/null || pgrep -f "worker-ai.*main" &>/dev/null; then
    CRITICAL_OK=$((CRITICAL_OK + 1))
fi
CRITICAL_CHECKS=$((CRITICAL_CHECKS + 1))

echo ""
if [ $CRITICAL_OK -eq $CRITICAL_CHECKS ]; then
    echo -e "  ${GREEN}✅ 所有关键服务运行正常 (${CRITICAL_OK}/${CRITICAL_CHECKS})${NC}"
else
    echo -e "  ${RED}❌ 部分关键服务异常 (${CRITICAL_OK}/${CRITICAL_CHECKS})${NC}"
fi

echo ""
echo -e "${BLUE}   API 健康检查详情:${NC}"
curl -s "$API_URL/api/health" 2>/dev/null | python3 -m json.tool 2>/dev/null || echo "   (无法获取)"
echo ""
