import { FastifyInstance } from 'fastify';
import nuxtPlugin from 'fastify-nuxtjs';

export default async function (fastify: FastifyInstance) {
  // Register Nuxt Plugin
  await fastify.register(nuxtPlugin);

  fastify.nuxt('*');
};
