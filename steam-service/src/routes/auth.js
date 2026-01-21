const express = require('express');
const router = express.Router();

// 预留的登录路由（未来实现）
router.post('/login', async (req, res) => {
  res.status(501).json({ 
    error: 'Not implemented',
    message: 'Steam login feature is not yet implemented'
  });
});

module.exports = router;
