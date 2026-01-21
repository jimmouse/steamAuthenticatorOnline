const express = require('express');
const db = require('../config/database');

const router = express.Router();

router.get('/health', (req, res) => {
  // 检查数据库连接
  db.get('SELECT 1', [], (err) => {
    if (err) {
      return res.status(503).json({
        status: 'unhealthy',
        database: 'disconnected',
        error: err.message
      });
    }
    
    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });
});

module.exports = router;
