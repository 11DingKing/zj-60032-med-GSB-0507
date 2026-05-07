#!/bin/bash

set -e

echo "========================================"
echo "🔄 在线问诊预约系统 - 重启脚本"
echo "========================================"
echo ""

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="${PROJECT_DIR}/backend"
FRONTEND_DIR="${PROJECT_DIR}/frontend"
LOG_DIR="${PROJECT_DIR}/logs"
BACKEND_PID_FILE="${PROJECT_DIR}/backend.pid"
FRONTEND_PID_FILE="${PROJECT_DIR}/frontend.pid"

# 创建日志目录
mkdir -p "${LOG_DIR}"

# 日志函数
log_info() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [INFO] $1" | tee -a "${LOG_DIR}/restart.log"
}

log_error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] $1" | tee -a "${LOG_DIR}/restart.log" >&2
}

log_success() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [SUCCESS] $1" | tee -a "${LOG_DIR}/restart.log"
}

# 杀掉指定端口的进程
kill_port() {
    local port=$1
    log_info "停止端口 ${port} 上的进程..."
    
    # 尝试通过 PID 文件停止
    if [ "${port}" = "3000" ] && [ -f "${BACKEND_PID_FILE}" ]; then
        local pid=$(cat "${BACKEND_PID_FILE}" 2>/dev/null)
        if [ -n "${pid}" ] && kill -0 "${pid}" 2>/dev/null; then
            kill "${pid}" 2>/dev/null || true
            log_info "已停止后端进程 (PID: ${pid})"
        fi
        rm -f "${BACKEND_PID_FILE}"
    fi

    if [ "${port}" = "5173" ] && [ -f "${FRONTEND_PID_FILE}" ]; then
        local pid=$(cat "${FRONTEND_PID_FILE}" 2>/dev/null)
        if [ -n "${pid}" ] && kill -0 "${pid}" 2>/dev/null; then
            kill "${pid}" 2>/dev/null || true
            log_info "已停止前端进程 (PID: ${pid})"
        fi
        rm -f "${FRONTEND_PID_FILE}"
    fi

    # 备用方法：通过端口查找并杀死进程
    local pids=$(lsof -ti:${port} 2>/dev/null || true)
    if [ -n "${pids}" ]; then
        for pid in ${pids}; do
            if kill -0 "${pid}" 2>/dev/null; then
                kill -9 "${pid}" 2>/dev/null || true
                log_info "已强制停止进程 (PID: ${pid})"
            fi
        done
    fi
    
    # 等待进程完全停止
    for i in {1..10}; do
        if ! lsof -ti:${port} >/dev/null 2>&1; then
            log_success "端口 ${port} 已释放"
            return 0
        fi
        sleep 0.5
    done
    
    log_error "端口 ${port} 未能完全释放"
    return 1
}

# 停止服务
log_info "停止现有服务..."
kill_port 3000
kill_port 5173

# 等待一下确保端口完全释放
sleep 1

# 启动后端服务
log_info "启动后端服务（端口 3000）..."
cd "${BACKEND_DIR}"
nohup npm run start:dev > "${LOG_DIR}/backend.log" 2>&1 &
BACKEND_PID=$!
echo ${BACKEND_PID} > "${BACKEND_PID_FILE}"
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
echo ${FRONTEND_PID} > "${FRONTEND_PID_FILE}"
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
echo "🎉 系统重启成功！"
echo "========================================"
echo ""
echo "🌐 前端地址: http://localhost:5173"
echo "🔧 后端地址: http://localhost:3000"
echo "📚 API 文档: http://localhost:3000/api"
echo ""
echo "📂 日志目录: ${LOG_DIR}"
echo "========================================"
