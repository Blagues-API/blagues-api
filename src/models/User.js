const Sequelize = require('sequelize');

const Database = require('../services/PostgreSQL');

const users = Database.db.define('users', {
    user_id: {
        type: Sequelize.STRING,
        primaryKey: true,
        allowNull: false
    },
    user_name: Sequelize.STRING,
    user_avatar: Sequelize.STRING,
    user_token: Sequelize.TEXT,
    user_token_refresh: Sequelize.TEXT,
    token: Sequelize.TEXT,
    limit: Sequelize.INTEGER,
}, {
    indexes: [{
        fields: ['user_id'],
    }],
    timestamps: false,
});

module.exports = users;