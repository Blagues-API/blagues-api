const jwt = require('jsonwebtoken');
const axios = require('axios');

const { Users } = require('../models');

module.exports = function() {
  return async function(req, res, next) {
    const auth = res.cookies.get('auth');

    if (auth) {
      const token = await jwt.verify(auth, process.env.jwt_encryption_web);
      try {
        const { data } = await axios.get(
          'http://discordapp.com/api/users/@me',
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const user = await Users.findOne({
          where: { user_id: data.id },
          raw: true,
        });
        req.user = user;
      } catch (error) {
        console.error('Auth-Web:', error);
      }
    }
    next();
  };
};
