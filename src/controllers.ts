import Jokes from './jokes';
import { Joke, Categories, Category } from './typings';
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
    response: random(Jokes.list.filter((joke: Joke) => joke.type === type))
  };
}

export function jokeById(id: number): Joke | null {
  return Jokes.list.find((joke: Joke) => joke.id === id) ?? null;
}

export function jokeByQuestion(question: string): Joke | null {
  return Jokes.list.find((entry: Joke) => entry.joke === question) ?? null;
}
