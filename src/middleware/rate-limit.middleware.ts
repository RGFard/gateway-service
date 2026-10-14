import rateLimit from '@fastify/rate-limit';
import fp from 'fastify-plugin';

export const registerRateLimit = fp(
  async (app) => {
    await app.register(rateLimit, {
      max: app.config.RATE_LIMIT_MAX,
      timeWindow: app.config.RATE_LIMIT_TIME_WINDOW_MS,
    });
  },
  { name: 'register-rate-limit' },
);
