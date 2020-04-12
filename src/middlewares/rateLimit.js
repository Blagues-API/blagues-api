const moment = require('moment');

let hostsStats = {};

setInterval(() => {
    hostsStats = {}
}, 10000);

module.exports = (req, res, next) => {
    const requester = String(req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown');
    
    const limit = req.user.limit || 100;

    if (!hostsStats[requester]) {
        hostsStats[requester] = 1;
    } else {
        hostsStats[requester] = hostsStats[requester] + 1;
    }

    if (rateLimitedIps[requester] > limit) {
      res.status(429).send({
        status: 429,
        error: "Too Many Requests",
        message: `Your ip has exceeded your limit of ${limit} requests per 10 seconds. Please try again.`
      })
    }

    next();
}