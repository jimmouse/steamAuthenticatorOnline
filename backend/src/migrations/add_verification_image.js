const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../data/database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('Adding verification_image column to pending_steam_accounts and steam_accounts tables...');

db.serialize(() => {
  // 添加到pending_steam_accounts表
  db.run(`
    ALTER TABLE pending_steam_accounts 
    ADD COLUMN verification_image TEXT
  `, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding verification_image to pending_steam_accounts:', err);
    } else {
      console.log('✓ verification_image column added to pending_steam_accounts');
    }
  });

  // 添加到steam_accounts表
  db.run(`
    ALTER TABLE steam_accounts 
    ADD COLUMN verification_image TEXT
  `, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding verification_image to steam_accounts:', err);
    } else {
      console.log('✓ verification_image column added to steam_accounts');
    }
  });
});

db.close(() => {
  console.log('Migration completed!');
});
