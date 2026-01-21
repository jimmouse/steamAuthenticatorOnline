#!/bin/bash

# Docker 快速启动脚本

set -e

echo "🚀 Steam取号器 - Docker 部署脚本"
echo "================================"

# 检查 Docker 和 Docker Compose
if ! command -v docker &> /dev/null; then
    echo "❌ 错误: 未安装 Docker"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ 错误: 未安装 Docker Compose"
    exit 1
fi

# 检查环境变量文件
if [ ! -f "backend/.env" ]; then
    echo "⚠️  警告: backend/.env 文件不存在"
    echo "正在创建..."
    
    if [ -f "backend/.env.example" ]; then
        cp backend/.env.example backend/.env
        echo "✅ 已从 .env.example 创建 .env 文件"
        echo "⚠️  请编辑 backend/.env 文件，设置 JWT_SECRET！"
    else
        echo "❌ 错误: backend/.env.example 文件不存在"
        echo "请手动创建 backend/.env 文件，至少包含："
        echo "  JWT_SECRET=your-super-secret-jwt-key-change-in-production"
        exit 1
    fi
fi

# 检查 JWT_SECRET 是否已修改
if grep -q "your-super-secret-jwt-key-change-in-production" backend/.env 2>/dev/null; then
    echo "⚠️  警告: JWT_SECRET 仍为默认值，请修改 backend/.env 文件！"
fi

# 创建必要的目录
mkdir -p backend/data/uploads
mkdir -p nginx/ssl

# 构建并启动服务
echo ""
echo "📦 构建 Docker 镜像..."
docker-compose build

echo ""
echo "🚀 启动服务..."
docker-compose up -d

# 等待服务启动
echo ""
echo "⏳ 等待服务启动..."
sleep 5

# 检查服务状态
echo ""
echo "📊 服务状态:"
docker-compose ps

# 检查数据库是否已初始化
echo ""
echo "🔍 检查数据库..."
if [ ! -f "backend/data/database.sqlite" ]; then
    echo "📝 数据库不存在，正在初始化..."
    docker-compose exec -T backend node src/scripts/initDatabase.js
    echo "✅ 数据库初始化完成"
else
    echo "✅ 数据库已存在"
fi

# 显示访问信息
echo ""
echo "================================"
echo "✅ 部署完成！"
echo ""
echo "📱 访问地址:"
echo "   前端: http://localhost"
echo "   后端 API: http://localhost/api"
echo "   健康检查: http://localhost/api/health"
echo ""
echo "👤 默认账户:"
echo "   管理员: admin / admin123"
echo "   测试用户: user / user123"
echo ""
echo "⚠️  生产环境请立即修改默认密码！"
echo ""
echo "📋 常用命令:"
echo "   查看日志: docker-compose logs -f"
echo "   停止服务: docker-compose stop"
echo "   重启服务: docker-compose restart"
echo "   删除服务: docker-compose down"
echo "================================"
