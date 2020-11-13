module.exports = function () {
  return function (req, res, next) {
    res.set('Access-Control-Allow-Origin', '*')
    next()
  }
}
