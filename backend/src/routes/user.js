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
      sa.notes,
      sa.email_address,
      sa.email_login_url,
      sa.email_password
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
      colorGradient: account.color_gradient,
      notes: account.notes,
      emailAddress: account.email_address,
      emailLoginUrl: account.email_login_url,
      emailPassword: account.email_password
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

// Steam确认管理（用户版）
router.get('/accounts/:id/confirmations', async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { getConfirmations, generateDeviceID, getConfirmationType } = require('../utils/steamConfirmation');
  
  // 验证用户权限
  const query = `
    SELECT sa.* FROM steam_accounts sa
    INNER JOIN user_permissions up ON sa.id = up.steam_account_id
    WHERE sa.id = ? AND up.user_id = ? AND sa.is_active = 1
  `;
  
  db.get(query, [id, userId], async (err, account) => {
    if (err || !account) {
      return res.status(404).json({ error: 'Account not found or access denied' });
    }
    
    try {
      // 从sda_data中获取Steam ID
      let steamId = account.username;
      if (account.sda_data) {
        try {
          const sdaData = JSON.parse(account.sda_data);
          if (sdaData.Session && sdaData.Session.SteamID) {
            steamId = sdaData.Session.SteamID;
          }
        } catch (e) {
          console.error('Failed to parse sda_data:', e);
        }
      }
      
      const deviceId = generateDeviceID(steamId);
      const confirmations = await getConfirmations(
        steamId,
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

router.post('/accounts/:id/confirmations/accept', async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { confirmations } = req.body;
  const { acceptMultipleConfirmations, generateDeviceID } = require('../utils/steamConfirmation');
  
  if (!confirmations || !Array.isArray(confirmations)) {
    return res.status(400).json({ error: 'Invalid confirmations data' });
  }
  
  const query = `
    SELECT sa.* FROM steam_accounts sa
    INNER JOIN user_permissions up ON sa.id = up.steam_account_id
    WHERE sa.id = ? AND up.user_id = ? AND sa.is_active = 1
  `;
  
  db.get(query, [id, userId], async (err, account) => {
    if (err || !account) {
      return res.status(404).json({ error: 'Account not found or access denied' });
    }
    
    try {
      // 从sda_data中获取Steam ID
      let steamId = account.username;
      if (account.sda_data) {
        try {
          const sdaData = JSON.parse(account.sda_data);
          if (sdaData.Session && sdaData.Session.SteamID) {
            steamId = sdaData.Session.SteamID;
          }
        } catch (e) {
          console.error('Failed to parse sda_data:', e);
        }
      }
      
      const deviceId = generateDeviceID(steamId);
      const results = await acceptMultipleConfirmations(
        steamId,
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

router.post('/accounts/:id/confirmations/:confId/accept', async (req, res) => {
  const userId = req.user.id;
  const { id, confId } = req.params;
  const { confKey } = req.body;
  const { acceptConfirmation, generateDeviceID } = require('../utils/steamConfirmation');
  
  const query = `
    SELECT sa.* FROM steam_accounts sa
    INNER JOIN user_permissions up ON sa.id = up.steam_account_id
    WHERE sa.id = ? AND up.user_id = ? AND sa.is_active = 1
  `;
  
  db.get(query, [id, userId], async (err, account) => {
    if (err || !account) {
      return res.status(404).json({ error: 'Account not found or access denied' });
    }
    
    try {
      // 从sda_data中获取Steam ID
      let steamId = account.username;
      if (account.sda_data) {
        try {
          const sdaData = JSON.parse(account.sda_data);
          if (sdaData.Session && sdaData.Session.SteamID) {
            steamId = sdaData.Session.SteamID;
          }
        } catch (e) {
          console.error('Failed to parse sda_data:', e);
        }
      }
      
      const deviceId = generateDeviceID(steamId);
      const success = await acceptConfirmation(
        steamId,
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

router.post('/accounts/:id/confirmations/:confId/deny', async (req, res) => {
  const userId = req.user.id;
  const { id, confId } = req.params;
  const { confKey } = req.body;
  const { denyConfirmation, generateDeviceID } = require('../utils/steamConfirmation');
  
  const query = `
    SELECT sa.* FROM steam_accounts sa
    INNER JOIN user_permissions up ON sa.id = up.steam_account_id
    WHERE sa.id = ? AND up.user_id = ? AND sa.is_active = 1
  `;
  
  db.get(query, [id, userId], async (err, account) => {
    if (err || !account) {
      return res.status(404).json({ error: 'Account not found or access denied' });
    }
    
    try {
      // 从sda_data中获取Steam ID
      let steamId = account.username;
      if (account.sda_data) {
        try {
          const sdaData = JSON.parse(account.sda_data);
          if (sdaData.Session && sdaData.Session.SteamID) {
            steamId = sdaData.Session.SteamID;
          }
        } catch (e) {
          console.error('Failed to parse sda_data:', e);
        }
      }
      
      const deviceId = generateDeviceID(steamId);
      const success = await denyConfirmation(
        steamId,
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

module.exports = router;
