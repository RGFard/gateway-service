import type { AuthErrorResponse } from '../schemas/common.schema.js';

export const API_KEY_ERROR_MESSAGES = {
  missing: 'API key is required',
  invalid: 'Invalid API key',
} as const;

export function createApiKeyErrorResponse(message: string): AuthErrorResponse {
  return {
    statusCode: 401,
    error: 'Unauthorized',
    message,
  };
}
