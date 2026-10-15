import { createCorrelationEnvelope, type ShipmentTarget } from '../lib/correlation-envelope.js';
import type { N8nClient, N8nInvokeSuccess } from './n8n-client.service.js';

/**
 * Routes validated shipment requests to n8n.
 * Does not transform, map, or normalize payloads — normalization belongs to
 * the Integration Intelligence Service downstream.
 */
export class ShipmentRouter {
  constructor(
    private readonly n8nClient: N8nClient,
    private readonly webhookUrl: string,
  ) {}

  async route(
    payload: unknown,
    correlationId: string,
    clientId: string | undefined,
    log: Parameters<N8nClient['invoke']>[1],
    target?: ShipmentTarget,
  ): Promise<N8nInvokeSuccess> {
    const envelope = createCorrelationEnvelope(payload, correlationId, clientId, target);

    return this.n8nClient.invoke(
      {
        url: this.webhookUrl,
        envelope,
      },
      log,
    );
  }
}
