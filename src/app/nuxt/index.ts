import { FastifyInstance } from 'fastify';
import nuxtPlugin from 'fastify-nuxtjs';

export default async function (fastify: FastifyInstance) {

  // Register Nuxt Plugin
  await fastify.register(nuxtPlugin);

  // @ts-ignore asking schema
  fastify.nuxt('/_auth/*', { method: 'POST' });

  fastify.nuxt('*');
};
