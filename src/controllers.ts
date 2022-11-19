import Jokes from './jokes';
import { Categories, Category, Joke } from './typings';
import { random } from './utils';
import { compareTwoStrings } from 'string-similarity';

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
  // TODO : modifier pour que le type "random" soit accepté
  if (!Categories.includes(type as Category)) {
    return {
      error: true
    };
  }

  return {
    error: false,
    response: random(Jokes.list.filter((joke: Joke) => joke.type === type))
  };
}

export function jokeById(id: number): Joke | null {
  return Jokes.list.find((joke: Joke) => joke.id === id) ?? null;
}

export function jokeByQuestion(question: string): Joke | null {
  return Jokes.list.find((entry: Joke) => entry.joke === question) ?? null;
}

export function jokeByKeyword(keyword: string, type: string): Joke | null {
  const jokes = type === 'random' ? Jokes.list : Jokes.list.filter((joke: Joke) => joke.type === type);
  const joke = random(
    jokes.filter(
      (joke: Joke) =>
        `${joke.joke}${joke.answer}`.toLowerCase().includes(keyword.toLowerCase()) ||
        `${joke.joke} ${joke.answer}`.split(' ').filter((word: string) => compareTwoStrings(word, keyword) > 0.9)
    )
  );

  return joke;
}
