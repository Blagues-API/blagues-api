const express = require('express')
const bodyParser = require('body-parser')
const helmet = require('helmet');
// const secure = require('express-force-https')

const { cors, rateLimit } = require('./middlewares');
const routes = require('./router')

const app = express()

app.use(bodyParser.json())
app.use(helmet())
// app.use(secure);
app.use(cors())

app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

// app.use(middlewares.rateLimit)

app.use('/', routes)

module.exports = app;