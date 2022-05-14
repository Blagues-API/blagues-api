import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { APIUser, OAuth2Routes, RESTPostOAuth2AccessTokenResult } from 'discord-api-types/v9';
import got from 'got';
import { jokeById, randomJoke, randomJokeByType, JokeResponse } from '../controllers';
import { Categories, CategoriesRefs } from '../typings';
import { BadRequest, JokeNotFound, MissingKey, NoContent } from './Errors';
import prisma from '../prisma';
import { generateAPIToken, generateKey } from '../utils';
import Jokes from '../jokes';

export default async (fastify: FastifyInstance): Promise<void> => {
  fastify.get('/count', async (_req: FastifyRequest, res) => {
    return res.code(200).send({
      count: Jokes.count
    });
  });

  fastify.get('/types', async (_req: FastifyRequest, res) => {
    return res.code(200).send({
      count: Categories.length,
      accepted_types: Categories,
      keys: CategoriesRefs
    });
  });

  type OptionalDisallowRequest = FastifyRequest<{
    Querystring: { disallow?: string[] };
  }>;

  fastify.get('/random', { onRequest: fastify.apiAuth }, async (req: OptionalDisallowRequest, res) => {
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

  fastify.get('/type/:type/random', { onRequest: fastify.apiAuth }, async (req: JokeTypeRequest, res) => {
    const joke: JokeResponse = randomJokeByType(req.params.type);
    if (joke.error) {
      return res.status(400).send(BadRequest);
    }
    return res.status(200).send(joke.response);
  });

  type JokeIdRequest = FastifyRequest<{
    Params: { id: number };
  }>;

  fastify.get('/id/:id', { onRequest: fastify.apiAuth }, async (req: JokeIdRequest, res) => {
    const joke = jokeById(Number(req.params.id));
    if (!joke) {
      return res.status(404).send(JokeNotFound);
    }
    return res.status(200).send(joke);
  });

  type DashboardAuthUser = FastifyRequest<{
    Headers: { Authorization: `Bearer ${string}` };
  }>;

  fastify.get('/auth/user', async (req: DashboardAuthUser, res) => {
    try {
      const discordUser = await got('http://discord.com/api/v9/users/@me', {
        headers: {
          Authorization: req.headers.authorization
        }
      }).json<APIUser>();
      const user = await prisma.user.findUnique({
        select: { token: true, token_key: true },
        where: { user_id: discordUser.id }
      });
      if (!user) {
        return res.code(404).send({ error: 'User not found' });
      }
      return res.code(200).send({
        id: discordUser.id,
        username: discordUser.username,
        avatar: discordUser.avatar,
        token: user.token,
        token_key: user.token_key
      });
    } catch (error) {
      console.error(error);
      return res.code(401).send({ error });
    }
  });

  type DashboardAuthLogin = FastifyRequest<{
    Body: { code: string };
  }>;

  fastify.post('/auth/token', async (req: DashboardAuthLogin, res: FastifyReply) => {
    const authData = await got
      .post(OAuth2Routes.tokenURL, {
        form: req.body
      })
      .json<RESTPostOAuth2AccessTokenResult>();

    const discordUser = await got('http://discord.com/api/v9/users/@me', {
      headers: {
        Authorization: `Bearer ${authData.access_token}`
      }
    }).json<APIUser>();

    const key = generateKey();
    const token = generateAPIToken(discordUser.id, key, 100);

    await prisma.user.upsert({
      create: {
        user_id: discordUser.id,
        user_name: discordUser.username,
        user_avatar: discordUser.avatar ?? '',
        user_token: authData.access_token,
        user_token_refresh: authData.refresh_token,
        token_key: key,
        token,
        limit: 100
      },
      update: {
        user_name: discordUser.username,
        user_token: authData.access_token,
        user_token_refresh: authData.refresh_token
      },
      where: { user_id: discordUser.id }
    });

    return res.code(200).send(authData);
  });

  type RegenerateRequest = FastifyRequest<{
    Body: { key: string };
  }>;

  fastify.post('/regenerate', { onRequest: fastify.apiAuth }, async (req: RegenerateRequest, res: FastifyReply) => {
    if (!req.body || req.body.key !== req.auth!.key) {
      return res.code(400).send(MissingKey);
    }

    const key = generateKey();
    const token = generateAPIToken(req.auth!.user_id, key, 100);

    await prisma.user.update({
      data: {
        token_key: key,
        token: token
      },
      where: { user_id: req.auth!.user_id }
    });

    return res.code(200).send({ token, key });
  });

  fastify.get('*', async () => {
    return 'Check documentation: https://www.blagues-api.fr/';
  });
};
