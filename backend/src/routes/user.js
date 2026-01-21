const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { generateAuthCode, getTimeRemaining } = require('../utils/steamAuth');

const router = express.Router();

router.use(authenticateToken);

router.get('/accounts', (req, res) => {
  const userId = req.user.id;

  const query = `
    SELECT 
      sa.id,
      sa.account_name,
      sa.username,
      sa.password,
      sa.shared_secret,
      sa.identity_secret,
      sa.color_type,
      sa.color_value,
      sa.color_gradient,
      sa.notes
    FROM steam_accounts sa
    INNER JOIN user_permissions up ON sa.id = up.steam_account_id
    WHERE up.user_id = ? AND sa.is_active = 1
    ORDER BY sa.account_name
  `;

  db.all(query, [userId], (err, accounts) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    const accountsWithCode = accounts.map(account => ({
      id: account.id,
      accountName: account.account_name,
      username: account.username,
      password: account.password,
      authCode: generateAuthCode(account.shared_secret),
      timeRemaining: getTimeRemaining(),
      colorType: account.color_type,
      colorValue: account.color_value,
      colorGradient: account.color_gradient
    }));

    res.json({ accounts: accountsWithCode });
  });
});

router.get('/accounts/:id/code', (req, res) => {
  const userId = req.user.id;
  const accountId = req.params.id;

  const query = `
    SELECT sa.shared_secret
    FROM steam_accounts sa
    INNER JOIN user_permissions up ON sa.id = up.steam_account_id
    WHERE sa.id = ? AND up.user_id = ? AND sa.is_active = 1
  `;

  db.get(query, [accountId, userId], (err, account) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    if (!account) {
      return res.status(404).json({ error: 'Account not found or access denied' });
    }

    res.json({
      authCode: generateAuthCode(account.shared_secret),
      timeRemaining: getTimeRemaining()
    });
  });
});

module.exports = router;
