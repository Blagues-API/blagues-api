import 'dotenv/config';
import fastify, { FastifyInstance } from 'fastify';
import formBody from '@fastify/formbody';
import cors from '@fastify/cors';

import auth from './auth';
import routes from './routes';

export default class App {
  public fastify: FastifyInstance;

  constructor() {
    this.fastify = fastify({ logger: false });
  }

  async start(): Promise<void> {
    if (process.env.api_service !== 'true') {
      return console.log('Service api désactivé');
    }

    await this.fastify.register(cors);
    await this.fastify.register(formBody);
    await this.fastify.register(auth);
    await this.fastify.register(routes, { prefix: 'api' });

    await this.fastify.listen({
      host: '0.0.0.0',
      port: 4000
    });

    console.log(`🚀 Blagues API lancé: http://localhost:4000`);
  }
}
