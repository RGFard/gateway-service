/**
 * What the n8n workflow returns, and what the gateway forwards to the caller of
 * POST /shipments. n8n does the shaping (Respond to Webhook node); the gateway
 * checks the shape and passes it through.
 */

/** Where the workflow stopped when a shipment was not created. */
export type ShipmentFailureStage = 'canonical' | 'dhl' | 'send';

export interface ShipmentFieldError {
  field: string;
  message: string;
}

export type ShipmentResponse =
  | { success: true; carrier: string; trackingNumber: string }
  | { success: false; stage: ShipmentFailureStage; errors: ShipmentFieldError[] };
