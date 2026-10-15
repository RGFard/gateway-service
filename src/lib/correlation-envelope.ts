/**
 * Wraps a request payload for downstream routing.
 * The payload is never transformed — only correlation metadata is added.
 */
/** Which system the shipment goes to, chosen by the caller (X-Target-System header). */
export interface ShipmentTarget {
  /** Target system name, e.g. "dhl", "fedex". Lowercase. */
  system: string;
  /** The target's own service/product code (X-Service-Code header), when the caller sent one. */
  serviceCode?: string;
}

export interface CorrelationEnvelope<T = unknown> {
  correlationId: string;
  timestamp: string;
  clientId?: string;
  target?: ShipmentTarget;
  payload: T;
}

export function createCorrelationEnvelope<T>(
  payload: T,
  correlationId: string,
  clientId?: string,
  target?: ShipmentTarget,
): CorrelationEnvelope<T> {
  return {
    correlationId,
    timestamp: new Date().toISOString(),
    ...(clientId ? { clientId } : {}),
    ...(target ? { target } : {}),
    payload,
  };
}
