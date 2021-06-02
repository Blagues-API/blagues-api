const jokes = require('../../blagues.json');
const { random } = require('../utils');

const typesRefs = {
  global: 'Général',
  dark: 'Noir',
  dev: 'Développeur',
  limit: 'Limite limite',
  beauf: 'Beauf',
  blondes: 'Blondes',
};

const randomJoke = disallow => {
  const typesForbidden = Array.isArray(disallow) ? disallow : Array.of(disallow);
  if (
    disallow &&
    typesForbidden.some(type => !Object.keys(typesRefs).includes(type))
  ) {
    return {
      error: true,
      message: 'Bad type provided',
    };
  }
  return {
    error: false,
    response: random(
      disallow
        ? jokes.filter(joke => !typesForbidden.includes(joke.type))
        : jokes,
    ),
  };
};

const jokeById = id => {
  return jokes.find(joke => joke.id === id);
};

const randomJokeByType = type => {
  if (!Object.keys(typesRefs).includes(type)) {
    return {
      error: true,
      message: 'Bad type provided',
    };
  }
  return {
    error: false,
    response: random(jokes.filter(joke => joke.type === type)),
  };
};

const jokesCount = () => {
  return jokes.length;
};

module.exports = {
  randomJoke,
  randomJokeByType,
  jokeById,
  jokesCount,
  typesRefs,
};
