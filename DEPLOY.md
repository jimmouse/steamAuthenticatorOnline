# Docker 部署完整指南

## 📋 前置要求

- Docker 20.10+
- Docker Compose 2.0+
- 至少 2GB 可用内存
- 至少 5GB 可用磁盘空间

## 🚀 快速部署

### 1. 克隆项目

```bash
git clone <repository-url>
cd SteamAuthenticatorOnline
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，**必须修改**以下配置：

```bash
# 修改为强随机字符串
JWT_SECRET=your-very-secure-random-string-here

# 修改为强随机字符串
STEAM_SERVICE_API_SECRET=change-this-to-a-secure-random-string
```

生成随机字符串的方法：

```bash
# Linux/Mac
openssl rand -hex 32

# Windows PowerShell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
```

### 3. 构建并启动

```bash
# 构建镜像
docker-compose build

# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f
```

### 4. 访问应用

- **前端**: http://localhost
- **后端API**: http://localhost:3010
- **Steam服务**: http://localhost:3020

### 5. 初始化管理员账户

首次启动后，数据库会自动初始化。默认管理员账户：

- 用户名: `admin`
- 密码: `admin123`

**⚠️ 重要：登录后立即修改默认密码！**

## 📦 服务说明

### 服务列表

| 服务 | 容器名 | 端口 | 说明 |
|------|--------|------|------|
| backend | steam-auth-backend | 3010 | 主后端服务 |
| frontend | steam-auth-frontend | 80 | 前端界面 |
| steam-service | steam-service | 3020 | Steam托管服务 |

### 服务依赖

```
frontend → backend → steam-service
```

- 前端依赖后端健康检查通过后才启动
- 后端和Steam服务独立启动

## 🔧 常用命令

### 启动和停止

```bash
# 启动所有服务
docker-compose up -d

# 停止所有服务
docker-compose down

# 重启服务
docker-compose restart

# 重启单个服务
docker-compose restart backend
```

### 查看状态

```bash
# 查看运行状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f steam-service
```

### 更新和重建

```bash
# 拉取最新代码
git pull

# 重新构建并启动
docker-compose up -d --build

# 仅重建特定服务
docker-compose build backend
docker-compose up -d backend
```

### 数据管理

```bash
# 备份数据
docker run --rm -v steam-authenticator_backend-data:/data -v $(pwd):/backup alpine tar czf /backup/backup-$(date +%Y%m%d).tar.gz /data

# 恢复数据
docker run --rm -v steam-authenticator_backend-data:/data -v $(pwd):/backup alpine tar xzf /backup/backup-YYYYMMDD.tar.gz -C /

# 查看数据卷
docker volume ls | grep steam-authenticator

# 清理所有数据（危险操作！）
docker-compose down -v
```

### 进入容器

```bash
# 进入后端容器
docker exec -it steam-auth-backend sh

# 进入前端容器
docker exec -it steam-auth-frontend sh

# 进入Steam服务容器
docker exec -it steam-service sh
```

## 🔍 健康检查

所有服务都配置了健康检查：

```bash
# 检查后端健康
curl http://localhost:3010/health

# 检查Steam服务健康
curl http://localhost:3020/health

# 检查前端
curl http://localhost
```

## 🐛 故障排除

### 问题1：容器无法启动

**检查日志：**
```bash
docker-compose logs backend
```

**常见原因：**
- 端口被占用：修改 `.env` 中的端口配置
- 权限问题：确保数据目录有写权限
- 内存不足：检查 Docker 内存限制

### 问题2：数据库初始化失败

**解决方案：**
```bash
# 停止服务
docker-compose down

# 删除数据卷
docker volume rm steam-authenticator_backend-data

# 重新启动
docker-compose up -d
```

### 问题3：前端无法连接后端

**检查：**
1. 后端是否健康：`docker-compose ps`
2. 网络是否正常：`docker network inspect steam-authenticator_steam-auth-network`
3. 查看nginx配置：`docker exec steam-auth-frontend cat /etc/nginx/conf.d/default.conf`

### 问题4：Steam服务连接失败

**检查：**
```bash
# 测试Steam服务
curl -H "X-API-Key: your-secret" http://localhost:3020/health

# 查看日志
docker-compose logs steam-service
```

## 🔐 安全配置

### 生产环境建议

1. **修改所有默认密钥**
   ```bash
   JWT_SECRET=<strong-random-string>
   STEAM_SERVICE_API_SECRET=<strong-random-string>
   ```

2. **使用HTTPS**
   - 配置反向代理（Nginx/Traefik）
   - 申请SSL证书（Let's Encrypt）

3. **限制端口访问**
   ```bash
   # 只暴露前端端口
   FRONTEND_PORT=80
   # 后端和Steam服务不对外暴露
   ```

4. **启用防火墙**
   ```bash
   # 只允许必要的端口
   ufw allow 80/tcp
   ufw allow 443/tcp
   ```

5. **定期备份**
   ```bash
   # 添加到crontab
   0 2 * * * cd /path/to/project && docker-compose exec -T backend tar czf - /app/data > backup-$(date +\%Y\%m\%d).tar.gz
   ```

## 📊 监控

### 资源使用

```bash
# 查看容器资源使用
docker stats

# 查看特定容器
docker stats steam-auth-backend
```

### 日志轮转

在 `docker-compose.yml` 中配置：

```yaml
services:
  backend:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## 🔄 更新流程

### 标准更新

```bash
# 1. 备份数据
./backup.sh

# 2. 拉取最新代码
git pull

# 3. 重新构建
docker-compose build

# 4. 停止旧服务
docker-compose down

# 5. 启动新服务
docker-compose up -d

# 6. 检查状态
docker-compose ps
docker-compose logs -f
```

### 零停机更新（使用蓝绿部署）

```bash
# 1. 构建新镜像
docker-compose build

# 2. 启动新容器（不同端口）
docker-compose -f docker-compose.blue-green.yml up -d

# 3. 测试新服务
curl http://localhost:8080/health

# 4. 切换流量（修改负载均衡器配置）

# 5. 停止旧容器
docker-compose down
```

## 🌐 反向代理配置

### Nginx示例

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api {
        proxy_pass http://localhost:3010;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### Traefik示例

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.steam-auth.rule=Host(`your-domain.com`)"
  - "traefik.http.routers.steam-auth.entrypoints=websecure"
  - "traefik.http.routers.steam-auth.tls.certresolver=letsencrypt"
```

## 📈 性能优化

### 1. 资源限制

在 `docker-compose.yml` 中添加：

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

### 2. 缓存优化

```bash
# 使用BuildKit加速构建
DOCKER_BUILDKIT=1 docker-compose build
```

### 3. 网络优化

```yaml
networks:
  steam-auth-network:
    driver: bridge
    driver_opts:
      com.docker.network.driver.mtu: 1500
```

## 🎯 最佳实践

1. **环境隔离** - 开发、测试、生产使用不同的 `.env` 文件
2. **版本控制** - 使用Git管理配置变更
3. **自动化部署** - 使用CI/CD pipeline
4. **监控告警** - 集成Prometheus + Grafana
5. **日志聚合** - 使用ELK或Loki
6. **定期维护** - 每周检查日志和性能

## 📞 支持

遇到问题？

1. 查看日志：`docker-compose logs -f`
2. 检查健康状态：`docker-compose ps`
3. 查看文档：`README.md`, `README.Docker.md`
4. 提交Issue：GitHub Issues

## 📝 附录

### 环境变量完整列表

参见 `.env.example` 文件

### 端口映射

| 服务 | 容器端口 | 主机端口 | 说明 |
|------|----------|----------|------|
| frontend | 80 | 80 | HTTP |
| backend | 3010 | 3010 | API |
| steam-service | 3020 | 3020 | Steam API |

### 数据卷

| 卷名 | 挂载点 | 说明 |
|------|--------|------|
| backend-data | /app/data | SQLite数据库 |
| backend-uploads | /app/uploads | 上传文件 |
| steam-service-data | /app/data | Session数据 |

## 🎉 完成

现在你的Steam Authenticator Online已经成功部署在Docker中！

访问 http://localhost 开始使用。
