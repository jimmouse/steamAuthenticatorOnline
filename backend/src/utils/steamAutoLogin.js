const axios = require('axios');
const crypto = require('crypto');
const SteamTotp = require('steam-totp');

/**
 * 自动登录Steam并获取Session
 * @param {string} username - Steam用户名
 * @param {string} password - Steam密码
 * @param {string} sharedSecret - 共享密钥（用于生成验证码）
 * @returns {Promise<Object>} Session数据
 */
async function autoLoginSteam(username, password, sharedSecret) {
  console.log(`[STEAM_AUTO_LOGIN] 开始自动登录: ${username}`);
  
  try {
    // 生成RSA密钥
    const rsaResponse = await axios.post('https://steamcommunity.com/login/getrsakey/', {
      username: username
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!rsaResponse.data.success) {
      throw new Error('获取RSA密钥失败');
    }

    const { publickey_mod, publickey_exp, timestamp } = rsaResponse.data;

    // 加密密码
    const encryptedPassword = encryptPassword(password, publickey_mod, publickey_exp);

    // 生成两步验证码
    const twoFactorCode = SteamTotp.generateAuthCode(sharedSecret);
    console.log(`[STEAM_AUTO_LOGIN] 生成验证码: ${twoFactorCode}`);

    // 执行登录
    const loginResponse = await axios.post('https://steamcommunity.com/login/dologin/', 
      new URLSearchParams({
        username: username,
        password: encryptedPassword,
        emailauth: '',
        emailsteamid: '',
        twofactorcode: twoFactorCode,
        captchagid: '-1',
        captcha_text: '',
        loginfriendlyname: 'Steam Authenticator Online',
        rsatimestamp: timestamp,
        remember_login: 'true',
        donotcache: Date.now().toString()
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://steamcommunity.com/login/home/'
        },
        maxRedirects: 0,
        validateStatus: (status) => status < 500
      }
    );

    console.log(`[STEAM_AUTO_LOGIN] 登录响应:`, loginResponse.data);

    if (!loginResponse.data.success) {
      throw new Error(loginResponse.data.message || '登录失败');
    }

    // 从响应中提取Session信息
    const cookies = loginResponse.headers['set-cookie'] || [];
    const sessionData = extractSessionFromCookies(cookies);

    if (!sessionData.sessionid || !sessionData.steamLoginSecure) {
      throw new Error('未能从响应中提取Session信息');
    }

    // 提取SteamID
    if (loginResponse.data.transfer_urls && loginResponse.data.transfer_parameters) {
      const params = loginResponse.data.transfer_parameters;
      sessionData.steamid = params.steamid;
    }

    console.log(`[STEAM_AUTO_LOGIN] 登录成功，Session已获取`);
    
    return {
      success: true,
      sessionData: {
        sessionid: sessionData.sessionid,
        steamLoginSecure: sessionData.steamLoginSecure,
        steamid: sessionData.steamid
      }
    };

  } catch (error) {
    console.error(`[STEAM_AUTO_LOGIN] 登录失败:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 使用RSA加密密码
 */
function encryptPassword(password, modulus, exponent) {
  const NodeRSA = require('node-rsa');
  
  // 创建公钥
  const key = new NodeRSA();
  key.importKey({
    n: Buffer.from(modulus, 'hex'),
    e: parseInt(exponent, 16)
  }, 'components-public');
  
  key.setOptions({ encryptionScheme: 'pkcs1' });
  
  // 加密密码
  const encrypted = key.encrypt(password, 'base64');
  return encrypted;
}

/**
 * 从Cookie中提取Session信息
 */
function extractSessionFromCookies(cookies) {
  const sessionData = {
    sessionid: null,
    steamLoginSecure: null,
    steamid: null
  };

  cookies.forEach(cookie => {
    const parts = cookie.split(';')[0].split('=');
    const name = parts[0];
    const value = parts.slice(1).join('=');

    if (name === 'sessionid') {
      sessionData.sessionid = value;
    } else if (name === 'steamLoginSecure') {
      sessionData.steamLoginSecure = value;
      // 从steamLoginSecure中提取SteamID
      const steamIdMatch = value.match(/^(\d+)\|\|/);
      if (steamIdMatch) {
        sessionData.steamid = steamIdMatch[1];
      }
    }
  });

  return sessionData;
}

/**
 * 验证Session是否有效
 */
async function validateSession(sessionData) {
  try {
    const response = await axios.get('https://steamcommunity.com/my/profile', {
      headers: {
        'Cookie': `sessionid=${sessionData.sessionid}; steamLoginSecure=${sessionData.steamLoginSecure}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      maxRedirects: 0,
      validateStatus: (status) => status < 400
    });

    return response.status === 200;
  } catch (error) {
    return false;
  }
}

module.exports = {
  autoLoginSteam,
  validateSession
};
