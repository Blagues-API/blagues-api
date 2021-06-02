module.exports = (database, DataTypes) => {
  return database.define(
    'users',
    {
      user_id: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
      },
      user_name: DataTypes.STRING,
      user_avatar: DataTypes.STRING,
      user_token: DataTypes.TEXT,
      user_token_refresh: DataTypes.TEXT,
      token: DataTypes.TEXT,
      token_key: DataTypes.STRING,
      limit: DataTypes.INTEGER,
    },
    {
      indexes: [
        {
          fields: ['user_id'],
        },
      ],
      timestamps: false,
    },
  );
};
