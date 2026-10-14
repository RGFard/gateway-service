import type { FastifyBaseLogger } from 'fastify';
import type { ShipmentRouter } from './shipment-router.service.js';
import type { ShipmentResponse } from '../models/shipment-response.types.js';
import { parseWorkflowReply } from '../lib/workflow-reply.js';
import { N8nWebhookError } from './n8n-client.service.js';

export const SHIPMENT_SCHEMA_DOMAIN = 'shipment';
export const SHIPMENT_CREATE_SCHEMA_NAME = 'shipment-create-request';

/**
 * Gateway orchestration for POST /shipments:
 * receive → wrap correlation envelope → route to n8n → check the reply → return it.
 *
 * The workflow normalizes the shipment, maps it to the carrier's format, sends it,
 * and shapes the reply itself (success with a tracking number, or the stage it
 * stopped at with errors). The gateway does no mapping or shaping of its own; it
 * only refuses a reply that does not have that shape.
 */
export class ShipmentService {
  constructor(
    private readonly log: FastifyBaseLogger,
    private readonly router: ShipmentRouter,
  ) {}

  async receive(
    payload: unknown,
    correlationId: string,
    clientId?: string,
  ): Promise<ShipmentResponse> {
    if (!clientId) {
      this.log.warn(
        { correlationId },
        'JWT missing sub claim — omitting clientId from n8n envelope',
      );
    }

    this.log.info({ correlationId }, 'Routing shipment payload to n8n');

    const routed = await this.router.route(payload, correlationId, clientId, this.log);
    const reply = parseWorkflowReply(routed.data);

    if (!reply) {
      this.log.error(
        { correlationId, durationMs: routed.durationMs, upstreamStatus: routed.statusCode },
        'n8n workflow reply did not have the expected shape',
      );
      throw new N8nWebhookError(
        'Upstream workflow returned an unexpected response',
        'UNEXPECTED_STATUS',
        correlationId,
        routed.statusCode,
      );
    }

    this.log.info(
      {
        correlationId,
        durationMs: routed.durationMs,
        upstreamStatus: routed.statusCode,
        success: reply.success,
        stage: reply.success ? undefined : reply.stage,
      },
      'n8n workflow reply received',
    );

    return reply;
  }
}
