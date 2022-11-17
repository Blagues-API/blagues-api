import { FastifyInstance, FastifyRequest } from 'fastify';
import Jokes from '../../jokes';
import { Categories, CategoriesRefs } from '../../typings';
import { jokeById, randomJoke, randomJokeByType } from '../../controllers';
import { BadRequest, JokeNotFound, NoContent } from '../Errors';
import { JokeIdRequest, JokeTypeRequest, OptionalDisallowRequest } from '../types';

export default async (fastify: FastifyInstance): Promise<void> => {
  fastify.route({
    url: '*',
    method: 'GET',
    handler: async () => 'Check documentation: https://www.blagues-api.fr/'
  });
  fastify.route({
    url: '/count',
    method: 'GET',
    handler: async (_req: FastifyRequest, res) => {
      return res.code(200).send({
        count: Jokes.count
      });
    }
  });
  fastify.route({
    url: '/types',
    method: 'GET',
    handler: async (_req: FastifyRequest, res) => {
      return res.code(200).send({
        count: Categories.length,
        accepted_types: Categories,
        keys: CategoriesRefs
      });
    }
  });

  fastify.route({
    url: '/random',
    method: 'GET',
    onRequest: fastify.apiAuth,
    handler: async (req: OptionalDisallowRequest, res) => {
      const joke = randomJoke(req.query.disallow);
      if (joke.error) {
        return res.status(400).send(BadRequest);
      }
      if (!joke.response) {
        return res.status(404).send(NoContent);
      }
      return res.status(200).send(joke.response);
    }
  });

  fastify.route({
    url: '/type/:type/random',
    method: 'GET',
    onRequest: fastify.apiAuth,
    handler: async (req: JokeTypeRequest, res) => {
      const joke = randomJokeByType(req.params.type);
      if (joke.error) {
        return res.status(400).send(BadRequest);
      }
      return res.status(200).send(joke.response);
    }
  });

  fastify.route({
    url: '/id/:id',
    method: 'GET',
    onRequest: fastify.apiAuth,
    handler: async (req: JokeIdRequest, res) => {
      const joke = jokeById(req.params.id);
      if (!joke) {
        return res.status(404).send(JokeNotFound);
      }
      return res.status(200).send(joke);
    }
  });
};
