# 宝塔面板 Nginx 配置指南

## 📋 配置说明

如果你的服务器使用宝塔面板，需要在宝塔面板中配置 Nginx 反向代理。

---

## 🔧 配置步骤

### 步骤 1: 进入宝塔面板

1. 登录宝塔面板
2. 点击左侧菜单 **"网站"**
3. 找到你的网站（如果没有，先添加一个站点）

### 步骤 2: 配置网站根目录

1. 点击网站右侧的 **"设置"**
2. 在 **"网站目录"** 中设置：
   ```
   /var/www/steam-auth/frontend/dist
   ```
   或你的实际前端构建目录

3. 在 **"运行目录"** 中设置：
   ```
   /var/www/steam-auth/frontend/dist
   ```

### 步骤 3: 配置反向代理（重要）

1. 在网站设置中，点击 **"反向代理"** 标签
2. 点击 **"添加反向代理"**
3. 配置如下：

**代理名称**：`api`（随便填）

**目标URL**：`http://127.0.0.1:3000`

**发送域名**：`$host`

**代理目录**：`/api/`

**⚠️ 重要**：目标URL 不要加 `/api/`，宝塔面板会自动处理路径映射

**缓存**：关闭

**高级设置**中，添加以下自定义配置：

```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection 'upgrade';
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_cache_bypass $http_upgrade;

proxy_connect_timeout 60s;
proxy_send_timeout 60s;
proxy_read_timeout 60s;
```

### 步骤 4: 配置伪静态（Vue Router 需要）

1. 在网站设置中，点击 **"伪静态"** 标签
2. 选择 **"Vue"** 或手动输入：

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

### 步骤 5: 配置 SSL（如果有域名）

1. 在网站设置中，点击 **"SSL"** 标签
2. 选择 **"Let's Encrypt"** 免费证书
3. 填写域名，点击申请
4. 开启 **"强制 HTTPS"**

---

## 📝 完整配置示例

如果你想手动编辑 Nginx 配置，可以在宝塔面板中：

1. 点击网站右侧的 **"设置"** → **"配置文件"**
2. 替换为以下配置：

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name your-domain.com www.your-domain.com;
    
    # 重定向到 HTTPS（如果配置了 SSL）
    # return 301 https://$server_name$request_uri;
    
    # 如果没有 SSL，直接使用以下配置
    root /var/www/steam-auth/frontend/dist;
    index index.html;

    # 前端路由（Vue Router）
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 代理到后端
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 静态资源缓存
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## 🔍 端口映射说明

### 架构图

```
用户访问
   ↓
Nginx (80/443) ← 宝塔面板配置的网站
   ↓
前端静态文件 (/var/www/steam-auth/frontend/dist)
   ↓
/api/* 请求 → 反向代理 → http://127.0.0.1:3000 (后端)
```

### 端口说明

- **Nginx 监听端口**：80 (HTTP) 或 443 (HTTPS)
- **后端服务端口**：3000 (localhost，不对外开放)
- **前端端口**：不需要（静态文件由 Nginx 直接提供）

### 关键配置

1. **网站根目录**：指向前端构建后的 `dist` 目录
2. **反向代理**：`/api/` 路径代理到 `http://127.0.0.1:3000`
3. **伪静态**：Vue Router 需要，所有路由都返回 `index.html`

---

## ✅ 验证配置

### 1. 检查后端服务

```bash
# 检查后端是否运行在 3000 端口
netstat -tlnp | grep 3000

# 或
ss -tlnp | grep 3000
```

### 2. 测试 API 代理

```bash
# 测试 API 是否正常
curl http://your-domain.com/api/health

# 应该返回：
# {"status":"ok","timestamp":"..."}
```

### 3. 测试前端

访问 `http://your-domain.com`，应该能看到登录页面。

---

## ⚠️ 常见问题

### 问题 1: 502 Bad Gateway

**原因**：后端服务未启动或端口不对

**解决**：
```bash
# 检查后端服务
pm2 status

# 如果没有运行，启动它
cd /var/www/steam-auth
pm2 start ecosystem.config.js
```

### 问题 2: 404 Not Found

**原因**：前端文件路径不对

**解决**：
- 检查网站根目录是否正确
- 确认前端已构建：`cd frontend && npm run build`
- 检查 `dist` 目录是否存在

### 问题 3: API 请求失败

**原因**：反向代理配置错误

**解决**：
- 检查反向代理的目标 URL 是否为 `http://127.0.0.1:3000`
- 检查代理目录是否为 `/api/`
- 检查后端服务是否运行

### 问题 4: 页面刷新 404

**原因**：Vue Router 需要伪静态配置

**解决**：
- 在宝塔面板中配置伪静态规则
- 或手动添加 `try_files $uri $uri/ /index.html;`

---

## 📋 检查清单

配置完成后，确认：

- [ ] 网站根目录指向 `/var/www/steam-auth/frontend/dist`
- [ ] 反向代理配置：`/api/` → `http://127.0.0.1:3000`
- [ ] 伪静态规则已配置（Vue Router）
- [ ] 后端服务运行在 3000 端口
- [ ] 前端已构建（`dist` 目录存在）
- [ ] SSL 已配置（生产环境推荐）
- [ ] 防火墙开放 80/443 端口

---

## 🎯 快速配置步骤总结

1. **宝塔面板** → **网站** → **设置**
2. **网站目录**：`/var/www/steam-auth/frontend/dist`
3. **反向代理**：添加 `/api/` → `http://127.0.0.1:3000`
4. **伪静态**：选择 Vue 或手动配置
5. **SSL**：申请 Let's Encrypt 证书（可选但推荐）
6. **保存并重启 Nginx**

完成！现在可以通过域名访问你的应用了。

