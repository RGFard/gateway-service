import type { AuthErrorResponse } from '../schemas/common.schema.js';

export const AUTH_ERROR_MESSAGES = {
  missing: 'Authentication token is required',
  malformed: 'Authorization header must use Bearer scheme',
  invalid: 'Invalid or expired authentication token',
} as const;

export function createAuthErrorResponse(message: string): AuthErrorResponse {
  return {
    statusCode: 401,
    error: 'Unauthorized',
    message,
  };
}

export function isAuthError(error: {
  statusCode?: number;
  code?: string;
}): boolean {
  return (
    error.statusCode === 401 ||
    error.code === 'FST_JWT_NO_AUTHORIZATION_IN_HEADER' ||
    error.code === 'FST_JWT_AUTHORIZATION_TOKEN_INVALID' ||
    error.code === 'FST_JWT_AUTHORIZATION_TOKEN_EXPIRED'
  );
}

export function authErrorFromFastify(error: {
  code?: string;
  message?: string;
}): AuthErrorResponse {
  switch (error.code) {
    case 'FST_JWT_NO_AUTHORIZATION_IN_HEADER':
      return createAuthErrorResponse(AUTH_ERROR_MESSAGES.missing);
    case 'FST_JWT_AUTHORIZATION_TOKEN_INVALID':
    case 'FST_JWT_AUTHORIZATION_TOKEN_EXPIRED':
      return createAuthErrorResponse(AUTH_ERROR_MESSAGES.invalid);
    default:
      return createAuthErrorResponse(
        error.message ?? AUTH_ERROR_MESSAGES.invalid,
      );
  }
}
