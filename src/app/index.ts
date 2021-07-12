import fastify, { FastifyInstance } from 'fastify';
import api from './api';
import nuxt from './nuxt';

export default async () => {
  const app: FastifyInstance = fastify();

  try {
    await app.register(api, { prefix: 'api' });
    await app.register(nuxt);

    await app.listen(3000);

    console.log(`
      🚀 Blagues API lancé: http://localhost:3000
    `);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};
