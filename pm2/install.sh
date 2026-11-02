#!/usr/bin/env bash
# Steam Authenticator - PM2 裸机安装/更新脚本 (Debian/Ubuntu, x86_64)
#
# 一键安装或更新:
#   curl -fsSL https://github.com/jimmouse/steamAuthenticatorOnline/releases/download/pm2-latest/install.sh | sudo bash
#
# 可选环境变量:
#   WEB_PORT=80   对外访问端口 (默认 8081)
#   APP_DIR=/opt/steam-auth   安装目录
set -euo pipefail

REPO="jimmouse/steamAuthenticatorOnline"
TARBALL_URL="https://github.com/${REPO}/releases/download/pm2-latest/steam-auth-pm2-linux-x64.tar.gz"
APP_DIR="${APP_DIR:-/opt/steam-auth}"
WEB_PORT="${WEB_PORT:-8081}"
BACKEND_PORT=3010
STEAM_SERVICE_PORT=3020

if [ "$(id -u)" -ne 0 ]; then
  echo "请用 root 或 sudo 运行此脚本"; exit 1
fi
if [ "$(uname -m)" != "x86_64" ]; then
  echo "此安装包仅支持 x86_64，当前架构: $(uname -m)"; exit 1
fi

echo "==> 1/6 安装 Node.js / Nginx / PM2"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl ca-certificates openssl >/dev/null
need_node=1
if command -v node >/dev/null 2>&1; then
  major=$(node -v | sed 's/^v//' | cut -d. -f1)
  [ "$major" -ge 18 ] && need_node=0
fi
if [ "$need_node" -eq 1 ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y -qq nodejs
fi
command -v nginx >/dev/null 2>&1 || apt-get install -y -qq nginx
command -v pm2 >/dev/null 2>&1 || npm install -g pm2 --omit=dev --no-fund --no-audit
echo "    node $(node -v), pm2 $(pm2 -v), nginx $(nginx -v 2>&1 | sed 's/.*nginx\///')"

echo "==> 2/6 下载并解压程序包"
mkdir -p "$APP_DIR/logs"
TMP=$(mktemp -d)
curl -fL --progress-bar "$TARBALL_URL" -o "$TMP/bundle.tar.gz"
# 只替换程序文件，保留 .env 与 data 目录
rm -rf "$APP_DIR/backend/src" "$APP_DIR/backend/node_modules" \
       "$APP_DIR/steam-service/src" "$APP_DIR/steam-service/node_modules" \
       "$APP_DIR/frontend"
tar -xzf "$TMP/bundle.tar.gz" -C "$APP_DIR"
rm -rf "$TMP"
echo "    版本: $(cat "$APP_DIR/VERSION" 2>/dev/null || echo unknown)"

echo "==> 3/6 生成配置文件"
if [ ! -f "$APP_DIR/backend/.env" ]; then
  JWT_SECRET=$(openssl rand -hex 32)
  API_SECRET=$(openssl rand -hex 32)
  cat > "$APP_DIR/backend/.env" <<EOF
PORT=$BACKEND_PORT
NODE_ENV=production
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=24h
DB_PATH=./data/database.sqlite
UPLOAD_PATH=./data/uploads
TRUST_PROXY=true
IP_HEADER=x-forwarded-for
STEAM_SERVICE_URL=http://127.0.0.1:$STEAM_SERVICE_PORT
STEAM_SERVICE_API_KEY=$API_SECRET
EOF
  cat > "$APP_DIR/steam-service/.env" <<EOF
PORT=$STEAM_SERVICE_PORT
NODE_ENV=production
API_SECRET=$API_SECRET
ALLOWED_ORIGINS=http://127.0.0.1:$BACKEND_PORT,http://localhost:$BACKEND_PORT
SESSION_STORAGE_PATH=./data/sessions
LOG_LEVEL=info
EOF
  chmod 600 "$APP_DIR/backend/.env" "$APP_DIR/steam-service/.env"
  echo "    已生成随机密钥: backend/.env, steam-service/.env"
else
  echo "    已存在 .env，保留原配置"
fi
mkdir -p "$APP_DIR/backend/data/uploads" "$APP_DIR/steam-service/data/sessions"

echo "==> 4/6 初始化 / 迁移数据库"
cd "$APP_DIR/backend"
for s in initDatabase addColorColumn addNotesColumn addEmailFields addLocationFields \
         createSettingsTable createPendingAccountsTable addTempUsers; do
  if [ -f "src/scripts/$s.js" ]; then
    node "src/scripts/$s.js" >/dev/null 2>&1 || echo "    (跳过 $s)"
  fi
done

echo "==> 5/6 配置 Nginx (端口 $WEB_PORT)"
sed -e "s|__WEB_PORT__|$WEB_PORT|g" \
    -e "s|__APP_DIR__|$APP_DIR|g" \
    -e "s|__BACKEND_PORT__|$BACKEND_PORT|g" \
    "$APP_DIR/nginx-steam-auth.conf" > /etc/nginx/sites-available/steam-auth
ln -sf /etc/nginx/sites-available/steam-auth /etc/nginx/sites-enabled/steam-auth
if [ "$WEB_PORT" = "80" ]; then
  rm -f /etc/nginx/sites-enabled/default
fi
nginx -t
systemctl enable nginx >/dev/null 2>&1 || true
systemctl reload nginx || systemctl restart nginx

echo "==> 6/6 启动 PM2"
cd "$APP_DIR"
pm2 startOrReload ecosystem.config.js --update-env
pm2 save
pm2 startup systemd -u root --hp /root >/dev/null 2>&1 || true

IP=$(hostname -I 2>/dev/null | awk '{print $1}')
echo
echo "================================================"
echo " 安装完成"
echo " 访问:  http://${IP:-<服务器IP>}:$WEB_PORT"
echo " 默认账号: admin / admin123  (请立即修改密码)"
echo " 状态: pm2 status      日志: pm2 logs"
echo " 更新: 重新执行本脚本即可，数据不会丢失"
echo "================================================"
