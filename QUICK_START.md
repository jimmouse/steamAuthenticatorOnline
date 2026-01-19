# 快速部署指南

## 🚀 5 分钟快速部署

### 前置条件
- 一台 Ubuntu 20.04+ 服务器
- 已配置域名（可选，但推荐）
- SSH 访问权限

### 步骤 1: 上传项目文件

```bash
# 在服务器上创建目录
sudo mkdir -p /var/www/steam-auth
sudo chown -R $USER:$USER /var/www/steam-auth

# 使用 SCP 上传（在本地执行）
scp -r ./steamAuthenticatorOnline/* user@your-server:/var/www/steam-auth/
```

### 步骤 2: 运行部署脚本

```bash
# SSH 登录服务器
ssh user@your-server

# 进入项目目录
cd /var/www/steam-auth

# 给脚本执行权限
chmod +x deploy.sh backup.sh

# 运行部署脚本
sudo ./deploy.sh
```

### 步骤 3: 配置域名和 HTTPS

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx -y

# 获取 SSL 证书（替换 your-domain.com）
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### 步骤 4: 修改默认密码

1. 访问 `https://your-domain.com`
2. 使用 `admin` / `admin123` 登录
3. 立即修改密码

## 📋 手动部署步骤

如果自动部署脚本失败，可以手动执行：

### 1. 安装依赖

```bash
# Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2
sudo npm install -g pm2

# Nginx
sudo apt install nginx -y
```

### 2. 配置后端

```bash
cd /var/www/steam-auth/backend
npm install --production

# 创建 .env 文件
cp .env.example .env
nano .env  # 编辑配置

# 初始化数据库
npm run init-db
```

### 3. 构建前端

```bash
cd /var/www/steam-auth/frontend
npm install
npm run build
```

### 4. 启动服务

```bash
cd /var/www/steam-auth
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 5. 配置 Nginx

```bash
# 编辑 nginx.conf，替换 your-domain.com
sudo nano nginx.conf

# 复制配置
sudo cp nginx.conf /etc/nginx/sites-available/steam-auth
sudo ln -s /etc/nginx/sites-available/steam-auth /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 🔧 常用命令

```bash
# 查看服务状态
pm2 status
pm2 logs steam-auth-backend

# 重启服务
pm2 restart steam-auth-backend

# 查看 Nginx 日志
sudo tail -f /var/log/nginx/steam-auth-error.log

# 备份数据
sudo ./backup.sh
```

## ⚠️ 重要提醒

1. **修改默认密码**：部署后立即修改 `admin` 和 `user` 的默认密码
2. **使用 HTTPS**：生产环境必须配置 SSL 证书
3. **定期备份**：设置定时备份任务
4. **更新系统**：定期更新系统和依赖

## 🆘 遇到问题？

查看详细文档：`DEPLOYMENT.md`

