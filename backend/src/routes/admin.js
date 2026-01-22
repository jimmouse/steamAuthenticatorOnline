const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { parseSdaFile } = require('../utils/steamAuth');

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
    `SELECT id, account_name, username, email_address, email_login_url, 
            country, province, city, color_type, color_value, color_gradient,
            created_at, is_active 
     FROM steam_accounts 
     ORDER BY created_at DESC`,
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
    const { username, password, accountName } = req.body;
    const sdaFile = req.file;

    if (!sdaFile) {
      return res.status(400).json({ error: 'SDA file required' });
    }

    const sdaContent = fs.readFileSync(sdaFile.path, 'utf8');
    const sdaData = parseSdaFile(sdaContent);

    const finalAccountName = accountName || sdaData.accountName;

    db.run(
      `INSERT INTO steam_accounts 
       (account_name, username, password, shared_secret, identity_secret, revocation_code, sda_data, created_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        finalAccountName,
        username || sdaData.accountName,
        password || '',
        sdaData.sharedSecret,
        sdaData.identitySecret,
        sdaData.revocationCode,
        JSON.stringify(sdaData.fullData),
        req.user.id
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
  const { accountName, username, password, is_active } = req.body;

  const updates = [];
  const params = [];

  if (accountName) {
    updates.push('account_name = ?');
    params.push(accountName);
  }

  if (username) {
    updates.push('username = ?');
    params.push(username);
  }

  if (password) {
    updates.push('password = ?');
    params.push(password);
  }

  if (typeof is_active !== 'undefined') {
    updates.push('is_active = ?');
    params.push(is_active ? 1 : 0);
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

// 未激活账户管理
router.get('/pending-accounts', (req, res) => {
  db.all('SELECT * FROM pending_steam_accounts ORDER BY created_at DESC', [], (err, accounts) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    res.json({ accounts });
  });
});

router.post('/pending-accounts', (req, res) => {
  const { username, password, email, notes } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  
  db.run(
    'INSERT INTO pending_steam_accounts (username, password, email, notes) VALUES (?, ?, ?, ?)',
    [username, password, email, notes],
    function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Failed to create pending account' });
      }
      res.json({ 
        id: this.lastID,
        message: 'Pending account created successfully'
      });
    }
  );
});

router.post('/pending-accounts/generate', (req, res) => {
  const { emailDomain, username: customUsername } = req.body;
  const { generateUsername, generatePassword, generateEmail } = require('../utils/steamRegister');
  
  const username = customUsername || generateUsername();
  const password = generatePassword();
  const email = emailDomain ? generateEmail(username, emailDomain) : null;
  
  res.json({
    username,
    password,
    email,
    steamRegisterUrl: 'https://store.steampowered.com/join/'
  });
});

router.delete('/pending-accounts/:id', (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM pending_steam_accounts WHERE id = ?', [id], function(err) {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }
    res.json({ message: 'Account deleted successfully' });
  });
});

router.post('/pending-accounts/:id/activate', (req, res) => {
  const { id } = req.params;
  const { steamAccountId } = req.body;
  
  db.run(
    'UPDATE pending_steam_accounts SET status = ?, activated_at = CURRENT_TIMESTAMP, steam_account_id = ? WHERE id = ?',
    ['activated', steamAccountId, id],
    function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Failed to update status' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Account not found' });
      }
      res.json({ message: 'Account activated successfully' });
    }
  );
});

// 获取Steam账户预览信息
router.get('/steam-accounts/:id/preview', async (req, res) => {
  const { id } = req.params;
  
  try {
    const account = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM steam_accounts WHERE id = ?',
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    res.json({
      id: account.id,
      accountName: account.account_name,
      username: account.username,
      password: account.password,
      notes: account.notes,
      colorType: account.color_type,
      colorValue: account.color_value,
      colorGradient: account.color_gradient
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 获取Steam账户验证码
router.get('/steam-accounts/:id/code', async (req, res) => {
  const { id } = req.params;
  
  try {
    const account = await new Promise((resolve, reject) => {
      db.get(
        'SELECT shared_secret FROM steam_accounts WHERE id = ?',
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    
    if (!account || !account.shared_secret) {
      return res.status(404).json({ error: 'Account not found or no shared secret' });
    }
    
    const SteamTotp = require('steam-totp');
    const authCode = SteamTotp.generateAuthCode(account.shared_secret);
    const timeRemaining = 30 - (Math.floor(Date.now() / 1000) % 30);
    
    res.json({
      authCode,
      timeRemaining
    });
  } catch (error) {
    console.error('Error generating code:', error);
    res.status(500).json({ error: 'Failed to generate code' });
  }
});

// 查询临时用户的登录记录
router.get('/temp-users/:code/logs', (req, res) => {
  const { code } = req.params;
  
  // 先检查temp_users表是否存在该记录
  db.get(
    'SELECT username FROM temp_users WHERE access_code = ?',
    [code],
    (err, tempUser) => {
      if (err) {
        console.error('Database error checking temp user:', err);
        return res.status(500).json({ error: 'Database error', details: err.message });
      }
      
      if (!tempUser) {
        return res.json({ logs: [] });
      }
      
      // 查询登录日志 - 如果login_logs表不存在，返回空数组
      db.all(
        `SELECT * FROM login_logs 
         WHERE username = ? 
         ORDER BY created_at DESC`,
        [tempUser.username],
        (err, logs) => {
          if (err) {
            // 如果表不存在，返回空数组而不是错误
            if (err.message.includes('no such table')) {
              console.log('login_logs table does not exist yet');
              return res.json({ logs: [] });
            }
            console.error('Database error fetching logs:', err);
            return res.status(500).json({ error: 'Database error', details: err.message });
          }
          res.json({ logs: logs || [] });
        }
      );
    }
  );
});

module.exports = router;
