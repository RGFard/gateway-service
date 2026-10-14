import type { FastifyPluginAsync } from 'fastify';
import { healthResponseSchema } from '../schemas/health.schema.js';

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/health',
    {
      schema: {
        response: {
          200: healthResponseSchema,
        },
      },
    },
    async () => ({ status: 'ok' as const }),
  );
};
