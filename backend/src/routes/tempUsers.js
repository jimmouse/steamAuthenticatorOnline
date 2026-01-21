const express = require('express');
const crypto = require('crypto');
const db = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// 生成随机授权码
function generateAccessCode() {
  return crypto.randomBytes(16).toString('hex');
}

// 获取所有临时用户
router.get('/', authenticateToken, requireAdmin, (req, res) => {
  db.all(
    `SELECT tu.*, sa.account_name, sa.username as steam_username,
            u.username as created_by_username
     FROM temp_users tu
     INNER JOIN steam_accounts sa ON tu.steam_account_id = sa.id
     LEFT JOIN users u ON tu.created_by = u.id
     ORDER BY tu.created_at DESC`,
    [],
    (err, tempUsers) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      res.json({ tempUsers });
    }
  );
});

// 创建临时用户
router.post('/', authenticateToken, requireAdmin, (req, res) => {
  const { steamAccountId, expiresAt, maxUses, notes } = req.body;
  const accessCode = generateAccessCode();

  if (!steamAccountId) {
    return res.status(400).json({ error: 'Steam account ID required' });
  }

  db.run(
    `INSERT INTO temp_users (access_code, steam_account_id, created_by, expires_at, max_uses, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [accessCode, steamAccountId, req.user.id, expiresAt || null, maxUses || null, notes || null],
    function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      db.get(
        `SELECT tu.*, sa.account_name, sa.username as steam_username
         FROM temp_users tu
         INNER JOIN steam_accounts sa ON tu.steam_account_id = sa.id
         WHERE tu.id = ?`,
        [this.lastID],
        (err, tempUser) => {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Internal server error' });
          }
          res.status(201).json({
            message: 'Temporary user created successfully',
            tempUser
          });
        }
      );
    }
  );
});

// 更新临时用户
router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { expiresAt, maxUses, isActive, notes } = req.body;

  const updates = [];
  const params = [];

  if (expiresAt !== undefined) {
    updates.push('expires_at = ?');
    params.push(expiresAt || null);
  }

  if (maxUses !== undefined) {
    updates.push('max_uses = ?');
    params.push(maxUses || null);
  }

  if (typeof isActive !== 'undefined') {
    updates.push('is_active = ?');
    params.push(isActive ? 1 : 0);
  }

  if (notes !== undefined) {
    updates.push('notes = ?');
    params.push(notes);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  params.push(id);

  db.run(
    `UPDATE temp_users SET ${updates.join(', ')} WHERE id = ?`,
    params,
    function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Temporary user not found' });
      }

      res.json({ message: 'Temporary user updated successfully' });
    }
  );
});

// 删除临时用户
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM temp_users WHERE id = ?', [id], function(err) {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Temporary user not found' });
    }

    res.json({ message: 'Temporary user deleted successfully' });
  });
});

// 重置使用次数
router.post('/:id/reset-uses', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;

  db.run(
    'UPDATE temp_users SET current_uses = 0 WHERE id = ?',
    [id],
    function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Temporary user not found' });
      }

      res.json({ message: 'Usage count reset successfully' });
    }
  );
});

module.exports = router;
