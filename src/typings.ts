

export interface Joke {
  id: number;
  type: Category;
  joke: string;
  answer: string;
}

export enum Categories {
  GLOBAL = 'global',
  DEV = 'dev',
  DARK = 'dark',
  LIMIT = 'limit',
  BEAUF = 'beauf',
  BLONDES = 'blondes'
}

export const JokeTypes = ['global', 'dev', 'dark', 'limit', 'beauf', 'blondes'];
export const JokeTypesRefs = {
  global: 'Général',
  dark: 'Noir',
  dev: 'Développeur',
  limit: 'Limite limite',
  beauf: 'Beauf',
  blondes: 'Blondes'
};

export type Category =
  | 'global'
  | 'dev'
  | 'dark'
  | 'limit'
  | 'beauf'
  | 'blondes';

/*
See api src/app/api/index.ts file for more informations

export interface JokePayload {
  type: Category;
  joke: string;
  answer: string;
}

export type JokePayloadKey =
  | 'type'
  | 'joke'
  | 'answer'
*/
