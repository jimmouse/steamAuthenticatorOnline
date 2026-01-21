# Steam取号器

Steam取号器 - 支持多用户管理 Steam 账户和二步验证码

## 功能特性

### 用户面板
- 🔐 安全登录（不支持注册，由管理员创建账户）
- 📱 查看分配的 Steam 账户（卡片展示）
- 🔑 实时显示二步验证码（自动刷新）
- 📋 一键复制用户名、密码和验证码
- ⏱️ 验证码倒计时显示

### 管理员面板
- 👥 用户管理（创建/编辑/删除用户）
- 🎮 Steam 账户管理（上传 .mafile 文件）
- 🔒 权限管理（指定用户可访问的账户）
- 📊 登录日志查看（IP 地址、时间、状态）
- 🌐 支持内网环境（自定义 IP Header）

## 技术栈

### 后端
- Node.js + Express.js
- SQLite 数据库
- JWT 身份验证
- bcryptjs 密码加密
- steam-totp 验证码生成

### 前端
- Vue 3 + Vite
- Element Plus UI 组件库
- Pinia 状态管理
- Vue Router 路由管理
- Axios HTTP 客户端

## 快速开始

### 方式一：Docker 部署（推荐）

使用 Docker Compose 一键部署，详见 [Docker 部署指南](./DOCKER_DEPLOYMENT.md)。

```bash
# 1. 配置环境变量
cd backend
cp .env.example .env
# 编辑 .env 文件，设置 JWT_SECRET

# 2. 构建并启动
cd ..
docker-compose up -d --build

# 3. 初始化数据库
docker-compose exec backend node src/scripts/initDatabase.js

# 4. 访问系统
# 前端: http://localhost
# 后端 API: http://localhost/api
```

### 方式二：传统部署

### 1. 安装依赖

#### 后端
```bash
cd backend
npm install
```

#### 前端
```bash
cd frontend
npm install
```

### 2. 配置环境变量

复制后端环境变量模板：
```bash
cd backend
copy .env.example .env
```

编辑 `.env` 文件，修改以下配置：
```env
PORT=3000
JWT_SECRET=your-secret-key-change-this-in-production
JWT_EXPIRES_IN=24h
DB_PATH=./data/database.sqlite
UPLOAD_PATH=./data/uploads
NODE_ENV=development
TRUST_PROXY=false
IP_HEADER=x-forwarded-for
```

**重要配置说明：**
- `JWT_SECRET`: 生产环境必须修改为强密码
- `TRUST_PROXY`: 如果在反向代理后运行，设置为 `true`
- `IP_HEADER`: 内网环境获取真实 IP 的 Header 名称

### 3. 初始化数据库

```bash
cd backend
npm run init-db
```

这将创建数据库并生成默认账户：
- **管理员**: username: `admin`, password: `admin123`
- **测试用户**: username: `user`, password: `user123`

⚠️ **生产环境请立即修改默认密码！**

### 4. 启动服务

#### 开发环境

后端（终端 1）：
```bash
cd backend
npm run dev
```

前端（终端 2）：
```bash
cd frontend
npm run dev
```

#### 生产环境

后端：
```bash
cd backend
npm start
```

前端（需要先构建）：
```bash
cd frontend
npm run build
```

然后使用 Nginx 或其他 Web 服务器托管 `frontend/dist` 目录。

### 5. 访问系统

- 前端地址: http://localhost:5173
- 后端 API: http://localhost:3000

## 使用指南

### 管理员操作流程

1. **登录管理员账户**
   - 使用 `admin` / `admin123` 登录

2. **创建用户**
   - 进入"用户管理"
   - 点击"创建用户"
   - 输入用户名、密码、选择角色

3. **添加 Steam 账户**
   - 进入"Steam账户"
   - 点击"添加账户"
   - 上传 `.mafile` 文件（Steam Desktop Authenticator 生成）
   - 填写 Steam 用户名和密码

4. **授予权限**
   - 进入"权限管理"
   - 点击"授予权限"
   - 选择用户和对应的 Steam 账户

5. **查看日志**
   - 进入"登录日志"
   - 可按用户筛选查看登录记录

### 用户操作流程

1. **登录**
   - 使用管理员分配的账户登录

2. **查看账户**
   - 登录后自动显示所有有权限的 Steam 账户

3. **使用验证码**
   - 点击卡片查看详细信息
   - 验证码每 30 秒自动刷新
   - 点击复制按钮一键复制

## API 文档

### 认证接口

#### POST /api/auth/login
登录获取 Token

**请求体：**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**响应：**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin"
  }
}
```

### 用户接口（需要认证）

#### GET /api/user/accounts
获取当前用户可访问的 Steam 账户列表

#### GET /api/user/accounts/:id/code
获取指定账户的最新验证码

### 管理员接口（需要管理员权限）

#### GET /api/admin/users
获取所有用户

#### POST /api/admin/users
创建用户

#### PUT /api/admin/users/:id
更新用户

#### DELETE /api/admin/users/:id
删除用户

#### GET /api/admin/steam-accounts
获取所有 Steam 账户

#### POST /api/admin/steam-accounts
添加 Steam 账户（需要上传 .mafile 文件）

#### PUT /api/admin/steam-accounts/:id
更新 Steam 账户

#### DELETE /api/admin/steam-accounts/:id
删除 Steam 账户

#### GET /api/admin/permissions
获取所有权限

#### POST /api/admin/permissions
授予权限

#### DELETE /api/admin/permissions/:id
撤销权限

#### GET /api/admin/logs
获取登录日志

## 数据库结构

### users 表
- `id`: 用户 ID
- `username`: 用户名
- `password_hash`: 密码哈希
- `role`: 角色（user/admin）
- `created_at`: 创建时间
- `last_login`: 最后登录时间
- `last_ip`: 最后登录 IP
- `is_active`: 是否启用

### steam_accounts 表
- `id`: 账户 ID
- `account_name`: 账户名称
- `username`: Steam 用户名
- `password`: Steam 密码
- `shared_secret`: 共享密钥（用于生成验证码）
- `identity_secret`: 身份密钥
- `revocation_code`: 撤销码
- `sda_data`: 完整 SDA 数据（JSON）
- `created_by`: 创建者 ID
- `created_at`: 创建时间
- `updated_at`: 更新时间
- `is_active`: 是否启用

### user_permissions 表
- `id`: 权限 ID
- `user_id`: 用户 ID
- `steam_account_id`: Steam 账户 ID
- `granted_by`: 授权者 ID
- `granted_at`: 授权时间

### login_logs 表
- `id`: 日志 ID
- `user_id`: 用户 ID
- `username`: 用户名
- `ip_address`: IP 地址
- `user_agent`: User Agent
- `login_time`: 登录时间
- `success`: 是否成功

## 安全建议

1. **修改默认密码**：立即修改 `admin` 和 `user` 的默认密码
2. **强 JWT 密钥**：在生产环境使用强随机字符串作为 `JWT_SECRET`
3. **HTTPS**：生产环境必须使用 HTTPS
4. **防火墙**：限制后端 API 的访问来源
5. **定期备份**：定期备份 SQLite 数据库文件
6. **日志审计**：定期检查登录日志，发现异常及时处理

## 常见问题

### Q: 如何获取 .mafile 文件？
A: 使用 Steam Desktop Authenticator 添加账户后，会在其数据目录生成 `.mafile` 文件。

### Q: 支持加密的 .mafile 文件吗？
A: 当前版本暂不支持，请先使用 SDA 解密后再上传。

### Q: 如何在内网环境获取真实 IP？
A: 设置 `TRUST_PROXY=true` 并配置正确的 `IP_HEADER`（如 `x-real-ip` 或 `x-forwarded-for`）。

### Q: 如何迁移到 PostgreSQL/MySQL？
A: 修改 `src/config/database.js`，将 SQLite 连接替换为对应数据库的连接，并调整 SQL 语法。

## 许可证

MIT License

## 免责声明

本项目仅供学习和个人使用，请遵守 Steam 服务条款。使用本软件产生的任何后果由使用者自行承担。
