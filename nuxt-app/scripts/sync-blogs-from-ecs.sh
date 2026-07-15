#!/bin/bash
#
# 从 ECS 同步 MD 备份到本地服务器
#
# 用法：
#   ./scripts/sync-blogs-from-ecs.sh                    # 同步到默认目录
#   ./scripts/sync-blogs-from-ecs.sh /path/to/backup    # 同步到指定目录
#
# 前提条件：
#   1. SSH 免密登录已配置（或通过 frp 隧道访问）
#   2. ECS 上的 blog-md 目录已存在
#
# 方式：通过 SSH/SCP 从 ECS 拉取 /app/data/blog-md/ 到本地

set -euo pipefail

# 配置
ECS_HOST="120.26.231.150"
ECS_USER="root"
ECS_CONTAINER="personal-website"
ECS_MD_DIR="/app/data/blog-md"

# 参数解析
LOCAL_BACKUP_DIR="${1:-./blog-backup}"

# 颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 主函数
main() {
  log_info "开始从 ECS 同步 MD 备份..."
  log_info "ECS: ${ECS_HOST}"
  log_info "本地目录: ${LOCAL_BACKUP_DIR}"
  
  # 创建本地目录
  mkdir -p "$LOCAL_BACKUP_DIR"
  
  # 从 ECS 容器复制文件
  log_info "正在从 ECS 复制 blog-md 目录..."
  
  # 先从容器复制到 ECS 宿主机临时目录
  ssh ${ECS_USER}@${ECS_HOST} "docker cp ${ECS_CONTAINER}:${ECS_MD_DIR} /tmp/blog-md-sync" 2>/dev/null || {
    log_warn "ECS 上可能没有 blog-md 目录，跳过"
    exit 0
  }
  
  # 从 ECS 宿主机复制到本地
  scp -r ${ECS_USER}@${ECS_HOST}:/tmp/blog-md-sync/* "$LOCAL_BACKUP_DIR/" 2>/dev/null || {
    log_warn "没有文件需要同步"
    exit 0
  }
  
  # 清理 ECS 临时目录
  ssh ${ECS_USER}@${ECS_HOST} "rm -rf /tmp/blog-md-sync" 2>/dev/null || true
  
  # 统计
  local count=$(find "$LOCAL_BACKUP_DIR" -name "*.md" -type f | wc -l)
  
  log_info "同步完成！"
  log_info "已同步 $count 个 MD 文件到: $LOCAL_BACKUP_DIR"
  
  # 列出文件
  log_info "文件列表："
  ls -la "$LOCAL_BACKUP_DIR"/*.md 2>/dev/null || log_warn "目录为空"
}

main
