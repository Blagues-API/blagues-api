const jokes = require('../../blagues.json');
const { random } = require('../utils');

const randomJoke = () => {
    return random(jokes);
};

const jokeById = (id) => {
    return jokes.find(joke => joke.id === id);
};

const randomJokeByType = (type) => {
  return random(jokes.filter(joke => joke.type === type));
};

module.exports = { randomJoke, randomJokeByType, jokeById };