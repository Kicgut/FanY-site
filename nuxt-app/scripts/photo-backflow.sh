#!/bin/bash
#
# 照片回流脚本
# 将 ECS 上的原图传回本地服务器存储
#
# 用法：
#   ./scripts/photo-backflow.sh                    # 处理所有待回流照片
#   ./scripts/photo-backflow.sh --limit 10         # 处理 10 张
#   ./scripts/photo-backflow.sh --stats            # 查看统计
#   ./scripts/photo-backflow.sh --reset-failed     # 重置失败的照片
#
# 依赖：curl, jq, ssh, scp

set -euo pipefail

# 配置
ECS_HOST="120.26.231.150"
ECS_USER="root"
ECS_CONTAINER="personal-website"
API_BASE="http://120.26.231.150"
LOCAL_PHOTOS_DIR="/mnt/data/personal-website/photos"
PHOTO_BACKFLOW_TOKEN="${PHOTO_BACKFLOW_TOKEN:-}"
BACKFLOW_AUTH_ARGS=()
if [ -n "$PHOTO_BACKFLOW_TOKEN" ]; then
  BACKFLOW_AUTH_ARGS=(-H "x-photo-backflow-token: ${PHOTO_BACKFLOW_TOKEN}")
fi

# 颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_debug() { echo -e "${BLUE}[DEBUG]${NC} $1"; }

# 检查依赖
check_deps() {
  for cmd in curl jq ssh scp; do
    if ! command -v $cmd &>/dev/null; then
      log_error "缺少依赖: $cmd"
      exit 1
    fi
  done
}

# 显示统计
show_stats() {
  log_info "正在获取回流统计..."
  local response=$(curl -s "${BACKFLOW_AUTH_ARGS[@]}" "${API_BASE}/api/photos/backflow?action=stats")
  local success=$(echo "$response" | jq -r '.success // false')
  
  if [ "$success" != "true" ]; then
    log_error "获取统计失败"
    exit 1
  fi
  
  echo ""
  echo "照片回流状态统计"
  echo "================"
  echo "$response" | jq -r '.data | 
    "待回流: \(.pending)\n正在同步: \(.syncing)\n已同步: \(.synced)\n失败: \(.failed)\n总计: \(.total)"'
  echo ""
}

# 重置失败的照片
reset_failed() {
  log_info "正在重置失败的照片..."
  local response=$(curl -s -X POST "${BACKFLOW_AUTH_ARGS[@]}" "${API_BASE}/api/photos/backflow" \
    -H "Content-Type: application/json" \
    -d '{"action": "reset-failed"}')
  
  local success=$(echo "$response" | jq -r '.success // false')
  if [ "$success" != "true" ]; then
    log_error "重置失败"
    exit 1
  fi
  
  local count=$(echo "$response" | jq -r '.data.resetCount // 0')
  log_info "已重置 $count 张失败照片"
}

# 获取待回流照片列表
get_pending_photos() {
  local limit=${1:-50}
  curl -s "${BACKFLOW_AUTH_ARGS[@]}" "${API_BASE}/api/photos/backflow?limit=${limit}" | jq -r '.data.photos'
}

# 从 ECS 复制原图到本地
copy_original_from_ecs() {
  local photo_id=$1
  local ecs_path=$2
  local local_path=$3
  
  # 确保本地目录存在
  mkdir -p "$(dirname "$local_path")"
  
  # 从 ECS 容器复制文件
  ssh ${ECS_USER}@${ECS_HOST} "docker cp ${ECS_CONTAINER}:${ecs_path} /tmp/photo-backflow-${photo_id}" 2>/dev/null
  
  if [ $? -ne 0 ]; then
    log_error "从 ECS 复制失败: photo ${photo_id}"
    return 1
  fi
  
  # 从 ECS 宿主机复制到本地
  scp ${ECS_USER}@${ECS_HOST}:/tmp/photo-backflow-${photo_id} "$local_path" 2>/dev/null
  
  if [ $? -ne 0 ]; then
    log_error "SCP 失败: photo ${photo_id}"
    ssh ${ECS_USER}@${ECS_HOST} "rm -f /tmp/photo-backflow-${photo_id}" 2>/dev/null
    return 1
  fi
  
  # 清理 ECS 临时文件
  ssh ${ECS_USER}@${ECS_HOST} "rm -f /tmp/photo-backflow-${photo_id}" 2>/dev/null
  
  return 0
}

# 标记照片回流完成
mark_completed() {
  local photo_id=$1
  local local_path=$2
  local checksum=$3
  
  local response=$(curl -s -X POST "${BACKFLOW_AUTH_ARGS[@]}" "${API_BASE}/api/photos/backflow/complete" \
    -H "Content-Type: application/json" \
    -d "{\"photoId\": ${photo_id}, \"localPath\": \"${local_path}\", \"checksum\": \"${checksum}\"}")
  
  local success=$(echo "$response" | jq -r '.success // false')
  if [ "$success" != "true" ]; then
    log_warn "标记完成失败: photo ${photo_id}"
    return 1
  fi
  
  return 0
}

# 标记照片回流失败
mark_failed() {
  local photo_id=$1
  local error_msg=$2
  
  curl -s -X POST "${BACKFLOW_AUTH_ARGS[@]}" "${API_BASE}/api/photos/backflow/fail" \
    -H "Content-Type: application/json" \
    -d "{\"photoId\": ${photo_id}, \"error\": \"${error_msg}\"}" > /dev/null
}

# 处理单张照片
process_photo() {
  local photo_json=$1
  
  local photo_id=$(echo "$photo_json" | jq -r '.id')
  local filename=$(echo "$photo_json" | jq -r '.filename')
  local original_path=$(echo "$photo_json" | jq -r '.originalPath // empty')
  local visibility=$(echo "$photo_json" | jq -r '.visibility // "private"')
  
  log_info "处理照片 #${photo_id}: ${filename}"
  
  # 如果没有 originalPath，跳过
  if [ -z "$original_path" ]; then
    log_warn "照片 #${photo_id} 没有 originalPath，跳过"
    mark_failed "$photo_id" "No originalPath"
    return 1
  fi
  
  # 构建本地路径
  # ECS路径格式: /app/data/photos/{visibility}/{YYYY-MM}/{uuid}_original.jpg
  # 本地路径格式: /mnt/data/personal-website/photos/{visibility}/{YYYY-MM}/{uuid}_original.jpg
  local year_month=$(echo "$original_path" | sed -nE 's|.*/(20[0-9]{2}-[0-9]{2})/[^/]+$|\1|p')
  if [ -z "$year_month" ]; then year_month=$(date +%Y-%m); fi
  local local_path="${LOCAL_PHOTOS_DIR}/${visibility}/${year_month}/${filename}"
  
  # 从 ECS 复制原图
  if copy_original_from_ecs "$photo_id" "$original_path" "$local_path"; then
    log_info "原图已复制到: $local_path"
    
    # 标记完成
    local checksum=$(sha256sum "$local_path" | awk '{print $1}')
    if mark_completed "$photo_id" "$local_path" "$checksum"; then
      log_info "照片 #${photo_id} 回流完成 ✓"
      return 0
    else
      log_error "标记完成失败: photo ${photo_id}"
      return 1
    fi
  else
    log_error "复制失败: photo ${photo_id}"
    mark_failed "$photo_id" "File copy failed"
    return 1
  fi
}

# 主函数
main() {
  check_deps
  
  # 解析参数
  local limit=50
  local show_stats_only=false
  local reset_failed_only=false
  
  while [[ $# -gt 0 ]]; do
    case $1 in
      --limit)
        limit="$2"
        shift 2
        ;;
      --stats)
        show_stats_only=true
        shift
        ;;
      --reset-failed)
        reset_failed_only=true
        shift
        ;;
      *)
        log_error "未知参数: $1"
        exit 1
        ;;
    esac
  done
  
  # 显示统计
  if [ "$show_stats_only" = true ]; then
    show_stats
    exit 0
  fi
  
  # 重置失败
  if [ "$reset_failed_only" = true ]; then
    reset_failed
    exit 0
  fi
  
  # 获取待回流照片
  log_info "正在获取待回流照片 (limit: ${limit})..."
  local photos=$(get_pending_photos "$limit")
  local count=$(echo "$photos" | jq length)
  
  if [ "$count" -eq 0 ]; then
    log_info "没有待回流的照片"
    exit 0
  fi
  
  log_info "找到 $count 张待回流照片"
  
  # 处理每张照片
  local success=0
  local failed=0
  
  for i in $(seq 0 $((count - 1))); do
    local photo=$(echo "$photos" | jq ".[$i]")
    
    if process_photo "$photo"; then
      success=$((success + 1))
    else
      failed=$((failed + 1))
    fi
    
    # 避免请求过快
    sleep 1
  done
  
  # 显示结果
  echo ""
  log_info "回流完成！"
  log_info "成功: $success"
  if [ $failed -gt 0 ]; then
    log_warn "失败: $failed"
  fi
  
  # 显示最终统计
  show_stats
}

main "$@"
