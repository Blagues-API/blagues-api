import jokes from '../blagues.json';
import { random } from './utils';

export const typesRefs: object = {
  global: 'Général',
  dark: 'Noir',
  dev: 'Développeur',
  limit: 'Limite limite',
  beauf: 'Beauf',
  blondes: 'Blondes',
};

export const randomJoke = (disallow: string[]) => {

  const typesForbidden = Array.isArray(disallow) ? disallow : Array.of(disallow);
  if(disallow && typesForbidden.some(type => !Object.keys(typesRefs).includes(type))){
    return {
      error: true
    };
  }
  return {
    error: false,
    response: random(disallow ? jokes.filter(joke => !typesForbidden.includes(joke.type)) : jokes)
  }
}

export const randomJokeByType = (type: string) => {
  if(!Object.keys(typesRefs).includes(type)){
    return {
      error: true,
    }
  }
  return {
    error: false,
    response: random(jokes.filter(joke => joke.type === type))
  }
}

export const jokeById = (id:Number) => {
    return jokes.find(joke => joke.id === id)
}

export const jokesCount = () => {
  return jokes.length;
};
