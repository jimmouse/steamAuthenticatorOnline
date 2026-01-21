#!/bin/bash

echo "======================================"
echo "Steam Authenticator Online - 启动脚本"
echo "======================================"

# 检查Docker是否安装
if ! command -v docker &> /dev/null; then
    echo "错误: Docker 未安装"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "错误: Docker Compose 未安装"
    exit 1
fi

# 检查.env文件
if [ ! -f "backend/.env" ]; then
    echo "警告: backend/.env 文件不存在，创建默认配置..."
    cat > backend/.env << EOF
JWT_SECRET=$(openssl rand -hex 32)
PORT=3010
NODE_ENV=production
TRUST_PROXY=false
EOF
    echo "已创建 backend/.env 文件"
fi

# 创建必要的目录
mkdir -p backend/data
mkdir -p backend/uploads

# 构建并启动
echo ""
echo "正在构建Docker镜像..."
docker-compose build

echo ""
echo "正在启动服务..."
docker-compose up -d

echo ""
echo "等待服务启动..."
sleep 5

# 检查服务状态
echo ""
echo "服务状态:"
docker-compose ps

echo ""
echo "======================================"
echo "启动完成！"
echo "前端地址: http://localhost"
echo "后端API: http://localhost:3010"
echo ""
echo "查看日志: docker-compose logs -f"
echo "停止服务: docker-compose down"
echo "======================================"
