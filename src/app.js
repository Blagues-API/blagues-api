const express = require('express');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const cookies = require('cookies');
// const secure = require('express-force-https')

const cors = require('./middlewares/cors');
const routes = require('./router');

const app = express();

app.use(bodyParser.json());
app.use(helmet());
app.use(cookieParser());
app.use(cookies.express(['random key']));
// app.use(secure);
app.use(cors());

app.use('/', express.static(__dirname + '/public/'));
app.use('/files', express.static(__dirname + '/../dist'));

app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

app.locals.getTypeName = function(key) {
    const types = {
        'limit': 'Blague limite limite',
        'global': 'Blague normale',
        'dark': 'Blague humour noir',
        'dev': 'Blague de développeurs',
        'beauf': 'Humour de beaufs',
        'blondes': 'Blagues blondes',
    };
    return types[key];
};

app.use('/', routes);

module.exports = app;