require('dotenv').config();

const app = require('./src/app');
const bot = require('./src/bot');
const models = require('./src/models');

bot.login(process.env.discord_bot_token);

models.database.sync().then(() => {
    const server = app.listen(process.env.port || 3000, () => {
        console.log(`API lancé sur http://127.0.0.1:${server.address().port}`);
    });
}).catch(console.error);
