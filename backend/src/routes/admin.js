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

const csvUpload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() === '.csv') {
      cb(null, true);
    } else {
      cb(new Error('Only .csv files are allowed'));
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
    'SELECT id, account_name, username, password, created_at, is_active, color_type, color_value, color_gradient, notes, email_address, email_login_url, email_password FROM steam_accounts ORDER BY created_at DESC',
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
    const { description, password, email_address, email_login_url, email_password, colorType, colorValue, colorGradient, notes } = req.body;
    const sdaFile = req.file;

    if (!sdaFile) {
      return res.status(400).json({ error: 'SDA file required' });
    }

    const sdaContent = fs.readFileSync(sdaFile.path, 'utf8');
    const sdaData = parseSdaFile(sdaContent);

    db.run(
      `INSERT INTO steam_accounts 
       (account_name, username, password, shared_secret, identity_secret, revocation_code, sda_data, created_by, color_type, color_value, color_gradient, notes, email_address, email_login_url, email_password) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        colorGradient || null,
        notes || null,
        email_address || null,
        email_login_url || null,
        email_password || null
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
  const { description, password, is_active, colorType, colorValue, colorGradient, notes, email_address, email_login_url, email_password } = req.body;

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

  if (email_address !== undefined) {
    updates.push('email_address = ?');
    params.push(email_address);
  }

  if (email_login_url !== undefined) {
    updates.push('email_login_url = ?');
    params.push(email_login_url);
  }

  if (email_password !== undefined) {
    updates.push('email_password = ?');
    params.push(email_password);
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
  const { emailDomain } = req.body;
  const { generateUsername, generatePassword, generateEmail } = require('../utils/steamRegister');
  
  const username = generateUsername();
  const password = generatePassword();
  const email = generateEmail(username, emailDomain);
  
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
  const { accountName, description } = req.body;
  
  // 获取待激活账户信息
  db.get('SELECT * FROM pending_steam_accounts WHERE id = ?', [id], (err, pending) => {
    if (err || !pending) {
      return res.status(404).json({ error: 'Pending account not found' });
    }
    
    // 更新状态为已激活
    db.run(
      'UPDATE pending_steam_accounts SET status = ?, activated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['activated', id],
      (err) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Failed to update status' });
        }
        
        res.json({ 
          message: 'Account marked as activated',
          accountName: accountName || pending.username,
          username: pending.username,
          password: pending.password
        });
      }
    );
  });
});

// Steam确认管理
router.get('/steam-accounts/:id/confirmations', async (req, res) => {
  const { id } = req.params;
  const { getConfirmations, generateDeviceID, getConfirmationType } = require('../utils/steamConfirmation');
  
  db.get('SELECT * FROM steam_accounts WHERE id = ?', [id], async (err, account) => {
    if (err || !account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    try {
      const deviceId = generateDeviceID(account.username);
      const confirmations = await getConfirmations(
        account.username,
        account.identity_secret,
        deviceId
      );
      
      const formattedConfirmations = confirmations.map(conf => ({
        ...conf,
        typeDescription: getConfirmationType(conf.type)
      }));
      
      res.json({ confirmations: formattedConfirmations });
    } catch (error) {
      console.error('Failed to get confirmations:', error);
      res.status(500).json({ error: 'Failed to fetch confirmations', message: error.message });
    }
  });
});

router.post('/steam-accounts/:id/confirmations/accept', async (req, res) => {
  const { id } = req.params;
  const { confirmations } = req.body;
  const { acceptMultipleConfirmations, generateDeviceID } = require('../utils/steamConfirmation');
  
  if (!confirmations || !Array.isArray(confirmations)) {
    return res.status(400).json({ error: 'Invalid confirmations data' });
  }
  
  db.get('SELECT * FROM steam_accounts WHERE id = ?', [id], async (err, account) => {
    if (err || !account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    try {
      const deviceId = generateDeviceID(account.username);
      const results = await acceptMultipleConfirmations(
        account.username,
        account.identity_secret,
        deviceId,
        confirmations
      );
      
      res.json({ results });
    } catch (error) {
      console.error('Failed to accept confirmations:', error);
      res.status(500).json({ error: 'Failed to accept confirmations', message: error.message });
    }
  });
});

router.post('/steam-accounts/:id/confirmations/:confId/accept', async (req, res) => {
  const { id, confId } = req.params;
  const { confKey } = req.body;
  const { acceptConfirmation, generateDeviceID } = require('../utils/steamConfirmation');
  
  db.get('SELECT * FROM steam_accounts WHERE id = ?', [id], async (err, account) => {
    if (err || !account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    try {
      const deviceId = generateDeviceID(account.username);
      const success = await acceptConfirmation(
        account.username,
        account.identity_secret,
        deviceId,
        confId,
        confKey
      );
      
      res.json({ success });
    } catch (error) {
      console.error('Failed to accept confirmation:', error);
      res.status(500).json({ error: 'Failed to accept confirmation', message: error.message });
    }
  });
});

router.post('/steam-accounts/:id/confirmations/:confId/deny', async (req, res) => {
  const { id, confId } = req.params;
  const { confKey } = req.body;
  const { denyConfirmation, generateDeviceID } = require('../utils/steamConfirmation');
  
  db.get('SELECT * FROM steam_accounts WHERE id = ?', [id], async (err, account) => {
    if (err || !account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    try {
      const deviceId = generateDeviceID(account.username);
      const success = await denyConfirmation(
        account.username,
        account.identity_secret,
        deviceId,
        confId,
        confKey
      );
      
      res.json({ success });
    } catch (error) {
      console.error('Failed to deny confirmation:', error);
      res.status(500).json({ error: 'Failed to deny confirmation', message: error.message });
    }
  });
});

// 批量导入Steam账户
router.post('/steam-accounts/batch-import', csvUpload.single('csvFile'), async (req, res) => {
  const { parse } = require('csv-parse/sync');
  
  if (!req.file) {
    return res.status(400).json({ error: 'CSV file required' });
  }

  try {
    const csvContent = fs.readFileSync(req.file.path, 'utf8');
    fs.unlinkSync(req.file.path);

    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    const results = {
      total: records.length,
      success: 0,
      failed: 0,
      errors: []
    };

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const rowNum = i + 2; // +2 because row 1 is header and array is 0-indexed

      try {
        // 验证必填字段
        if (!record.s_name || !record.s_pass || !record.mafile_content) {
          results.failed++;
          results.errors.push({
            row: rowNum,
            error: 'Missing required fields (s_name, s_pass, mafile_content)'
          });
          continue;
        }

        // 解析mafile内容
        let maFileData;
        try {
          maFileData = JSON.parse(record.mafile_content);
        } catch (e) {
          results.failed++;
          results.errors.push({
            row: rowNum,
            error: 'Invalid mafile JSON format'
          });
          continue;
        }

        // 验证mafile必要字段
        if (!maFileData.shared_secret || !maFileData.identity_secret) {
          results.failed++;
          results.errors.push({
            row: rowNum,
            error: 'mafile missing required fields (shared_secret, identity_secret)'
          });
          continue;
        }

        // 插入数据库
        await new Promise((resolve, reject) => {
          db.run(
            `INSERT INTO steam_accounts 
             (account_name, username, password, shared_secret, identity_secret, 
              color_type, color_value, notes, email_address, email_login_url, email_password) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              record.description || record.s_name,
              record.s_name,
              record.s_pass,
              maFileData.shared_secret,
              maFileData.identity_secret,
              'solid',
              '#409eff',
              null,
              record.email || null,
              record.e_url || null,
              record.e_pass || null
            ],
            function(err) {
              if (err) {
                reject(err);
              } else {
                resolve(this.lastID);
              }
            }
          );
        });

        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          row: rowNum,
          error: error.message
        });
      }
    }

    res.json({
      message: 'Batch import completed',
      results
    });

  } catch (error) {
    console.error('Batch import error:', error);
    res.status(500).json({ error: 'Failed to process CSV file', message: error.message });
  }
});

// 系统设置管理
router.get('/settings', (req, res) => {
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

router.put('/settings', (req, res) => {
  const { settings } = req.body;
  
  if (!settings || typeof settings !== 'object') {
    return res.status(400).json({ error: 'Invalid settings data' });
  }
  
  const stmt = db.prepare('INSERT OR REPLACE INTO system_settings (setting_key, setting_value, updated_by, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)');
  
  let updated = 0;
  const keys = Object.keys(settings);
  
  keys.forEach((key, index) => {
    stmt.run(key, settings[key], req.user.id, (err) => {
      if (err) {
        console.error(`Error updating ${key}:`, err);
      } else {
        updated++;
      }
      
      if (index === keys.length - 1) {
        stmt.finalize();
        res.json({ message: 'Settings updated successfully', updated });
      }
    });
  });
});

// 更新Steam账户的Session数据
router.post('/steam-accounts/:id/session', async (req, res) => {
  const { id } = req.params;
  const { sessionData, cookieString } = req.body;
  const { updateAccountSession, parseSessionFromCookie, validateSession } = require('../utils/steamLogin');

  try {
    let session;

    // 如果提供了Cookie字符串，解析它
    if (cookieString) {
      session = parseSessionFromCookie(cookieString);
      if (!session.SessionID || !session.SteamID) {
        return res.status(400).json({ error: 'Invalid cookie string' });
      }
    } else if (sessionData) {
      session = sessionData;
    } else {
      return res.status(400).json({ error: 'Session data or cookie string required' });
    }

    // 验证Session是否有效
    const isValid = await validateSession(session);
    if (!isValid) {
      return res.status(400).json({ 
        error: 'Invalid session', 
        message: 'Session验证失败，请确保Cookie是最新的' 
      });
    }

    // 更新数据库
    const updatedSession = await updateAccountSession(db, id, session);

    res.json({ 
      message: 'Session updated successfully',
      session: {
        SteamID: updatedSession.SteamID,
        UpdatedAt: updatedSession.UpdatedAt
      }
    });
  } catch (error) {
    console.error('Failed to update session:', error);
    res.status(500).json({ error: 'Failed to update session', message: error.message });
  }
});

module.exports = router;
