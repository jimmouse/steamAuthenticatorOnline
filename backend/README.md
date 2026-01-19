# Steam 认证器在线管理系统 - 后端

一个基于 Node.js 和 Express 的 Steam 认证器在线管理系统后端服务，支持多用户管理、Steam 账户导入、TOTP 验证码生成等功能。

## 📋 目录

- [功能特性](#功能特性)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [快速开始](#快速开始)
- [环境配置](#环境配置)
- [API 文档](#api-文档)
- [数据库结构](#数据库结构)
- [安全说明](#安全说明)
- [开发指南](#开发指南)

## ✨ 功能特性

### 用户认证
- JWT Token 认证机制
- 密码加密存储（bcrypt）
- 登录日志记录
- 登录频率限制

### Steam 账户管理
- 支持导入 Steam Desktop Authenticator (.mafile) 文件
- 自动解析 SDA 文件中的密钥信息
- 生成 Steam TOTP 验证码
- 账户信息加密存储

### 权限管理
- 基于角色的访问控制（RBAC）
- 用户与 Steam 账户的权限关联
- 管理员可分配账户访问权限

### 管理员功能
- 用户管理（创建、编辑、删除、激活/停用）
- Steam 账户管理（导入、编辑、删除）
- 权限分配管理
- 登录日志查看

## 🛠 技术栈

- **运行时**: Node.js
- **框架**: Express.js
- **数据库**: SQLite3
- **认证**: JWT (jsonwebtoken)
- **密码加密**: bcryptjs
- **Steam TOTP**: steam-totp
- **文件上传**: multer
- **安全**: express-rate-limit (限流)
- **开发工具**: nodemon

## 📁 项目结构

```
backend/
├── src/
│   ├── config/
│   │   └── database.js          # 数据库配置和表结构
│   ├── middleware/
│   │   └── auth.js              # 认证中间件
│   ├── routes/
│   │   ├── auth.js              # 认证路由（登录/登出）
│   │   ├── user.js              # 用户路由（账户查询、验证码生成）
│   │   └── admin.js             # 管理员路由（用户/账户/权限管理）
│   ├── scripts/
│   │   └── initDatabase.js      # 数据库初始化脚本
│   ├── utils/
│   │   └── steamAuth.js         # Steam 认证工具函数
│   └── server.js                # 服务器入口文件
├── package.json
└── README.md
```

## 🚀 快速开始

### 前置要求

- Node.js >= 14.0.0
- npm 或 yarn

### 安装步骤

1. **克隆项目并安装依赖**

```bash
cd backend
npm install
```

2. **配置环境变量**

创建 `.env` 文件（参考 [环境配置](#环境配置) 部分）

3. **初始化数据库**

```bash
npm run init-db
```

这将创建数据库表结构并初始化默认管理员账户：
- 管理员：`admin` / `admin123`
- 测试用户：`user` / `user123`

⚠️ **重要**: 生产环境请立即修改默认密码！

4. **启动服务**

开发模式（自动重启）：
```bash
npm run dev
```

生产模式：
```bash
npm start
```

服务默认运行在 `http://localhost:3000`

## ⚙️ 环境配置

在项目根目录创建 `.env` 文件：

```env
# 服务器配置
PORT=3000
NODE_ENV=development

# JWT 配置
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h

# 数据库配置
DB_PATH=./data/database.sqlite

# 文件上传配置
UPLOAD_PATH=./data/uploads

# 代理配置（如果部署在反向代理后）
TRUST_PROXY=false
IP_HEADER=x-forwarded-for
```

### 环境变量说明

| 变量名 | 说明 | 默认值 | 必需 |
|--------|------|--------|------|
| `PORT` | 服务器端口 | 3000 | 否 |
| `NODE_ENV` | 运行环境 | development | 否 |
| `JWT_SECRET` | JWT 密钥 | - | **是** |
| `JWT_EXPIRES_IN` | Token 过期时间 | 24h | 否 |
| `DB_PATH` | 数据库文件路径 | ./data/database.sqlite | 否 |
| `UPLOAD_PATH` | 上传文件目录 | ./data/uploads | 否 |
| `TRUST_PROXY` | 是否信任代理 | false | 否 |
| `IP_HEADER` | IP 头字段名 | x-forwarded-for | 否 |

## 📚 API 文档

### 基础信息

- **Base URL**: `http://localhost:3000/api`
- **认证方式**: Bearer Token（在请求头中添加 `Authorization: Bearer <token>`）

### 公共接口

#### 健康检查
```
GET /api/health
```

响应：
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 认证接口 (`/api/auth`)

#### 用户登录
```
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

响应：
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

#### 用户登出
```
POST /api/auth/logout
Authorization: Bearer <token>
```

### 用户接口 (`/api/user`)

所有接口需要认证。

#### 获取账户列表
```
GET /api/user/accounts
Authorization: Bearer <token>
```

响应：
```json
{
  "accounts": [
    {
      "id": 1,
      "accountName": "MySteamAccount",
      "username": "steamuser",
      "password": "password",
      "authCode": "A1B2C",
      "timeRemaining": 15
    }
  ]
}
```

#### 获取指定账户验证码
```
GET /api/user/accounts/:id/code
Authorization: Bearer <token>
```

响应：
```json
{
  "authCode": "A1B2C",
  "timeRemaining": 15
}
```

### 管理员接口 (`/api/admin`)

所有接口需要管理员权限。

#### 用户管理

**获取用户列表**
```
GET /api/admin/users
Authorization: Bearer <admin_token>
```

**创建用户**
```
POST /api/admin/users
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "username": "newuser",
  "password": "password123",
  "role": "user"
}
```

**更新用户**
```
PUT /api/admin/users/:id
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "username": "newusername",
  "password": "newpassword",
  "role": "admin",
  "is_active": true
}
```

**删除用户**
```
DELETE /api/admin/users/:id
Authorization: Bearer <admin_token>
```

#### Steam 账户管理

**获取账户列表**
```
GET /api/admin/steam-accounts
Authorization: Bearer <admin_token>
```

**导入 Steam 账户（上传 SDA 文件）**
```
POST /api/admin/steam-accounts
Content-Type: multipart/form-data
Authorization: Bearer <admin_token>

Form Data:
- sdaFile: <file> (.mafile)
- username: (可选)
- password: (可选)
- accountName: (可选)
```

**更新账户**
```
PUT /api/admin/steam-accounts/:id
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "accountName": "NewAccountName",
  "username": "newusername",
  "password": "newpassword",
  "is_active": true
}
```

**删除账户**
```
DELETE /api/admin/steam-accounts/:id
Authorization: Bearer <admin_token>
```

#### 权限管理

**获取权限列表**
```
GET /api/admin/permissions
Authorization: Bearer <admin_token>
```

**分配权限**
```
POST /api/admin/permissions
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "userId": 2,
  "steamAccountId": 1
}
```

**撤销权限**
```
DELETE /api/admin/permissions/:id
Authorization: Bearer <admin_token>
```

#### 日志查看

**获取登录日志**
```
GET /api/admin/logs?limit=100&userId=1
Authorization: Bearer <admin_token>
```

查询参数：
- `limit`: 返回记录数（默认 100）
- `userId`: 过滤指定用户（可选）

## 🗄️ 数据库结构

### users 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| username | TEXT | 用户名（唯一） |
| password_hash | TEXT | 密码哈希 |
| role | TEXT | 角色（user/admin） |
| created_at | DATETIME | 创建时间 |
| last_login | DATETIME | 最后登录时间 |
| last_ip | TEXT | 最后登录 IP |
| is_active | INTEGER | 是否激活（1/0） |

### steam_accounts 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| account_name | TEXT | 账户显示名称 |
| username | TEXT | Steam 用户名 |
| password | TEXT | Steam 密码 |
| shared_secret | TEXT | 共享密钥（用于生成 TOTP） |
| identity_secret | TEXT | 身份密钥 |
| revocation_code | TEXT | 撤销代码 |
| sda_data | TEXT | 完整 SDA 数据（JSON） |
| created_by | INTEGER | 创建者用户 ID |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |
| is_active | INTEGER | 是否激活（1/0） |

### user_permissions 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| user_id | INTEGER | 用户 ID |
| steam_account_id | INTEGER | Steam 账户 ID |
| granted_by | INTEGER | 授权者用户 ID |
| granted_at | DATETIME | 授权时间 |

### login_logs 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| user_id | INTEGER | 用户 ID |
| username | TEXT | 用户名 |
| ip_address | TEXT | IP 地址 |
| user_agent | TEXT | 用户代理 |
| login_time | DATETIME | 登录时间 |
| success | INTEGER | 是否成功（1/0） |

## 🔒 安全说明

### 已实现的安全措施

1. **密码加密**: 使用 bcrypt 进行密码哈希存储
2. **JWT 认证**: 使用 JWT Token 进行身份验证
3. **限流保护**: 
   - 通用 API 限流：15 分钟内最多 100 次请求
   - 登录接口限流：15 分钟内最多 5 次尝试
4. **权限控制**: 基于角色的访问控制（RBAC）
5. **SQL 注入防护**: 使用参数化查询
6. **文件上传限制**: 仅允许 .mafile 文件上传

### 安全建议

⚠️ **生产环境部署前请务必：**

1. **修改默认密码**: 初始化后立即修改默认管理员和用户密码
2. **设置强 JWT_SECRET**: 使用足够长且随机的密钥
3. **启用 HTTPS**: 使用 SSL/TLS 加密传输
4. **配置防火墙**: 限制不必要的端口访问
5. **定期备份数据库**: 数据库文件位于 `./data/database.sqlite`
6. **监控日志**: 定期检查登录日志，发现异常行为
7. **更新依赖**: 定期更新 npm 包以修复安全漏洞
8. **环境变量保护**: 不要将 `.env` 文件提交到版本控制系统

### 数据安全

- Steam 账户的敏感信息（密码、密钥）以明文形式存储在数据库中
- 建议在生产环境中对敏感字段进行加密存储
- 定期备份数据库文件

## 💻 开发指南

### 开发模式

使用 nodemon 自动重启：
```bash
npm run dev
```

### 代码规范

- 使用 ES6+ 语法
- 异步操作使用 async/await 或 Promise
- 错误处理使用 try-catch 或回调函数错误参数

### 添加新功能

1. **添加新路由**: 在 `src/routes/` 目录下创建或修改路由文件
2. **添加中间件**: 在 `src/middleware/` 目录下创建中间件
3. **添加工具函数**: 在 `src/utils/` 目录下创建工具文件
4. **数据库迁移**: 修改 `src/config/database.js` 中的表结构

### 测试

目前项目未包含测试套件，建议添加：
- Jest 或 Mocha 用于单元测试
- Supertest 用于 API 集成测试

## 📝 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📧 联系方式

如有问题或建议，请提交 Issue。

---

**注意**: 此项目仅用于学习和研究目的。使用 Steam 认证器相关功能时，请遵守 Steam 的服务条款。
