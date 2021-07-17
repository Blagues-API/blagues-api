import data from '../blagues.json';
import { Joke, JokeTypes } from './typings';
import { random } from './utils';

const jokes = data as Joke[];

export const randomJoke = (disallow: string[]) => {
  const typesForbidden = Array.isArray(disallow)
    ? disallow
    : Array.of(disallow);

  if (disallow && typesForbidden.some((type) => !JokeTypes.includes(type))) {
    return {
      error: true
    };
  }

  return {
    error: false,
    response: random(
      disallow
        ? jokes.filter((joke: Joke) => !typesForbidden.includes(joke.type))
        : jokes
    )
  };
};

export const randomJokeByType = (type: string) => {
  if (!JokeTypes.includes(type)) {
    return {
      error: true
    };
  }

  return {
    error: false,
    response: random(jokes.filter((joke: Joke) => joke.type === type))
  };
};

export const jokeById = (id: number) => {
  return jokes.find((joke: Joke) => joke.id === id);
};

export const jokesCount = () => {
  return jokes.length;
};
