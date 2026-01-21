const fs = require('fs');
const path = require('path');

const SESSION_DIR = path.join(__dirname, '../../data/sessions');

// 确保目录存在
if (!fs.existsSync(SESSION_DIR)) {
  fs.mkdirSync(SESSION_DIR, { recursive: true });
}

/**
 * 保存Session到文件
 */
function saveSession(accountId, sessionData) {
  const sessionFile = path.join(SESSION_DIR, `${accountId}.json`);
  const data = {
    ...sessionData,
    updatedAt: new Date().toISOString(),
    expiresAt: calculateExpiry()
  };
  
  fs.writeFileSync(sessionFile, JSON.stringify(data, null, 2));
  console.log(`[SESSION] Saved session for account ${accountId}`);
  return data;
}

/**
 * 获取Session
 */
function getSession(accountId) {
  const sessionFile = path.join(SESSION_DIR, `${accountId}.json`);
  
  if (!fs.existsSync(sessionFile)) {
    return null;
  }
  
  try {
    const data = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
    
    // 检查是否过期
    if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
      console.log(`[SESSION] Session expired for account ${accountId}`);
      return { ...data, expired: true };
    }
    
    return data;
  } catch (error) {
    console.error(`[SESSION] Failed to read session for account ${accountId}:`, error);
    return null;
  }
}

/**
 * 删除Session
 */
function deleteSession(accountId) {
  const sessionFile = path.join(SESSION_DIR, `${accountId}.json`);
  
  if (fs.existsSync(sessionFile)) {
    fs.unlinkSync(sessionFile);
    console.log(`[SESSION] Deleted session for account ${accountId}`);
    return true;
  }
  
  return false;
}

/**
 * 获取所有Session
 */
function getAllSessions() {
  const files = fs.readdirSync(SESSION_DIR);
  const sessions = [];
  
  for (const file of files) {
    if (file.endsWith('.json')) {
      const accountId = file.replace('.json', '');
      const session = getSession(accountId);
      if (session) {
        sessions.push({ accountId, ...session });
      }
    }
  }
  
  return sessions;
}

/**
 * 计算过期时间（默认30天）
 */
function calculateExpiry() {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString();
}

/**
 * 标记Session为无效
 */
function markSessionInvalid(accountId) {
  const session = getSession(accountId);
  if (session) {
    session.invalid = true;
    session.invalidatedAt = new Date().toISOString();
    saveSession(accountId, session);
  }
}

module.exports = {
  saveSession,
  getSession,
  deleteSession,
  getAllSessions,
  markSessionInvalid
};
