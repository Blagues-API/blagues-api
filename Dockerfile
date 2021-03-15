FROM node:14
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY ./src/ ./src/
COPY .env index.js webpack.config.js blagues.json ./

RUN npx webpack --mode production

EXPOSE 3001

CMD node index.js
