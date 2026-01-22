const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { getClientIp } = require('../middleware/auth');
const crypto = require('crypto');

const router = express.Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  // 获取真实IP
  const forwarded = req.headers['x-forwarded-for'];
  const realIp = req.headers['x-real-ip'];
  let clientIp = req.ip || req.connection?.remoteAddress;
  
  // 优先使用x-forwarded-for
  if (forwarded) {
    clientIp = forwarded.split(',')[0].trim();
  } else if (realIp) {
    clientIp = realIp;
  }
  
  // 移除IPv6前缀
  if (clientIp && clientIp.startsWith('::ffff:')) {
    clientIp = clientIp.substring(7);
  }
  
  // 只将Docker网关IP标记为本地访问（172.17-32段是Docker默认网段）
  if (clientIp && /^172\.(1[7-9]|2[0-9]|3[0-2])\./.test(clientIp)) {
    clientIp = '127.0.0.1 (本地访问)';
  }

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

// 授权码登录
router.post('/login-with-code', async (req, res) => {
  const { accessCode } = req.body;
  const clientIp = getClientIp(req);

  console.log(`[ACCESS_CODE_LOGIN] 尝试使用授权码登录, IP: ${clientIp}`);

  if (!accessCode) {
    return res.status(400).json({ error: 'Access code required' });
  }

  db.get(
    `SELECT tu.*, sa.id as steam_account_id, sa.account_name, sa.username as steam_username
     FROM temp_users tu
     INNER JOIN steam_accounts sa ON tu.steam_account_id = sa.id
     WHERE tu.access_code = ? AND tu.is_active = 1`,
    [accessCode],
    async (err, tempUser) => {
      if (err) {
        console.error('[ACCESS_CODE_LOGIN] 数据库错误:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      if (!tempUser) {
        console.log(`[ACCESS_CODE_LOGIN] 无效的授权码`);
        return res.status(401).json({ error: 'Invalid access code' });
      }

      // 检查是否过期
      if (tempUser.expires_at && new Date(tempUser.expires_at) < new Date()) {
        console.log(`[ACCESS_CODE_LOGIN] 授权码已过期`);
        return res.status(401).json({ error: '授权码已过期，请联系管理员' });
      }

      // 检查使用次数
      if (tempUser.max_uses && tempUser.current_uses >= tempUser.max_uses) {
        console.log(`[ACCESS_CODE_LOGIN] 授权码使用次数已达上限`);
        return res.status(401).json({ error: '授权码使用次数已达上限，请联系管理员' });
      }

      console.log(`[ACCESS_CODE_LOGIN] 授权码验证成功，账户: ${tempUser.account_name}`);

      // 更新使用次数和最后使用时间
      db.run(
        'UPDATE temp_users SET current_uses = current_uses + 1, last_used_at = CURRENT_TIMESTAMP WHERE id = ?',
        [tempUser.id]
      );

      if (!process.env.JWT_SECRET) {
        console.error('JWT_SECRET is not set');
        return res.status(500).json({ error: 'Server configuration error' });
      }

      // 生成临时用户token
      const token = jwt.sign(
        { 
          id: tempUser.steam_account_id,  
          username: `临时用户_${tempUser.access_code.substring(0, 8)}`,
          role: 'temp_user',
          steamAccountId: tempUser.steam_account_id,
          tempUserId: tempUser.id
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        token,
        user: {
          id: `temp_${tempUser.id}`,
          username: `临时用户_${tempUser.access_code.substring(0, 8)}`,
          role: 'temp_user',
          steamAccountId: tempUser.steam_account_id,
          accountName: tempUser.account_name
        }
      });
    }
  );
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
