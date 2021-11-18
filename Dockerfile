FROM node:16.13.0 as builder
WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./

RUN npm install

COPY ./src ./src
COPY ./prisma ./prisma
COPY .env .

COPY ./blagues.json ./

RUN npx prisma generate
RUN npx tsc
RUN npm run nuxt:build

FROM node:16.13.0
WORKDIR /app

COPY package*.json ./

RUN npm set-script prepare ""
RUN npm ci --production

COPY ./blagues.json .
COPY --from=builder /app/build .
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/@prisma/client/ ./node_modules/@prisma/client/
COPY --from=builder /app/node_modules/.prisma/client/ ./node_modules/.prisma/client/
COPY --from=builder /app/src/nuxt ./src/nuxt/

RUN cp ./node_modules ./src/nuxt/node_modules

ENV NODE_ENV=production

EXPOSE 3000
EXPOSE 4000

CMD node src/index.js
