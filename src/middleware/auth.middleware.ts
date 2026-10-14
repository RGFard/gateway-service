import fastifyJwt from '@fastify/jwt';
import fp from 'fastify-plugin';
import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  AUTH_ERROR_MESSAGES,
  createAuthErrorResponse,
} from '../lib/auth-errors.js';

export const registerAuth = fp(
  async (app) => {
    await app.register(fastifyJwt, {
      secret: app.config.JWT_SECRET,
    });
  },
  { name: 'register-auth' },
);

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const authorization = request.headers.authorization;

  if (!authorization) {
    await reply
      .status(401)
      .send(createAuthErrorResponse(AUTH_ERROR_MESSAGES.missing));
    return;
  }

  if (!authorization.startsWith('Bearer ')) {
    await reply
      .status(401)
      .send(createAuthErrorResponse(AUTH_ERROR_MESSAGES.malformed));
    return;
  }

  try {
    await request.jwtVerify();
  } catch {
    await reply
      .status(401)
      .send(createAuthErrorResponse(AUTH_ERROR_MESSAGES.invalid));
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub?: string; [key: string]: unknown };
    user: { sub?: string; [key: string]: unknown };
  }
}
