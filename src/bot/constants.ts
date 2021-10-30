import { Snowflake } from 'discord-api-types';

export const jokeRole: Snowflake =
  process.env.JOKE_ROLE ?? '699244416849674310';
export const parrainRole: Snowflake =
  process.env.PARRAIN_ROLE ?? '877511831525154837';

export const suggestsChannel: Snowflake =
  process.env.SUGGESTION_CHANNEL ?? '698826767221391390';
export const correctionChannel: Snowflake =
  process.env.CORRECTION_CHANNEL ?? '826856142793736213';

export const upReaction: Snowflake = '705115420495183979';
export const downReaction: Snowflake = '705115406976680117';

export const guildId: Snowflake = '698822532467523605';
