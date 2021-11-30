/**
 * Standard joke interface
 */

export interface Joke {
  id: number;
  type: Category;
  joke: string;
  answer: string;
}

export type JokeKey = keyof Joke;

export type UnsignedJoke = Omit<Joke, 'id'>;

export type UnsignedJokeKey = keyof UnsignedJoke;

/**
 * Unpublished joke interface
 */

export interface UnpublishedJoke {
  message_id: string;
  type: Category;
  joke: string;
  answer: string;
}
export type UnpublishedJokeKey = keyof UnpublishedJoke;

/**
 * Joke categories
 */

export const Categories = ['global', 'dev', 'dark', 'limit', 'beauf', 'blondes'] as const;

export type Category = typeof Categories[number];

/**
 * Joke references
 */

export const CategoriesRefs: Record<Category, string> = {
  global: 'Général',
  dark: 'Noir',
  dev: 'Développeur',
  limit: '18+',
  beauf: 'Beauf',
  blondes: 'Blondes'
};

export const JokeTypesDescriptions: Record<Category, string> = {
  global: 'Blagues tout public, accessibles pour tous.',
  dark: 'Blagues qui souligne avec cruauté certains faits.',
  dev: 'Blagues orientées pour les développeurs & geeks.',
  limit: 'Blagues portées sur la sexualité.',
  beauf: 'Blagues vulgaires et généralement stéréotypées.',
  blondes: 'Blagues ciblées sur les femmes blondes.'
};
