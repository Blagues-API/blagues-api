const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

const { Users } = require('../models');

module.exports = function() {
    return async function(req, res, next) {
        const auth = res.cookies.get('auth');

        if(auth) {
            const token = await jwt.verify(auth, process.env.jwt_encryption_web);
            const userRq = await fetch('http://discordapp.com/api/users/@me', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            const decoded = await userRq.json();
            req.user = await Users.findOne({ where: { user_id: decoded.id }, raw: true });
        }
        next();
    };
};