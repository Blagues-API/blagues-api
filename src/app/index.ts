import 'dotenv/config';
import fastify, { FastifyInstance } from 'fastify';
import api from './api';
import nuxt from './nuxt';

import { parse } from 'querystring';

export default class App {
  public fastify: FastifyInstance;

  constructor() {
    this.fastify = fastify({ logger: false });
  }

  async start(): Promise<void> {
    if (process.env.web_service !== 'true') {
      return console.log('Service web désactivé');
    }

    // TODO: Clean up, it's for tests
    this.fastify.addContentTypeParser(
      'application/x-www-form-urlencoded',
      { parseAs: 'string' },
      async function (_: any, payload: any) {
        return parse(payload.toString());
      }
    );

    try {
      await this.fastify.register(api, { prefix: 'api' });
      await this.fastify.register(nuxt);

      await this.fastify.listen(3000, '0.0.0.0');

      console.log(`
      🚀 Blagues API lancé: http://localhost:3000
      `);
    } catch (err) {
      this.fastify.log.error(err);
      process.exit(1);
    }
  }
}
