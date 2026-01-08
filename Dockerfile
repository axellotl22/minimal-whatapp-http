FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache git

COPY package*.json ./

EXPOSE 3000

CMD ["sh", "-c", "npm install && node src/index.js"]
