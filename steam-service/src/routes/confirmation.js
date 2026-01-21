const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const { getSession } = require('../utils/sessionManager');

const router = express.Router();

/**
 * 获取确认列表
 * GET /api/confirmation/:accountId
 */
router.get('/:accountId', async (req, res) => {
  const { accountId } = req.params;
  const { identitySecret, deviceId } = req.query;
  
  if (!identitySecret) {
    return res.status(400).json({ error: 'Identity secret required' });
  }
  
  const session = getSession(accountId);
  
  if (!session || session.expired || session.invalid) {
    return res.status(400).json({ error: 'Session not available' });
  }
  
  try {
    const confirmations = await fetchConfirmations(session, identitySecret, deviceId);
    
    res.json({
      accountId,
      steamid: session.steamid,
      confirmations,
      count: confirmations.length,
      queriedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('[CONFIRMATION] Fetch error:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch confirmations',
      message: error.message
    });
  }
});

/**
 * 获取Steam确认列表
 */
async function fetchConfirmations(session, identitySecret, deviceId) {
  const time = Math.floor(Date.now() / 1000);
  const confirmationKey = generateConfirmationKey(identitySecret, time, 'conf');
  
  const https = require('https');
  const httpsAgent = new https.Agent({
    rejectUnauthorized: false
  });
  
  try {
    const response = await axios.get('https://steamcommunity.com/mobileconf/getlist', {
      params: {
        p: deviceId || generateDeviceID(session.steamid),
        a: session.steamid,
        k: confirmationKey,
        t: time,
        m: 'react',
        tag: 'conf'
      },
      headers: {
        'Cookie': `sessionid=${session.sessionid}; steamLoginSecure=${session.steamLoginSecure}`,
        'User-Agent': 'Mozilla/5.0 (Linux; U; Android 4.1.1; en-us) AppleWebKit/534.30'
      },
      httpsAgent
    });
    
    if (response.data && response.data.success) {
      return response.data.conf || [];
    }
    
    return [];
  } catch (error) {
    console.error('[CONFIRMATION] API error:', error.message);
    throw error;
  }
}

/**
 * 生成确认密钥
 */
function generateConfirmationKey(identitySecret, time, tag) {
  const buffer = Buffer.alloc(8);
  buffer.writeUInt32BE(Math.floor(time), 0);
  buffer.writeUInt32BE(0, 4);
  
  const tagBuffer = Buffer.from(tag, 'utf8');
  const dataBuffer = Buffer.concat([buffer, tagBuffer]);
  
  const identitySecretBuffer = Buffer.from(identitySecret, 'base64');
  const hmac = crypto.createHmac('sha1', identitySecretBuffer);
  hmac.update(dataBuffer);
  
  return hmac.digest('base64');
}

/**
 * 生成设备ID
 */
function generateDeviceID(steamId) {
  const hash = crypto.createHash('sha1');
  hash.update(steamId.toString());
  const digest = hash.digest('hex');
  
  return 'android:' + 
    digest.substr(0, 8) + '-' +
    digest.substr(8, 4) + '-' +
    digest.substr(12, 4) + '-' +
    digest.substr(16, 4) + '-' +
    digest.substr(20, 12);
}

module.exports = router;
