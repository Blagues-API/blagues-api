const express = require('express');
const router = express.Router();

const auth = require('../middlewares/auth-api');

const { randomJoke, randomJokeByType, jokeById } = require('../controllers/JokeController');

router.use(auth());

router.get('/random', (req, res) => {
    res.json(randomJoke());
});

router.get('/type/:type/random', (req, res) => {
    res.json(randomJokeByType(req.params.type));
});

router.get('/id/:id', (req, res) => {
    res.json(jokeById(req.params.id));
});

router.get('*', (req, res) => {
    res.send('Try /api/random, /api/type/<joke_type>/random, or /api/id/<joke_id>');
});

module.exports = router;