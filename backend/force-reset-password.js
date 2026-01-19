// 强制重置密码脚本
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const bcrypt = require('bcryptjs');
const db = require('./src/config/database');

async function resetPassword() {
  console.log('=== 强制重置密码 ===\n');
  
  const adminPassword = await bcrypt.hash('admin123', 10);
  const userPassword = await bcrypt.hash('user123', 10);
  
  console.log('正在重置 admin 密码...');
  db.run(
    'UPDATE users SET password_hash = ? WHERE username = ?',
    [adminPassword, 'admin'],
    function(err) {
      if (err) {
        console.error('重置 admin 密码失败:', err);
      } else {
        console.log(`✅ admin 密码已重置 (影响行数: ${this.changes})`);
      }
      
      console.log('\n正在重置 user 密码...');
      db.run(
        'UPDATE users SET password_hash = ? WHERE username = ?',
        [userPassword, 'user'],
        function(err) {
          if (err) {
            console.error('重置 user 密码失败:', err);
          } else {
            console.log(`✅ user 密码已重置 (影响行数: ${this.changes})`);
          }
          
          // 验证密码
          console.log('\n验证密码...');
          db.all('SELECT username, password_hash FROM users WHERE username IN (?, ?)', ['admin', 'user'], async (err, users) => {
            if (err) {
              console.error('查询失败:', err);
              process.exit(1);
            }
            
            for (const user of users) {
              const testPassword = user.username === 'admin' ? 'admin123' : 'user123';
              const isValid = await bcrypt.compare(testPassword, user.password_hash);
              console.log(`${user.username}: ${isValid ? '✅ 密码正确' : '❌ 密码错误'}`);
            }
            
            console.log('\n=== 完成 ===');
            console.log('\n默认账户:');
            console.log('  admin / admin123');
            console.log('  user / user123');
            
            process.exit(0);
          });
        }
      );
    }
  );
}

resetPassword();

