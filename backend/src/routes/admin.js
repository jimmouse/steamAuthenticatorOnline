const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { parseSdaFile, generateAuthCode, getTimeRemaining } = require('../utils/steamAuth');

const router = express.Router();

router.use(authenticateToken);
router.use(requireAdmin);

const uploadDir = process.env.UPLOAD_PATH || './data/uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'sda-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() === '.mafile') {
      cb(null, true);
    } else {
      cb(new Error('Only .mafile files are allowed'));
    }
  }
});

router.get('/users', (req, res) => {
  db.all(
    'SELECT id, username, role, created_at, last_login, last_ip, is_active FROM users ORDER BY created_at DESC',
    [],
    (err, users) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      res.json({ users });
    }
  );
});

router.post('/users', async (req, res) => {
  const { username, password, role } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  if (role && !['user', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  db.run(
    'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
    [username, passwordHash, role || 'user'],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Username already exists' });
        }
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      res.status(201).json({ 
        message: 'User created successfully',
        userId: this.lastID 
      });
    }
  );
});

router.put('/users/:id', async (req, res) => {
  const userId = req.params.id;
  const { username, password, role, is_active } = req.body;

  const updates = [];
  const params = [];

  if (username) {
    updates.push('username = ?');
    params.push(username);
  }

  if (password) {
    const passwordHash = await bcrypt.hash(password, 10);
    updates.push('password_hash = ?');
    params.push(passwordHash);
  }

  if (role) {
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    updates.push('role = ?');
    params.push(role);
  }

  if (typeof is_active !== 'undefined') {
    updates.push('is_active = ?');
    params.push(is_active ? 1 : 0);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  params.push(userId);

  db.run(
    `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
    params,
    function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json({ message: 'User updated successfully' });
    }
  );
});

router.delete('/users/:id', (req, res) => {
  const userId = req.params.id;

  db.run('DELETE FROM user_permissions WHERE user_id = ?', [userId]);
  db.run('DELETE FROM users WHERE id = ?', [userId], function(err) {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
  });
});

router.get('/steam-accounts', (req, res) => {
  db.all(
    'SELECT id, account_name, username, password, created_at, is_active, color_type, color_value, color_gradient FROM steam_accounts ORDER BY created_at DESC',
    [],
    (err, accounts) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      res.json({ accounts });
    }
  );
});

router.post('/steam-accounts', upload.single('sdaFile'), async (req, res) => {
  try {
    const { password, description, colorType, colorValue, colorGradient } = req.body;
    const sdaFile = req.file;

    if (!sdaFile) {
      return res.status(400).json({ error: 'SDA file required' });
    }

    const sdaContent = fs.readFileSync(sdaFile.path, 'utf8');
    const sdaData = parseSdaFile(sdaContent);

    db.run(
      `INSERT INTO steam_accounts 
       (account_name, username, password, shared_secret, identity_secret, revocation_code, sda_data, created_by, color_type, color_value, color_gradient) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        description || sdaData.accountName,
        sdaData.accountName,
        password || '',
        sdaData.sharedSecret,
        sdaData.identitySecret,
        sdaData.revocationCode,
        JSON.stringify(sdaData.fullData),
        req.user.id,
        colorType || 'solid',
        colorValue || '#409eff',
        colorGradient || null
      ],
      function(err) {
        fs.unlinkSync(sdaFile.path);

        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Internal server error' });
        }

        res.status(201).json({ 
          message: 'Steam account created successfully',
          accountId: this.lastID 
        });
      }
    );
  } catch (error) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Error processing SDA file:', error);
    res.status(400).json({ error: error.message });
  }
});

router.put('/steam-accounts/:id', (req, res) => {
  const accountId = req.params.id;
  const { description, password, is_active, colorType, colorValue, colorGradient, notes } = req.body;

  const updates = [];
  const params = [];

  if (description !== undefined) {
    updates.push('account_name = ?');
    params.push(description);
  }

  if (password) {
    updates.push('password = ?');
    params.push(password);
  }

  if (typeof is_active !== 'undefined') {
    updates.push('is_active = ?');
    params.push(is_active ? 1 : 0);
  }

  if (colorType) {
    updates.push('color_type = ?');
    params.push(colorType);
  }

  if (colorValue) {
    updates.push('color_value = ?');
    params.push(colorValue);
  }

  if (colorGradient !== undefined) {
    updates.push('color_gradient = ?');
    params.push(colorGradient);
  }

  if (notes !== undefined) {
    updates.push('notes = ?');
    params.push(notes);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(accountId);

  db.run(
    `UPDATE steam_accounts SET ${updates.join(', ')} WHERE id = ?`,
    params,
    function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Steam account not found' });
      }
      res.json({ message: 'Steam account updated successfully' });
    }
  );
});

router.delete('/steam-accounts/:id', (req, res) => {
  const accountId = req.params.id;

  db.run('DELETE FROM user_permissions WHERE steam_account_id = ?', [accountId]);
  db.run('DELETE FROM steam_accounts WHERE id = ?', [accountId], function(err) {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Steam account not found' });
    }
    res.json({ message: 'Steam account deleted successfully' });
  });
});

router.get('/permissions', (req, res) => {
  const query = `
    SELECT 
      up.id,
      up.user_id,
      u.username,
      up.steam_account_id,
      sa.account_name,
      up.granted_at
    FROM user_permissions up
    INNER JOIN users u ON up.user_id = u.id
    INNER JOIN steam_accounts sa ON up.steam_account_id = sa.id
    ORDER BY up.granted_at DESC
  `;

  db.all(query, [], (err, permissions) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    res.json({ permissions });
  });
});

router.post('/permissions', (req, res) => {
  const { userId, steamAccountId } = req.body;

  if (!userId || !steamAccountId) {
    return res.status(400).json({ error: 'User ID and Steam account ID required' });
  }

  db.run(
    'INSERT INTO user_permissions (user_id, steam_account_id, granted_by) VALUES (?, ?, ?)',
    [userId, steamAccountId, req.user.id],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Permission already exists' });
        }
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      res.status(201).json({ 
        message: 'Permission granted successfully',
        permissionId: this.lastID 
      });
    }
  );
});

router.delete('/permissions/:id', (req, res) => {
  const permissionId = req.params.id;

  db.run('DELETE FROM user_permissions WHERE id = ?', [permissionId], function(err) {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Permission not found' });
    }
    res.json({ message: 'Permission revoked successfully' });
  });
});

router.get('/logs', (req, res) => {
  const { limit = 100, userId } = req.query;

  let query = `
    SELECT 
      ll.id,
      ll.user_id,
      ll.username,
      ll.ip_address,
      ll.user_agent,
      ll.login_time,
      ll.success
    FROM login_logs ll
  `;

  const params = [];

  if (userId) {
    query += ' WHERE ll.user_id = ?';
    params.push(userId);
  }

  query += ' ORDER BY ll.login_time DESC LIMIT ?';
  params.push(parseInt(limit));

  db.all(query, params, (err, logs) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    res.json({ logs });
  });
});

router.get('/steam-accounts/:id/preview', (req, res) => {
  const accountId = req.params.id;

  const query = `
    SELECT 
      id,
      account_name,
      username,
      password,
      shared_secret
    FROM steam_accounts
    WHERE id = ? AND is_active = 1
  `;

  db.get(query, [accountId], (err, account) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    res.json({
      id: account.id,
      accountName: account.account_name,
      username: account.username,
      password: account.password,
      authCode: generateAuthCode(account.shared_secret),
      timeRemaining: getTimeRemaining()
    });
  });
});

router.get('/steam-accounts/:id/code', (req, res) => {
  const accountId = req.params.id;

  const query = `
    SELECT shared_secret
    FROM steam_accounts
    WHERE id = ? AND is_active = 1
  `;

  db.get(query, [accountId], (err, account) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    res.json({
      authCode: generateAuthCode(account.shared_secret),
      timeRemaining: getTimeRemaining()
    });
  });
});

// API Key 管理
router.get('/api-keys', (req, res) => {
  const query = `
    SELECT 
      ak.id,
      ak.api_key,
      ak.name,
      ak.created_by,
      u.username as created_by_username,
      ak.created_at,
      ak.last_used_at,
      ak.is_active
    FROM api_keys ak
    LEFT JOIN users u ON ak.created_by = u.id
    ORDER BY ak.created_at DESC
  `;

  db.all(query, [], (err, apiKeys) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    res.json({ apiKeys });
  });
});

router.post('/api-keys', (req, res) => {
  const { name } = req.body;
  const crypto = require('crypto');
  
  // 生成 API Key
  const apiKey = 'sk_' + crypto.randomBytes(32).toString('hex');

  db.run(
    'INSERT INTO api_keys (api_key, name, created_by) VALUES (?, ?, ?)',
    [apiKey, name || 'Untitled', req.user.id],
    function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      res.status(201).json({
        message: 'API key created successfully',
        api_key: apiKey,
        id: this.lastID
      });
    }
  );
});

router.delete('/api-keys/:id', (req, res) => {
  const apiKeyId = req.params.id;

  db.run('DELETE FROM api_keys WHERE id = ?', [apiKeyId], function(err) {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'API key not found' });
    }
    res.json({ message: 'API key deleted successfully' });
  });
});

router.put('/api-keys/:id', (req, res) => {
  const apiKeyId = req.params.id;
  const { name, is_active } = req.body;

  const updates = [];
  const params = [];

  if (name !== undefined) {
    updates.push('name = ?');
    params.push(name);
  }

  if (typeof is_active !== 'undefined') {
    updates.push('is_active = ?');
    params.push(is_active ? 1 : 0);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  params.push(apiKeyId);

  db.run(
    `UPDATE api_keys SET ${updates.join(', ')} WHERE id = ?`,
    params,
    function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'API key not found' });
      }
      res.json({ message: 'API key updated successfully' });
    }
  );
});

module.exports = router;
