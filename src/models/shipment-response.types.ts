/**
 * Shape of the Integration Intelligence Engine's (nexus-engine) full response
 * to POST /ai/normalize, as passed through verbatim by n8n. Internal only —
 * never forwarded to the gateway's caller as-is; see ShipmentService.shapeResponse.
 */
export interface NormalizeResponse {
  plan: unknown;
  targetPayload: unknown;
  appliedMappings: unknown;
  skippedMappings: unknown;
  validation?: {
    valid: boolean;
    errors?: Array<{
      instancePath: string;
      message?: string;
    }>;
  };
}

/** What the gateway actually returns to the external caller of POST /shipments. */
export type ShipmentResponse =
  | { success: true; shipment: unknown }
  | { success: false; errors: Array<{ field: string; message: string }> };
