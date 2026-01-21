# Docker 快速部署指南

## 前置要求

1. **安装 Docker Desktop**
   - 下载地址: https://www.docker.com/products/docker-desktop
   - 安装后启动 Docker Desktop，等待其完全启动

2. **检查 Docker 是否运行**
   ```powershell
   docker ps
   ```
   如果显示容器列表或空列表（没有错误），说明 Docker 正在运行。

## 快速部署步骤

### 1. 启动 Docker Desktop

确保 Docker Desktop 正在运行（系统托盘中有 Docker 图标）。

### 2. 配置环境变量

检查 `backend/.env` 文件是否存在，如果不存在，创建它：

```powershell
# 如果不存在 .env 文件，创建它
if (-not (Test-Path "backend\.env")) {
    @"
NODE_ENV=production
PORT=3010
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h
DB_PATH=/app/data/database.sqlite
TRUST_PROXY=true
IP_HEADER=x-forwarded-for
"@ | Out-File -FilePath "backend\.env" -Encoding utf8
    Write-Host "已创建 backend\.env 文件，请修改 JWT_SECRET！"
}
```

**重要**: 修改 `backend/.env` 中的 `JWT_SECRET` 为强随机字符串！

### 3. 构建并启动服务

```powershell
# 构建镜像
docker compose build

# 启动服务
docker compose up -d

# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f
```

### 4. 访问系统

- **前端**: http://localhost:8081
- **后端 API**: http://localhost:3010/api
- **健康检查**: http://localhost:3010/api/health

### 5. 默认账户

- **管理员**: `admin` / `admin123`
- **测试用户**: `user` / `user123`

⚠️ **生产环境请立即修改默认密码！**

## 常用命令

```powershell
# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f
docker compose logs -f backend    # 只看后端日志
docker compose logs -f frontend   # 只看前端日志

# 停止服务
docker compose stop

# 重启服务
docker compose restart

# 重启特定服务
docker compose restart backend

# 删除服务（不会删除数据卷）
docker compose down

# 删除服务和数据卷（⚠️ 会删除数据库！）
docker compose down -v

# 重新构建并启动
docker compose up -d --build

# 进入容器
docker compose exec backend sh
docker compose exec frontend sh
```

## 故障排查

### Docker Desktop 未运行

**错误**: `failed to connect to the docker API`

**解决**: 
1. 启动 Docker Desktop
2. 等待 Docker Desktop 完全启动（系统托盘图标不再闪烁）
3. 重新运行命令

### 端口被占用

**错误**: `port is already allocated`

**解决**: 
1. 检查端口占用：
   ```powershell
   netstat -ano | findstr ":8081"
   netstat -ano | findstr ":3010"
   ```
2. 修改 `docker-compose.yml` 中的端口映射，或停止占用端口的程序

### 构建失败

**错误**: `npm install` 失败

**解决**:
1. 清理 Docker 缓存：
   ```powershell
   docker compose down
   docker system prune -a
   ```
2. 重新构建：
   ```powershell
   docker compose build --no-cache
   ```

### 服务启动失败

**查看日志**:
```powershell
docker compose logs backend
docker compose logs frontend
```

**常见问题**:
- 环境变量未设置：检查 `backend/.env` 文件
- 数据库路径错误：检查 `DB_PATH` 环境变量
- JWT_SECRET 未设置：确保 `.env` 文件中设置了 `JWT_SECRET`

## 数据备份

### 备份数据库

数据库存储在 Docker 卷中，备份方法：

```powershell
# 创建备份目录
mkdir backup

# 从容器中复制数据库文件
docker compose exec backend sh -c "cp /app/data/database.sqlite /tmp/db_backup.sqlite"
docker compose cp backend:/tmp/db_backup.sqlite backup/database_$(Get-Date -Format "yyyyMMdd_HHmmss").sqlite
```

### 恢复数据库

```powershell
# 停止服务
docker compose stop backend

# 复制数据库文件到容器
docker compose cp backup/database_YYYYMMDD_HHMMSS.sqlite backend:/app/data/database.sqlite

# 启动服务
docker compose start backend
```

## 生产环境建议

1. **修改默认密码**: 部署后立即修改管理员和测试用户密码
2. **强 JWT 密钥**: 使用强随机字符串作为 `JWT_SECRET`
3. **HTTPS**: 配置 SSL 证书，启用 HTTPS
4. **防火墙**: 限制 Docker 端口访问
5. **定期备份**: 定期备份数据库文件
6. **监控日志**: 定期检查服务日志，发现异常及时处理
