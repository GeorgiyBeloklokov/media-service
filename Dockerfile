FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npx prisma generate

RUN npm run build

COPY scripts/init-db.js ./scripts/

CMD ["sh", "-c", "node scripts/init-db.js && node dist/src/main.js"]
