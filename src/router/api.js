const express = require('express');
const router = express.Router();

const { generateKey, generateAPIToken } = require('../utils');

const auth = require('../middlewares/auth-api');

const { Users } = require('../models');

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

router.post('/regenerate', async (req, res) => {
    console.log(req, res);
    if(!req.body || req.body !== req.auth.key) {
        return res.status(400).json({
            status: 400,
            error: 'Bad Request',
            message: 'Key is missing',
        });
    }

    try {
        const key = generateKey();
        const token = await generateAPIToken(req.auth.id, key, 100);

        await Users.update({
            token_key: key,
            token: token,
        }, {
            where: { user_id: req.auth.id },
        });

        return res.status(200).json(token);
    } catch (error) {
        return res.status(400).json({
            status: 500,
            error: 'Internal Server Error',
            message: 'Something went wrong',
        });
    }
});

router.get('*', (req, res) => {
    res.send('Try /api/random, /api/type/<joke_type>/random, or /api/id/<joke_id>');
});

module.exports = router;