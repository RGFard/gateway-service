/**
 * Wraps a request payload for downstream routing.
 * The payload is never transformed — only correlation metadata is added.
 */
export interface CorrelationEnvelope<T = unknown> {
  correlationId: string;
  timestamp: string;
  clientId?: string;
  payload: T;
}

export function createCorrelationEnvelope<T>(
  payload: T,
  correlationId: string,
  clientId?: string,
): CorrelationEnvelope<T> {
  return {
    correlationId,
    timestamp: new Date().toISOString(),
    ...(clientId ? { clientId } : {}),
    payload,
  };
}
