const axios = require('axios');
const crypto = require('crypto');

/**
 * 更新Steam账户的Session数据
 * @param {Object} sessionData - Session数据对象
 * @param {string} sessionData.SessionID - Steam会话ID
 * @param {string} sessionData.SteamID - 64位Steam ID
 * @param {string} sessionData.SteamLoginSecure - 登录令牌
 * @param {string} sessionData.OAuthToken - OAuth令牌（可选）
 */
function updateAccountSession(db, accountId, sessionData) {
  return new Promise((resolve, reject) => {
    // 获取当前的sda_data
    db.get('SELECT sda_data FROM steam_accounts WHERE id = ?', [accountId], (err, row) => {
      if (err) {
        return reject(err);
      }

      if (!row) {
        return reject(new Error('Account not found'));
      }

      let sdaData = {};
      try {
        sdaData = JSON.parse(row.sda_data || '{}');
      } catch (e) {
        console.error('Failed to parse sda_data:', e);
      }

      // 更新Session数据
      sdaData.Session = {
        SessionID: sessionData.SessionID,
        SteamID: sessionData.SteamID,
        SteamLoginSecure: sessionData.SteamLoginSecure,
        OAuthToken: sessionData.OAuthToken || null,
        UpdatedAt: new Date().toISOString()
      };

      // 保存回数据库
      db.run(
        'UPDATE steam_accounts SET sda_data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [JSON.stringify(sdaData), accountId],
        (err) => {
          if (err) {
            return reject(err);
          }
          resolve(sdaData.Session);
        }
      );
    });
  });
}

/**
 * 验证Session是否有效
 */
async function validateSession(sessionData) {
  if (!sessionData || !sessionData.SessionID || !sessionData.SteamID) {
    return false;
  }

  try {
    const https = require('https');
    const httpsAgent = new https.Agent({
      rejectUnauthorized: false
    });

    const response = await axios.get('https://steamcommunity.com/my/profile', {
      headers: {
        'Cookie': `sessionid=${sessionData.SessionID}; steamLoginSecure=${sessionData.SteamLoginSecure || ''}`
      },
      httpsAgent,
      maxRedirects: 0,
      validateStatus: (status) => status < 400
    });

    // 如果能访问个人资料页面，说明session有效
    return response.status === 200;
  } catch (error) {
    console.error('Session validation failed:', error.message);
    return false;
  }
}

/**
 * 从浏览器Cookie中提取Session数据
 * 用户可以从浏览器开发者工具中复制Cookie
 */
function parseSessionFromCookie(cookieString) {
  const cookies = {};
  cookieString.split(';').forEach(cookie => {
    const [key, value] = cookie.trim().split('=');
    if (key && value) {
      cookies[key] = value;
    }
  });

  return {
    SessionID: cookies.sessionid || null,
    SteamLoginSecure: cookies.steamLoginSecure || null,
    SteamID: cookies.steamLoginSecure ? cookies.steamLoginSecure.split('%7C%7C')[0] : null
  };
}

module.exports = {
  updateAccountSession,
  validateSession,
  parseSessionFromCookie
};
