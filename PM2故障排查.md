# PM2 服务故障排查指南

## 🔍 查看错误日志

首先查看 PM2 日志，找出错误原因：

```bash
# 查看最近的错误日志
pm2 logs steam-auth-backend --lines 50

# 或查看所有日志
pm2 logs steam-auth-backend --err
```

## 🐛 常见问题及解决方法

### 问题 1: JWT_SECRET 未设置

**错误信息**：
```
错误: JWT_SECRET 环境变量未设置！
```

**解决方法**：
```bash
# 进入后端目录
cd /root/Steamget/backend

# 检查 .env 文件是否存在
ls -la .env

# 如果不存在，创建它
nano .env
```

在 `.env` 文件中添加：
```env
PORT=3000
NODE_ENV=production
JWT_SECRET=your-very-strong-random-secret-key-here
JWT_EXPIRES_IN=24h
DB_PATH=./data/database.sqlite
UPLOAD_PATH=./data/uploads
TRUST_PROXY=true
IP_HEADER=x-forwarded-for
```

生成强随机密钥：
```bash
openssl rand -base64 32
```

### 问题 2: 数据库文件权限问题

**错误信息**：
```
Database connection error: unable to open database file
```

**解决方法**：
```bash
# 检查数据库目录
ls -la /root/Steamget/backend/data/

# 创建目录（如果不存在）
mkdir -p /root/Steamget/backend/data/uploads

# 设置权限
chmod 755 /root/Steamget/backend/data
chmod 644 /root/Steamget/backend/data/database.sqlite
```

### 问题 3: 端口被占用

**错误信息**：
```
Error: listen EADDRINUSE: address already in use :::3000
```

**解决方法**：
```bash
# 检查端口占用
netstat -tlnp | grep 3000
# 或
ss -tlnp | grep 3000

# 如果被占用，杀死进程
kill -9 <PID>

# 或修改 .env 中的端口
PORT=3001
```

### 问题 4: 依赖未安装

**错误信息**：
```
Error: Cannot find module 'xxx'
```

**解决方法**：
```bash
cd /root/Steamget/backend
npm install --production
```

### 问题 5: 数据库未初始化

**错误信息**：
```
no such table: users
```

**解决方法**：
```bash
cd /root/Steamget/backend
npm run init-db
```

## 🔧 完整排查步骤

### 步骤 1: 停止服务并查看日志

```bash
pm2 stop steam-auth-backend
pm2 logs steam-auth-backend --lines 100
```

### 步骤 2: 检查环境变量

```bash
cd /root/Steamget/backend
cat .env
```

确保 `.env` 文件存在且包含所有必需变量。

### 步骤 3: 手动测试启动

```bash
cd /root/Steamget/backend
node src/server.js
```

如果手动启动成功，说明代码没问题，可能是 PM2 配置问题。

### 步骤 4: 检查 PM2 配置

```bash
cd /root/Steamget
cat ecosystem.config.js
```

确保配置正确：
- `cwd` 路径正确
- `script` 路径正确
- 环境变量已设置

### 步骤 5: 重新启动

```bash
# 删除旧进程
pm2 delete steam-auth-backend

# 重新启动
cd /root/Steamget
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 查看日志
pm2 logs steam-auth-backend
```

## 📋 快速修复命令

如果以上都不行，执行完整重置：

```bash
# 1. 停止并删除进程
pm2 delete steam-auth-backend

# 2. 进入项目目录
cd /root/Steamget

# 3. 检查后端环境
cd backend
ls -la .env
ls -la data/

# 4. 如果 .env 不存在，创建它
if [ ! -f .env ]; then
    cat > .env << EOF
PORT=3000
NODE_ENV=production
JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRES_IN=24h
DB_PATH=./data/database.sqlite
UPLOAD_PATH=./data/uploads
TRUST_PROXY=true
IP_HEADER=x-forwarded-for
EOF
fi

# 5. 确保数据库目录存在
mkdir -p data/uploads
chmod 755 data

# 6. 初始化数据库（如果未初始化）
if [ ! -f data/database.sqlite ]; then
    npm run init-db
fi

# 7. 返回项目根目录，重新启动
cd ..
pm2 start ecosystem.config.js
pm2 logs steam-auth-backend
```

## ✅ 验证服务

启动成功后，测试：

```bash
# 测试健康检查接口
curl http://localhost:3000/api/health

# 应该返回：
# {"status":"ok","timestamp":"..."}
```

## 📞 如果还是不行

请把以下信息发给我：

1. PM2 日志输出：
```bash
pm2 logs steam-auth-backend --lines 50
```

2. 手动启动的输出：
```bash
cd /root/Steamget/backend
node src/server.js
```

3. 环境变量内容：
```bash
cat /root/Steamget/backend/.env
```

4. 文件结构：
```bash
ls -la /root/Steamget/
ls -la /root/Steamget/backend/
```

