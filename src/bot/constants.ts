import { Snowflake } from 'discord-api-types/v9';

export const jokerRoleId: Snowflake = process.env.JOKER_ROLE ?? '699244416849674310';
export const correctorRoleId: Snowflake = process.env.CORRECTOR_ROLE ?? '829996106808426516';
export const godfatherRoleId: Snowflake = process.env.GODFATHER_ROLE ?? '877511831525154837';

export const suggestionsChannelId: Snowflake = process.env.SUGGESTIONS_CHANNEL ?? '698826767221391390';
export const correctionsChannelId: Snowflake = process.env.CORRECTIONS_CHANNEL ?? '826856142793736213';
export const logsChannelId: Snowflake = process.env.LOGS_CHANNEL ?? '763778635857133599';
export const commandsChannelId: Snowflake = process.env.COMMANDS_CHANNEL ?? '821040840541077545';
export const remindersChannelId: Snowflake = process.env.REMINDERS_CHANNEL ?? '920277899649613844';

export const neededSuggestionsApprovals: number = Number(process.env.SUGGESTIONS_APPROVALS_COUNT) || 3;
export const neededCorrectionsApprovals: number = Number(process.env.CORRECTIONS_APPROVALS_COUNT) || 2;

export const upReaction: Snowflake = process.env.UP_REACTION ?? '⬆️';
export const downReaction: Snowflake = process.env.DOWN_REACTION ?? '⬇️';

export const guildId: Snowflake = process.env.SERVER_ID ?? '698822532467523605';
export const emojisGuildId: Snowflake = process.env.EMOJIS_SERVER_ID ?? '698822532467523605';

export enum Colors {
  PRIMARY = 0x245f8d,
  SUCCESS = 0x248d5f,
  DANGER = 0x8d2424,
  INFO = 0xffda83,

  PROPOSED = 0x245f8d,
  ACCEPTED = 0x248d5f,
  REFUSED = 0x8d2424,
  REPLACED = 0xffe83b
}

export const dataSplitRegex = /(?<base>(?:\n?> .+)+)(?:\n(?<correction>:warning: .+))?(?:\n\n?(?<godfathers>.+))?/;
