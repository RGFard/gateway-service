export interface EnvConfig {
  HOST: string;
  PORT: number;
  NODE_ENV: string;
  LOG_LEVEL: string;
  JWT_SECRET: string;
  API_KEYS: string;
  N8N_WEBHOOK_URL: string;
  N8N_WEBHOOK_TIMEOUT_MS: number;
  RATE_LIMIT_MAX: number;
  RATE_LIMIT_TIME_WINDOW_MS: number;
}

export const envSchema = {
  type: 'object',
  required: [
    'HOST',
    'PORT',
    'NODE_ENV',
    'LOG_LEVEL',
    'JWT_SECRET',
    'API_KEYS',
    'N8N_WEBHOOK_URL',
  ],
  properties: {
    HOST: { type: 'string', default: '0.0.0.0' },
    PORT: { type: 'number', default: 3000 },
    NODE_ENV: {
      type: 'string',
      default: 'development',
      enum: ['development', 'production', 'test'],
    },
    LOG_LEVEL: {
      type: 'string',
      default: 'info',
      enum: ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'],
    },
    JWT_SECRET: { type: 'string', minLength: 1 },
    API_KEYS: {
      type: 'string',
      minLength: 1,
      description: 'Comma-separated list of valid API keys',
    },
    N8N_WEBHOOK_URL: {
      type: 'string',
      minLength: 1,
      description: 'n8n webhook URL for the shipment creation workflow',
    },
    N8N_WEBHOOK_TIMEOUT_MS: {
      type: 'number',
      default: 30000,
      description: 'Timeout for n8n webhook requests in milliseconds',
    },
    RATE_LIMIT_MAX: {
      type: 'number',
      default: 100,
      description: 'Maximum requests per client per time window',
    },
    RATE_LIMIT_TIME_WINDOW_MS: {
      type: 'number',
      default: 60000,
      description: 'Rate limit time window in milliseconds',
    },
  },
} as const;

export const envOptions = {
  confKey: 'config',
  schema: envSchema,
  dotenv: true,
};
