// 用户名生成工具

// 常见外文名
const foreignNames = [
  // 英文名
  'James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph', 'Thomas', 'Charles',
  'Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Jessica', 'Sarah', 'Karen',
  'Daniel', 'Matthew', 'Anthony', 'Mark', 'Donald', 'Steven', 'Paul', 'Andrew', 'Joshua', 'Kenneth',
  'Emily', 'Ashley', 'Kimberly', 'Melissa', 'Donna', 'Michelle', 'Dorothy', 'Carol', 'Amanda', 'Betty',
  'Christopher', 'Ryan', 'Nicholas', 'Eric', 'Jacob', 'Jonathan', 'Brandon', 'Tyler', 'Aaron', 'Adam',
  'Samantha', 'Rebecca', 'Laura', 'Cynthia', 'Kathleen', 'Amy', 'Angela', 'Shirley', 'Anna', 'Brenda',
  
  // 日文名
  'Yuki', 'Sakura', 'Haruto', 'Sota', 'Yuuto', 'Hinata', 'Ren', 'Kaito', 'Aoi', 'Riku',
  'Hina', 'Yui', 'Mio', 'Akari', 'Mei', 'Saki', 'Nanami', 'Rina', 'Koharu', 'Ayaka',
  
  // 韩文名
  'Minho', 'Jiwoo', 'Seojun', 'Yuna', 'Jihoon', 'Seoah', 'Hajun', 'Jiwon', 'Dohyun', 'Suyeon',
  
  // 其他
  'Alex', 'Sam', 'Chris', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn'
]

// 默认词库（可自定义）
const defaultWordList = [
  'Dragon', 'Phoenix', 'Tiger', 'Wolf', 'Eagle', 'Lion', 'Bear', 'Hawk', 'Falcon', 'Raven',
  'Shadow', 'Storm', 'Thunder', 'Lightning', 'Flame', 'Frost', 'Wind', 'Ocean', 'Mountain', 'Sky',
  'Dark', 'Light', 'Fire', 'Ice', 'Steel', 'Gold', 'Silver', 'Crystal', 'Diamond', 'Ruby',
  'Knight', 'Warrior', 'Hunter', 'Ranger', 'Mage', 'Wizard', 'Ninja', 'Samurai', 'Assassin', 'Guardian',
  'Star', 'Moon', 'Sun', 'Nova', 'Cosmic', 'Nebula', 'Galaxy', 'Comet', 'Meteor', 'Aurora',
  'Blade', 'Sword', 'Arrow', 'Shield', 'Armor', 'Crown', 'Throne', 'King', 'Queen', 'Prince',
  'Cyber', 'Neon', 'Pixel', 'Digital', 'Virtual', 'Matrix', 'Code', 'Byte', 'Data', 'Tech',
  'Phantom', 'Ghost', 'Spirit', 'Soul', 'Dream', 'Vision', 'Echo', 'Whisper', 'Silent', 'Mystic'
]

// 生成随机字符串（乱码模式）
function generateRandomString(length = 8) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  
  // 确保首字母是字母
  const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
  result += letters.charAt(Math.floor(Math.random() * letters.length))
  
  for (let i = 1; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// 生成随机数字
function generateRandomNumber(digits = 4) {
  const min = Math.pow(10, digits - 1)
  const max = Math.pow(10, digits) - 1
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// 从数组中随机选择
function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

// 词库模式生成
export function generateFromWordList(customWords = null, wordCount = 2, addNumber = false, numberDigits = 4) {
  const words = customWords && customWords.length > 0 ? customWords : defaultWordList
  
  if (words.length === 0) {
    throw new Error('词库为空')
  }
  
  const selectedWords = []
  const usedIndices = new Set()
  
  // 随机选择指定数量的词
  for (let i = 0; i < wordCount; i++) {
    let index
    do {
      index = Math.floor(Math.random() * words.length)
    } while (usedIndices.has(index) && usedIndices.size < words.length)
    
    usedIndices.add(index)
    selectedWords.push(words[index])
  }
  
  let username = selectedWords.join('')
  
  if (addNumber) {
    username += generateRandomNumber(numberDigits)
  }
  
  return username
}

// 乱码模式生成
export function generateRandomUsername(length = 8, addNumber = false, numberDigits = 4) {
  let username = generateRandomString(length)
  
  if (addNumber) {
    username += generateRandomNumber(numberDigits)
  }
  
  return username
}

// 外文名模式生成
export function generateForeignName(addNumber = false, numberDigits = 4) {
  let username = randomChoice(foreignNames)
  
  if (addNumber) {
    username += generateRandomNumber(numberDigits)
  }
  
  return username
}

// 混合模式生成（外文名 + 词库）
export function generateMixedUsername(customWords = null, addNumber = false, numberDigits = 4) {
  const words = customWords && customWords.length > 0 ? customWords : defaultWordList
  const name = randomChoice(foreignNames)
  const word = randomChoice(words)
  
  let username = name + word
  
  if (addNumber) {
    username += generateRandomNumber(numberDigits)
  }
  
  return username
}

// 主生成函数
export function generateUsername(options = {}) {
  const {
    mode = 'wordlist', // 'wordlist', 'random', 'foreign', 'mixed'
    customWords = null,
    wordCount = 2,
    length = 8,
    addNumber = false,
    numberDigits = 4
  } = options
  
  switch (mode) {
    case 'wordlist':
      return generateFromWordList(customWords, wordCount, addNumber, numberDigits)
    case 'random':
      return generateRandomUsername(length, addNumber, numberDigits)
    case 'foreign':
      return generateForeignName(addNumber, numberDigits)
    case 'mixed':
      return generateMixedUsername(customWords, addNumber, numberDigits)
    default:
      return generateFromWordList(customWords, wordCount, addNumber, numberDigits)
  }
}

// 获取默认词库
export function getDefaultWordList() {
  return [...defaultWordList]
}

// 获取外文名列表
export function getForeignNames() {
  return [...foreignNames]
}
