#!/usr/bin/env bash
# ============================================================
# AI 教师工作空间 - 服务器一键部署脚本
#
# 使用方法:
#   1. 将 docker-compose.prod.yml 和 nginx.conf 上传到服务器
#   2. 复制 .env.production.example 为 .env 并填写真实值
#   3. 运行: bash deploy.sh
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.prod.yml"
ENV_FILE="${SCRIPT_DIR}/.env"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info()  { echo -e "${BLUE}[INFO]${NC} $*"; }
log_ok()    { echo -e "${GREEN}[OK]${NC} $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }

# ==================== 前置检查 ====================

check_prerequisites() {
    log_info "检查前置条件..."

    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi
    log_ok "Docker 已安装: $(docker --version)"

    if ! docker compose version &> /dev/null; then
        log_error "Docker Compose 未安装，请先安装 Docker Compose"
        exit 1
    fi
    log_ok "Docker Compose 已安装"

    if [ ! -f "$ENV_FILE" ]; then
        log_error ".env 文件不存在！"
        log_info "请先复制模板: cp .env.production.example .env"
        log_info "然后编辑 .env 填入真实值"
        exit 1
    fi
    log_ok ".env 文件存在"

    # 检查 .env 中是否有未修改的占位符
    if grep -q "CHANGE_ME" "$ENV_FILE"; then
        log_warn "检测到 .env 中仍有 CHANGE_ME 占位符，请检查！"
        grep "CHANGE_ME" "$ENV_FILE" || true
        echo ""
        read -rp "是否继续部署？(y/N) " confirm
        if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
            log_info "已取消部署"
            exit 0
        fi
    fi
}

# ==================== 创建必要目录 ====================

create_directories() {
    log_info "创建必要目录..."
    mkdir -p "${SCRIPT_DIR}/ssl"
    log_ok "目录就绪"
}

# ==================== 拉取镜像 ====================

pull_images() {
    log_info "拉取最新镜像..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" pull
    log_ok "镜像拉取完成"
}

# ==================== 启动服务 ====================

start_services() {
    log_info "启动服务..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d
    log_ok "服务已启动"
}

# ==================== 等待就绪 ====================

wait_for_ready() {
    log_info "等待服务就绪..."

    # 等待 PostgreSQL
    log_info "  等待 PostgreSQL..."
    for i in $(seq 1 30); do
        if docker compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U postgres &> /dev/null; then
            log_ok "  PostgreSQL 就绪"
            break
        fi
        sleep 2
    done

    # 等待 Redis
    log_info "  等待 Redis..."
    for i in $(seq 1 15); do
        if docker compose -f "$COMPOSE_FILE" exec -T redis redis-cli ping &> /dev/null; then
            log_ok "  Redis 就绪"
            break
        fi
        sleep 2
    done

    # 等待 API
    log_info "  等待 API..."
    for i in $(seq 1 30); do
        if curl -s http://localhost:3000/api/health &> /dev/null; then
            log_ok "  API 就绪"
            break
        fi
        sleep 3
    done
}

# ==================== 运行数据库迁移 ====================

run_migrations() {
    log_info "运行数据库迁移..."

    # 在生产环境中，API 容器启动时会自动运行迁移
    # 如果需要手动运行，取消下面注释：
    # docker compose -f "$COMPOSE_FILE" exec -T api node dist/apps/api/src/main.js migration:run

    log_ok "数据库迁移完成（由 API 容器自动执行）"
}

# ==================== 检查状态 ====================

check_status() {
    log_info "检查服务状态..."
    echo ""
    docker compose -f "$COMPOSE_FILE" ps
    echo ""

    # 健康检查
    log_info "健康检查..."
    if curl -s http://localhost:3000/api/health &> /dev/null; then
        log_ok "API 健康检查通过"
    else
        log_warn "API 健康检查未通过，请检查日志: docker compose -f $COMPOSE_FILE logs api"
    fi

    if curl -s http://localhost:8080 &> /dev/null; then
        log_ok "Web 健康检查通过"
    else
        log_warn "Web 健康检查未通过，请检查日志: docker compose -f $COMPOSE_FILE logs web"
    fi
}

# ==================== 主流程 ====================

main() {
    echo ""
    echo -e "${BLUE}============================================================${NC}"
    echo -e "${BLUE}   AI 教师工作空间 - 生产部署脚本${NC}"
    echo -e "${BLUE}============================================================${NC}"
    echo ""

    check_prerequisites
    create_directories
    pull_images
    start_services
    wait_for_ready
    run_migrations
    check_status

    echo ""
    echo -e "${GREEN}============================================================${NC}"
    echo -e "${GREEN}   🎉 部署完成！${NC}"
    echo -e "${GREEN}============================================================${NC}"
    echo ""
    echo -e "  Web 前端:  http://localhost:8080"
    echo -e "  API 接口:  http://localhost:3000/api"
    echo ""
    echo -e "  常用命令:"
    echo -e "    查看日志:  docker compose -f ${COMPOSE_FILE} logs -f"
    echo -e "    重启服务:  docker compose -f ${COMPOSE_FILE} restart"
    echo -e "    停止服务:  docker compose -f ${COMPOSE_FILE} down"
    echo -e "    更新部署:  bash deploy.sh"
    echo ""
}

main "$@"
