import { FastifyInstance, FastifyRequest } from 'fastify';
import {
  jokeById,
  randomJoke,
  randomJokeByType,
  JokeResponse
} from '../controllers';
import { JokeTypes, JokeTypesRefs } from '../typings';
import { BadRequest, JokeNotFound, NoContent } from './Errors';
import middleware from './middleware';

export default async (fastify: FastifyInstance): Promise<void> => {
  fastify.register(middleware);

  fastify.get('/types', async (req: FastifyRequest, res) => {
    return res.code(200).send({
      count: JokeTypes.length,
      accepted_types: JokeTypes,
      keys: JokeTypesRefs
    });
  });

  type OptionalDisallowRequest = FastifyRequest<{
    Querystring: { disallow?: string[] };
  }>;

  fastify.get('/random', async (req: OptionalDisallowRequest, res) => {
    const joke: JokeResponse = randomJoke(req.query.disallow);
    if (joke.error) {
      return res.status(400).send(BadRequest);
    }
    if (!joke.response) {
      return res.status(404).send(NoContent);
    }
    return res.status(200).send(joke.response);
  });

  type JokeTypeRequest = FastifyRequest<{
    Params: { type: string };
  }>;

  fastify.get('/type/:type/random', async (req: JokeTypeRequest, res) => {
    const joke: JokeResponse = randomJokeByType(req.params.type);
    if (joke.error) {
      return res.status(400).send(BadRequest);
    }
    return res.status(200).send(joke.response);
  });

  type JokeIdRequest = FastifyRequest<{
    Params: { id: number };
  }>;

  fastify.get('/id/:id', async (req: JokeIdRequest, res) => {
    const joke = jokeById(Number(req.params.id));
    if (!joke) {
      return res.status(404).send(JokeNotFound);
    }
    return res.status(200).send(joke);
  });

  /*
   * Temporaly on the side need whitelist with client verification to avoid spam
   *
   * Ideas:
   * - Block jokes with looks like similare
   * - Add return body of the request with the link of the Blagues-API server
   */

  /*
  const webhook: WebhookClient = new WebhookClient(process.env.WEBHOOK_ID as `${bigint}`, process.env.WEBHOOK_TOKEN!);

  type JokeAddRequest = FastifyRequest<{
    Body: JokePayload
  }>

  fastify.post('/jokeadd', async (req: JokeAddRequest, res) => {

    const jokePayload: JokePayload = req.body

    const requiredFields: JokePayloadKey[] = ['type', 'joke', 'answer']
    for (const key of requiredFields) {
      if(requiredFields.includes(key)) {
        res.code(400).send(BadKeyPayloadRequest(key))
      }
      if(!(jokePayload[key] as string).length) {
        res.code(400).send(BadEmptyPayloadRequest(key))
      }
      if(['joke', 'answer'].includes(key) && jokePayload[key].length > 130) {
        res.code(400).send(BadlengthPayloadRequest(key))
      }
    }

    const formatedType: string = jokePayload.type.toLowerCase();
    if(!JokeTypes.includes(formatedType)) {
      res.code(400).send(BadTypePayloadRequest(formatedType))
    }

    const joke = stripIndents`
      > **Type**: ${JokeTypesRefs[formatedType as Category]}
      > **Blague**: ${jokePayload.joke}
      > **Réponse**: ${jokePayload.answer}
      > ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
    `

    await webhook.send(joke);

    return res.code(200).send({ success: true })
  })
  */

  fastify.get('*', async () => {
    return 'Check documentation: https://www.blagues-api.fr/';
  });
};
