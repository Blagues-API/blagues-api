import { Approval, Disapproval, Proposal, Report } from '@prisma/client';

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

export const CategoriesRefsFull: Record<Category, string> = {
  global: 'Tout public',
  dark: 'Humour noir',
  dev: 'Blague de dev',
  limit: 'Blague 18+',
  beauf: 'Humour beauf',
  blondes: 'Blagues de blondes'
};

export const JokeTypesDescriptions: Record<Category, string> = {
  global: 'Blagues tout public, accessibles pour tous.',
  dark: 'Blagues qui souligne avec cruauté certains faits.',
  dev: 'Blagues orientées pour les développeurs & geeks.',
  limit: 'Blagues portées sur la sexualité.',
  beauf: 'Blagues vulgaires et généralement stéréotypées.',
  blondes: 'Blagues ciblées sur les femmes blondes.'
};

export const Reasons = ['DUPLICATE', 'INAPPROPRIATE'] as const;

export type Reason = typeof Reasons[number];

export const ReasonsRefs: Record<Reason, string> = {
  DUPLICATE: 'Doublon',
  INAPPROPRIATE: 'Inappropriée'
};

interface GodfathersDecisions {
  approvals: Approval[];
  disapprovals: Disapproval[];
}

export type ProposalExtended = Proposal & GodfathersDecisions;

export type Correction = ProposalExtended & {
  type: 'SUGGESTION_CORRECTION' | 'CORRECTION';
  suggestion: ProposalSuggestion;
};

export type Suggestion = ProposalExtended & {
  type: 'SUGGESTION';
  corrections: ProposalExtended[];
};

export type ProposalSuggestion = ProposalExtended & {
  type: 'SUGGESTION';
  corrections: Proposal[];
};

export type ReminderProposal = ProposalExtended & {
  corrections: Proposal[];
  suggestion: (ProposalExtended & { corrections: Proposal[] }) | null;
};

export type Reports = Report & GodfathersDecisions;

export interface ReportExtended extends Reports {
  suggestion: Suggestion;
}

export type Proposals = Correction | Suggestion | ProposalSuggestion | ReportExtended;
