module.exports = function() {
    return function(req, res, next) {
        res.set("Access-Control-Allow-Origin", "*")
        res.set("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type")
        next()
    }
}