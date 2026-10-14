import type { FastifyError } from 'fastify';
import type {
  ValidationErrorDetail,
  ValidationErrorResponse,
} from '../schemas/common.schema.js';

interface AjvValidationError {
  instancePath: string;
  schemaPath: string;
  keyword: string;
  params?: Record<string, unknown>;
  message?: string;
}

function fieldFromValidationError(entry: AjvValidationError): string {
  if (entry.keyword === 'required') {
    const missing = entry.params?.missingProperty;
    if (typeof missing === 'string') {
      return missing;
    }
  }

  if (entry.keyword === 'additionalProperties') {
    const extra = entry.params?.additionalProperty;
    if (typeof extra === 'string') {
      return extra;
    }
  }

  const path = entry.instancePath.replace(/^\//, '');
  return path || 'body';
}

function messageFromValidationError(entry: AjvValidationError): string {
  if (entry.message) {
    return entry.message;
  }

  if (entry.keyword === 'required') {
    const field = fieldFromValidationError(entry);
    return `The field '${field}' is required`;
  }

  return 'Invalid value';
}

export function isValidationError(error: FastifyError): boolean {
  return (
    error.code === 'FST_ERR_VALIDATION' ||
    (error.statusCode === 400 && Array.isArray(error.validation))
  );
}

export function formatValidationErrors(
  error: FastifyError,
): ValidationErrorResponse {
  const ajvErrors = (error.validation ?? []) as AjvValidationError[];

  const details: ValidationErrorDetail[] = ajvErrors.map((entry) => ({
    field: fieldFromValidationError(entry),
    message: messageFromValidationError(entry),
  }));

  return {
    statusCode: 400,
    error: 'Bad Request',
    message: 'Request validation failed',
    details,
  };
}
