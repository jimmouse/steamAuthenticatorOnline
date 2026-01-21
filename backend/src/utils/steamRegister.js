const crypto = require('crypto');

// 生成随机Steam用户名
function generateUsername() {
  const prefixes = ['Steam', 'Game', 'Pro', 'Epic', 'Mega', 'Ultra', 'Super', 'Cyber', 'Dark', 'Fire'];
  const suffixes = ['Player', 'Gamer', 'Master', 'King', 'Lord', 'Hero', 'Warrior', 'Hunter', 'Ninja', 'Dragon'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  const number = Math.floor(Math.random() * 10000);
  return `${prefix}${suffix}${number}`;
}

// 生成强密码
function generatePassword(length = 16) {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*';
  
  const allChars = uppercase + lowercase + numbers + symbols;
  let password = '';
  
  // 确保至少包含每种字符
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // 填充剩余长度
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // 打乱顺序
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

// 生成邮箱（如果用户提供了域名）
function generateEmail(username, domain = null) {
  if (domain) {
    return `${username.toLowerCase()}@${domain}`;
  }
  return null;
}

module.exports = {
  generateUsername,
  generatePassword,
  generateEmail
};
