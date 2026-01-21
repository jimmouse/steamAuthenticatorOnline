const express = require('express');
const axios = require('axios');
const { getSession } = require('../utils/sessionManager');

const router = express.Router();

/**
 * 查询单个账户余额
 * GET /api/balance/:accountId
 */
router.get('/:accountId', async (req, res) => {
  const { accountId } = req.params;
  
  const session = getSession(accountId);
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  if (session.expired || session.invalid) {
    return res.status(400).json({ 
      error: 'Session invalid or expired',
      status: session.expired ? 'expired' : 'invalid'
    });
  }
  
  try {
    const balance = await fetchSteamBalance(session);
    
    res.json({
      accountId,
      steamid: session.steamid,
      balance: balance.balance,
      currency: balance.currency,
      formatted: balance.formatted,
      queriedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('[BALANCE] Query error:', error.message);
    res.status(500).json({ 
      error: 'Failed to query balance',
      message: error.message
    });
  }
});

/**
 * 批量查询余额
 * POST /api/balance/batch
 */
router.post('/batch', async (req, res) => {
  const { accountIds } = req.body;
  
  if (!Array.isArray(accountIds) || accountIds.length === 0) {
    return res.status(400).json({ error: 'Account IDs array required' });
  }
  
  const results = [];
  
  for (const accountId of accountIds) {
    try {
      const session = getSession(accountId);
      
      if (!session || session.expired || session.invalid) {
        results.push({
          accountId,
          error: 'Session not available',
          success: false
        });
        continue;
      }
      
      const balance = await fetchSteamBalance(session);
      
      results.push({
        accountId,
        steamid: session.steamid,
        balance: balance.balance,
        currency: balance.currency,
        formatted: balance.formatted,
        success: true
      });
      
      // 避免请求过快
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      results.push({
        accountId,
        error: error.message,
        success: false
      });
    }
  }
  
  res.json({
    total: accountIds.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results,
    queriedAt: new Date().toISOString()
  });
});

/**
 * 从Steam获取余额
 */
async function fetchSteamBalance(session) {
  const https = require('https');
  const httpsAgent = new https.Agent({
    rejectUnauthorized: false
  });
  
  try {
    // 访问账户页面获取余额
    const response = await axios.get('https://store.steampowered.com/account/', {
      headers: {
        'Cookie': `sessionid=${session.sessionid}; steamLoginSecure=${session.steamLoginSecure}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      httpsAgent
    });
    
    const html = response.data;
    
    // 解析余额信息
    // Steam钱包余额通常在 <div class="accountData price">
    const balanceMatch = html.match(/id="header_wallet_balance"[^>]*>([^<]+)</i);
    
    if (balanceMatch) {
      const balanceText = balanceMatch[1].trim();
      // 提取数字和货币
      const amountMatch = balanceText.match(/([\d,\.]+)/);
      const currencyMatch = balanceText.match(/([A-Z¥€£$]+)/);
      
      return {
        balance: amountMatch ? parseFloat(amountMatch[1].replace(',', '')) : 0,
        currency: currencyMatch ? currencyMatch[1] : 'USD',
        formatted: balanceText
      };
    }
    
    // 如果没有找到余额，可能是0或页面结构变化
    return {
      balance: 0,
      currency: 'USD',
      formatted: '$0.00'
    };
  } catch (error) {
    console.error('[BALANCE] Fetch error:', error.message);
    throw new Error('Failed to fetch balance from Steam');
  }
}

module.exports = router;
