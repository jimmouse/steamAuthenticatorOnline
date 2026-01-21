require('dotenv').config();
const db = require('../config/database');

console.log('Adding email fields to steam_accounts table...');

db.serialize(() => {
  db.run(`
    ALTER TABLE steam_accounts ADD COLUMN email_address TEXT
  `, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding email_address:', err);
    } else {
      console.log('email_address column added or already exists');
    }
  });

  db.run(`
    ALTER TABLE steam_accounts ADD COLUMN email_login_url TEXT
  `, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding email_login_url:', err);
    } else {
      console.log('email_login_url column added or already exists');
    }
  });

  db.run(`
    ALTER TABLE steam_accounts ADD COLUMN email_password TEXT
  `, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding email_password:', err);
    } else {
      console.log('email_password column added or already exists');
    }
  });

  setTimeout(() => {
    console.log('\nDatabase migration complete!');
    process.exit(0);
  }, 1000);
});
