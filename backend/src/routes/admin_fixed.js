// 临时文件用于检查语法
// 从第675行开始的内容
router.delete('/pending-accounts/:id', (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM pending_steam_accounts WHERE id = ?', [id], function(err) {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }
    res.json({ message: 'Account deleted successfully' });
  });
});
