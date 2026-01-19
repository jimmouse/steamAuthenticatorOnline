// 模拟 PM2 环境检查数据库路径
const path = require('path');
const fs = require('fs');

console.log('=== 检查 PM2 环境下的数据库路径 ===\n');

// PM2 的工作目录
const pm2Cwd = '/root/Steamget';
const dbPathRelative = './data/database.sqlite';
const dbPathAbsolute = path.resolve(pm2Cwd, dbPathRelative);

console.log('PM2 工作目录 (cwd):', pm2Cwd);
console.log('数据库相对路径:', dbPathRelative);
console.log('数据库绝对路径:', dbPathAbsolute);
console.log('文件是否存在:', fs.existsSync(dbPathAbsolute));

if (fs.existsSync(dbPathAbsolute)) {
  const stats = fs.statSync(dbPathAbsolute);
  console.log('文件大小:', stats.size, '字节');
  console.log('修改时间:', stats.mtime);
} else {
  console.log('❌ 文件不存在！这就是问题所在！');
}

// 检查脚本目录下的数据库
const scriptDbPath = path.resolve(__dirname, './data/database.sqlite');
console.log('\n脚本目录下的数据库路径:', scriptDbPath);
console.log('文件是否存在:', fs.existsSync(scriptDbPath));

if (fs.existsSync(scriptDbPath)) {
  const stats = fs.statSync(scriptDbPath);
  console.log('文件大小:', stats.size, '字节');
  console.log('修改时间:', stats.mtime);
}

console.log('\n=== 解决方案 ===');
console.log('需要将数据库文件复制到 PM2 工作目录，或者修改数据库路径配置。');

