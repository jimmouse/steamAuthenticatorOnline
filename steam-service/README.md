# Steam Session托管服务

独立的Steam会话管理服务，专门用于托管Steam账户的Session并提供状态查询功能。

## 功能特性

- 🔐 **Session托管** - 安全存储和管理Steam会话
- 💰 **余额查询** - 实时查询Steam钱包余额
- 📊 **状态检测** - 检测账户登录状态
- 🔄 **自动刷新** - Session过期自动刷新
- 🛡️ **安全隔离** - 独立服务，与主系统隔离
- 📝 **详细日志** - 完整的操作日志记录

## 架构设计

```
主系统 (Port 3010)
    ↓ HTTP API调用
Steam托管服务 (Port 3020)
    ↓ Steam API
Steam服务器
```

## 快速开始

### 1. 安装依赖

```bash
cd steam-service
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件
```

### 3. 启动服务

```bash
npm start
```

## API文档

### 认证

所有API请求需要在Header中包含API密钥：

```
X-API-Key: your-api-secret
```

### 端点列表

#### 1. 健康检查

```http
GET /health
```

#### 2. 保存Session

```http
POST /api/session/save
Content-Type: application/json

{
  "accountId": "1",
  "sessionData": {
    "sessionid": "xxx",
    "steamLoginSecure": "xxx",
    "steamid": "76561198xxx"
  }
}
```

#### 3. 获取Session

```http
GET /api/session/:accountId
```

#### 4. 检查登录状态

```http
GET /api/session/:accountId/status
```

#### 5. 查询余额

```http
GET /api/balance/:accountId
```

#### 6. 批量查询余额

```http
POST /api/balance/batch
Content-Type: application/json

{
  "accountIds": ["1", "2", "3"]
}
```

## 使用示例

### 从主系统调用

```javascript
const axios = require('axios');

const steamService = axios.create({
  baseURL: 'http://localhost:3020',
  headers: {
    'X-API-Key': process.env.STEAM_SERVICE_API_KEY
  }
});

// 保存Session
await steamService.post('/api/session/save', {
  accountId: '1',
  sessionData: {
    sessionid: 'xxx',
    steamLoginSecure: 'xxx',
    steamid: '76561198xxx'
  }
});

// 查询余额
const balance = await steamService.get('/api/balance/1');
console.log(balance.data);
```

## 部署

### Docker部署

```bash
docker build -t steam-service .
docker run -d -p 3020:3020 --name steam-service steam-service
```

### Docker Compose

```yaml
services:
  steam-service:
    build: ./steam-service
    ports:
      - "3020:3020"
    environment:
      - API_SECRET=your-secret
    volumes:
      - ./steam-service/data:/app/data
```

## 安全建议

1. **API密钥** - 使用强随机字符串
2. **网络隔离** - 只允许主系统访问
3. **HTTPS** - 生产环境使用HTTPS
4. **定期备份** - 备份Session数据
5. **日志监控** - 监控异常访问

## 故障排除

### Session失效

- 自动检测并标记
- 需要重新获取Cookie更新

### 余额查询失败

- 检查Session是否有效
- 检查Steam API是否可用

## 许可证

MIT
