const app = require('./src/app');
const models = require('./src/models');

const BlaguesAPIBot = require('./src/bot/blagues-api');

models.database
  .sync()
  .then(() => {
    const server = app.listen(process.env.port || 3000, () => {
      console.log(`API lancée sur http://127.0.0.1:${server.address().port}`);
    });
  })
  .catch(console.error);

const bot = new BlaguesAPIBot();

bot.login(process.env.discord_bot_token);
