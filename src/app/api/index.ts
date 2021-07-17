import { FastifyInstance } from 'fastify';

import { jokeById, randomJoke, randomJokeByType } from '../../controllers';
import { JokeTypes, JokeTypesRefs } from '../../typings';
import { BadRequest, JokeNotFound, NoContent } from './Errors';
import middleware from './middleware';

interface controllersReturn {
  error: boolean;
  response?: undefined;
}

export default async (fastify: FastifyInstance): Promise<void> => {
  fastify.register(middleware);

  fastify.get('/types', async (req, res) => {
    return res.code(200).send({
      count: JokeTypes.length,
      accepted_types: JokeTypes,
      keys: JokeTypesRefs
    });
  });

  fastify.get('/random', async (req: any, res) => {
    const joke: controllersReturn = randomJoke(req.query.disallow);
    if (joke.error) {
      return res.status(400).send(BadRequest);
    }
    if (!joke.response) {
      return res.status(404).send(NoContent);
    }
    return res.status(200).send(joke.response);
  });

  fastify.get('/type/:type/random', async (req: any, res) => {
    const joke: controllersReturn = randomJokeByType(req.params.type);
    if (joke.error) {
      return res.status(400).send(BadRequest);
    }
    return res.status(200).send(joke.response);
  });

  fastify.get('/id/:id', async (req: any, res) => {
    const joke = jokeById(Number(req.params.id));
    if (!joke) {
      return res.status(404).send(JokeNotFound);
    }
    return res.status(200).send(joke);
  });

  fastify.get('*', async () => {
    return 'Check documentation: https://www.blagues-api.fr/';
  });
};
