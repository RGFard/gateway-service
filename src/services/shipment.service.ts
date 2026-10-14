import type { FastifyBaseLogger } from 'fastify';
import type { ShipmentRouter } from './shipment-router.service.js';
import type { NormalizeResponse, ShipmentResponse } from '../models/shipment-response.types.js';

export const SHIPMENT_SCHEMA_DOMAIN = 'shipment';
export const SHIPMENT_CREATE_SCHEMA_NAME = 'shipment-create-request';

/**
 * Gateway orchestration for POST /shipments:
 * receive → wrap correlation envelope → route to n8n → shape response for the caller.
 *
 * The gateway does no semantic field mapping or presence/shape checking of its
 * own — the Integration Intelligence Engine downstream handles that (including
 * canonical schema validation, which already requires origin/destination/
 * packages, and tolerates whatever envelope shape the payload arrives in). The
 * gateway's own job here is routing plus trimming the engine's full internal
 * response down to what an external caller actually needs.
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

    this.log.info(
      {
        correlationId,
        durationMs: routed.durationMs,
        upstreamStatus: routed.statusCode,
      },
      'n8n workflow response received — shaping for caller',
    );

    return this.shapeResponse(routed.data as NormalizeResponse);
  }

  /**
   * The engine's full response (mapping plan, applied/skipped mappings,
   * validation detail) is useful for us to see what it did, but the caller
   * only needs the canonical result and, on failure, why. Everything else
   * stays internal — visible in logs/n8n execution history, never forwarded.
   */
  private shapeResponse(engineResponse: NormalizeResponse): ShipmentResponse {
    const valid = engineResponse.validation?.valid ?? true;

    if (valid) {
      return { success: true, shipment: engineResponse.targetPayload };
    }

    return {
      success: false,
      errors: (engineResponse.validation?.errors ?? []).map((e) => ({
        field: e.instancePath || '(root)',
        message: e.message ?? 'Validation failed',
      })),
    };
  }
}
