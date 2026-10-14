import fp from 'fastify-plugin';
import { N8nClient } from '../services/n8n-client.service.js';

declare module 'fastify' {
  interface FastifyInstance {
    n8nClient: N8nClient;
  }
}

export const registerN8nClient = fp(
  async (app) => {
    app.decorate(
      'n8nClient',
      new N8nClient({
        defaultTimeoutMs: app.config.N8N_WEBHOOK_TIMEOUT_MS,
      }),
    );
  },
  { name: 'register-n8n-client' },
);
