import { Snowflake } from 'discord-api-types';

export const jokeRole: Snowflake = process.env.JOKE_ROLE ?? '699244416849674310';
export const parrainRole: Snowflake = process.env.PARRAIN_ROLE ?? '877511831525154837';

export const suggestsChannel: Snowflake = process.env.SUGGESTIONS_CHANNEL ?? '698826767221391390';
export const correctionsChannel: Snowflake = process.env.CORRECTIONS_CHANNEL ?? '826856142793736213';
export const logsChannel: Snowflake = process.env.LOGS_CHANNEL ?? '763778635857133599';
export const commandsChannel: Snowflake = process.env.COMMANDS_CHANNEL ?? '821040840541077545';
export const remindersChannel: Snowflake = process.env.REMINDERS_CHANNEL ?? '920277899649613844';

export const neededApprovals: number = Number(process.env.APPROVALS_COUNT) || 3;

export const upReaction: Snowflake = '705115420495183979';
export const downReaction: Snowflake = '705115406976680117';

export const guildId: Snowflake = process.env.SERVER_ID ?? '698822532467523605';
export const emojisGuildId: Snowflake = process.env.EMOJIS_SERVER_ID ?? '698822532467523605';
