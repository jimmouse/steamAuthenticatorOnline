require('dotenv').config();
const db = require('../config/database');

console.log('Adding color columns to steam_accounts table...');

db.serialize(() => {
  db.run(`ALTER TABLE steam_accounts ADD COLUMN color_type TEXT DEFAULT 'solid'`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding color_type column:', err);
    } else {
      console.log('color_type column added or already exists');
    }
  });

  db.run(`ALTER TABLE steam_accounts ADD COLUMN color_value TEXT DEFAULT '#409eff'`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding color_value column:', err);
    } else {
      console.log('color_value column added or already exists');
    }
  });

  db.run(`ALTER TABLE steam_accounts ADD COLUMN color_gradient TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding color_gradient column:', err);
    } else {
      console.log('color_gradient column added or already exists');
    }
  });

  setTimeout(() => {
    console.log('\nDatabase migration complete!');
    process.exit(0);
  }, 1000);
});
