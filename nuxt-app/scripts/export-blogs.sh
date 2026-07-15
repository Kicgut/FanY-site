#!/bin/bash
#
# 批量导出博客为 MD 文件（冷存储）
#
# 用法：
#   ./scripts/export-blogs.sh                    # 导出所有文章
#   ./scripts/export-blogs.sh /path/to/output    # 导出到指定目录
#   ./scripts/export-blogs.sh ./export published # 只导出已发布文章
#
# 依赖：curl, jq

set -euo pipefail

# 配置（通过 Nginx 80 端口访问）
API_BASE="http://120.26.231.150"
EXPORT_API="${API_BASE}/api/articles"

# 参数解析
OUTPUT_DIR="${1:-./blog-export}"
STATUS="${2:-}"

# 颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 检查依赖
check_deps() {
  for cmd in curl jq; do
    if ! command -v $cmd &>/dev/null; then
      log_error "缺少依赖: $cmd"
      exit 1
    fi
  done
}

# 构建查询参数
build_url() {
  local url="${EXPORT_API}?export=md"
  if [ -n "$STATUS" ]; then
    url="${url}&status=${STATUS}"
  fi
  echo "$url"
}

# 主函数
main() {
  check_deps
  
  local url=$(build_url)
  
  log_info "开始导出博客..."
  log_info "API: $url"
  log_info "输出目录: $OUTPUT_DIR"
  
  # 创建输出目录
  mkdir -p "$OUTPUT_DIR"
  
  # 调用导出 API
  log_info "正在从 ECS 获取文章数据..."
  local response=$(curl -s "$url")
  
  # 检查响应
  local success=$(echo "$response" | jq -r '.success // false')
  if [ "$success" != "true" ]; then
    local error=$(echo "$response" | jq -r '.message // "Unknown error"')
    log_error "导出失败: $error"
    exit 1
  fi
  
  local count=$(echo "$response" | jq -r '.count // 0')
  log_info "找到 $count 篇文章"
  
  if [ "$count" -eq 0 ]; then
    log_warn "没有文章需要导出"
    exit 0
  fi
  
  # 逐个保存 MD 文件
  local saved=0
  local skipped=0
  
  for i in $(seq 0 $((count - 1))); do
    local slug=$(echo "$response" | jq -r ".data[$i].slug")
    local title=$(echo "$response" | jq -r ".data[$i].title")
    local status=$(echo "$response" | jq -r ".data[$i].status")
    local md=$(echo "$response" | jq -r ".data[$i].md")
    
    local filename="${slug}.md"
    local filepath="${OUTPUT_DIR}/${filename}"
    
    # 检查是否已存在
    if [ -f "$filepath" ]; then
      log_warn "文件已存在，跳过: $filename"
      skipped=$((skipped + 1))
      continue
    fi
    
    # 写入文件
    echo "$md" > "$filepath"
    log_info "已保存: $filename ($status)"
    saved=$((saved + 1))
  done
  
  # 生成导出报告
  local report_file="${OUTPUT_DIR}/export-report.md"
  cat > "$report_file" << EOF
# 博客导出报告

- **导出时间**: $(date '+%Y-%m-%d %H:%M:%S')
- **总文章数**: $count
- **已保存**: $saved
- **已跳过**: $skipped
- **状态筛选**: ${STATUS:-全部}

## 文章列表

| 标题 | Slug | 状态 | 标签 |
|------|------|------|------|
EOF
  
  for i in $(seq 0 $((count - 1))); do
    local title=$(echo "$response" | jq -r ".data[$i].title")
    local slug=$(echo "$response" | jq -r ".data[$i].slug")
    local status=$(echo "$response" | jq -r ".data[$i].status")
    local tags=$(echo "$response" | jq -r ".data[$i].tags | join(\", \")")
    echo "| $title | $slug | $status | $tags |" >> "$report_file"
  done
  
  log_info "导出完成！"
  log_info "报告已保存到: $report_file"
  log_info "MD 文件保存在: $OUTPUT_DIR"
}

main
