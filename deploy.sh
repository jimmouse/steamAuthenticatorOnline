#!/bin/bash

# Steam Authenticator 一键部署脚本
# 使用方法: sudo ./deploy.sh

set -e

echo "=========================================="
echo "Steam Authenticator 部署脚本"
echo "=========================================="

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then 
    echo "请使用 sudo 运行此脚本"
    exit 1
fi

# 配置变量
PROJECT_DIR="/var/www/steam-auth"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
DOMAIN="your-domain.com"  # 修改为你的域名

echo "1. 检查系统环境..."

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "安装 Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi

# 检查 PM2
if ! command -v pm2 &> /dev/null; then
    echo "安装 PM2..."
    npm install -g pm2
fi

# 检查 Nginx
if ! command -v nginx &> /dev/null; then
    echo "安装 Nginx..."
    apt-get update
    apt-get install -y nginx
    systemctl enable nginx
    systemctl start nginx
fi

echo "2. 创建项目目录..."
mkdir -p "$PROJECT_DIR"
mkdir -p "$PROJECT_DIR/logs"
mkdir -p "$BACKEND_DIR/data/uploads"
chown -R www-data:www-data "$PROJECT_DIR"

echo "3. 安装后端依赖..."
if [ -d "$BACKEND_DIR" ]; then
    cd "$BACKEND_DIR"
    npm install --production
else
    echo "错误: 后端目录不存在"
    exit 1
fi

echo "4. 检查环境变量..."
if [ ! -f "$BACKEND_DIR/.env" ]; then
    echo "创建 .env 文件..."
    cat > "$BACKEND_DIR/.env" << EOF
PORT=3000
NODE_ENV=production
JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRES_IN=24h
DB_PATH=./data/database.sqlite
UPLOAD_PATH=./data/uploads
TRUST_PROXY=true
IP_HEADER=x-forwarded-for
EOF
    echo "⚠️  请编辑 $BACKEND_DIR/.env 文件设置 JWT_SECRET"
fi

echo "5. 初始化数据库..."
cd "$BACKEND_DIR"
if [ ! -f "data/database.sqlite" ]; then
    npm run init-db
    echo "⚠️  请立即修改默认密码！"
fi

echo "6. 安装前端依赖..."
if [ -d "$FRONTEND_DIR" ]; then
    cd "$FRONTEND_DIR"
    npm install
    echo "7. 构建前端..."
    npm run build
else
    echo "错误: 前端目录不存在"
    exit 1
fi

echo "8. 配置 PM2..."
cd "$PROJECT_DIR"
if [ -f "ecosystem.config.js" ]; then
    pm2 delete steam-auth-backend 2>/dev/null || true
    pm2 start ecosystem.config.js
    pm2 save
    pm2 startup | grep -v "PM2" | bash || true
else
    echo "警告: ecosystem.config.js 不存在，跳过 PM2 配置"
fi

echo "9. 配置 Nginx..."
if [ -f "nginx.conf" ]; then
    # 替换域名
    sed -i "s/your-domain.com/$DOMAIN/g" nginx.conf
    cp nginx.conf "/etc/nginx/sites-available/steam-auth"
    ln -sf "/etc/nginx/sites-available/steam-auth" "/etc/nginx/sites-enabled/"
    rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
    
    # 测试配置
    if nginx -t; then
        systemctl reload nginx
        echo "Nginx 配置已更新"
    else
        echo "错误: Nginx 配置测试失败"
        exit 1
    fi
else
    echo "警告: nginx.conf 不存在，跳过 Nginx 配置"
fi

echo "10. 设置文件权限..."
chown -R www-data:www-data "$PROJECT_DIR"
chmod -R 755 "$PROJECT_DIR"
chmod -R 755 "$BACKEND_DIR/data"

echo "=========================================="
echo "部署完成！"
echo "=========================================="
echo ""
echo "下一步："
echo "1. 编辑 $BACKEND_DIR/.env 设置 JWT_SECRET"
echo "2. 运行: npm run init-db (如果数据库未初始化)"
echo "3. 修改默认密码"
echo "4. 配置域名 DNS 解析"
echo "5. 运行: sudo certbot --nginx -d $DOMAIN"
echo ""
echo "检查服务状态:"
echo "  pm2 status"
echo "  sudo systemctl status nginx"
echo ""

