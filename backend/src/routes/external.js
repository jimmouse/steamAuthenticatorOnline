const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { authenticateApiKey } = require('../middleware/auth');

const router = express.Router();

// 所有外部 API 都需要 API Key 验证
router.use(authenticateApiKey);

// 快捷授权用户使用 Steam 账户
router.post('/authorize-user', (req, res) => {
  const { username, steam_account_id } = req.body;

  if (!username || !steam_account_id) {
    return res.status(400).json({ error: 'Username and steam_account_id required' });
  }

  // 查找用户
  db.get('SELECT id FROM users WHERE username = ?', [username], (err, user) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 检查 Steam 账户是否存在
    db.get('SELECT id FROM steam_accounts WHERE id = ? AND is_active = 1', [steam_account_id], (err, account) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      if (!account) {
        return res.status(404).json({ error: 'Steam account not found' });
      }

      // 检查权限是否已存在
      db.get(
        'SELECT id FROM user_permissions WHERE user_id = ? AND steam_account_id = ?',
        [user.id, steam_account_id],
        (err, existing) => {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Internal server error' });
          }

          if (existing) {
            return res.status(400).json({ error: 'Permission already exists' });
          }

          // 创建权限
          db.run(
            'INSERT INTO user_permissions (user_id, steam_account_id, granted_by) VALUES (?, ?, ?)',
            [user.id, steam_account_id, req.apiKey.created_by || null],
            function(err) {
              if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Internal server error' });
              }

              res.json({
                success: true,
                message: 'User authorized successfully',
                permission_id: this.lastID
              });
            }
          );
        }
      );
    });
  });
});

// 快捷创建账户（用户名+密码明文传输）
router.post('/create-account', async (req, res) => {
  const { username, password, role } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  if (role && !['user', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  // 检查用户名是否已存在
  db.get('SELECT id FROM users WHERE username = ?', [username], async (err, existing) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    if (existing) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // 加密密码
    const passwordHash = await bcrypt.hash(password, 10);

    // 创建用户
    db.run(
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
      [username, passwordHash, role || 'user'],
      function(err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Internal server error' });
        }

        res.json({
          success: true,
          message: 'Account created successfully',
          user_id: this.lastID,
          username: username
        });
      }
    );
  });
});

module.exports = router;

