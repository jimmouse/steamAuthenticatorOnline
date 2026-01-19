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
  const trustProxy = process.env.TRUST_PROXY === 'true';
  const ipHeader = process.env.IP_HEADER || 'x-forwarded-for';
  
  if (trustProxy && req.headers[ipHeader]) {
    const ips = req.headers[ipHeader].split(',');
    return ips[0].trim();
  }
  
  return req.ip || req.connection.remoteAddress;
}

module.exports = {
  authenticateToken,
  requireAdmin,
  authenticateApiKey,
  getClientIp
};
