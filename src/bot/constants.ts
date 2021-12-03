import { Snowflake } from 'discord-api-types';

export const jokeRole: Snowflake = process.env.JOKE_ROLE ?? '699244416849674310';
export const parrainRole: Snowflake = process.env.PARRAIN_ROLE ?? '877511831525154837';

export const suggestsChannel: Snowflake = process.env.SUGGESTIONS_CHANNEL ?? '698826767221391390';
export const correctionsChannel: Snowflake = process.env.CORRECTIONS_CHANNEL ?? '826856142793736213';
export const logsChannel: Snowflake = process.env.LOGS_CHANNEL ?? '908302746665500682';

export const neededApprovals: number = Number(process.env.APPROVALS_COUNT) || 3;

export const upReaction: Snowflake = '705115420495183979';
export const downReaction: Snowflake = '705115406976680117';

export const emojisGuildId: Snowflake = process.env.EMOJIS_SERVER_ID ?? '698822532467523605';
