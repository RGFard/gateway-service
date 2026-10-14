/** Shared JSON Schema fragments for API responses. */

export const errorDetailSchema = {
  type: 'object',
  required: ['field', 'message'],
  properties: {
    field: { type: 'string' },
    message: { type: 'string' },
  },
  additionalProperties: false,
} as const;

export const validationErrorResponseSchema = {
  type: 'object',
  required: ['statusCode', 'error', 'message', 'details'],
  properties: {
    statusCode: { type: 'number', const: 400 },
    error: { type: 'string', const: 'Bad Request' },
    message: { type: 'string' },
    details: {
      type: 'array',
      items: errorDetailSchema,
    },
  },
  additionalProperties: false,
} as const;

export interface ValidationErrorDetail {
  field: string;
  message: string;
}

export interface ValidationErrorResponse {
  statusCode: 400;
  error: 'Bad Request';
  message: string;
  details: ValidationErrorDetail[];
}

export const unauthorizedErrorResponseSchema = {
  type: 'object',
  required: ['statusCode', 'error', 'message'],
  properties: {
    statusCode: { type: 'number', const: 401 },
    error: { type: 'string', const: 'Unauthorized' },
    message: { type: 'string' },
  },
  additionalProperties: false,
} as const;

export interface AuthErrorResponse {
  statusCode: 401;
  error: 'Unauthorized';
  message: string;
}

export const gatewayErrorResponseSchema = {
  type: 'object',
  required: ['statusCode', 'error', 'message', 'correlationId'],
  properties: {
    statusCode: { type: 'number', const: 502 },
    error: { type: 'string', const: 'Bad Gateway' },
    message: { type: 'string' },
    correlationId: { type: 'string' },
  },
  additionalProperties: false,
} as const;

export interface GatewayErrorResponse {
  statusCode: 502;
  error: 'Bad Gateway';
  message: string;
  correlationId: string;
}
