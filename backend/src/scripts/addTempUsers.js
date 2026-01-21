const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../data/database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('Adding temporary users table...');

db.serialize(() => {
  // 创建临时用户表
  db.run(`
    CREATE TABLE IF NOT EXISTS temp_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      access_code TEXT UNIQUE NOT NULL,
      steam_account_id INTEGER NOT NULL,
      created_by INTEGER NOT NULL,
      expires_at DATETIME,
      max_uses INTEGER DEFAULT NULL,
      current_uses INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_used_at DATETIME,
      notes TEXT,
      FOREIGN KEY (steam_account_id) REFERENCES steam_accounts(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `, (err) => {
    if (err) {
      console.error('Error creating temp_users table:', err);
    } else {
      console.log('✓ temp_users table created');
    }
  });

  // 创建索引
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_temp_users_access_code ON temp_users(access_code)
  `, (err) => {
    if (err) {
      console.error('Error creating index:', err);
    } else {
      console.log('✓ Index created');
    }
  });

  console.log('Migration completed!');
  db.close();
});
