FROM node:14
WORKDIR /app
COPY package.json ./
COPY yarn.lock ./

RUN yarn

COPY ./src/ ./src/
COPY .env index.js webpack.config.js blagues.json ./

RUN npx webpack --mode production

EXPOSE 3001

CMD node index.js
