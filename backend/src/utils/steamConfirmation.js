const crypto = require('crypto');
const axios = require('axios');

// 生成确认密钥
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

// 生成设备ID
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

// 获取待确认项列表
async function getConfirmations(steamId, identitySecret, deviceId) {
  const time = Math.floor(Date.now() / 1000);
  const confirmationKey = generateConfirmationKey(identitySecret, time, 'conf');
  
  try {
    const response = await axios.get('https://steamcommunity.com/mobileconf/conf', {
      params: {
        p: deviceId,
        a: steamId,
        k: confirmationKey,
        t: time,
        m: 'android',
        tag: 'conf'
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; U; Android 4.1.1; en-us; Google Nexus 4 - 4.1.1 - API 16 - 768x1280 Build/JRO03S) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30'
      }
    });
    
    // 解析HTML获取确认项
    const confirmations = parseConfirmations(response.data);
    return confirmations;
  } catch (error) {
    console.error('Failed to get confirmations:', error.message);
    throw error;
  }
}

// 解析确认项HTML
function parseConfirmations(html) {
  const confirmations = [];
  
  // 简单的正则匹配，实际应该使用HTML解析器
  const confRegex = /data-confid="(\d+)".*?data-key="(\d+)".*?data-type="(\d+)".*?<div>(.*?)<\/div>/gs;
  let match;
  
  while ((match = confRegex.exec(html)) !== null) {
    confirmations.push({
      id: match[1],
      key: match[2],
      type: parseInt(match[3]),
      description: match[4].replace(/<[^>]*>/g, '').trim()
    });
  }
  
  return confirmations;
}

// 确认单个项目
async function acceptConfirmation(steamId, identitySecret, deviceId, confId, confKey) {
  const time = Math.floor(Date.now() / 1000);
  const confirmationKey = generateConfirmationKey(identitySecret, time, 'allow');
  
  try {
    const response = await axios.get('https://steamcommunity.com/mobileconf/ajaxop', {
      params: {
        op: 'allow',
        p: deviceId,
        a: steamId,
        k: confirmationKey,
        t: time,
        m: 'android',
        tag: 'allow',
        cid: confId,
        ck: confKey
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; U; Android 4.1.1; en-us; Google Nexus 4 - 4.1.1 - API 16 - 768x1280 Build/JRO03S) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30'
      }
    });
    
    return response.data.success === true;
  } catch (error) {
    console.error('Failed to accept confirmation:', error.message);
    throw error;
  }
}

// 拒绝单个项目
async function denyConfirmation(steamId, identitySecret, deviceId, confId, confKey) {
  const time = Math.floor(Date.now() / 1000);
  const confirmationKey = generateConfirmationKey(identitySecret, time, 'cancel');
  
  try {
    const response = await axios.get('https://steamcommunity.com/mobileconf/ajaxop', {
      params: {
        op: 'cancel',
        p: deviceId,
        a: steamId,
        k: confirmationKey,
        t: time,
        m: 'android',
        tag: 'cancel',
        cid: confId,
        ck: confKey
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; U; Android 4.1.1; en-us; Google Nexus 4 - 4.1.1 - API 16 - 768x1280 Build/JRO03S) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30'
      }
    });
    
    return response.data.success === true;
  } catch (error) {
    console.error('Failed to deny confirmation:', error.message);
    throw error;
  }
}

// 批量确认
async function acceptMultipleConfirmations(steamId, identitySecret, deviceId, confirmations) {
  const results = [];
  
  for (const conf of confirmations) {
    try {
      const success = await acceptConfirmation(steamId, identitySecret, deviceId, conf.id, conf.key);
      results.push({ id: conf.id, success });
      
      // 延迟避免请求过快
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      results.push({ id: conf.id, success: false, error: error.message });
    }
  }
  
  return results;
}

// 获取确认类型描述
function getConfirmationType(type) {
  const types = {
    1: '未知',
    2: '交易报价',
    3: '市场出售',
    4: '账户恢复',
    5: '手机验证器添加',
    6: '手机验证器移除'
  };
  return types[type] || '未知类型';
}

module.exports = {
  generateConfirmationKey,
  generateDeviceID,
  getConfirmations,
  acceptConfirmation,
  denyConfirmation,
  acceptMultipleConfirmations,
  getConfirmationType
};
