// 检查数据库路径和内容
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const path = require('path');
const fs = require('fs');

console.log('=== 检查数据库配置 ===\n');

const dbPath = process.env.DB_PATH || './data/database.sqlite';
const absolutePath = path.resolve(__dirname, dbPath);

console.log('当前工作目录:', process.cwd());
console.log('脚本目录:', __dirname);
console.log('DB_PATH 环境变量:', process.env.DB_PATH || '(未设置，使用默认值)');
console.log('数据库路径 (相对):', dbPath);
console.log('数据库路径 (绝对):', absolutePath);
console.log('数据库文件是否存在:', fs.existsSync(absolutePath));

if (fs.existsSync(absolutePath)) {
  const stats = fs.statSync(absolutePath);
  console.log('数据库文件大小:', stats.size, '字节');
  console.log('数据库文件修改时间:', stats.mtime);
}

// 检查是否有其他数据库文件
console.log('\n=== 查找所有数据库文件 ===');
const dataDir = path.resolve(__dirname, './data');
if (fs.existsSync(dataDir)) {
  const files = fs.readdirSync(dataDir);
  files.forEach(file => {
    if (file.endsWith('.sqlite') || file.endsWith('.db')) {
      const filePath = path.join(dataDir, file);
      const stats = fs.statSync(filePath);
      console.log(`  ${file}: ${stats.size} 字节, 修改时间: ${stats.mtime}`);
    }
  });
}

// 检查后端实际使用的数据库
console.log('\n=== 检查数据库内容 ===');
const db = require('./src/config/database');
db.all('SELECT id, username, role, is_active, length(password_hash) as hash_len FROM users', (err, rows) => {
  if (err) {
    console.error('查询失败:', err);
  } else {
    console.log('数据库中的用户:');
    console.log(JSON.stringify(rows, null, 2));
  }
  
  db.close((err) => {
    if (err) console.error('关闭数据库失败:', err);
    process.exit(0);
  });
});

