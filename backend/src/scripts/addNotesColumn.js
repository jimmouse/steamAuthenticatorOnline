require('dotenv').config();
const db = require('../config/database');

console.log('Adding notes column to steam_accounts table...');

db.serialize(() => {
  db.run(`ALTER TABLE steam_accounts ADD COLUMN notes TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding notes column:', err);
    } else {
      console.log('notes column added or already exists');
    }
  });

  setTimeout(() => {
    console.log('\nDatabase migration complete!');
    process.exit(0);
  }, 1000);
});
