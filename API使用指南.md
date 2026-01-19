# Steam取号器 - API 使用指南

## 📋 目录

- [认证方式](#认证方式)
- [API 端点](#api-端点)
- [请求示例](#请求示例)
- [错误处理](#错误处理)

---

## 🔐 认证方式

系统提供两种认证方式：

### 1. JWT Token 认证（用户和管理员）

用于普通用户和管理员的 API 请求。

**获取 Token**：
```bash
POST /api/auth/login
```

**使用 Token**：
在请求头中添加：
```
Authorization: Bearer <your_token>
```

### 2. API Key 认证（外部 API）

用于外部系统集成的 API 请求。

**获取 API Key**：
在管理员控制台的"API Key 管理"页面创建。

**使用 API Key**：
在请求头中添加：
```
X-API-Key: sk_your_api_key_here
```

或通过查询参数：
```
?api_key=sk_your_api_key_here
```

---

## 📡 API 端点

### 基础 URL

- **开发环境**: `http://localhost:3000`
- **生产环境**: `https://your-domain.com`

### 1. 认证接口（无需认证）

#### 1.1 用户登录
```http
POST /api/auth/login
Content-Type: application/json
```

**请求体**：
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**响应**：
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

#### 1.2 用户登出
```http
POST /api/auth/logout
Authorization: Bearer <token>
```

**响应**：
```json
{
  "message": "Logged out successfully"
}
```

#### 1.3 健康检查
```http
GET /api/health
```

**响应**：
```json
{
  "status": "ok",
  "timestamp": "2024-01-19T12:00:00.000Z"
}
```

---

### 2. 用户接口（需要 JWT Token）

所有用户接口都需要在请求头中添加 `Authorization: Bearer <token>`

#### 2.1 获取账户列表
```http
GET /api/user/accounts
Authorization: Bearer <token>
```

**响应**：
```json
{
  "accounts": [
    {
      "id": 1,
      "accountName": "账户1",
      "username": "steam_user",
      "password": "password123",
      "authCode": "PMVYX",
      "timeRemaining": 25
    }
  ]
}
```

#### 2.2 获取验证码
```http
GET /api/user/accounts/:id/code
Authorization: Bearer <token>
```

**响应**：
```json
{
  "authCode": "PMVYX",
  "timeRemaining": 25
}
```

---

### 3. 管理员接口（需要 Admin 权限）

所有管理员接口都需要：
- JWT Token 认证
- Admin 角色权限

#### 3.1 用户管理

**获取用户列表**：
```http
GET /api/admin/users
Authorization: Bearer <admin_token>
```

**创建用户**：
```http
POST /api/admin/users
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**请求体**：
```json
{
  "username": "newuser",
  "password": "password123",
  "role": "user"
}
```

**更新用户**：
```http
PUT /api/admin/users/:id
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**请求体**（可选字段）：
```json
{
  "username": "newusername",
  "password": "newpassword",
  "role": "admin",
  "is_active": true
}
```

**删除用户**：
```http
DELETE /api/admin/users/:id
Authorization: Bearer <admin_token>
```

#### 3.2 Steam 账户管理

**获取账户列表**：
```http
GET /api/admin/steam-accounts
Authorization: Bearer <admin_token>
```

**添加账户**（需要上传 .mafile 文件）：
```http
POST /api/admin/steam-accounts
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data
```

**表单数据**：
- `sdaFile`: .mafile 文件
- `username`: Steam 用户名
- `password`: Steam 密码
- `accountName`: 账户名称（可选）

**更新账户**：
```http
PUT /api/admin/steam-accounts/:id
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**请求体**（可选字段）：
```json
{
  "accountName": "新名称",
  "username": "new_username",
  "password": "new_password",
  "is_active": true
}
```

**删除账户**：
```http
DELETE /api/admin/steam-accounts/:id
Authorization: Bearer <admin_token>
```

#### 3.3 权限管理

**获取权限列表**：
```http
GET /api/admin/permissions
Authorization: Bearer <admin_token>
```

**授予权限**：
```http
POST /api/admin/permissions
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**请求体**：
```json
{
  "userId": 2,
  "steamAccountId": 1
}
```

**撤销权限**：
```http
DELETE /api/admin/permissions/:id
Authorization: Bearer <admin_token>
```

#### 3.4 登录日志

**获取日志**：
```http
GET /api/admin/logs?limit=100&userId=1
Authorization: Bearer <admin_token>
```

**查询参数**：
- `limit`: 返回数量（默认 100）
- `userId`: 用户 ID（可选，筛选特定用户）

#### 3.5 API Key 管理

**获取 API Key 列表**：
```http
GET /api/admin/api-keys
Authorization: Bearer <admin_token>
```

**创建 API Key**：
```http
POST /api/admin/api-keys
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**请求体**：
```json
{
  "name": "我的API Key"
}
```

**响应**：
```json
{
  "message": "API key created successfully",
  "api_key": "sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "id": 1
}
```

**⚠️ 注意**：API Key 创建后只会显示一次，请立即保存！

**更新 API Key**：
```http
PUT /api/admin/api-keys/:id
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**请求体**：
```json
{
  "name": "新名称",
  "is_active": true
}
```

**删除 API Key**：
```http
DELETE /api/admin/api-keys/:id
Authorization: Bearer <admin_token>
```

---

### 4. 外部 API（需要 API Key）

所有外部 API 都需要在请求头中添加 `X-API-Key: <api_key>`

#### 4.1 快捷授权用户使用 Steam 账户
```http
POST /api/external/authorize-user
X-API-Key: sk_your_api_key_here
Content-Type: application/json
```

**请求体**：
```json
{
  "username": "user123",
  "steam_account_id": 1
}
```

**响应**：
```json
{
  "success": true,
  "message": "User authorized successfully",
  "permission_id": 123
}
```

#### 4.2 快捷创建账户
```http
POST /api/external/create-account
X-API-Key: sk_your_api_key_here
Content-Type: application/json
```

**请求体**：
```json
{
  "username": "newuser",
  "password": "plaintext_password",
  "role": "user"
}
```

**响应**：
```json
{
  "success": true,
  "message": "Account created successfully",
  "user_id": 456,
  "username": "newuser"
}
```

---

## 💻 请求示例

### cURL 示例

#### 1. 登录获取 Token
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

#### 2. 获取账户列表（使用 Token）
```bash
curl -X GET http://localhost:3000/api/user/accounts \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### 3. 创建用户（管理员）
```bash
curl -X POST http://localhost:3000/api/admin/users \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser",
    "password": "password123",
    "role": "user"
  }'
```

#### 4. 外部 API - 授权用户
```bash
curl -X POST http://localhost:3000/api/external/authorize-user \
  -H "X-API-Key: sk_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "user123",
    "steam_account_id": 1
  }'
```

---

### JavaScript (Fetch) 示例

#### 1. 登录
```javascript
async function login(username, password) {
  const response = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username, password })
  });
  
  const data = await response.json();
  if (response.ok) {
    localStorage.setItem('token', data.token);
    return data;
  } else {
    throw new Error(data.error);
  }
}

// 使用
login('admin', 'admin123')
  .then(data => console.log('登录成功:', data))
  .catch(error => console.error('登录失败:', error));
```

#### 2. 获取账户列表
```javascript
async function getAccounts() {
  const token = localStorage.getItem('token');
  const response = await fetch('http://localhost:3000/api/user/accounts', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const data = await response.json();
  return data.accounts;
}

// 使用
getAccounts()
  .then(accounts => console.log('账户列表:', accounts))
  .catch(error => console.error('获取失败:', error));
```

#### 3. 创建用户（管理员）
```javascript
async function createUser(username, password, role = 'user') {
  const token = localStorage.getItem('token');
  const response = await fetch('http://localhost:3000/api/admin/users', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username, password, role })
  });
  
  return await response.json();
}
```

#### 4. 外部 API - 授权用户
```javascript
async function authorizeUser(username, steamAccountId, apiKey) {
  const response = await fetch('http://localhost:3000/api/external/authorize-user', {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      username: username,
      steam_account_id: steamAccountId
    })
  });
  
  return await response.json();
}
```

---

### Python 示例

#### 1. 登录
```python
import requests

def login(username, password):
    url = 'http://localhost:3000/api/auth/login'
    data = {'username': username, 'password': password}
    response = requests.post(url, json=data)
    return response.json()

# 使用
result = login('admin', 'admin123')
token = result['token']
print(f'Token: {token}')
```

#### 2. 获取账户列表
```python
def get_accounts(token):
    url = 'http://localhost:3000/api/user/accounts'
    headers = {'Authorization': f'Bearer {token}'}
    response = requests.get(url, headers=headers)
    return response.json()

# 使用
accounts = get_accounts(token)
print(accounts)
```

#### 3. 创建用户（管理员）
```python
def create_user(token, username, password, role='user'):
    url = 'http://localhost:3000/api/admin/users'
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    data = {
        'username': username,
        'password': password,
        'role': role
    }
    response = requests.post(url, json=data, headers=headers)
    return response.json()
```

#### 4. 外部 API - 授权用户
```python
def authorize_user(api_key, username, steam_account_id):
    url = 'http://localhost:3000/api/external/authorize-user'
    headers = {
        'X-API-Key': api_key,
        'Content-Type': 'application/json'
    }
    data = {
        'username': username,
        'steam_account_id': steam_account_id
    }
    response = requests.post(url, json=data, headers=headers)
    return response.json()
```

---

## ⚠️ 错误处理

### HTTP 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未认证（Token 无效或缺失） |
| 403 | 无权限（需要 Admin 权限） |
| 404 | 资源不存在 |
| 429 | 请求过于频繁（限流） |
| 500 | 服务器内部错误 |

### 错误响应格式

```json
{
  "error": "错误信息描述"
}
```

### 常见错误

#### 1. 未认证
```json
{
  "error": "Access token required"
}
```
**解决方法**：检查是否添加了 `Authorization` 头

#### 2. Token 过期
```json
{
  "error": "Invalid or expired token"
}
```
**解决方法**：重新登录获取新 Token

#### 3. 无权限
```json
{
  "error": "Admin access required"
}
```
**解决方法**：使用管理员账户登录

#### 4. 请求过于频繁
```json
{
  "error": "Too many requests from this IP"
}
```
**解决方法**：等待 15 分钟后重试

---

## 📝 注意事项

1. **Token 有效期**：JWT Token 默认 24 小时过期
2. **API 限流**：
   - API 请求：100次/15分钟
   - 登录请求：20次/15分钟
3. **HTTPS**：生产环境必须使用 HTTPS
4. **API Key 安全**：
   - 不要在客户端代码中暴露 API Key
   - API Key 创建后只会显示一次
   - 定期轮换 API Key
5. **密码传输**：
   - 登录接口：密码明文传输（HTTPS 加密）
   - 外部 API：密码明文传输（建议应用层加密）

---

## 🔗 相关文档

- `API_DOCUMENTATION.md` - 外部 API 详细文档
- `安全评估报告.md` - 安全配置说明

---

**API 基础 URL**：
- 开发：`http://localhost:3000`
- 生产：`https://your-domain.com`

**所有 API 请求都需要添加相应的认证头！**

