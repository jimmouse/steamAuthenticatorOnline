require('dotenv').config();
const db = require('../config/database');

console.log('Creating system_settings table...');

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS system_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      setting_key TEXT UNIQUE NOT NULL,
      setting_value TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_by INTEGER,
      FOREIGN KEY (updated_by) REFERENCES users(id)
    )
  `, (err) => {
    if (err) {
      console.error('Error creating table:', err);
    } else {
      console.log('system_settings table created successfully');
    }
  });

  // 插入默认设置
  const defaultSettings = [
    { key: 'theme_mode', value: 'light' },
    { key: 'user_bg_type', value: 'solid' },
    { key: 'user_bg_color', value: '#f5f7fa' },
    { key: 'user_bg_gradient', value: null },
    { key: 'login_bg_type', value: 'solid' },
    { key: 'login_bg_color', value: '#409eff' },
    { key: 'login_bg_gradient', value: null }
  ];

  const stmt = db.prepare('INSERT OR IGNORE INTO system_settings (setting_key, setting_value) VALUES (?, ?)');
  
  defaultSettings.forEach(setting => {
    stmt.run(setting.key, setting.value, (err) => {
      if (err) {
        console.error(`Error inserting ${setting.key}:`, err);
      } else {
        console.log(`Default setting ${setting.key} inserted`);
      }
    });
  });

  stmt.finalize(() => {
    console.log('\nDatabase setup complete!');
    setTimeout(() => process.exit(0), 1000);
  });
});
