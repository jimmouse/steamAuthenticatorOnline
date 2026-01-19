// 直接测试登录逻辑
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('./src/config/database');

async function testLogin() {
  console.log('=== 直接测试登录逻辑 ===\n');
  
  const username = 'admin';
  const password = 'admin123';
  
  console.log(`测试登录: ${username} / ${password}\n`);
  
  db.get('SELECT * FROM users WHERE username = ? AND is_active = 1', [username], async (err, user) => {
    if (err) {
      console.error('数据库错误:', err);
      process.exit(1);
    }
    
    if (!user) {
      console.log('❌ 用户不存在或已被禁用');
      process.exit(1);
    }
    
    console.log('✅ 找到用户:');
    console.log(`   ID: ${user.id}`);
    console.log(`   用户名: ${user.username}`);
    console.log(`   角色: ${user.role}`);
    console.log(`   状态: ${user.is_active === 1 ? '激活' : '禁用'}`);
    console.log(`   密码哈希: ${user.password_hash.substring(0, 30)}...`);
    console.log('');
    
    console.log('验证密码...');
    const validPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!validPassword) {
      console.log('❌ 密码验证失败');
      console.log(`   输入的密码: ${password}`);
      console.log(`   密码哈希: ${user.password_hash}`);
      process.exit(1);
    }
    
    console.log('✅ 密码验证成功！');
    console.log('\n登录应该成功，但实际失败了。');
    console.log('可能的原因：');
    console.log('1. 后端服务连接的是不同的数据库文件');
    console.log('2. 后端服务的工作目录不对');
    console.log('3. 后端服务没有重启，还在使用旧的数据库连接');
    
    db.close();
    process.exit(0);
  });
}

testLogin();

