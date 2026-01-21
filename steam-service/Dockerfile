FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY . .

RUN mkdir -p /app/data/sessions

EXPOSE 3020

ENV NODE_ENV=production

CMD ["node", "src/server.js"]
