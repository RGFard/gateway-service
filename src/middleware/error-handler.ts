import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { formatValidationErrors, isValidationError } from '../lib/validation-errors.js';
import { authErrorFromFastify, isAuthError } from '../lib/auth-errors.js';
import {
  createGatewayErrorResponse,
  gatewayErrorMessageFromCode,
} from '../lib/gateway-errors.js';
import { N8nWebhookError } from '../services/n8n-client.service.js';

interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string;
}

export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  // Fastify schema validation failure (route-level JSON schema)
  if (isValidationError(error)) {
    request.log.warn({ validation: error.validation }, 'Request validation failed');
    void reply.status(400).send(formatValidationErrors(error));
    return;
  }

  // JWT / API key auth failure
  if (isAuthError(error)) {
    request.log.warn({ code: error.code }, 'Authentication failed');
    void reply.status(401).send(authErrorFromFastify(error));
    return;
  }

  // n8n webhook failure
  if (error instanceof N8nWebhookError) {
    request.log.error(
      {
        correlationId: error.correlationId,
        code: error.code,
        upstreamStatus: error.upstreamStatus,
      },
      'n8n workflow request failed',
    );
    void reply.status(502).send(
      createGatewayErrorResponse(
        gatewayErrorMessageFromCode(error.code),
        error.correlationId,
      ),
    );
    return;
  }

  // Generic fallback
  const statusCode = error.statusCode ?? 500;
  const isServerError = statusCode >= 500;

  if (isServerError) {
    request.log.error({ err: error }, 'Unhandled server error');
  } else {
    request.log.warn({ err: error }, 'Client error');
  }

  const body: ErrorResponse = {
    statusCode,
    error: error.name || 'Error',
    message: isServerError ? 'Internal Server Error' : error.message,
  };

  void reply.status(statusCode).send(body);
}
