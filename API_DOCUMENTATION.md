# 外部 API 文档

## 概述

外部 API 允许通过 API Key 进行快捷操作，包括：
- 快捷授权用户使用 Steam 账户
- 快捷创建用户账户

## 认证方式

所有外部 API 请求都需要在请求头中包含 API Key：

```
X-API-Key: sk_your_api_key_here
```

或者通过查询参数：

```
?api_key=sk_your_api_key_here
```

## API 端点

### 1. 快捷授权用户使用 Steam 账户

**端点**: `POST /api/external/authorize-user`

**请求头**:
```
X-API-Key: sk_your_api_key_here
Content-Type: application/json
```

**请求体**:
```json
{
  "username": "user123",
  "steam_account_id": 1
}
```

**参数说明**:
- `username` (必需): 要授权的用户名
- `steam_account_id` (必需): Steam 账户 ID

**响应示例**:
```json
{
  "success": true,
  "message": "User authorized successfully",
  "permission_id": 123
}
```

**错误响应**:
```json
{
  "error": "User not found"
}
```

### 2. 快捷创建账户

**端点**: `POST /api/external/create-account`

**请求头**:
```
X-API-Key: sk_your_api_key_here
Content-Type: application/json
```

**请求体**:
```json
{
  "username": "newuser",
  "password": "plaintext_password",
  "role": "user"
}
```

**参数说明**:
- `username` (必需): 用户名
- `password` (必需): 密码（明文传输）
- `role` (可选): 角色，可选值：`user` 或 `admin`，默认为 `user`

**响应示例**:
```json
{
  "success": true,
  "message": "Account created successfully",
  "user_id": 456,
  "username": "newuser"
}
```

**错误响应**:
```json
{
  "error": "Username already exists"
}
```

## 使用示例

### cURL 示例

#### 授权用户
```bash
curl -X POST https://your-domain.com/api/external/authorize-user \
  -H "X-API-Key: sk_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "user123",
    "steam_account_id": 1
  }'
```

#### 创建账户
```bash
curl -X POST https://your-domain.com/api/external/create-account \
  -H "X-API-Key: sk_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser",
    "password": "password123",
    "role": "user"
  }'
```

### JavaScript 示例

```javascript
const API_KEY = 'sk_your_api_key_here';
const API_BASE_URL = 'https://your-domain.com/api/external';

// 授权用户
async function authorizeUser(username, steamAccountId) {
  const response = await fetch(`${API_BASE_URL}/authorize-user`, {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      username: username,
      steam_account_id: steamAccountId
    })
  });
  
  return await response.json();
}

// 创建账户
async function createAccount(username, password, role = 'user') {
  const response = await fetch(`${API_BASE_URL}/create-account`, {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      username: username,
      password: password,
      role: role
    })
  });
  
  return await response.json();
}

// 使用示例
authorizeUser('user123', 1)
  .then(result => console.log('授权成功:', result))
  .catch(error => console.error('授权失败:', error));

createAccount('newuser', 'password123')
  .then(result => console.log('创建成功:', result))
  .catch(error => console.error('创建失败:', error));
```

### Python 示例

```python
import requests

API_KEY = 'sk_your_api_key_here'
API_BASE_URL = 'https://your-domain.com/api/external'

headers = {
    'X-API-Key': API_KEY,
    'Content-Type': 'application/json'
}

# 授权用户
def authorize_user(username, steam_account_id):
    url = f'{API_BASE_URL}/authorize-user'
    data = {
        'username': username,
        'steam_account_id': steam_account_id
    }
    response = requests.post(url, json=data, headers=headers)
    return response.json()

# 创建账户
def create_account(username, password, role='user'):
    url = f'{API_BASE_URL}/create-account'
    data = {
        'username': username,
        'password': password,
        'role': role
    }
    response = requests.post(url, json=data, headers=headers)
    return response.json()

# 使用示例
result = authorize_user('user123', 1)
print('授权结果:', result)

result = create_account('newuser', 'password123')
print('创建结果:', result)
```

## 错误码

| HTTP 状态码 | 说明 |
|------------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | API Key 无效或缺失 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

## 安全注意事项

1. **API Key 安全**:
   - 不要在客户端代码中暴露 API Key
   - 定期轮换 API Key
   - 使用 HTTPS 传输

2. **密码安全**:
   - 虽然密码是明文传输，但建议在应用层进行加密
   - 不要在日志中记录密码

3. **权限控制**:
   - 每个 API Key 都有创建者记录
   - 可以通过管理员界面禁用 API Key

## API Key 管理

在管理员控制台的"API Key 管理"页面可以：
- 创建新的 API Key
- 查看所有 API Key
- 编辑 API Key 名称和状态
- 删除 API Key
- 查看 API Key 的最后使用时间

**注意**: API Key 创建后只会显示一次，请妥善保管！

