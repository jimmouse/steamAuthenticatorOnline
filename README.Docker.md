# Steam Authenticator Online - Docker 部署指南

## 快速开始

### 1. 环境准备

确保已安装：
- Docker (20.10+)
- Docker Compose (2.0+)

### 2. 配置环境变量

创建 `.env` 文件（可选，或直接修改 docker-compose.yml）：

```bash
JWT_SECRET=your-very-secure-secret-key-here
```

### 3. 构建并启动

```bash
# 构建并启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 重新构建
docker-compose up -d --build
```

### 4. 访问应用

- 前端：http://localhost
- 后端API：http://localhost:3010

### 5. 初始化管理员账户

首次启动后，需要创建管理员账户：

```bash
# 进入后端容器
docker exec -it steam-auth-backend sh

# 运行初始化脚本
node src/scripts/initAdmin.js

# 退出容器
exit
```

## 数据持久化

数据存储在以下位置：
- SQLite数据库：`./backend/data/database.sqlite`
- 上传文件：`./backend/uploads/`

这些目录已通过 volumes 映射到宿主机，数据不会因容器重启而丢失。

## 生产环境部署建议

### 1. 修改默认密钥

**重要**：在 `docker-compose.yml` 中修改 `JWT_SECRET` 为强密码：

```yaml
environment:
  - JWT_SECRET=your-very-secure-random-string-here
```

### 2. 使用 HTTPS

建议在前端容器前添加反向代理（如 Nginx、Traefik）并配置 SSL 证书。

### 3. 配置反向代理

如果使用反向代理，需要设置：

```yaml
environment:
  - TRUST_PROXY=true
  - IP_HEADER=x-forwarded-for
```

### 4. 备份数据

定期备份数据目录：

```bash
# 备份数据库
cp backend/data/database.sqlite backup/database_$(date +%Y%m%d).sqlite

# 备份上传文件
tar -czf backup/uploads_$(date +%Y%m%d).tar.gz backend/uploads/
```

## 常用命令

```bash
# 查看运行状态
docker-compose ps

# 查看实时日志
docker-compose logs -f backend
docker-compose logs -f frontend

# 重启服务
docker-compose restart

# 进入容器
docker exec -it steam-auth-backend sh
docker exec -it steam-auth-frontend sh

# 清理所有数据（危险操作）
docker-compose down -v
```

## 故障排除

### 后端无法连接

检查后端日志：
```bash
docker-compose logs backend
```

### 前端无法访问API

确认 nginx 配置正确，检查前端日志：
```bash
docker-compose logs frontend
```

### 数据库错误

检查数据目录权限：
```bash
ls -la backend/data/
```

## 端口配置

默认端口：
- 前端：80
- 后端：3010

如需修改，编辑 `docker-compose.yml` 中的 ports 配置：

```yaml
ports:
  - "8080:80"  # 将前端映射到 8080 端口
  - "3000:3010"  # 将后端映射到 3000 端口
```

## 性能优化

### 1. 限制容器资源

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
```

### 2. 启用日志轮转

```yaml
services:
  backend:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## 更新应用

```bash
# 拉取最新代码
git pull

# 重新构建并启动
docker-compose up -d --build

# 查看新版本是否正常运行
docker-compose logs -f
```
