import { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import jwt from 'jsonwebtoken';
import { AuthHeaderBadFormat, AuthHeaderInvalidToken, AuthHeaderMissing } from './Errors';

interface AuthPayload {
  user_id: string;
  limit: 100;
  key: string;
  created_at: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    auth: AuthPayload | null;
  }
  interface FastifyInstance {
    apiAuth(): void;
  }
}

const middleware: FastifyPluginAsync = async (fastify: FastifyInstance): Promise<void> => {
  fastify.decorateRequest('auth', null);

  fastify.decorate('apiAuth', async (request: FastifyRequest, reply: FastifyReply) => {
    const bearerToken = request.headers.authorization;
    if (!bearerToken) {
      return reply.code(401).send(AuthHeaderMissing);
    }
    if (bearerToken.substring(0, 7) !== 'Bearer ') {
      return reply.code(401).send(AuthHeaderBadFormat);
    }

    const token: string = bearerToken.split(' ')[1];
    try {
      const decoded: AuthPayload = jwt.verify(token, process.env.JWT_TOKEN!) as AuthPayload;
      request.auth = decoded;
    } catch (error) {
      return reply.code(401).send(AuthHeaderInvalidToken);
    }
  });
};

export default fp(middleware);
