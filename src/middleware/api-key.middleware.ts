import fp from 'fastify-plugin';
import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  API_KEY_ERROR_MESSAGES,
  createApiKeyErrorResponse,
} from '../lib/api-key-errors.js';
import {
  InMemoryApiKeyValidator,
  parseApiKeysFromEnv,
  type ApiKeyValidator,
} from '../services/api-key-validator.service.js';

export const API_KEY_HEADER = 'x-api-key';

export interface ApiKeyContext {
  apiKey: string;
  subscriptionId?: string;
}

declare module 'fastify' {
  interface FastifyInstance {
    apiKeyValidator: ApiKeyValidator;
  }

  interface FastifyRequest {
    apiKeyContext?: ApiKeyContext;
  }
}

export const registerApiKeyAuth = fp(
  async (app) => {
    const allowedKeys = parseApiKeysFromEnv(app.config.API_KEYS);

    if (allowedKeys.size === 0) {
      app.log.warn('No API keys configured — all requests will be rejected');
    }

    app.decorate('apiKeyValidator', new InMemoryApiKeyValidator(allowedKeys));
  },
  { name: 'register-api-key-auth' },
);

export async function validateApiKey(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const rawHeader = request.headers[API_KEY_HEADER];

  if (typeof rawHeader !== 'string' || rawHeader.trim().length === 0) {
    await reply
      .status(401)
      .send(createApiKeyErrorResponse(API_KEY_ERROR_MESSAGES.missing));
    return;
  }

  const apiKey = rawHeader.trim();
  const result = await request.server.apiKeyValidator.validate(apiKey);

  if (!result.valid) {
    await reply
      .status(401)
      .send(createApiKeyErrorResponse(API_KEY_ERROR_MESSAGES.invalid));
    return;
  }

  request.apiKeyContext = {
    apiKey,
    subscriptionId: result.subscriptionId,
  };
}
