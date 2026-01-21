const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

// 检查必要的环境变量
if (!process.env.JWT_SECRET) {
  console.error('错误: JWT_SECRET 环境变量未设置！');
  console.error('请在 backend/.env 文件中设置 JWT_SECRET');
  process.exit(1);
}

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');
const externalRoutes = require('./routes/external');
const tempUsersRoutes = require('./routes/tempUsers');
const healthRoutes = require('./routes/health');

const app = express();
const PORT = process.env.PORT || 3000;

if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', true);
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 只对登录接口进行严格限制
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    trustProxy: process.env.TRUST_PROXY === 'true'
  }
});

app.use('/api/auth/login', authLimiter);

// 对外部API进行限制
const externalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP',
  validate: {
    trustProxy: process.env.TRUST_PROXY === 'true'
  }
});

app.use('/api/external', externalLimiter);

app.use('/', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin/temp-users', tempUsersRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/external', externalRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Server accessible at http://0.0.0.0:${PORT}`);
});
