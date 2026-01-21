FROM node:18-alpine

WORKDIR /app

# 安装必要的系统依赖
RUN apk update && apk add --no-cache python3 make g++

# 复制package文件
COPY package*.json ./

# 安装依赖
RUN npm install --production

# 复制源代码
COPY . .

# 创建必要的目录
RUN mkdir -p /app/data /app/uploads

# 创建启动脚本
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'echo "Initializing database..."' >> /app/start.sh && \
    echo 'node src/scripts/initDatabase.js' >> /app/start.sh && \
    echo 'node src/scripts/createSettingsTable.js' >> /app/start.sh && \
    echo 'node src/scripts/addTempUsers.js' >> /app/start.sh && \
    echo 'echo "Starting server..."' >> /app/start.sh && \
    echo 'node src/server.js' >> /app/start.sh && \
    chmod +x /app/start.sh

EXPOSE 3010

ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3010/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["/app/start.sh"]
