import { FastifyInstance, RawRequestDefaultExpression } from 'fastify';
import jwt from 'jsonwebtoken';

interface RequestBlagueAPI extends RawRequestDefaultExpression {
  auth: null;
}

export default async (fastify: FastifyInstance) => {
  fastify.decorateRequest('auth', '');

  fastify.addHook('onRequest', async (request, reply) => {
    const bearerToken = request.headers.authorization;
    if (!bearerToken) {
      return reply.code(401).send({
        status: 401,
        error: 'Unauthorized',
        message: 'Authorization header is required'
      });
    } else if (bearerToken.substring(0, 7) !== 'Bearer ') {
      return reply.code(401).send({
        status: 401,
        error: 'Unauthorized',
        message:
          'Authorization header value must follow the Bearer <token> format'
      });
    }
    const token: string = bearerToken.split(' ')[1];
    try {
      const decoded: any = jwt.verify(token, process.env.jwt_encryption_api!);
      request.auth = decoded;
      console.log(`API call: ${decoded.user_id}`);
    } catch (error) {
      return reply.code(401).send({
        status: 401,
        error: 'Unauthorized',
        message: 'Invalid Token submitted'
      });
    }
  });
};
