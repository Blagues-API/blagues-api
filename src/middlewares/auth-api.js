const jwt = require('jsonwebtoken');

module.exports = function() {
  return async function(req, res, next) {
    const bearerToken = req.header('Authorization');
    if (!bearerToken) {
      return res.status(401).json({
        status: 401,
        error: 'Unauthorized',
        message: 'Authorization header is required',
      });
    } else if (bearerToken.substring(0, 7) !== 'Bearer ') {
      return res.status(401).json({
        status: 401,
        error: 'Unauthorized',
        message:
          'Authorization header value must follow the Bearer <token> format',
      });
    }
    const token = bearerToken.split(' ')[1] || null;
    try {
      const decoded = jwt.verify(token, process.env.jwt_encryption_api);
      req.auth = decoded;
      if(process.env.NODE_ENV === 'production') {
        console.log(`API call: ${decoded.user_name} (${decoded.user_id})`);
      }
      return next();
    } catch (error) {
      return res.status(401).json({
        status: 401,
        error: 'Unauthorized',
        message: 'Invalid Token submitted',
      });
    }
  };
};
