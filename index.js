require('dotenv').config();

const app = require('./src/app');
const models = require('./src/models');

require('./src/bot');

models.database.sync().then(() => {
    const server = app.listen(process.env.port || 3000, () => {
        console.log(`API lancée sur http://127.0.0.1:${server.address().port}`);
    });
}).catch(console.error);
