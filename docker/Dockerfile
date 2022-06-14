FROM node:18.3 as builder
WORKDIR /app

COPY --chown=node:node package.json yarn.lock ./
COPY --chown=node:node tsconfig.json ./

RUN yarn install

COPY --chown=node:node ./src ./src
COPY --chown=node:node ./prisma ./prisma
COPY --chown=node:node .env .

COPY --chown=node:node ./blagues.json ./

RUN npx prisma generate
RUN npx tsc

FROM node:18.3 as production
WORKDIR /app

COPY --chown=node:node package.json yarn.lock ./

RUN npm set-script prepare ""
RUN yarn install --frozen-lockfile

COPY --chown=node:node ./blagues.json .
COPY --from=builder --chown=node:node /app/build .
COPY --from=builder --chown=node:node /app/prisma ./prisma
COPY --from=builder --chown=node:node /app/node_modules/@prisma/client/ ./node_modules/@prisma/client/
COPY --from=builder --chown=node:node /app/node_modules/.prisma/client/ ./node_modules/.prisma/client/

ENV NODE_ENV=production

EXPOSE 4000

USER node

CMD node src/index.js
