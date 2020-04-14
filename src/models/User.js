module.exports = (sequelize, Sequelize) => {
    return sequelize.define('users', {
        user_id: {
            type: Sequelize.STRING,
            primaryKey: true,
            allowNull: false,
        },
        user_name: Sequelize.STRING,
        user_avatar: Sequelize.STRING,
        user_token: Sequelize.TEXT,
        user_token_refresh: Sequelize.TEXT,
        token: Sequelize.TEXT,
        token_key: Sequelize.STRING,
        limit: Sequelize.INTEGER,
    }, {
        indexes: [{
            fields: ['user_id'],
        }],
        timestamps: false,
    });
};

