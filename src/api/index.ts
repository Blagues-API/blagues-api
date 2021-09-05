import 'dotenv/config';
import fastify, { FastifyInstance } from 'fastify';
import routes from './routes';

export default class App {
  public fastify: FastifyInstance;

  constructor() {
    this.fastify = fastify({ logger: false });
  }

  async start(): Promise<void> {
    if (process.env.web_service !== 'true') {
      return console.log('Service web désactivé');
    }

    try {
      await this.fastify.register(routes, { prefix: 'api' });

      await this.fastify.listen(4000, '0.0.0.0');

      console.log(`🚀 Blagues API lancé: http://localhost:3000`);
    } catch (err) {
      this.fastify.log.error(err);
      process.exit(1);
    }
  }
}
