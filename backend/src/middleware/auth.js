const jwt = require('jsonwebtoken');
const db = require('../config/database');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

function authenticateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;

  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  db.get(
    'SELECT * FROM api_keys WHERE api_key = ? AND is_active = 1',
    [apiKey],
    (err, apiKeyRecord) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      if (!apiKeyRecord) {
        return res.status(401).json({ error: 'Invalid API key' });
      }

      // 更新最后使用时间
      db.run(
        'UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?',
        [apiKeyRecord.id]
      );

      req.apiKey = apiKeyRecord;
      next();
    }
  );
}

function getClientIp(req) {
  // 优先从 x-forwarded-for 获取（Nginx/代理转发）
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = forwarded.split(',').map(ip => ip.trim());
    // 返回第一个非内网IP
    for (const ip of ips) {
      if (!isPrivateIP(ip)) {
        return ip;
      }
    }
    return ips[0]; // 如果都是内网IP，返回第一个
  }

  // 尝试其他header
  const realIp = req.headers['x-real-ip'];
  if (realIp && !isPrivateIP(realIp)) {
    return realIp;
  }

  // 最后使用连接IP
  let remoteAddr = req.connection?.remoteAddress || req.socket?.remoteAddress || req.ip;

  // 移除IPv6前缀
  if (remoteAddr && remoteAddr.startsWith('::ffff:')) {
    remoteAddr = remoteAddr.substring(7);
  }

  // 只将Docker网关IP标记为本地访问（172.17-32段是Docker默认网段）
  if (remoteAddr && /^172\.(1[7-9]|2[0-9]|3[0-2])\./.test(remoteAddr)) {
    return '127.0.0.1';
  }

  return remoteAddr || 'unknown';
}

// 判断是否为私有IP
function isPrivateIP(ip) {
  if (!ip) return true;

  // IPv4私有地址
  const privateRanges = [
    /^10\./,                    // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
    /^192\.168\./,              // 192.168.0.0/16
    /^127\./,                   // 127.0.0.0/8 (localhost)
    /^169\.254\./,              // 169.254.0.0/16 (link-local)
    /^::1$/,                    // IPv6 localhost
    /^fe80:/,                   // IPv6 link-local
    /^fc00:/,                   // IPv6 unique local
    /^fd00:/                    // IPv6 unique local
  ];

  return privateRanges.some(range => range.test(ip));
}

module.exports = {
  authenticateToken,
  requireAdmin,
  authenticateApiKey,
  getClientIp
};
