module.exports = {
  apps: [
    {
      name: 'steam-auth-backend',
      script: './backend/src/server.js',
      cwd: '/root/Steamget',
      instances: 1,
      exec_mode: 'fork',
      env_file: '/root/Steamget/backend/.env',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '/root/Steamget/logs/pm2-error.log',
      out_file: '/root/Steamget/logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '500M',
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'data']
    }
  ]
};

