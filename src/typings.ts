export interface Joke {
  id: number;
  type: Category;
  joke: string;
  answer: string;
}

export type UnsignedJoke = Omit<Joke, 'id'>;

export type JokeKey = 'id' | 'type' | 'joke' | 'answer';

export interface JokeNotPublished {
  message_id: string;
  type: Category;
  joke: string;
  answer: string;
}

export type JokeNotPublishedKey = 'message_id' | 'type' | 'joke' | 'answer';

export enum Categories {
  GLOBAL = 'global',
  DEV = 'dev',
  DARK = 'dark',
  LIMIT = 'limit',
  BEAUF = 'beauf',
  BLONDES = 'blondes'
}

export const JokeTypes = ['global', 'dev', 'dark', 'limit', 'beauf', 'blondes'];

export const JokeTypesRefs: Record<Category, CategoryName> = {
  global: 'Général',
  dark: 'Noir',
  dev: 'Développeur',
  limit: '18+',
  beauf: 'Beauf',
  blondes: 'Blondes'
};

export const JokeTypesRefsReverse: Record<CategoryName, Category> = {
  Général: 'global',
  Noir: 'dark',
  Développeur: 'dev',
  '18+': 'limit',
  Beauf: 'beauf',
  Blondes: 'blondes'
};

export const JokeTypesDescriptions = {
  global: 'Blagues tout public, accessibles pour tous.',
  dark: 'Blagues qui souligne avec cruauté certains faits.',
  dev: 'Blagues orientées pour les développeurs & geeks.',
  limit: 'Blagues portées sur la sexualité.',
  beauf: 'Blagues vulgaires et généralement stéréotypées.',
  blondes: 'Blagues ciblées sur les femmes blondes.'
};

export type Category =
  | 'global'
  | 'dev'
  | 'dark'
  | 'limit'
  | 'beauf'
  | 'blondes';

export type CategoryName =
  | 'Général'
  | 'Noir'
  | 'Développeur'
  | '18+'
  | 'Beauf'
  | 'Blondes';

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
