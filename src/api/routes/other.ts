import { FastifyInstance, FastifyReply } from 'fastify';
import { MissingKey } from '../Errors';
import { generateAPIToken, generateKey } from '../../utils';
import prisma from '../../prisma';
import { RegenerateReply, RegenerateRequest } from '../types';

export default async (fastify: FastifyInstance): Promise<void> => {
  fastify.route({
    url: '*',
    method: 'GET',
    handler: async () => 'Check documentation: https://www.blagues-api.fr/'
  });
  fastify.route({
    url: '/regenerate',
    method: 'POST',
    onRequest: fastify.apiAuth,
    handler: async (req: RegenerateRequest, res: FastifyReply) => {
      if (!req.body || req.body.key !== req.auth!.key) {
        return res.code(400).send(MissingKey);
      }

      const token_key = generateKey();
      const token = generateAPIToken(req.auth!.user_id, token_key, 100);
      const data: RegenerateReply = {
        token_key,
        token
      };

      await prisma.user.update({
        data,
        where: { user_id: req.auth!.user_id }
      });

      return res.code(200).send(data);
    }
  });
};
