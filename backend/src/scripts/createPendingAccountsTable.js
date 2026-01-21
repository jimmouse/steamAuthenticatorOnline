require('dotenv').config();
const db = require('../config/database');

console.log('Creating pending_steam_accounts table...');

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS pending_steam_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      email TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      activated_at DATETIME,
      notes TEXT
    )
  `, (err) => {
    if (err) {
      console.error('Error creating table:', err);
    } else {
      console.log('pending_steam_accounts table created successfully');
    }
  });

  setTimeout(() => {
    console.log('\nDatabase setup complete!');
    process.exit(0);
  }, 1000);
});
