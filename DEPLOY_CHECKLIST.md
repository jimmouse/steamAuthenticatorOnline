# 部署检查清单

使用此清单确保部署过程完整无误。

## 📋 部署前准备

- [ ] 服务器已准备（Ubuntu 20.04+）
- [ ] 已获取服务器 SSH 访问权限
- [ ] 已准备域名（可选但推荐）
- [ ] 已上传项目文件到服务器

## 🔧 服务器配置

- [ ] Node.js 18+ 已安装 (`node --version`)
- [ ] npm 已安装 (`npm --version`)
- [ ] PM2 已安装 (`pm2 --version`)
- [ ] Nginx 已安装 (`nginx -v`)
- [ ] 防火墙已配置（开放 80、443 端口）

## 📦 项目配置

### 后端配置
- [ ] 后端依赖已安装 (`cd backend && npm install --production`)
- [ ] `.env` 文件已创建并配置
- [ ] `JWT_SECRET` 已设置为强随机字符串
- [ ] `TRUST_PROXY` 已设置为 `true`
- [ ] 数据库已初始化 (`npm run init-db`)
- [ ] 文件权限已设置正确

### 前端配置
- [ ] 前端依赖已安装 (`cd frontend && npm install`)
- [ ] 前端已构建 (`npm run build`)
- [ ] `dist` 目录已生成

## 🚀 服务启动

- [ ] PM2 配置文件 (`ecosystem.config.js`) 已配置
- [ ] 后端服务已启动 (`pm2 start ecosystem.config.js`)
- [ ] PM2 已保存配置 (`pm2 save`)
- [ ] PM2 开机自启已配置 (`pm2 startup`)

## 🌐 Nginx 配置

- [ ] Nginx 配置文件已创建
- [ ] 域名已在配置文件中替换
- [ ] Nginx 配置测试通过 (`nginx -t`)
- [ ] Nginx 已重载 (`systemctl reload nginx`)
- [ ] 静态文件路径正确
- [ ] API 代理配置正确

## 🔒 安全配置

- [ ] SSL 证书已配置（Let's Encrypt）
- [ ] HTTPS 已启用并正常工作
- [ ] HTTP 已重定向到 HTTPS
- [ ] 默认密码已修改
- [ ] SSH 密钥认证已配置（可选但推荐）
- [ ] 防火墙规则已设置

## 💾 备份配置

- [ ] 备份脚本 (`backup.sh`) 已创建
- [ ] 备份脚本已设置执行权限
- [ ] 定时备份任务已配置（crontab）
- [ ] 备份目录已创建

## ✅ 功能测试

- [ ] 网站可以访问（HTTPS）
- [ ] 登录功能正常
- [ ] 管理员功能正常
- [ ] 用户功能正常
- [ ] API 接口正常响应
- [ ] 文件上传功能正常（如适用）

## 📊 监控配置

- [ ] PM2 日志可以查看 (`pm2 logs`)
- [ ] Nginx 日志可以查看
- [ ] 系统资源监控已设置
- [ ] 错误告警已配置（可选）

## 🔄 更新和维护

- [ ] 更新流程已文档化
- [ ] 回滚方案已准备
- [ ] 维护窗口已规划

## 📝 文档

- [ ] 部署文档已阅读 (`DEPLOYMENT.md`)
- [ ] 快速开始指南已阅读 (`QUICK_START.md`)
- [ ] 团队已了解部署流程

---

## 🎯 快速验证命令

```bash
# 检查服务状态
pm2 status
sudo systemctl status nginx

# 检查端口
sudo netstat -tlnp | grep -E "3000|80|443"

# 测试 API
curl https://your-domain.com/api/health

# 查看日志
pm2 logs steam-auth-backend
sudo tail -f /var/log/nginx/steam-auth-error.log
```

## ⚠️ 常见问题

### 502 Bad Gateway
- 检查后端服务是否运行：`pm2 status`
- 检查端口是否正确：`netstat -tlnp | grep 3000`
- 查看 Nginx 错误日志

### 403 Forbidden
- 检查文件权限：`ls -la /var/www/steam-auth`
- 检查 Nginx 用户权限

### 数据库错误
- 检查数据库文件权限
- 检查磁盘空间：`df -h`
- 检查数据库文件是否存在

### SSL 证书问题
- 检查证书是否过期：`sudo certbot certificates`
- 检查域名解析：`nslookup your-domain.com`
- 检查防火墙是否开放 80 端口（Let's Encrypt 验证需要）

---

**部署完成后，请保存此清单以备后续参考！**

