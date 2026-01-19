// 诊断登录问题
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const bcrypt = require('bcryptjs');
const db = require('./src/config/database');

console.log('=== 登录问题诊断 ===\n');

// 1. 检查环境变量
console.log('1. 检查环境变量:');
console.log('   JWT_SECRET:', process.env.JWT_SECRET ? '✅ 已设置' : '❌ 未设置');
console.log('   PORT:', process.env.PORT || '3000');
console.log('   DB_PATH:', process.env.DB_PATH || './data/database.sqlite');
console.log('');

// 2. 检查数据库连接
console.log('2. 检查数据库:');
db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
  if (err) {
    console.error('   ❌ 数据库查询失败:', err);
    process.exit(1);
  }
  console.log(`   ✅ 数据库连接正常，用户数量: ${row.count}`);
  console.log('');

  // 3. 检查用户和密码
  console.log('3. 检查用户和密码:');
  db.all('SELECT id, username, role, is_active, password_hash FROM users', async (err, users) => {
    if (err) {
      console.error('   ❌ 查询用户失败:', err);
      process.exit(1);
    }

    for (const user of users) {
      console.log(`\n   用户: ${user.username}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   角色: ${user.role}`);
      console.log(`   状态: ${user.is_active === 1 ? '✅ 激活' : '❌ 禁用'}`);
      console.log(`   密码哈希: ${user.password_hash.substring(0, 30)}...`);
      
      // 测试默认密码
      const testPasswords = ['admin123', 'user123'];
      for (const pwd of testPasswords) {
        const isValid = await bcrypt.compare(pwd, user.password_hash);
        if (isValid) {
          console.log(`   ✅ 密码 "${pwd}" 匹配`);
          break;
        }
      }
    }

    console.log('\n4. 测试登录流程:');
    const testUser = users.find(u => u.username === 'admin');
    if (!testUser) {
      console.log('   ❌ 找不到 admin 用户');
      process.exit(1);
    }

    if (testUser.is_active !== 1) {
      console.log('   ❌ admin 用户被禁用');
      process.exit(1);
    }

    const testPassword = 'admin123';
    const isValid = await bcrypt.compare(testPassword, testUser.password_hash);
    
    if (!isValid) {
      console.log('   ❌ 密码不匹配，正在重置...');
      const newHash = await bcrypt.hash(testPassword, 10);
      db.run('UPDATE users SET password_hash = ? WHERE username = ?', [newHash, 'admin'], (err) => {
        if (err) {
          console.error('   ❌ 重置密码失败:', err);
          process.exit(1);
        }
        console.log('   ✅ 密码已重置为 admin123');
      });
    } else {
      console.log('   ✅ 密码验证通过');
    }

    console.log('\n5. 检查 JWT_SECRET:');
    if (!process.env.JWT_SECRET) {
      console.log('   ❌ JWT_SECRET 未设置');
      console.log('   请检查 backend/.env 文件');
    } else {
      console.log('   ✅ JWT_SECRET 已设置');
      console.log(`   长度: ${process.env.JWT_SECRET.length} 字符`);
    }

    console.log('\n=== 诊断完成 ===');
    console.log('\n请使用以下命令测试登录:');
    console.log('curl -X POST http://127.0.0.1:3000/api/auth/login \\');
    console.log('  -H "Content-Type: application/json" \\');
    console.log('  -d \'{"username":"admin","password":"admin123"}\'');

    setTimeout(() => process.exit(0), 1000);
  });
});

