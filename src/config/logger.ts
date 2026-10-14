import type { FastifyServerOptions } from 'fastify';

export function buildLoggerOptions(): FastifyServerOptions['logger'] {
  const level = process.env.LOG_LEVEL ?? 'info';
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    return {
      level,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
    };
  }

  return { level };
}
