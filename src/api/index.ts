import 'dotenv/config';
import fastify, { FastifyInstance } from 'fastify';
import formBody from 'fastify-formbody';
import cors from 'fastify-cors';

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

    try {
      await this.fastify.register(cors);
      await this.fastify.register(formBody);
      await this.fastify.register(auth);
      await this.fastify.register(routes, { prefix: 'api' });

      await this.fastify.listen(4000, '0.0.0.0');

      console.log(`🚀 Blagues API lancé: http://localhost:4000`);
    } catch (err) {
      this.fastify.log.error(err);
      process.exit(1);
    }
  }
}
