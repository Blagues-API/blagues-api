const Sequelize = require('sequelize');

const { POSTGRES_USER, POSTGRES_HOST, POSTGRES_PASSWORD, POSTGRES_DATABASE } = process.env;

const database = new Sequelize(
    {
        storage: '.../database.sqlite',
        dialect: 'sqlite',
        logging: false,
        sync: { alter: false },
        pool: {
            max: 10,
            min: 0,
            idle: 10000,
            acquire: 30000,
        },
    });

class Database {
    static get db() {
        return database;
    }

    static start() {
        database.authenticate()
            .then(() => console.log('[POSTGRES]: Connection to database has been established successfully.'))
            .then(() => console.log('[POSTGRES]: Synchronizing database...'))
            .then(() => database.sync()
                .then(() => console.log('[POSTGRES]: Done Synchronizing database!'))
                .catch(error => console.error(`[POSTGRES]: Error synchronizing the database: \n${error}`))
            )
            .catch(error => {
                console.error(`[POSTGRES]: Unable to connect to the database: \n${error}`);
                console.error('[POSTGRES]: Try reconnecting in 5 seconds...');
                setTimeout(() => Database.start(), 20000);
            });
    }
}

module.exports = Database;
