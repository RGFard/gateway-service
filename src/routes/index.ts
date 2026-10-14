import type { FastifyPluginAsync } from 'fastify';
import { healthRoutes } from './health.js';
import { shipmentRoutes } from './shipments.js';

export const registerRoutes: FastifyPluginAsync = async (app) => {
  await app.register(healthRoutes);
  await app.register(shipmentRoutes);
};
