import fastifyEnv from '@fastify/env';
import Fastify from 'fastify';
import { envOptions, type EnvConfig } from './config/env.js';
import { buildLoggerOptions } from './config/logger.js';
import { assignCorrelationId } from './middleware/correlation-id.middleware.js';
import { registerN8nClient } from './middleware/n8n-client.middleware.js';
import { registerApiKeyAuth } from './middleware/api-key.middleware.js';
import { registerAuth } from './middleware/auth.middleware.js';
import { registerRateLimit } from './middleware/rate-limit.middleware.js';
import { errorHandler } from './middleware/error-handler.js';
import { notFoundHandler } from './middleware/not-found.js';
import { registerRoutes } from './routes/index.js';

declare module 'fastify' {
  interface FastifyInstance {
    config: EnvConfig;
  }
}

export async function buildApp() {
  const app = Fastify({
    logger: buildLoggerOptions(),
  });

  await app.register(fastifyEnv, envOptions);
  app.log.level = app.config.LOG_LEVEL;

  await app.register(registerAuth);
  await app.register(registerApiKeyAuth);
  await app.register(registerRateLimit);
  await app.register(registerN8nClient);

  app.addHook('onRequest', assignCorrelationId);

  app.setErrorHandler(errorHandler);
  app.setNotFoundHandler(notFoundHandler);

  await app.register(registerRoutes);

  return app;
}
