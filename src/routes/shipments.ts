import type { FastifyPluginAsync } from 'fastify';
import { validateApiKey } from '../middleware/api-key.middleware.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { ShipmentRouter } from '../services/shipment-router.service.js';
import { ShipmentService } from '../services/shipment.service.js';

/**
 * POST /shipments — gateway responsibilities only:
 * auth, correlation envelope, route to n8n, shape the response for the caller.
 *
 * Semantic field mapping and canonical validation are handled by the
 * Integration Intelligence Engine downstream.
 */
export const shipmentRoutes: FastifyPluginAsync = async (app) => {
  const router = new ShipmentRouter(app.n8nClient, app.config.N8N_WEBHOOK_URL);
  const shipmentService = new ShipmentService(app.log, router);

  app.post(
    '/shipments',
    {
      preHandler: [validateApiKey, authenticate],
    },
    async (request) => {
      const clientId = request.user?.sub;
      return shipmentService.receive(request.body, request.correlationId, clientId);
    },
  );
};
