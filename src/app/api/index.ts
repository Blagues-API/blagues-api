import { FastifyInstance } from 'fastify';
import { jokeById, randomJoke, randomJokeByType, typesRefs } from '../../controllers';
import {
  BadRequest, JokeNotFound, NoContent
} from './Errors';
import middleware from './middleware';


interface controllersReturn {
  error: boolean;
  response?: undefined;
}

export default async (fastify: FastifyInstance) => {
  fastify.register(middleware);

  fastify.get('/types', async (req, res) => {
    const keys = Object.keys(typesRefs);
    return res.code(200).send({
      count: keys.length,
      accepted_types: keys,
      keys: typesRefs
    })
  })

  fastify.get('/random', async (req: any, res) => {
    const joke: controllersReturn = randomJoke(req.query.disallow);
    if(joke.error){
      return res.status(400).send(BadRequest);
    }
    if(!joke.response){
      return res.status(404).send(NoContent);
    }
      return res.status(200).send(joke.response);
  })

  fastify.get('/type/:type/random', async (req: any, res) => {
    const joke: controllersReturn = randomJokeByType(req.params.type);
    if(joke.error){
      return res.status(400).send(BadRequest)
    }
    return res.status(200).send(joke.response)
  })

  fastify.get('/id/:id', async (req:any, res) => {
    const joke = jokeById(Number(req.params.id))
    if(!joke){
      return res.status(404).send(JokeNotFound)
    }
    return res.status(200).send(joke)
  })

  fastify.get('*', async () => {
    return 'Check documentation: https://www.blagues-api.fr/';
  });
};
