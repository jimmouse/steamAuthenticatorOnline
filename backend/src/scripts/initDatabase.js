require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../config/database');

async function initDatabase() {
  console.log('Initializing database...');

  const adminPassword = await bcrypt.hash('admin123', 10);
  const userPassword = await bcrypt.hash('user123', 10);

  db.serialize(() => {
    db.run(
      'INSERT OR IGNORE INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)',
      [1, 'admin', adminPassword, 'admin'],
      (err) => {
        if (err) {
          console.error('Error creating admin user:', err);
        } else {
          console.log('Admin user created (username: admin, password: admin123)');
        }
      }
    );

    db.run(
      'INSERT OR IGNORE INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)',
      [2, 'user', userPassword, 'user'],
      (err) => {
        if (err) {
          console.error('Error creating test user:', err);
        } else {
          console.log('Test user created (username: user, password: user123)');
        }
      }
    );
  });

  setTimeout(() => {
    console.log('\nDatabase initialization complete!');
    console.log('\nDefault accounts:');
    console.log('  Admin - username: admin, password: admin123');
    console.log('  User  - username: user, password: user123');
    console.log('\nPlease change these passwords in production!');
    process.exit(0);
  }, 1000);
}

initDatabase();
