import { FastifyRequest } from 'fastify';
import { ReplyGenericInterface } from 'fastify/types/reply';

export type OptionalDisallowRequest = FastifyRequest<{
  Querystring: { disallow?: string[] };
}>;

export type JokeIdRequest = FastifyRequest<{
  Params: { id: number };
}>;

export type JokeTypeRequest = FastifyRequest<{
  Params: { type: string };
}>;

export interface AuthPayload {
  user_id: string;
  limit: 100;
  key: string;
  created_at: string;
}

export type DashboardAuthLogin = FastifyRequest<{
  Body: { code: string };
}>;

export type DashboardAuthUser = FastifyRequest<{
  Headers: { Authorization: `Bearer ${string}` };
}>;

export type RegenerateRequest = FastifyRequest<{
  Body: { key: string };
}>;

export interface RegenerateReply extends ReplyGenericInterface {
  token_key: string;
  token: string;
}
