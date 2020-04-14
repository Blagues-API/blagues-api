const Sequelize = require('sequelize');
const sqlite3 = require('sqlite3');

const database = new Sequelize({
    storage: './database.sqlite',
    dialectModule: sqlite3,
    dialect: 'sqlite',
    logging: false,
    sync: { alter: true },
    pool: {
        max: 10,
        min: 0,
        idle: 10000,
        acquire: 30000,
    },
});

module.exports = {
    Sequelize,
    database,
    Users: database.import('./User'),
};