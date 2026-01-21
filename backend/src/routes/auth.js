const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { getClientIp } = require('../middleware/auth');

const router = express.Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const clientIp = getClientIp(req);
  const userAgent = req.headers['user-agent'];

  console.log(`[LOGIN] 尝试登录 - 用户名: ${username}, IP: ${clientIp}`);

  if (!username || !password) {
    console.log(`[LOGIN] 缺少用户名或密码`);
    return res.status(400).json({ error: 'Username and password required' });
  }

  db.get('SELECT * FROM users WHERE username = ? AND is_active = 1', [username], async (err, user) => {
    if (err) {
      console.error('[LOGIN] 数据库错误:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    const logLogin = (userId, success) => {
      db.run(
        'INSERT INTO login_logs (user_id, username, ip_address, user_agent, success) VALUES (?, ?, ?, ?, ?)',
        [userId, username, clientIp, userAgent, success ? 1 : 0]
      );
    };

    if (!user) {
      console.log(`[LOGIN] 用户不存在或已被禁用: ${username}`);
      logLogin(null, false);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log(`[LOGIN] 找到用户: ${user.username}, 角色: ${user.role}`);
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      console.log(`[LOGIN] 密码验证失败: ${username}`);
      logLogin(user.id, false);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log(`[LOGIN] 登录成功: ${username}`);

    db.run(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP, last_ip = ? WHERE id = ?',
      [clientIp, user.id]
    );

    logLogin(user.id, true);

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not set');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  });
});

router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

// 公共设置接口（不需要认证）
router.get('/settings', (req, res) => {
  const db = require('../config/database');
  db.all('SELECT setting_key, setting_value FROM system_settings', [], (err, settings) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    
    const settingsObj = {};
    settings.forEach(s => {
      settingsObj[s.setting_key] = s.setting_value;
    });
    
    res.json({ settings: settingsObj });
  });
});

module.exports = router;
