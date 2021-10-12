FROM node:16.6.1 as builder
WORKDIR /app

COPY package*.json ./

RUN npm ci --ignore-scripts

COPY tsconfig.json ./

COPY ./src ./src
COPY ./prisma ./prisma
COPY .env tsconfig.json ./
COPY blagues.json ./

RUN npx tsc
RUN npx prisma generate
RUN prisma migrate deploy

FROM node:16.6.1
WORKDIR /app

COPY package*.json ./

RUN npm ci --production --ignore-scripts

COPY --from=builder /app/build ./
COPY --from=builder /app/node_modules/@prisma/client/ ./node_modules/@prisma/client/
COPY --from=builder /app/node_modules/.prisma/client/ ./node_modules/.prisma/client/

EXPOSE 3000
EXPOSE 4000

CMD node index.js
