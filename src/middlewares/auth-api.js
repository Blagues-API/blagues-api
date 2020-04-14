const jwt = require('jsonwebtoken');

module.exports = function() {
    return async function(req, res, next) {
        const bearerToken = req.header('Authorization');
        if (!bearerToken) {
            return res.status(400).send({
                status: 400,
                error: 'Bad Request',
                message: 'Authorization header is required',
            });
        } else if (bearerToken.substring(0, 7) !== 'Bearer ') {
            return res.status(400).send({
                status: 400,
                error: 'Bad Request',
                message:  'Authorization header value must follow the Bearer <token> format',
            });
        }
        const token = bearerToken.split(' ')[1] || null;
        try {
            const decoded = await jwt.verify(token, process.env.jwt_encryption_api);
            req.auth = decoded;
            return next();
        } catch (error) {
            return res.status(400).send({
                status: 400,
                error: 'Bad Request',
                message:  'Invalid Token submitted',
            });
        }
    };
};