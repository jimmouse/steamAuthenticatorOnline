// 测试登录脚本
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const bcrypt = require('bcryptjs');
const db = require('./src/config/database');

async function testLogin() {
  console.log('=== 测试登录功能 ===\n');
  
  // 1. 检查数据库中的用户
  console.log('1. 检查数据库中的用户：');
  db.all('SELECT id, username, role, is_active FROM users', (err, users) => {
    if (err) {
      console.error('数据库查询错误:', err);
      process.exit(1);
    }
    
    console.log(JSON.stringify(users, null, 2));
    console.log('');
    
    // 2. 测试密码验证
    console.log('2. 测试密码验证：');
    const testUsername = 'admin';
    const testPassword = 'admin123';
    
    db.get('SELECT * FROM users WHERE username = ?', [testUsername], async (err, user) => {
      if (err) {
        console.error('查询用户错误:', err);
        process.exit(1);
      }
      
      if (!user) {
        console.error('用户不存在:', testUsername);
        process.exit(1);
      }
      
      console.log(`用户存在: ${user.username}`);
      console.log(`密码哈希: ${user.password_hash.substring(0, 20)}...`);
      console.log(`用户状态: ${user.is_active === 1 ? '激活' : '禁用'}`);
      console.log('');
      
      // 验证密码
      const isValid = await bcrypt.compare(testPassword, user.password_hash);
      console.log(`3. 密码验证结果: ${isValid ? '✅ 正确' : '❌ 错误'}`);
      
      if (!isValid) {
        console.log('\n⚠️  密码不匹配！');
        console.log('正在重置密码为 admin123...');
        
        const newHash = await bcrypt.hash(testPassword, 10);
        db.run('UPDATE users SET password_hash = ? WHERE username = ?', [newHash, testUsername], (err) => {
          if (err) {
            console.error('重置密码失败:', err);
            process.exit(1);
          }
          
          console.log('✅ 密码已重置为 admin123');
          console.log('\n请使用以下凭据登录：');
          console.log(`用户名: ${testUsername}`);
          console.log(`密码: ${testPassword}`);
          process.exit(0);
        });
      } else {
        console.log('\n✅ 密码验证通过！');
        console.log('\n请检查：');
        console.log('1. 后端服务是否正常运行: pm2 status');
        console.log('2. 后端日志: pm2 logs steam-auth-backend --lines 30');
        console.log('3. 测试 API: curl -X POST http://127.0.0.1:3000/api/auth/login -H "Content-Type: application/json" -d \'{"username":"admin","password":"admin123"}\'');
        process.exit(0);
      }
    });
  });
}

testLogin();

