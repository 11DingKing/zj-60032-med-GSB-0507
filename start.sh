#!/bin/bash

set -e

echo "========================================"
echo "🚀 在线问诊预约系统 - 一键启动脚本"
echo "========================================"
echo ""

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="${PROJECT_DIR}/backend"
FRONTEND_DIR="${PROJECT_DIR}/frontend"
LOG_DIR="${PROJECT_DIR}/logs"

# 创建日志目录
mkdir -p "${LOG_DIR}"

# 日志函数
log_info() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [INFO] $1" | tee -a "${LOG_DIR}/startup.log"
}

log_error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] $1" | tee -a "${LOG_DIR}/startup.log" >&2
}

log_success() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [SUCCESS] $1" | tee -a "${LOG_DIR}/startup.log"
}

# 检查 PostgreSQL 容器
log_info "检查 PostgreSQL 容器..."
if ! docker ps --format '{{.Names}}' | grep -q "dev-postgres"; then
    log_error "PostgreSQL 容器 dev-postgres 未运行"
    log_info "请确保 Docker 已安装并运行 PostgreSQL 容器："
    log_info "docker run --name dev-postgres -e POSTGRES_USER=dev -e POSTGRES_PASSWORD=dev123456 -p 5432:5432 -d postgres"
    exit 1
fi
log_success "PostgreSQL 容器运行中"

# 检查 Redis
log_info "检查 Redis 连接..."
if ! command -v redis-cli &> /dev/null; then
    log_info "redis-cli 未安装，跳过 Redis 连接检查（后端会自动处理连接）"
elif ! redis-cli -u "redis://default:redis123456@localhost:6379" ping | grep -q "PONG"; then
    log_info "Redis 连接失败，后端启动后会自动重试连接"
    log_info "如需 Redis 缓存功能，请确保 Redis 已启动："
    log_info "docker run --name dev-redis -p 6379:6379 -d redis redis-server --requirepass redis123456"
    exit 1
fi
log_success "Redis 连接正常"

# 创建数据库
log_info "创建数据库 db_zj_60032..."
if docker exec -e PGPASSWORD=dev123456 dev-postgres psql -U dev -d postgres -c "SELECT 1 FROM pg_database WHERE datname = 'db_zj_60032'" | grep -q "1 row"; then
    log_info "数据库 db_zj_60032 已存在"
else
    if docker exec -e PGPASSWORD=dev123456 dev-postgres psql -U dev -d postgres -c "CREATE DATABASE db_zj_60032"; then
        log_success "数据库创建成功"
    else
        log_error "数据库创建失败"
        exit 1
    fi
fi

# 安装后端依赖
log_info "安装后端依赖..."
cd "${BACKEND_DIR}"
if [ ! -d "node_modules" ]; then
    log_info "正在安装 npm 依赖（这可能需要几分钟）..."
    npm install 2>&1 | tee -a "${LOG_DIR}/backend-install.log"
    log_success "后端依赖安装完成"
else
    log_info "后端依赖已存在"
fi

# 安装前端依赖
log_info "安装前端依赖..."
cd "${FRONTEND_DIR}"
if [ ! -d "node_modules" ]; then
    log_info "正在安装 npm 依赖（这可能需要几分钟）..."
    npm install 2>&1 | tee -a "${LOG_DIR}/frontend-install.log"
    log_success "前端依赖安装完成"
else
    log_info "前端依赖已存在"
fi

# 生成 Prisma Client
log_info "生成 Prisma Client..."
cd "${BACKEND_DIR}"
npx prisma generate 2>&1 | tee -a "${LOG_DIR}/prisma-generate.log"
log_success "Prisma Client 生成完成"

# 运行 Prisma 迁移
log_info "运行 Prisma 迁移..."
npx prisma migrate dev --name init --skip-seed 2>&1 | tee -a "${LOG_DIR}/prisma-migrate.log" || true
log_success "Prisma 迁移完成"

# 灌入种子数据
log_info "灌入种子数据..."
npx prisma db seed 2>&1 | tee -a "${LOG_DIR}/prisma-seed.log"
log_success "种子数据灌入完成"

# 启动后端服务
log_info "启动后端服务（端口 3000）..."
cd "${BACKEND_DIR}"
nohup npm run start:dev > "${LOG_DIR}/backend.log" 2>&1 &
BACKEND_PID=$!
echo ${BACKEND_PID} > "${PROJECT_DIR}/backend.pid"
log_success "后端服务已启动，PID: ${BACKEND_PID}"

# 等待后端启动
log_info "等待后端服务启动..."
for i in {1..30}; do
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/api" | grep -q "200"; then
        log_success "后端服务已就绪"
        break
    fi
    if [ $i -eq 30 ]; then
        log_error "后端服务启动超时"
        exit 1
    fi
    sleep 1
done

# 启动前端服务
log_info "启动前端服务（端口 5173）..."
cd "${FRONTEND_DIR}"
nohup npm run dev > "${LOG_DIR}/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo ${FRONTEND_PID} > "${PROJECT_DIR}/frontend.pid"
log_success "前端服务已启动，PID: ${FRONTEND_PID}"

# 等待前端启动
log_info "等待前端服务启动..."
for i in {1..30}; do
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:5173" | grep -q "200"; then
        log_success "前端服务已就绪"
        break
    fi
    if [ $i -eq 30 ]; then
        log_error "前端服务启动超时"
        exit 1
    fi
    sleep 1
done

echo ""
echo "========================================"
echo "🎉 系统启动成功！"
echo "========================================"
echo ""
echo "🌐 前端地址: http://localhost:5173"
echo "🔧 后端地址: http://localhost:3000"
echo "📚 API 文档: http://localhost:3000/api"
echo ""
echo "📝 测试账号："
echo "  管理员: admin / 123456"
echo "  医生: doctor_li / 123456"
echo "  患者: patient_zhang / 123456"
echo ""
echo "📂 日志目录: ${LOG_DIR}"
echo "========================================"
