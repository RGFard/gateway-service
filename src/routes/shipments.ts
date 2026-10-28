import type { FastifyPluginAsync } from 'fastify';
import path from 'node:path';
import type { ShipmentTarget } from '../lib/correlation-envelope.js';
import { validateApiKey } from '../middleware/api-key.middleware.js';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  hashRequest,
  IdempotencyStore,
  isValidIdempotencyKey,
} from '../services/idempotency-store.js';
import { ShipmentRouter } from '../services/shipment-router.service.js';
import { ShipmentService } from '../services/shipment.service.js';

const TARGET_SYSTEM_PATTERN = /^[a-z0-9][a-z0-9_-]{0,39}$/;
const SERVICE_CODE_PATTERN = /^[\x21-\x7e]{1,40}$/;
const ACCOUNT_NUMBER_PATTERN = /^[A-Za-z0-9-]{1,40}$/;

function headerValue(value: string | string[] | undefined): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  return v === undefined ? undefined : v.trim();
}

/**
 * Reads X-Target-System (required), X-Service-Code and X-Account-Number (both optional).
 * Returns an error message when the target is missing or any header is malformed.
 */
export function readShipmentTarget(
  headers: Record<string, string | string[] | undefined>,
): ShipmentTarget | { error: string } {
  const raw = headerValue(headers['x-target-system']);
  if (!raw) {
    return {
      error: 'No target system determined: send the X-Target-System header (for example dhl or fedex)',
    };
  }
  const system = raw.toLowerCase();
  if (!TARGET_SYSTEM_PATTERN.test(system)) {
    return { error: 'X-Target-System must be a system name such as dhl or fedex' };
  }
  const serviceCode = headerValue(headers['x-service-code']);
  if (serviceCode !== undefined && !SERVICE_CODE_PATTERN.test(serviceCode)) {
    return { error: 'X-Service-Code must be 1 to 40 printable characters with no spaces' };
  }
  const accountNumber = headerValue(headers['x-account-number']);
  if (accountNumber !== undefined && accountNumber !== '' && !ACCOUNT_NUMBER_PATTERN.test(accountNumber)) {
    return { error: 'X-Account-Number must be 1 to 40 letters, digits or dashes' };
  }
  return {
    system,
    ...(serviceCode ? { serviceCode } : {}),
    ...(accountNumber ? { accountNumber } : {}),
  };
}

/** Where successful replies are remembered, relative to the folder the gateway runs from. */
const IDEMPOTENCY_FILE = path.resolve('data', 'idempotency-keys.json');

/**
 * POST /shipments — gateway responsibilities only:
 * auth, optional Idempotency-Key, correlation envelope, route to n8n, return the reply.
 *
 * Semantic field mapping, carrier mapping and sending are handled downstream.
 */
export const shipmentRoutes: FastifyPluginAsync = async (app) => {
  const router = new ShipmentRouter(app.n8nClient, app.config.N8N_WEBHOOK_URL);
  const shipmentService = new ShipmentService(app.log, router);
  const idempotency = new IdempotencyStore(IDEMPOTENCY_FILE);

  app.post(
    '/shipments',
    {
      preHandler: [validateApiKey, authenticate],
    },
    async (request, reply) => {
      const clientId = request.user?.sub;

      const target = readShipmentTarget(request.headers);
      if ('error' in target) {
        return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: target.error });
      }

      const header = request.headers['idempotency-key'];
      const key = Array.isArray(header) ? header[0] : header;

      // No key: behave exactly as before.
      if (key === undefined) {
        return shipmentService.receive(request.body, request.correlationId, clientId, target);
      }

      if (!isValidIdempotencyKey(key)) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Idempotency-Key must be 1 to 255 printable characters with no spaces',
        });
      }

      // The target is part of the request: the same shipment sent to another carrier is a new shipment.
      const requestHash = hashRequest({ target, body: request.body });
      const check = idempotency.begin(clientId, key, requestHash);

      if (check.kind === 'replay') {
        request.log.info({ correlationId: request.correlationId, key }, 'Idempotent replay of stored reply');
        void reply.header('idempotent-replayed', 'true');
        return check.reply;
      }
      if (check.kind === 'in-progress') {
        return reply.status(409).send({
          statusCode: 409,
          error: 'Conflict',
          message: 'A request with this Idempotency-Key is still being processed',
        });
      }
      if (check.kind === 'mismatch') {
        return reply.status(422).send({
          statusCode: 422,
          error: 'Unprocessable Entity',
          message: 'This Idempotency-Key was already used for a different request',
        });
      }

      try {
        const result = await shipmentService.receive(request.body, request.correlationId, clientId, target);
        idempotency.finish(clientId, key, requestHash, result);
        return result;
      } catch (err) {
        idempotency.abandon(clientId, key);
        throw err;
      }
    },
  );
};
