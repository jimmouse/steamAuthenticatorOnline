require('dotenv').config();
const db = require('../config/database');

async function addLocationFields() {
  console.log('Adding location fields to steam_accounts table...');

  db.serialize(() => {
    // 添加地区相关字段
    db.run(`
      ALTER TABLE steam_accounts 
      ADD COLUMN country TEXT DEFAULT NULL
    `, (err) => {
      if (err && !err.message.includes('duplicate column')) {
        console.error('Error adding country column:', err);
      } else {
        console.log('✓ country column added');
      }
    });

    db.run(`
      ALTER TABLE steam_accounts 
      ADD COLUMN province TEXT DEFAULT NULL
    `, (err) => {
      if (err && !err.message.includes('duplicate column')) {
        console.error('Error adding province column:', err);
      } else {
        console.log('✓ province column added');
      }
    });

    db.run(`
      ALTER TABLE steam_accounts 
      ADD COLUMN city TEXT DEFAULT NULL
    `, (err) => {
      if (err && !err.message.includes('duplicate column')) {
        console.error('Error adding city column:', err);
      } else {
        console.log('✓ city column added');
      }
    });

    db.run(`
      ALTER TABLE steam_accounts 
      ADD COLUMN district TEXT DEFAULT NULL
    `, (err) => {
      if (err && !err.message.includes('duplicate column')) {
        console.error('Error adding district column:', err);
      } else {
        console.log('✓ district column added');
      }
    });
  });

  setTimeout(() => {
    console.log('\nLocation fields migration completed!');
    process.exit(0);
  }, 1000);
}

addLocationFields();
