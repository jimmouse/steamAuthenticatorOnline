# GitHub Actions 配置说明

本项目包含4个GitHub Actions工作流，用于自动化构建、测试和部署。

## 工作流说明

### 1. CI (ci.yml)
**触发条件**: 推送到main/develop分支或PR到main分支

**功能**:
- 检查后端代码语法
- 检查前端代码并构建
- 检查Steam服务代码
- 测试Docker镜像构建

**用途**: 确保代码质量，防止破坏性提交

### 2. Docker Build (docker-build.yml)
**触发条件**: 推送到main/develop分支、创建tag或PR

**功能**:
- 构建Backend、Frontend、Steam Service三个Docker镜像
- 推送到GitHub Container Registry (ghcr.io)
- 使用GitHub Actions缓存加速构建
- 生成构建摘要

**镜像地址**:
```
ghcr.io/<username>/<repo>/backend:latest
ghcr.io/<username>/<repo>/frontend:latest
ghcr.io/<username>/<repo>/steam-service:latest
```

### 3. Release (release.yml)
**触发条件**: 推送tag (如 v1.0.0)

**功能**:
- 自动生成changelog
- 创建GitHub Release
- 构建并推送带版本号的Docker镜像
- 生成部署说明

**使用方法**:
```bash
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

### 4. Deploy (deploy.yml)
**触发条件**: 手动触发 (workflow_dispatch)

**功能**:
- 通过SSH连接到服务器
- 拉取最新代码和镜像
- 自动备份当前版本
- 部署新版本
- 失败时自动回滚

**使用方法**:
1. 在GitHub仓库 → Actions → Deploy to Server
2. 点击 "Run workflow"
3. 选择环境 (production/staging)
4. 输入版本号 (可选)

## 配置步骤

### 1. 启用GitHub Container Registry

在仓库设置中启用Packages功能。

### 2. 配置Secrets (用于部署)

在仓库 Settings → Secrets and variables → Actions 中添加：

| Secret名称 | 说明 | 示例 |
|-----------|------|------|
| `SSH_PRIVATE_KEY` | SSH私钥 | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `SERVER_HOST` | 服务器地址 | `example.com` 或 `192.168.1.100` |
| `SERVER_USER` | SSH用户名 | `ubuntu` 或 `root` |
| `DEPLOY_PATH` | 部署路径 | `/opt/steam-authenticator` |

### 3. 配置Environments (可选)

在仓库 Settings → Environments 中创建：
- `production` - 生产环境
- `staging` - 测试环境

可以为每个环境设置不同的Secrets和保护规则。

## 使用Docker镜像

### 从GitHub Container Registry拉取

```bash
# 登录 (需要Personal Access Token)
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# 拉取镜像
docker pull ghcr.io/<username>/<repo>/backend:latest
docker pull ghcr.io/<username>/<repo>/frontend:latest
docker pull ghcr.io/<username>/<repo>/steam-service:latest
```

### 使用docker-compose

修改 `docker-compose.yml`:

```yaml
services:
  backend:
    image: ghcr.io/<username>/<repo>/backend:latest
    # 移除 build 配置
    
  frontend:
    image: ghcr.io/<username>/<repo>/frontend:latest
    
  steam-service:
    image: ghcr.io/<username>/<repo>/steam-service:latest
```

然后启动：

```bash
docker-compose pull
docker-compose up -d
```

## 本地测试工作流

使用 [act](https://github.com/nektos/act) 在本地测试GitHub Actions:

```bash
# 安装 act
# Windows: choco install act-cli
# Mac: brew install act
# Linux: curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# 测试CI工作流
act push

# 测试特定工作流
act -W .github/workflows/ci.yml
```

## 工作流状态徽章

在README.md中添加状态徽章：

```markdown
![CI](https://github.com/<username>/<repo>/workflows/CI/badge.svg)
![Docker Build](https://github.com/<username>/<repo>/workflows/Docker%20Build%20and%20Push/badge.svg)
```

## 常见问题

### Q: 构建失败怎么办？

查看Actions日志：
1. 进入仓库 → Actions
2. 点击失败的工作流
3. 查看详细日志

### Q: 如何加速构建？

- 使用GitHub Actions缓存 (已配置)
- 使用Docker layer缓存 (已配置)
- 减少依赖包大小

### Q: 如何跳过CI？

在commit message中添加 `[skip ci]`:

```bash
git commit -m "Update README [skip ci]"
```

### Q: 部署失败如何回滚？

部署工作流会自动回滚。手动回滚：

```bash
ssh user@server
cd /opt/steam-authenticator
docker-compose down
rm -rf ./*
cp -r backup/* .
docker-compose up -d
```

## 最佳实践

1. **分支策略**
   - `main` - 生产环境
   - `develop` - 开发环境
   - `feature/*` - 功能分支

2. **版本管理**
   - 使用语义化版本 (v1.0.0)
   - 重大更新: v2.0.0
   - 功能更新: v1.1.0
   - Bug修复: v1.0.1

3. **部署流程**
   ```
   develop → PR → main → tag → release → deploy
   ```

4. **安全建议**
   - 定期更新依赖
   - 扫描Docker镜像漏洞
   - 使用最小权限原则
   - 定期轮换Secrets

## 监控和告警

可以集成以下服务：
- GitHub Actions通知 (邮件/Slack)
- Docker Hub自动构建
- Dependabot自动更新依赖
- CodeQL代码安全扫描

## 相关文档

- [GitHub Actions文档](https://docs.github.com/en/actions)
- [Docker文档](https://docs.docker.com/)
- [部署指南](../DEPLOY.md)
