const express = require('express');
const axios = require('axios');
const { saveSession, getSession, deleteSession, getAllSessions, markSessionInvalid } = require('../utils/sessionManager');

const router = express.Router();

/**
 * 保存Session
 * POST /api/session/save
 */
router.post('/save', (req, res) => {
  const { accountId, sessionData } = req.body;
  
  if (!accountId || !sessionData) {
    return res.status(400).json({ error: 'Account ID and session data required' });
  }
  
  if (!sessionData.sessionid || !sessionData.steamLoginSecure) {
    return res.status(400).json({ error: 'Invalid session data' });
  }
  
  try {
    const saved = saveSession(accountId, sessionData);
    res.json({ 
      message: 'Session saved successfully',
      accountId,
      updatedAt: saved.updatedAt
    });
  } catch (error) {
    console.error('[SESSION_SAVE] Error:', error);
    res.status(500).json({ error: 'Failed to save session' });
  }
});

/**
 * 获取Session
 * GET /api/session/:accountId
 */
router.get('/:accountId', (req, res) => {
  const { accountId } = req.params;
  
  const session = getSession(accountId);
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  res.json({ accountId, session });
});

/**
 * 检查Session状态
 * GET /api/session/:accountId/status
 */
router.get('/:accountId/status', async (req, res) => {
  const { accountId } = req.params;
  
  const session = getSession(accountId);
  
  if (!session) {
    return res.json({ 
      accountId,
      status: 'not_found',
      valid: false
    });
  }
  
  if (session.expired || session.invalid) {
    return res.json({
      accountId,
      status: session.expired ? 'expired' : 'invalid',
      valid: false,
      updatedAt: session.updatedAt
    });
  }
  
  // 验证Session是否仍然有效
  try {
    const https = require('https');
    const httpsAgent = new https.Agent({
      rejectUnauthorized: false
    });
    
    const response = await axios.get('https://steamcommunity.com/my/profile', {
      headers: {
        'Cookie': `sessionid=${session.sessionid}; steamLoginSecure=${session.steamLoginSecure}`
      },
      httpsAgent,
      maxRedirects: 0,
      validateStatus: (status) => status < 400
    });
    
    if (response.status === 200) {
      res.json({
        accountId,
        status: 'valid',
        valid: true,
        updatedAt: session.updatedAt
      });
    } else {
      markSessionInvalid(accountId);
      res.json({
        accountId,
        status: 'invalid',
        valid: false
      });
    }
  } catch (error) {
    console.error('[SESSION_STATUS] Validation error:', error.message);
    markSessionInvalid(accountId);
    res.json({
      accountId,
      status: 'invalid',
      valid: false,
      error: error.message
    });
  }
});

/**
 * 删除Session
 * DELETE /api/session/:accountId
 */
router.delete('/:accountId', (req, res) => {
  const { accountId } = req.params;
  
  const deleted = deleteSession(accountId);
  
  if (deleted) {
    res.json({ message: 'Session deleted successfully', accountId });
  } else {
    res.status(404).json({ error: 'Session not found' });
  }
});

/**
 * 获取所有Session
 * GET /api/session
 */
router.get('/', (req, res) => {
  const sessions = getAllSessions();
  res.json({ 
    total: sessions.length,
    sessions: sessions.map(s => ({
      accountId: s.accountId,
      steamid: s.steamid,
      updatedAt: s.updatedAt,
      expired: s.expired || false,
      invalid: s.invalid || false
    }))
  });
});

module.exports = router;
