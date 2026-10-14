import type { GatewayErrorResponse } from '../schemas/common.schema.js';

export const GATEWAY_ERROR_MESSAGES = {
  workflowFailed: 'Upstream workflow request failed',
  workflowTimeout: 'Upstream workflow request timed out',
  workflowUnavailable: 'Upstream workflow is unavailable',
  workflowUnexpectedStatus: 'Upstream workflow returned an unexpected response',
} as const;

export function createGatewayErrorResponse(
  message: string,
  correlationId: string,
): GatewayErrorResponse {
  return {
    statusCode: 502,
    error: 'Bad Gateway',
    message,
    correlationId,
  };
}

export function gatewayErrorMessageFromCode(
  code: 'TIMEOUT' | 'NETWORK' | 'UNEXPECTED_STATUS',
): string {
  switch (code) {
    case 'TIMEOUT':
      return GATEWAY_ERROR_MESSAGES.workflowTimeout;
    case 'NETWORK':
      return GATEWAY_ERROR_MESSAGES.workflowUnavailable;
    case 'UNEXPECTED_STATUS':
      return GATEWAY_ERROR_MESSAGES.workflowUnexpectedStatus;
    default:
      return GATEWAY_ERROR_MESSAGES.workflowFailed;
  }
}
