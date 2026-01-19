# 公网部署指南

本文档提供将 Steam 验证器管理系统部署到公网的完整方案。

## 📋 目录

- [服务器要求](#服务器要求)
- [部署架构](#部署架构)
- [部署步骤](#部署步骤)
- [安全配置](#安全配置)
- [域名和 HTTPS](#域名和-https)
- [进程管理](#进程管理)
- [备份策略](#备份策略)
- [监控和维护](#监控和维护)

## 🖥️ 服务器要求

### 最低配置
- **CPU**: 1 核
- **内存**: 1GB RAM
- **存储**: 20GB SSD
- **带宽**: 1Mbps
- **操作系统**: Ubuntu 20.04+ / CentOS 7+ / Debian 10+

### 推荐配置
- **CPU**: 2 核
- **内存**: 2GB RAM
- **存储**: 40GB SSD
- **带宽**: 5Mbps
- **操作系统**: Ubuntu 22.04 LTS

## 🏗️ 部署架构

```
Internet
   ↓
Nginx (80/443) - 反向代理 + HTTPS
   ↓
Frontend (静态文件) - /var/www/steam-auth/dist
   ↓
Backend API (Node.js + PM2) - localhost:3000
   ↓
SQLite Database - /var/www/steam-auth/backend/data
```

## 🚀 部署步骤

### 1. 服务器准备

#### 1.1 更新系统
```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# CentOS/RHEL
sudo yum update -y
```

#### 1.2 安装 Node.js
```bash
# 使用 NodeSource 安装 Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node --version
npm --version
```

#### 1.3 安装 Nginx
```bash
sudo apt install nginx -y
sudo systemctl enable nginx
sudo systemctl start nginx
```

#### 1.4 安装 PM2（进程管理）
```bash
sudo npm install -g pm2
```

### 2. 上传项目文件

#### 2.1 创建项目目录
```bash
sudo mkdir -p /var/www/steam-auth
sudo chown -R $USER:$USER /var/www/steam-auth
```

#### 2.2 上传文件
使用以下方式之一上传项目文件：

**方式 A: 使用 Git**
```bash
cd /var/www/steam-auth
git clone <your-repo-url> .
```

**方式 B: 使用 SCP**
```bash
# 在本地执行
scp -r ./steamAuthenticatorOnline/* user@your-server-ip:/var/www/steam-auth/
```

**方式 C: 使用 SFTP**
使用 FileZilla 或其他 SFTP 客户端上传文件

### 3. 配置后端

#### 3.1 安装后端依赖
```bash
cd /var/www/steam-auth/backend
npm install --production
```

#### 3.2 配置环境变量
```bash
cd /var/www/steam-auth/backend
cp .env.example .env
nano .env
```

编辑 `.env` 文件：
```env
PORT=3000
NODE_ENV=production

# ⚠️ 重要：使用强随机字符串生成 JWT_SECRET
# 可以使用命令生成：openssl rand -base64 32
JWT_SECRET=your-very-strong-random-secret-key-here
JWT_EXPIRES_IN=24h

DB_PATH=./data/database.sqlite
UPLOAD_PATH=./data/uploads

# 反向代理配置
TRUST_PROXY=true
IP_HEADER=x-forwarded-for
```

#### 3.3 初始化数据库
```bash
cd /var/www/steam-auth/backend
npm run init-db
```

**⚠️ 重要：立即修改默认密码！**

#### 3.4 设置文件权限
```bash
sudo chown -R www-data:www-data /var/www/steam-auth/backend/data
sudo chmod -R 755 /var/www/steam-auth/backend/data
```

### 4. 配置前端

#### 4.1 安装前端依赖
```bash
cd /var/www/steam-auth/frontend
npm install
```

#### 4.2 配置生产环境变量（可选）
如果需要配置 API 基础 URL，创建 `.env.production`：
```bash
cd /var/www/steam-auth/frontend
nano .env.production
```

内容：
```env
VITE_API_BASE_URL=https://your-domain.com
```

#### 4.3 构建前端
```bash
cd /var/www/steam-auth/frontend
npm run build
```

构建完成后，静态文件会在 `frontend/dist` 目录中。

### 5. 配置 PM2

#### 5.1 创建 PM2 配置文件
使用项目根目录的 `ecosystem.config.js`（见下方）

#### 5.2 启动后端服务
```bash
cd /var/www/steam-auth
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 6. 配置 Nginx

#### 6.1 创建 Nginx 配置
使用项目根目录的 `nginx.conf`（见下方）

#### 6.2 启用配置
```bash
sudo cp nginx.conf /etc/nginx/sites-available/steam-auth
sudo ln -s /etc/nginx/sites-available/steam-auth /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 7. 配置防火墙

```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# firewalld (CentOS)
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

## 🔒 安全配置

### 1. 配置 HTTPS（使用 Let's Encrypt）

#### 1.1 安装 Certbot
```bash
sudo apt install certbot python3-certbot-nginx -y
```

#### 1.2 获取 SSL 证书
```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

Certbot 会自动配置 Nginx 使用 HTTPS。

#### 1.3 自动续期
```bash
sudo certbot renew --dry-run
```

证书会自动续期（Let's Encrypt 证书有效期 90 天）。

### 2. 安全加固

#### 2.1 修改默认密码
登录系统后立即修改管理员和测试用户的默认密码。

#### 2.2 限制 SSH 访问
```bash
sudo nano /etc/ssh/sshd_config
```

修改：
```
PermitRootLogin no
PasswordAuthentication no  # 使用密钥认证
```

重启 SSH：
```bash
sudo systemctl restart sshd
```

#### 2.3 定期更新
```bash
# 设置自动更新
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure -plow unattended-upgrades
```

## 🌐 域名和 HTTPS

### 1. 域名解析

在域名服务商处添加 A 记录：
- 类型：A
- 主机记录：@（或 www）
- 记录值：服务器公网 IP
- TTL：600

### 2. HTTPS 配置

按照上述"安全配置"部分的步骤配置 HTTPS。

## 📦 进程管理

### PM2 常用命令

```bash
# 查看状态
pm2 status

# 查看日志
pm2 logs steam-auth-backend

# 重启服务
pm2 restart steam-auth-backend

# 停止服务
pm2 stop steam-auth-backend

# 删除服务
pm2 delete steam-auth-backend

# 监控
pm2 monit
```

## 💾 备份策略

### 1. 数据库备份脚本

创建备份脚本 `backup.sh`：
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/steam-auth"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# 备份数据库
cp /var/www/steam-auth/backend/data/database.sqlite $BACKUP_DIR/database_$DATE.sqlite

# 备份上传的文件
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /var/www/steam-auth/backend/data/uploads

# 删除 30 天前的备份
find $BACKUP_DIR -name "*.sqlite" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
```

### 2. 设置定时备份

```bash
chmod +x backup.sh
sudo cp backup.sh /usr/local/bin/steam-auth-backup.sh

# 添加到 crontab（每天凌晨 2 点备份）
sudo crontab -e
# 添加以下行：
0 2 * * * /usr/local/bin/steam-auth-backup.sh >> /var/log/steam-auth-backup.log 2>&1
```

## 📊 监控和维护

### 1. 日志查看

```bash
# PM2 日志
pm2 logs steam-auth-backend

# Nginx 日志
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# 系统日志
sudo journalctl -u nginx -f
```

### 2. 性能监控

```bash
# 系统资源
htop

# PM2 监控
pm2 monit

# 磁盘使用
df -h
```

### 3. 更新部署

```bash
# 1. 备份当前版本
cp -r /var/www/steam-auth /var/www/steam-auth-backup-$(date +%Y%m%d)

# 2. 更新代码
cd /var/www/steam-auth
git pull  # 或重新上传文件

# 3. 更新依赖
cd backend && npm install --production
cd ../frontend && npm install && npm run build

# 4. 重启服务
pm2 restart steam-auth-backend
sudo systemctl reload nginx
```

## 🐛 故障排查

### 1. 服务无法启动
```bash
# 检查 PM2 日志
pm2 logs steam-auth-backend --lines 50

# 检查端口占用
sudo netstat -tlnp | grep 3000

# 检查环境变量
cd /var/www/steam-auth/backend
cat .env
```

### 2. Nginx 502 错误
```bash
# 检查后端服务是否运行
pm2 status

# 检查 Nginx 错误日志
sudo tail -f /var/log/nginx/error.log
```

### 3. 数据库错误
```bash
# 检查数据库文件权限
ls -la /var/www/steam-auth/backend/data/

# 检查磁盘空间
df -h
```

## 📝 检查清单

部署完成后，请确认：

- [ ] 后端服务正常运行（`pm2 status`）
- [ ] 前端文件已构建（`ls frontend/dist`）
- [ ] Nginx 配置正确（`sudo nginx -t`）
- [ ] HTTPS 证书已配置
- [ ] 防火墙规则已设置
- [ ] 默认密码已修改
- [ ] 备份脚本已配置
- [ ] 域名解析正确
- [ ] 可以正常访问网站

## 🔗 相关文件

- `ecosystem.config.js` - PM2 配置文件
- `nginx.conf` - Nginx 配置文件
- `backup.sh` - 备份脚本

## 📞 支持

如遇到问题，请检查：
1. 服务器日志
2. PM2 日志
3. Nginx 日志
4. 浏览器控制台（F12）

---

**⚠️ 安全提醒：**
- 生产环境必须使用 HTTPS
- 定期更新系统和依赖
- 使用强密码
- 定期备份数据
- 监控系统日志

