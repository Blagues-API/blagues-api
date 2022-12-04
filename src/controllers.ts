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

export function jokesByKeywords(query: string | string[], disallow?: string | string[]) {
  const jokes = !disallow ? Jokes['list'] : Jokes.list.filter((joke) => !disallow.includes(joke['type']));
  return jokes.filter((joke) => checkKeywordsInJoke(joke, query));
}

export function checkKeywordsInJoke(joke: Joke, query: string | string[]) {
  const keywords = Array.isArray(query) ? query : Array.of(query);
  const word = `${joke.joke} ${joke.answer}`.split(' ').filter((word) => {
    for (const key of keywords) {
      if (compareTwoStrings(word, key) >= 0.95) return true;
    }
  });
  return Array.from(new Set(word)).length >= keywords.length;
}
