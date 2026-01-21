const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const sessionRoutes = require('./routes/session');
const balanceRoutes = require('./routes/balance');
const confirmationRoutes = require('./routes/confirmation');

const app = express();
const PORT = process.env.PORT || 3020;

// CORS配置
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3010'];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));

app.use(express.json());

// API密钥验证中间件
const apiKeyAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.API_SECRET) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  next();
};

// 限流
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100 // 限制100个请求
});

app.use(limiter);
app.use(apiKeyAuth);

// 路由
app.use('/api/auth', authRoutes);
app.use('/api/session', sessionRoutes);
app.use('/api/balance', balanceRoutes);
app.use('/api/confirmation', confirmationRoutes);

// 健康检查
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'steam-auth-service',
    timestamp: new Date().toISOString() 
  });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Steam Service running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
