import { compareTwoStrings } from 'string-similarity';
import Jokes from './jokes';
import { Categories, Category, Joke } from './typings';
import { random } from './utils';

export interface JokeResponse {
  error: boolean;
  response?: Joke;
}

export function randomJoke(disallow?: string[]): JokeResponse {
  let typesForbidden: string[] = [];

  if (disallow) {
    typesForbidden = Array.isArray(disallow) ? disallow : Array.of(disallow);

    if (typesForbidden.some((type) => !Categories.includes(type as Category))) {
      return {
        error: true
      };
    }
  }

  return {
    error: false,
    response: random(
      typesForbidden.length ? Jokes.list.filter((joke: Joke) => !typesForbidden.includes(joke.type)) : Jokes.list
    )
  };
}

export function randomJokeByType(type: string): JokeResponse {
  if (!Categories.includes(type as Category)) {
    return {
      error: true
    };
  }

  return {
    error: false,
    response: random(Jokes.list.filter((joke) => joke.type === type))
  };
}

export function randomJokeByKeywords(keys: string | string[], type?: string | string[]): JokeResponse {
  const response = random(jokesByKeywords(keys, type));

  if (!response) return { error: true };

  return {
    error: false,
    response
  };
}

export function jokeById(id: number): Joke | null {
  return Jokes.list.find((joke) => joke.id === id) ?? null;
}

export function jokeByQuestion(question: string): Joke | null {
  return Jokes.list.find((entry) => entry.joke === question) ?? null;
}

export function jokesByKeywords(keys: string | string[], type?: string | string[]) {
  const jokes = !type ? Jokes['list'] : Jokes.list.filter((joke) => type.includes(joke['type']));
  return jokes.filter((joke) => checkKeywordsInJoke(joke, keys));
}

export function checkKeywordsInJoke(joke: Joke, keys: string | string[]) {
  const keywords = Array.isArray(keys) ? keys : Array.of(keys);
  const word = `${joke.joke} ${joke.answer}`.split(' ').filter((word) => {
    for (const key of keywords) compareTwoStrings(word, key) >= 0.95;
  });
  return Array.from(new Set(word)).length >= keywords.length;
}
