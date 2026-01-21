# Steam托管服务集成指南

## 架构说明

Steam托管服务是一个独立的微服务，专门用于管理Steam账户的Session和状态信息。

```
┌─────────────────┐
│   主系统 (3010)  │
│  - 用户管理      │
│  - 账户管理      │
│  - 权限控制      │
└────────┬────────┘
         │ HTTP API
         ↓
┌─────────────────┐
│ Steam服务(3020) │
│  - Session托管  │
│  - 余额查询      │
│  - 状态检测      │
└────────┬────────┘
         │ Steam API
         ↓
┌─────────────────┐
│  Steam服务器     │
└─────────────────┘
```

## 集成步骤

### 1. 安装依赖

```bash
cd steam-service
npm install
```

### 2. 配置环境变量

创建 `.env` 文件：

```bash
PORT=3020
API_SECRET=your-secure-random-string-here
ALLOWED_ORIGINS=http://localhost:3010,http://localhost:8081
```

### 3. 启动服务

```bash
# 开发环境
npm start

# 或使用Docker
docker-compose up -d steam-service
```

### 4. 在主系统中集成

#### 4.1 创建Steam服务客户端

在主系统中创建 `backend/src/utils/steamServiceClient.js`：

```javascript
const axios = require('axios');

const steamService = axios.create({
  baseURL: process.env.STEAM_SERVICE_URL || 'http://localhost:3020',
  headers: {
    'X-API-Key': process.env.STEAM_SERVICE_API_KEY
  },
  timeout: 30000
});

// 保存Session
async function saveSession(accountId, sessionData) {
  const response = await steamService.post('/api/session/save', {
    accountId,
    sessionData
  });
  return response.data;
}

// 获取Session
async function getSession(accountId) {
  const response = await steamService.get(`/api/session/${accountId}`);
  return response.data;
}

// 检查Session状态
async function checkSessionStatus(accountId) {
  const response = await steamService.get(`/api/session/${accountId}/status`);
  return response.data;
}

// 查询余额
async function getBalance(accountId) {
  const response = await steamService.get(`/api/balance/${accountId}`);
  return response.data;
}

// 批量查询余额
async function getBatchBalance(accountIds) {
  const response = await steamService.post('/api/balance/batch', {
    accountIds
  });
  return response.data;
}

// 获取确认列表
async function getConfirmations(accountId, identitySecret, deviceId) {
  const response = await steamService.get(`/api/confirmation/${accountId}`, {
    params: { identitySecret, deviceId }
  });
  return response.data;
}

module.exports = {
  saveSession,
  getSession,
  checkSessionStatus,
  getBalance,
  getBatchBalance,
  getConfirmations
};
```

#### 4.2 修改Session更新API

修改 `backend/src/routes/admin.js` 中的Session更新端点：

```javascript
const steamServiceClient = require('../utils/steamServiceClient');

router.post('/steam-accounts/:id/session', async (req, res) => {
  const { id } = req.params;
  const { sessionData, cookieString } = req.body;
  
  try {
    let session;
    
    if (cookieString) {
      session = parseSessionFromCookie(cookieString);
    } else if (sessionData) {
      session = sessionData;
    } else {
      return res.status(400).json({ error: 'Session data required' });
    }
    
    // 保存到Steam托管服务
    await steamServiceClient.saveSession(id, session);
    
    // 同时更新主数据库（可选）
    await updateAccountSession(db, id, session);
    
    res.json({ 
      message: 'Session updated successfully',
      accountId: id
    });
  } catch (error) {
    console.error('Failed to update session:', error);
    res.status(500).json({ error: 'Failed to update session' });
  }
});
```

#### 4.3 添加余额查询API

在 `backend/src/routes/user.js` 中添加：

```javascript
const steamServiceClient = require('../utils/steamServiceClient');

// 查询单个账户余额
router.get('/accounts/:id/balance', async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  
  // 验证权限
  const hasPermission = await checkUserPermission(userId, id);
  if (!hasPermission) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  try {
    const balance = await steamServiceClient.getBalance(id);
    res.json(balance);
  } catch (error) {
    console.error('Failed to get balance:', error);
    res.status(500).json({ error: 'Failed to get balance' });
  }
});

// 批量查询余额
router.post('/accounts/balance/batch', async (req, res) => {
  const userId = req.user.id;
  
  // 获取用户有权限的账户列表
  const accountIds = await getUserAccountIds(userId);
  
  try {
    const balances = await steamServiceClient.getBatchBalance(accountIds);
    res.json(balances);
  } catch (error) {
    console.error('Failed to get balances:', error);
    res.status(500).json({ error: 'Failed to get balances' });
  }
});
```

#### 4.4 前端集成

在 `frontend/src/views/UserDashboard.vue` 中添加余额显示：

```vue
<template>
  <div class="account-card">
    <!-- 现有内容 -->
    
    <!-- 添加余额显示 -->
    <div class="balance-section" v-if="account.balance">
      <el-divider />
      <div class="info-item">
        <label>💰 Steam钱包：</label>
        <div class="balance-display">
          <span class="balance-amount">{{ account.balance.formatted }}</span>
          <el-button
            size="small"
            :icon="Refresh"
            @click="refreshBalance(account.id)"
            :loading="refreshingBalance[account.id]"
          >
            刷新
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import axios from '@/utils/axios'

const refreshingBalance = reactive({})

const refreshBalance = async (accountId) => {
  refreshingBalance[accountId] = true
  try {
    const response = await axios.get(`/api/user/accounts/${accountId}/balance`)
    const account = accounts.value.find(a => a.id === accountId)
    if (account) {
      account.balance = response.data
    }
    ElMessage.success('余额已更新')
  } catch (error) {
    console.error('Failed to refresh balance:', error)
    ElMessage.error('刷新余额失败')
  } finally {
    refreshingBalance[accountId] = false
  }
}

// 在fetchAccounts中同时获取余额
const fetchAccounts = async () => {
  // ... 现有代码
  
  // 批量获取余额
  try {
    const accountIds = accounts.value.map(a => a.id)
    const balanceResponse = await axios.post('/api/user/accounts/balance/batch', {
      accountIds
    })
    
    // 更新账户余额
    balanceResponse.data.results.forEach(result => {
      if (result.success) {
        const account = accounts.value.find(a => a.id === result.accountId)
        if (account) {
          account.balance = result
        }
      }
    })
  } catch (error) {
    console.error('Failed to fetch balances:', error)
  }
}
</script>
```

## 环境变量配置

### 主系统 (.env)

```bash
# Steam托管服务配置
STEAM_SERVICE_URL=http://localhost:3020
STEAM_SERVICE_API_KEY=your-api-secret-here
```

### Docker Compose

```yaml
services:
  backend:
    environment:
      - STEAM_SERVICE_URL=http://steam-service:3020
      - STEAM_SERVICE_API_KEY=${STEAM_SERVICE_API_SECRET}
```

## API端点总览

### Session管理

| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/api/session/save` | 保存Session |
| GET | `/api/session/:accountId` | 获取Session |
| GET | `/api/session/:accountId/status` | 检查状态 |
| DELETE | `/api/session/:accountId` | 删除Session |
| GET | `/api/session` | 获取所有Session |

### 余额查询

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/balance/:accountId` | 查询单个余额 |
| POST | `/api/balance/batch` | 批量查询余额 |

### 确认管理

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/confirmation/:accountId` | 获取确认列表 |

## 使用示例

### 1. 更新Session

```javascript
// 用户在浏览器中复制Cookie后
const cookieString = "sessionid=xxx; steamLoginSecure=xxx";

await axios.post('/api/admin/steam-accounts/1/session', {
  cookieString
});
```

### 2. 查询余额

```javascript
// 查询单个账户
const balance = await axios.get('/api/user/accounts/1/balance');
console.log(balance.data.formatted); // "$10.50"

// 批量查询
const balances = await axios.post('/api/user/accounts/balance/batch', {
  accountIds: ['1', '2', '3']
});
```

### 3. 检查Session状态

```javascript
const status = await axios.get('/api/user/accounts/1/session/status');
if (!status.data.valid) {
  // 提示用户更新Session
  ElMessage.warning('Session已过期，请更新');
}
```

## 监控和维护

### 健康检查

```bash
curl http://localhost:3020/health
```

### 查看所有Session

```bash
curl -H "X-API-Key: your-secret" http://localhost:3020/api/session
```

### 日志监控

```bash
# Docker
docker logs -f steam-service

# 本地
tail -f steam-service/logs/app.log
```

## 故障排除

### 问题：无法连接Steam服务

**解决方案：**
1. 检查服务是否启动：`docker ps | grep steam-service`
2. 检查端口是否开放：`netstat -an | grep 3020`
3. 检查防火墙设置

### 问题：API密钥验证失败

**解决方案：**
1. 确认环境变量设置正确
2. 检查主系统和Steam服务的API_SECRET是否一致
3. 查看请求Header是否包含 `X-API-Key`

### 问题：余额查询失败

**解决方案：**
1. 检查Session是否有效
2. 确认Steam社区是否可访问
3. 查看Steam服务日志

## 性能优化

### 1. 缓存余额数据

```javascript
// 在主系统中缓存余额，避免频繁请求
const balanceCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5分钟

async function getCachedBalance(accountId) {
  const cached = balanceCache.get(accountId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const balance = await steamServiceClient.getBalance(accountId);
  balanceCache.set(accountId, {
    data: balance,
    timestamp: Date.now()
  });
  
  return balance;
}
```

### 2. 批量请求

尽量使用批量API而不是循环调用单个API。

### 3. 异步处理

对于非关键操作，使用异步队列处理。

## 安全建议

1. **API密钥** - 使用强随机字符串，定期更换
2. **网络隔离** - 只允许主系统访问Steam服务
3. **数据加密** - 敏感数据加密存储
4. **访问日志** - 记录所有API调用
5. **限流保护** - 防止滥用

## 扩展功能

未来可以添加：
- 📈 余额变动历史记录
- 🔔 余额变动通知
- 📊 账户活跃度统计
- 🎮 游戏库信息查询
- 👥 好友列表管理
- 💬 聊天消息代理

## 总结

Steam托管服务提供了：
- ✅ 独立的Session管理
- ✅ 实时余额查询
- ✅ 状态检测
- ✅ 易于集成
- ✅ 可扩展架构

通过这个服务，主系统可以专注于用户和权限管理，而Steam相关的复杂操作由专门的服务处理。
