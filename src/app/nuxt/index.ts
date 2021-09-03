import { FastifyInstance } from 'fastify';
import nuxtPlugin from 'fastify-nuxtjs';
import formbodyPlugin from 'fastify-formbody';

export default async function (fastify: FastifyInstance) {
  await fastify.register(formbodyPlugin);

  // Register Nuxt Plugin
  await fastify.register(nuxtPlugin);

  fastify.nuxt('*');
};
