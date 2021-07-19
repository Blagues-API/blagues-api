

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
export const JokeTypesRefs: object = {
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
