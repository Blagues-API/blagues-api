const express = require('express');
const router = express.Router();

const { generateKey, generateAPIToken } = require('../utils');

const auth = require('../middlewares/auth-api');

const { Users } = require('../models');

const {
  randomJoke,
  randomJokeByType,
  jokeById,
  typesRefs,
} = require('../controllers/JokeController');

router.use(auth());

router.get('/types', (req, res) => {
  const keys = Object.keys(typesRefs);
  return res.json({
    count: keys.length,
    accepted_types: keys,
    keys: typesRefs,
  });
});

router.get('/random', (req, res) => {
  const joke = randomJoke(req.query.disallow);
  if (joke.error) {
    return res.status(400).json({
      status: 400,
      error: 'Bad Request',
      message: joke.message,
    });
  }
  return res.status(200).json(joke.response);
});

router.get('/type/:type/random', (req, res) => {
  const joke = randomJokeByType(req.params.type);
  if (joke.error) {
    return res.status(400).json({
      status: 400,
      error: 'Bad Request',
      message: joke.message,
    });
  }
  return res.status(200).json(joke.response);
});

router.get('/id/:id', (req, res) => {
  const joke = jokeById(Number(req.params.id));
  if (!joke) {
    return res.status(404).json({
      status: 404,
      error: 'Not found',
      message: 'Joke not found',
    });
  }
  return res.status(200).json(joke);
});

router.post('/regenerate', async (req, res) => {
  if (!req.body || req.body.key !== req.auth.key) {
    return res.status(400).json({
      status: 400,
      error: 'Bad Request',
      message: 'Key is missing',
    });
  }

  try {
    const key = generateKey();
    const token = await generateAPIToken(req.auth.user_id, key, 100);

    await Users.update(
      {
        token_key: key,
        token: token,
      },
      {
        where: { user_id: req.auth.user_id },
      },
    );

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
  return res.send('Check documentation: https://www.blagues-api.fr/');
});

module.exports = router;
