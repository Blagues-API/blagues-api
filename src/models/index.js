const Sequelize = require('sequelize');
const sqlite3 = require('sqlite3');
const path = require('path');

const database = new Sequelize({
  storage: path.resolve(__dirname, '../../database.sqlite'),
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

const models = {
  Users: require('./User')(database, Sequelize.DataTypes),
};

module.exports = {
  Sequelize,
  database,
  ...models,
};
