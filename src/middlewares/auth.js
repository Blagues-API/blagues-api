const jwt = require('jsonwebtoken')

module.exports = function() {
    return function(req, res, next) {
      const bearerToken = req.header('Authorization')
      if (!bearerToken) {
        return res.status(400).send({
            status: 400,
            error: 'Bad Request',
            message: 'Authorization header is required'
        })
      } else if (bearerToken.substring(0,7) !== "Bearer ") {
        return res.status(400).send({
            status: 400,
            error: 'Bad Request',
            message:  'Authorization header value must follow the Bearer <token> format'
        })
      }
      const token = bearerToken.split(' ')[1] || null
      jwt.verify(token, process.env.jwt_encryption, function(err, decoded) {
         if (err) {
            return res.status(400).send({
                status: 400,
                error: 'Bad Request',
                message:  'Invalid Token submitted'
            })
         }
         req.user = decoded
         return next()
      })
    }
}