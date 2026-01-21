# Docker 部署指南

本文档介绍如何使用 Docker 和 Docker Compose 部署 Steam取号器。

## 前置要求

- Docker Engine 20.10+
- Docker Compose 2.0+
- 至少 1GB 可用磁盘空间

## 快速开始

### 1. 克隆项目

```bash
git clone <your-repo-url>
cd steamAuthenticatorOnline
```

### 2. 配置环境变量

创建 `backend/.env` 文件：

```bash
cd backend
cp .env.example .env
```

编辑 `.env` 文件，设置以下变量：

```env
NODE_ENV=production
PORT=3000
JWT_SECRET=your-super-secret-jwt-key-change-in-production
DB_PATH=/app/data/database.sqlite
TRUST_PROXY=true
```

**重要：** 生产环境必须修改 `JWT_SECRET` 为强随机字符串！

### 3. 构建并启动服务

```bash
# 在项目根目录执行
docker-compose up -d --build
```

### 4. 初始化数据库

```bash
# 进入后端容器
docker-compose exec backend sh

# 在容器内执行初始化脚本
node src/scripts/initDatabase.js

# 退出容器
exit
```

或者直接执行：

```bash
docker-compose exec backend node src/scripts/initDatabase.js
```

### 5. 访问系统

- 前端地址: http://localhost
- 后端 API: http://localhost/api

默认账户：
- **管理员**: `admin` / `admin123`
- **测试用户**: `user` / `user123`

⚠️ **生产环境请立即修改默认密码！**

## Docker Compose 服务说明

### backend 服务

- **端口**: 3000
- **数据卷**: `./backend/data` → `/app/data`
- **环境变量**: 从 `backend/.env` 加载
- **健康检查**: 每 30 秒检查 `/api/health` 端点

### frontend 服务

- **端口**: 80 (HTTP), 443 (HTTPS，需配置)
- **数据卷**: 
  - `./nginx/nginx.conf` → `/etc/nginx/conf.d/default.conf`
  - SSL 证书目录（可选）
- **依赖**: 等待 backend 服务启动

## 常用命令

### 查看服务状态

```bash
docker-compose ps
```

### 查看日志

```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend
docker-compose logs -f frontend
```

### 重启服务

```bash
# 重启所有服务
docker-compose restart

# 重启特定服务
docker-compose restart backend
```

### 停止服务

```bash
docker-compose stop
```

### 启动服务

```bash
docker-compose start
```

### 停止并删除容器

```bash
docker-compose down
```

### 停止并删除容器、卷、网络

```bash
docker-compose down -v
```

⚠️ **警告**: `-v` 会删除数据卷，包括数据库文件！

## 数据持久化

### 数据库文件

数据库文件存储在 `./backend/data/database.sqlite`，通过 Docker 卷挂载到容器内。

### 备份数据库

```bash
# 停止服务
docker-compose stop backend

# 备份数据库文件
cp backend/data/database.sqlite backend/data/database.sqlite.backup.$(date +%Y%m%d_%H%M%S)

# 启动服务
docker-compose start backend
```

### 恢复数据库

```bash
# 停止服务
docker-compose stop backend

# 恢复数据库文件
cp backend/data/database.sqlite.backup.YYYYMMDD_HHMMSS backend/data/database.sqlite

# 启动服务
docker-compose start backend
```

## 配置 HTTPS

### 1. 准备 SSL 证书

将 SSL 证书文件放到 `nginx/ssl/` 目录：

```bash
mkdir -p nginx/ssl
cp your-cert.pem nginx/ssl/cert.pem
cp your-key.pem nginx/ssl/key.pem
```

### 2. 修改 Nginx 配置

编辑 `nginx/nginx.conf`，取消注释 HTTPS 配置部分：

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    # ... 其他配置
}
```

### 3. 更新 docker-compose.yml

取消注释 SSL 证书挂载：

```yaml
volumes:
  - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro
  - ./nginx/ssl:/etc/nginx/ssl:ro  # 取消注释
```

### 4. 重启服务

```bash
docker-compose restart frontend
```

## 生产环境优化

### 1. 使用命名卷（可选）

修改 `docker-compose.yml`，使用命名卷而不是绑定挂载：

```yaml
volumes:
  backend-data:
    driver: local

services:
  backend:
    volumes:
      - backend-data:/app/data
```

### 2. 资源限制

在 `docker-compose.yml` 中添加资源限制：

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

### 3. 日志管理

配置日志轮转：

```yaml
services:
  backend:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## 故障排查

### 查看容器日志

```bash
docker-compose logs backend
docker-compose logs frontend
```

### 进入容器调试

```bash
# 进入后端容器
docker-compose exec backend sh

# 进入前端容器
docker-compose exec frontend sh
```

### 检查网络连接

```bash
# 测试后端健康检查
docker-compose exec frontend wget -O- http://backend:3000/api/health

# 测试前端
curl http://localhost
```

### 重置数据库

```bash
# 停止服务
docker-compose stop backend

# 删除数据库文件
rm backend/data/database.sqlite

# 启动服务并重新初始化
docker-compose start backend
docker-compose exec backend node src/scripts/initDatabase.js
```

## 更新部署

### 1. 拉取最新代码

```bash
git pull
```

### 2. 重新构建并启动

```bash
docker-compose up -d --build
```

### 3. 检查服务状态

```bash
docker-compose ps
docker-compose logs -f
```

## 安全建议

1. **修改默认密码**: 部署后立即修改默认管理员密码
2. **强 JWT 密钥**: 使用强随机字符串作为 `JWT_SECRET`
3. **HTTPS**: 生产环境必须启用 HTTPS
4. **防火墙**: 限制 Docker 端口访问
5. **定期备份**: 定期备份数据库文件
6. **更新镜像**: 定期更新基础镜像（node:18-alpine, nginx:alpine）

## 常见问题

### Q: 容器启动失败，提示找不到 .env 文件？

A: 确保 `backend/.env` 文件存在，或修改 `docker-compose.yml` 移除 `.env` 文件挂载，直接在 `environment` 中设置环境变量。

### Q: 前端无法连接到后端 API？

A: 检查：
1. 后端容器是否正常运行：`docker-compose ps`
2. 后端健康检查：`docker-compose exec frontend wget -O- http://backend:3000/api/health`
3. Nginx 配置中的 `proxy_pass` 是否正确

### Q: 数据库文件权限错误？

A: 确保 `backend/data` 目录有正确的权限：

```bash
chmod -R 755 backend/data
```

### Q: 如何查看容器内的环境变量？

A: 

```bash
docker-compose exec backend env
```

### Q: 如何修改 Nginx 配置？

A: 编辑 `nginx/nginx.conf`，然后重启 frontend 服务：

```bash
docker-compose restart frontend
```

## 技术支持

如遇到问题，请查看：
- 容器日志：`docker-compose logs`
- 服务状态：`docker-compose ps`
- 健康检查：访问 `http://localhost/api/health`
