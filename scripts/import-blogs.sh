#!/bin/bash
# ============================================
# 批量导入 md 文件到博客系统
# ============================================
# 用法：
#   ./import-blogs.sh <目录路径> [状态]
#
# 示例：
#   ./import-blogs.sh /mnt/data/personal-website/docs/architecture
#   ./import-blogs.sh /mnt/data/personal-website/docs/learning-notes published
#
# 说明：
#   - 扫描指定目录下的所有 .md 文件
#   - 解析 frontmatter（可选，如果没有则从文件名提取标题）
#   - 调用 import-content API 导入
#   - 支持批量导入，跳过已存在的文章
# ============================================

# API 地址（ECS 公网）
API_URL="http://120.26.231.150/api/articles/import-content"

# 默认状态
DEFAULT_STATUS="published"

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 检查参数
if [ -z "$1" ]; then
    echo -e "${RED}错误：请指定目录路径${NC}"
    echo "用法：$0 <目录路径> [状态]"
    exit 1
fi

DIR_PATH="$1"
STATUS="${2:-$DEFAULT_STATUS}"

# 检查目录是否存在
if [ ! -d "$DIR_PATH" ]; then
    echo -e "${RED}错误：目录不存在：$DIR_PATH${NC}"
    exit 1
fi

# 统计
TOTAL=0
SUCCESS=0
SKIPPED=0
FAILED=0

echo -e "${GREEN}开始导入目录：$DIR_PATH${NC}"
echo -e "${YELLOW}状态：$STATUS${NC}"
echo "----------------------------------------"

# 遍历所有 .md 文件
for file in "$DIR_PATH"/*.md; do
    # 检查是否有 md 文件
    [ -f "$file" ] || continue
    
    TOTAL=$((TOTAL + 1))
    filename=$(basename "$file" .md)
    
    # 读取文件内容
    content=$(cat "$file")
    
    # 尝试解析 frontmatter
    has_frontmatter=false
    title=""
    description=""
    tags=""
    slug=""
    
    # 检查是否有 frontmatter（以 ---开头）
    if head -n 1 "$file" | grep -q "^---"; then
        has_frontmatter=true
        
        # 提取 frontmatter 内容（第一个 ---和第二个 ---之间）
        frontmatter=$(sed -n '/^---$/,/^---$/p' "$file" | sed '1d;$d')
        
        # 提取字段
        title=$(echo "$frontmatter" | grep "^title:" | sed 's/^title:\s*//' | sed 's/^["'"'"']\(.*\)["'"'"']$/\1/')
        description=$(echo "$frontmatter" | grep "^description:" | sed 's/^description:\s*//' | sed 's/^["'"'"']\(.*\)["'"'"']$/\1/')
        tags=$(echo "$frontmatter" | grep "^tags:" | sed 's/^tags:\s*//' | sed 's/^\[\(.*\)\]$/\1/' | sed 's/,/","/g' | sed 's/^/"/' | sed 's/$/"/')
        slug=$(echo "$frontmatter" | grep "^slug:" | sed 's/^slug:\s*//')
        
        # 提取正文（去掉 frontmatter）
        body=$(sed '/^---$/,/^---$/d' "$file" | sed '/^$/d')
    else
        # 没有 frontmatter，整个文件都是正文
        body="$content"
    fi
    
    # 如果没有 title，使用文件名
    if [ -z "$title" ]; then
        title="$filename"
    fi
    
    # 构建 JSON
    json="{\"title\": $(echo "$title" | jq -Rs .), \"content\": $(echo "$body" | jq -Rs .), \"status\": \"$STATUS\""
    
    # 添加可选字段
    if [ -n "$description" ]; then
        json="$json, \"description\": $(echo "$description" | jq -Rs .)"
    fi
    if [ -n "$tags" ]; then
        json="$json, \"tags\": [$tags]"
    fi
    if [ -n "$slug" ]; then
        json="$json, \"slug\": \"$slug\""
    fi
    
    json="$json}"
    
    # 调用 API
    echo -e "${YELLOW}[$TOTAL] 导入：$title${NC}"
    response=$(curl -s -X POST "$API_URL" \
        -H "Content-Type: application/json" \
        -d "$json")
    
    # 检查响应
    if echo "$response" | grep -q '"success":true'; then
        echo -e "${GREEN}  ✓ 成功${NC}"
        SUCCESS=$((SUCCESS + 1))
    elif echo "$response" | grep -q 'already exists'; then
        echo -e "${YELLOW}  ⊘ 已存在，跳过${NC}"
        SKIPPED=$((SKIPPED + 1))
    else
        echo -e "${RED}  ✗ 失败：$response${NC}"
        FAILED=$((FAILED + 1))
    fi
done

echo "----------------------------------------"
echo -e "${GREEN}导入完成！${NC}"
echo "总计：$TOTAL"
echo "成功：$SUCCESS"
echo "跳过：$SKIPPED"
echo "失败：$FAILED"
