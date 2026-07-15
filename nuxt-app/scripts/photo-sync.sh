#!/bin/bash
#
# 照片同步脚本
# 将本地缩略图同步到 ECS，或从 ECS 回流原图到本地
#
# 用法：
#   ./scripts/photo-sync.sh --mode upload          # 上传本地缩略图到 ECS
#   ./scripts/photo-sync.sh --mode backflow        # 从 ECS 回流原图到本地
#   ./scripts/photo-sync.sh --mode backflow --limit 10
#   ./scripts/photo-sync.sh --stats                # 查看统计
#   ./scripts/photo-sync.sh --reset-failed         # 重置失败的照片
#
# 依赖：curl, jq, ssh, scp, rsync

set -euo pipefail

# 配置
ECS_HOST="120.26.231.150"
ECS_USER="root"
ECS_CONTAINER="personal-website"
API_BASE="http://120.26.231.150"
LOCAL_PHOTOS_DIR="/mnt/data/personal-website/photos"
LOCAL_THUMBNAILS_DIR="/mnt/data/personal-website/thumbnails"
ECS_UPLOADS_DIR="/opt/personal-website/uploads/photos"

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
  for cmd in curl jq ssh scp rsync; do
    if ! command -v $cmd &>/dev/null; then
      log_error "缺少依赖: $cmd"
      exit 1
    fi
  done
}

# 显示统计
show_stats() {
  log_info "正在获取同步统计..."
  local response=$(curl -s "${API_BASE}/api/photos/sync?action=stats")
  local success=$(echo "$response" | jq -r '.success // false')
  
  if [ "$success" != "true" ]; then
    log_error "获取统计失败"
    exit 1
  fi
  
  echo ""
  echo "照片同步状态统计"
  echo "================"
  echo "$response" | jq -r '.data | 
    "待同步: \(.pending)\n正在同步: \(.syncing)\n已同步: \(.synced)\n失败: \(.failed)\n仅本地: \(.localOnly)\n总计: \(.total)"'
  echo ""
}

# 重置失败的照片
reset_failed() {
  log_info "正在重置失败的照片..."
  local response=$(curl -s -X POST "${API_BASE}/api/photos/sync" \
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

# 获取待同步照片列表
get_pending_photos() {
  local limit=${1:-50}
  curl -s "${API_BASE}/api/photos/sync?limit=${limit}" | jq -r '.data.photos'
}

# 从本地复制缩略图到 ECS
copy_thumbs_to_ecs() {
  local photo_id=$1
  local local_thumb_path=$2
  local local_medium_path=$3
  local year_month=$4
  
  # 确保 ECS 目录存在
  ssh ${ECS_USER}@${ECS_HOST} "mkdir -p ${ECS_UPLOADS_DIR}/thumbnails/${year_month}"
  
  # 复制缩略图
  scp "$local_thumb_path" ${ECS_USER}@${ECS_HOST}:${ECS_UPLOADS_DIR}/thumbnails/${year_month}/ 2>/dev/null
  if [ $? -ne 0 ]; then
    log_error "复制缩略图失败: photo ${photo_id}"
    return 1
  fi
  
  # 复制中图
  if [ -f "$local_medium_path" ]; then
    scp "$local_medium_path" ${ECS_USER}@${ECS_HOST}:${ECS_UPLOADS_DIR}/thumbnails/${year_month}/ 2>/dev/null
  fi
  
  return 0
}

# 标记同步完成
mark_completed() {
  local photo_id=$1
  local ecs_thumb_path=$2
  
  local response=$(curl -s -X POST "${API_BASE}/api/photos/sync/complete" \
    -H "Content-Type: application/json" \
    -d "{\"photoId\": ${photo_id}, \"ecsThumbPath\": \"${ecs_thumb_path}\"}")
  
  local success=$(echo "$response" | jq -r '.success // false')
  if [ "$success" != "true" ]; then
    log_warn "标记完成失败: photo ${photo_id}"
    return 1
  fi
  
  return 0
}

# 标记同步失败
mark_failed() {
  local photo_id=$1
  local error_msg=$2
  
  curl -s -X POST "${API_BASE}/api/photos/sync/fail" \
    -H "Content-Type: application/json" \
    -d "{\"photoId\": ${photo_id}, \"error\": \"${error_msg}\"}" > /dev/null
}

# 处理单张照片（上传缩略图到 ECS）
process_photo_upload() {
  local photo_json=$1
  
  local photo_id=$(echo "$photo_json" | jq -r '.id')
  local filename=$(echo "$photo_json" | jq -r '.filename')
  local thumb_path=$(echo "$photo_json" | jq -r '.thumbPath // empty')
  local medium_path=$(echo "$photo_json" | jq -r '.mediumUrl // empty')
  local visibility=$(echo "$photo_json" | jq -r '.visibility // "public"')
  local taken_at=$(echo "$photo_json" | jq -r '.takenAt // empty')
  
  log_info "处理照片 #${photo_id}: ${filename}"
  
  # 如果没有 thumbPath，跳过
  if [ -z "$thumb_path" ]; then
    log_warn "照片 #${photo_id} 没有 thumbPath，跳过"
    mark_failed "$photo_id" "No thumbPath"
    return 1
  fi
  
  # 提取年月
  local year_month=""
  if [ -n "$taken_at" ]; then
    year_month=$(echo "$taken_at" | cut -c1-7)
  else
    year_month=$(date +%Y-%m)
  fi
  
  # 从本地复制缩略图到 ECS
  if copy_thumbs_to_ecs "$photo_id" "$thumb_path" "$medium_path" "$year_month"; then
    local thumb_filename=$(basename "$thumb_path")
    local ecs_thumb_path="${ECS_UPLOADS_DIR}/thumbnails/${year_month}/${thumb_filename}"
    
    # 标记完成
    if mark_completed "$photo_id" "$ecs_thumb_path"; then
      log_info "照片 #${photo_id} 同步完成 ✓"
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

# 从 ECS 回流原图到本地
process_photo_backflow() {
  local photo_json=$1
  
  local photo_id=$(echo "$photo_json" | jq -r '.id')
  local filename=$(echo "$photo_json" | jq -r '.filename')
  local original_path=$(echo "$photo_json" | jq -r '.originalPath // empty')
  local visibility=$(echo "$photo_json" | jq -r '.visibility // "public"')
  
  log_info "回流照片 #${photo_id}: ${filename}"
  
  # 如果没有 originalPath，跳过
  if [ -z "$original_path" ]; then
    log_warn "照片 #${photo_id} 没有 originalPath，跳过"
    mark_failed "$photo_id" "No originalPath"
    return 1
  fi
  
  # 构建本地路径
  local relative_path=$(echo "$original_path" | sed 's|^/app/public/uploads/photos/||')
  local local_path="${LOCAL_PHOTOS_DIR}/${visibility}/${relative_path}"
  
  # 确保本地目录存在
  mkdir -p "$(dirname "$local_path")"
  
  # 从 ECS 复制原图
  ssh ${ECS_USER}@${ECS_HOST} "docker cp ${ECS_CONTAINER}:${original_path} /tmp/photo-backflow-${photo_id}" 2>/dev/null
  
  if [ $? -ne 0 ]; then
    log_error "从 ECS 复制失败: photo ${photo_id}"
    mark_failed "$photo_id" "ECS copy failed"
    return 1
  fi
  
  # 从 ECS 宿主机复制到本地
  scp ${ECS_USER}@${ECS_HOST}:/tmp/photo-backflow-${photo_id} "$local_path" 2>/dev/null
  
  if [ $? -ne 0 ]; then
    log_error "SCP 失败: photo ${photo_id}"
    ssh ${ECS_USER}@${ECS_HOST} "rm -f /tmp/photo-backflow-${photo_id}" 2>/dev/null
    mark_failed "$photo_id" "SCP failed"
    return 1
  fi
  
  # 清理 ECS 临时文件
  ssh ${ECS_USER}@${ECS_HOST} "rm -f /tmp/photo-backflow-${photo_id}" 2>/dev/null
  
  # 标记完成（更新 storageLocation）
  local response=$(curl -s -X POST "${API_BASE}/api/photos/backflow/complete" \
    -H "Content-Type: application/json" \
    -d "{\"photoId\": ${photo_id}, \"localPath\": \"${local_path}\"}")
  
  local success=$(echo "$response" | jq -r '.success // false')
  if [ "$success" = "true" ]; then
    log_info "照片 #${photo_id} 回流完成 ✓"
    return 0
  else
    log_error "标记完成失败: photo ${photo_id}"
    return 1
  fi
}

# 主函数
main() {
  check_deps
  
  # 解析参数
  local mode="upload"
  local limit=50
  local show_stats_only=false
  local reset_failed_only=false
  
  while [[ $# -gt 0 ]]; do
    case $1 in
      --mode)
        mode="$2"
        shift 2
        ;;
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
  
  # 获取待处理照片
  log_info "正在获取待处理照片 (limit: ${limit}, mode: ${mode})..."
  local photos=$(get_pending_photos "$limit")
  local count=$(echo "$photos" | jq length)
  
  if [ "$count" -eq 0 ]; then
    log_info "没有待处理的照片"
    exit 0
  fi
  
  log_info "找到 $count 张待处理照片"
  
  # 处理每张照片
  local success=0
  local failed=0
  
  for i in $(seq 0 $((count - 1))); do
    local photo=$(echo "$photos" | jq ".[$i]")
    
    if [ "$mode" = "upload" ]; then
      if process_photo_upload "$photo"; then
        success=$((success + 1))
      else
        failed=$((failed + 1))
      fi
    elif [ "$mode" = "backflow" ]; then
      if process_photo_backflow "$photo"; then
        success=$((success + 1))
      else
        failed=$((failed + 1))
      fi
    fi
    
    # 避免请求过快
    sleep 1
  done
  
  # 显示结果
  echo ""
  log_info "处理完成！"
  log_info "成功: $success"
  if [ $failed -gt 0 ]; then
    log_warn "失败: $failed"
  fi
  
  # 显示最终统计
  show_stats
}

main "$@"
