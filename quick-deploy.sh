#!/bin/bash

# Band Sync Calendar - 快速部署脚本
# 自动化部署到GitHub Pages和Cloudflare Workers

set -e  # 遇到错误时退出

echo "🚀 Band Sync Calendar - 快速部署开始"
echo "======================================"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查必要工具
echo -e "${BLUE}📋 检查部署环境...${NC}"

if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}❌ Wrangler CLI 未安装${NC}"
    echo "请运行: npm install -g wrangler"
    exit 1
fi

if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Git 未安装${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 环境检查通过${NC}"

# 1. 部署后端到Cloudflare Workers
echo -e "\n${BLUE}🔧 部署后端到Cloudflare Workers...${NC}"

# 检查是否已登录
if ! wrangler whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️  需要登录Cloudflare账户${NC}"
    wrangler login
fi

# 部署数据库schema
echo "📊 设置数据库..."
if wrangler d1 execute band-sync-calendar-db --file=./src/backend/schema.sql --env production; then
    echo -e "${GREEN}✅ 数据库设置完成${NC}"
else
    echo -e "${YELLOW}⚠️  数据库可能已存在，继续部署...${NC}"
fi

# 部署Worker
echo "🚀 部署Worker..."
if wrangler deploy --env production; then
    echo -e "${GREEN}✅ Worker部署成功${NC}"
else
    echo -e "${RED}❌ Worker部署失败${NC}"
    exit 1
fi

# 2. 验证部署
echo -e "\n${BLUE}🧪 验证部署配置...${NC}"
if node verify-deployment.js; then
    echo -e "${GREEN}✅ 部署验证通过${NC}"
else
    echo -e "${YELLOW}⚠️  部署验证发现问题，但继续进行...${NC}"
fi

# 3. 准备GitHub Pages部署
echo -e "\n${BLUE}📁 准备GitHub Pages部署...${NC}"

# 创建部署目录
if [ -d "docs" ]; then
    rm -rf docs
fi
mkdir -p docs

# 复制前端文件到docs目录
cp -r src/frontend/* docs/
echo -e "${GREEN}✅ 前端文件已复制到docs目录${NC}"

# 4. Git操作
echo -e "\n${BLUE}📤 提交到Git仓库...${NC}"

# 检查Git状态
if [ -z "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  没有需要提交的更改${NC}"
else
    # 添加所有更改
    git add .
    
    # 提交更改
    COMMIT_MSG="Deploy Band Sync Calendar - $(date '+%Y-%m-%d %H:%M:%S')"
    git commit -m "$COMMIT_MSG"
    echo -e "${GREEN}✅ 更改已提交: $COMMIT_MSG${NC}"
    
    # 推送到远程仓库
    if git push origin main; then
        echo -e "${GREEN}✅ 代码已推送到GitHub${NC}"
    else
        echo -e "${RED}❌ 推送失败，请检查Git配置${NC}"
        exit 1
    fi
fi

# 5. 显示部署信息
echo -e "\n${GREEN}🎉 部署完成！${NC}"
echo "======================================"
echo -e "${BLUE}📊 部署信息:${NC}"
echo "• 后端API: https://band-sync-calendar.coooookai.workers.dev"
echo "• GitHub仓库: $(git remote get-url origin 2>/dev/null || echo '未配置')"
echo ""
echo -e "${BLUE}📋 下一步操作:${NC}"
echo "1. 在GitHub仓库设置中启用Pages"
echo "2. 设置Pages源为 'docs' 目录"
echo "3. 等待GitHub Pages构建完成"
echo "4. 访问你的GitHub Pages URL测试功能"
echo ""
echo -e "${BLUE}🔗 有用的链接:${NC}"
echo "• GitHub Pages设置: https://github.com/$(git remote get-url origin 2>/dev/null | sed 's/.*github.com[:/]\([^/]*\/[^/]*\).*/\1/' | sed 's/\.git$//')/settings/pages"
echo "• Cloudflare Workers仪表板: https://dash.cloudflare.com/"
echo ""
echo -e "${YELLOW}💡 提示: 如果遇到CORS错误，请确认GitHub Pages URL并更新wrangler.toml中的ALLOWED_ORIGINS${NC}"