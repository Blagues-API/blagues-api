import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import jwt from 'jsonwebtoken';
import {
  AuthHeaderBadFormat,
  AuthHeaderInvalidToken,
  AuthHeaderMissing
} from './Errors';

declare module 'fastify' {
  interface FastifyRequest {
    auth: string | null;
  }
}

const middleware: FastifyPluginAsync = async (
  fastify: FastifyInstance
): Promise<void> => {
  fastify.decorateRequest('auth', null);

  fastify.addHook('onRequest', async (request, reply) => {
    const bearerToken = request.headers.authorization;
    if (!bearerToken) {
      return reply.code(401).send(AuthHeaderMissing);
    }
    if (bearerToken.substring(0, 7) !== 'Bearer ') {
      return reply.code(401).send(AuthHeaderBadFormat);
    }

    const token: string = bearerToken.split(' ')[1];
    try {
      const decoded: any = jwt.verify(token, process.env.jwt_encryption_api!);
      request.auth = decoded;
    } catch (error) {
      return reply.code(401).send(AuthHeaderInvalidToken);
    }
  });
};

export default fp(middleware);
