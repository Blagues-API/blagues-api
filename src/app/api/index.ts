import { FastifyInstance } from 'fastify';
import middleware from './middleware';

export default async (fastify: FastifyInstance) => {
  fastify.register(middleware);

  fastify.get('*', async () => {
    return 'Check documentation: https://www.blagues-api.fr/';
  });
};
