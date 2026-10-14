import type { FastifyReply, FastifyRequest } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    correlationId: string;
  }
}

export async function assignCorrelationId(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  const header = request.headers['x-correlation-id'];

  request.correlationId =
    typeof header === 'string' && header.trim().length > 0
      ? header.trim()
      : request.id;
}
