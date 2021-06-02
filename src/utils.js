const moment = require('moment');
const jwt = require('jsonwebtoken');

const random = items => {
  return items[Math.floor(Math.random() * items.length)];
};

const generateAPIToken = (userId, key, limit) => {
  return jwt.sign(
    {
      user_id: userId,
      limit,
      key,
      created_at: moment().format(),
    },
    process.env.jwt_encryption_api,
  );
};

const generateKey = () => {
  let result = '';
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  for (let i = 0; i < 50; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

module.exports = {
  generateAPIToken,
  random,
  generateKey,
};
