// PM2 配置：路径全部相对于本文件所在目录，解压到任何位置都能用
const path = require('path');
const root = __dirname;

module.exports = {
  apps: [
    {
      name: 'steam-auth-backend',
      cwd: path.join(root, 'backend'),
      script: 'src/server.js',
      instances: 1,
      exec_mode: 'fork',
      // 低内存服务器：限制 V8 堆，超限自动重启
      node_args: '--max-old-space-size=96',
      max_memory_restart: '160M',
      env: { NODE_ENV: 'production' },
      autorestart: true,
      watch: false,
      error_file: path.join(root, 'logs', 'backend-error.log'),
      out_file: path.join(root, 'logs', 'backend-out.log'),
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'steam-service',
      cwd: path.join(root, 'steam-service'),
      script: 'src/server.js',
      instances: 1,
      exec_mode: 'fork',
      node_args: '--max-old-space-size=64',
      max_memory_restart: '120M',
      env: { NODE_ENV: 'production' },
      autorestart: true,
      watch: false,
      error_file: path.join(root, 'logs', 'steam-service-error.log'),
      out_file: path.join(root, 'logs', 'steam-service-out.log'),
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
