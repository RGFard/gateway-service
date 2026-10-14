import type { FastifyPluginAsync } from 'fastify';
import path from 'node:path';
import { validateApiKey } from '../middleware/api-key.middleware.js';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  hashRequest,
  IdempotencyStore,
  isValidIdempotencyKey,
} from '../services/idempotency-store.js';
import { ShipmentRouter } from '../services/shipment-router.service.js';
import { ShipmentService } from '../services/shipment.service.js';

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
      const header = request.headers['idempotency-key'];
      const key = Array.isArray(header) ? header[0] : header;

      // No key: behave exactly as before.
      if (key === undefined) {
        return shipmentService.receive(request.body, request.correlationId, clientId);
      }

      if (!isValidIdempotencyKey(key)) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Idempotency-Key must be 1 to 255 printable characters with no spaces',
        });
      }

      const requestHash = hashRequest(request.body);
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
        const result = await shipmentService.receive(request.body, request.correlationId, clientId);
        idempotency.finish(clientId, key, requestHash, result);
        return result;
      } catch (err) {
        idempotency.abandon(clientId, key);
        throw err;
      }
    },
  );
};
