import 'dotenv/config';
import fastify, { FastifyInstance } from 'fastify';
import formBody from '@fastify/formbody';
import cors from '@fastify/cors';
import AutoRoutes from '@fastify/autoload';
import path from 'path';

export default class App {
  public fastify: FastifyInstance;

  constructor() {
    this.fastify = fastify({ logger: false });
  }

  async start(): Promise<void> {
    if (process.env.API_SERVICE !== 'true') {
      return console.log('Service api désactivé');
    }

    await this.fastify.register(cors);
    await this.fastify.register(formBody);
    await this.fastify.register(AutoRoutes, {
      dir: path.join(__dirname, 'middleware')
    });
    await this.fastify.register(AutoRoutes, {
      dir: path.join(__dirname, 'routes'),
      prefix: '/api'
    });

    await this.fastify.listen({
      host: '0.0.0.0',
      port: 4000
    });

    console.log(`🚀 Blagues API lancé: http://localhost:4000`);
  }
}
