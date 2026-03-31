import 'dotenv/config';
import fastify, { FastifyInstance } from 'fastify';
import formBody from '@fastify/formbody';
import cors from '@fastify/cors';

import AuthMiddleware from './middleware/auth';
import AuthRoute from './routes/auth';
import JokesRoute from './routes/jokes';

export default class App {
  public fastify: FastifyInstance;

  constructor() {
    this.fastify = fastify({
      logger: {
        level: 'info',
        redact: ['req.headers.authorization'],
        serializers: {
          req(request) {
            return {
              method: request.method,
              url: request.url,
              ip: request.ip
            };
          },
          res(reply) {
            return {
              statusCode: reply.statusCode,
              discord_id: reply.request?.auth?.user_id
            };
          }
        }
      }
    });
  }

  async start(): Promise<void> {
    if (process.env.API_SERVICE !== 'true') {
      return console.log('Service api désactivé');
    }

    await this.fastify.register(cors);
    await this.fastify.register(formBody);
    await this.fastify.register(AuthMiddleware);
    await this.fastify.register(AuthRoute, { prefix: 'api' });
    await this.fastify.register(JokesRoute, { prefix: 'api' });

    await this.fastify.listen({
      host: '0.0.0.0',
      port: 4000
    });

    console.log(`🚀 Blagues API lancé: http://localhost:4000`);
  }
}
