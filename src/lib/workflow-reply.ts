import type {
  ShipmentFailureStage,
  ShipmentFieldError,
  ShipmentResponse,
} from '../models/shipment-response.types.js';

const STAGES: readonly ShipmentFailureStage[] = ['canonical', 'dhl', 'send'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isFieldError(value: unknown): value is ShipmentFieldError {
  return isRecord(value) && typeof value.field === 'string' && typeof value.message === 'string';
}

/**
 * Returns the workflow's reply if it has the agreed shape, or null if it does not.
 *
 * A null matters: when an n8n node fails before Respond to Webhook, n8n still
 * answers 200 with an empty body. Without this check the gateway would report
 * that as a success.
 */
export function parseWorkflowReply(data: unknown): ShipmentResponse | null {
  if (!isRecord(data)) return null;

  if (data.success === true) {
    if (!isNonEmptyString(data.carrier) || !isNonEmptyString(data.trackingNumber)) return null;
    return { success: true, carrier: data.carrier, trackingNumber: data.trackingNumber };
  }

  if (data.success === false) {
    const stage = data.stage as ShipmentFailureStage;
    if (!STAGES.includes(stage)) return null;
    if (!Array.isArray(data.errors) || !data.errors.every(isFieldError)) return null;
    return {
      success: false,
      stage,
      errors: data.errors.map((e) => ({ field: e.field, message: e.message })),
    };
  }

  return null;
}
