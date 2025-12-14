#!/bin/bash

echo "🚀 Band Sync Calendar - 快速部署修复"
echo "=================================="

# 检查当前目录
if [ ! -f "wrangler.toml" ]; then
    echo "❌ 请在band-sync-calendar目录中运行此脚本"
    exit 1
fi

echo "📁 检查文件结构..."
if [ -d "docs" ] && [ -f "docs/index.html" ]; then
    echo "✅ docs文件夹和index.html存在"
else
    echo "❌ docs文件夹或index.html缺失"
    exit 1
fi

echo "📝 添加所有文件到Git..."
git add .

echo "💾 提交更改..."
git commit -m "Fix GitHub Pages deployment with Actions workflow"

echo "🚀 推送到GitHub..."
git push origin main

echo ""
echo "🎉 部署修复完成！"
echo ""
echo "📋 下一步操作（非常重要！）："
echo "1. 访问你的GitHub仓库设置："
echo "   https://github.com/cooooookai/KONKUJIRA/settings/pages"
echo ""
echo "2. 在Pages设置中："
echo "   - 当前可能显示: 'Deploy from a branch' → 'main' → '/docs'"
echo "   - 🚨 必须改为: 'GitHub Actions'"
echo "   - 点击保存设置"
echo ""
echo "⚠️  如果不更改这个设置，GitHub会继续使用Jekyll构建并失败！"
echo ""
echo "3. 等待2-3分钟后访问："
echo "   - 主页: https://cooooookai.github.io/KONKUJIRA/"
echo "   - 测试页: https://cooooookai.github.io/KONKUJIRA/test.html"
echo ""
echo "4. 查看部署状态："
echo "   https://github.com/cooooookai/KONKUJIRA/actions"
echo ""
echo "✨ 如果仍有问题，请查看Actions日志获取详细信息"