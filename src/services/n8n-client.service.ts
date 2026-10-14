import type { CorrelationEnvelope } from '../lib/correlation-envelope.js';

/** Envelope sent to n8n webhooks — workflow-agnostic, payload pass-through. */
export type N8nWebhookEnvelope<T = unknown> = CorrelationEnvelope<T>;

export interface N8nClientOptions {
  defaultTimeoutMs: number;
}

export interface N8nInvokeOptions<T> {
  url: string;
  envelope: N8nWebhookEnvelope<T>;
  timeoutMs?: number;
}

export interface N8nInvokeSuccess<TResponse = unknown> {
  ok: true;
  statusCode: number;
  durationMs: number;
  correlationId: string;
  data: TResponse;
}

export type N8nWebhookErrorCode =
  | 'TIMEOUT'
  | 'NETWORK'
  | 'UNEXPECTED_STATUS';

export class N8nWebhookError extends Error {
  readonly statusCode = 502;

  constructor(
    message: string,
    readonly code: N8nWebhookErrorCode,
    readonly correlationId: string,
    readonly upstreamStatus?: number,
  ) {
    super(message);
    this.name = 'N8nWebhookError';
  }
}

export interface N8nRequestLogger {
  info: (obj: Record<string, unknown>, msg: string) => void;
  error: (obj: Record<string, unknown>, msg: string) => void;
}

export class N8nClient {
  constructor(private readonly options: N8nClientOptions) {}

  async invoke<TPayload, TResponse = unknown>(
    options: N8nInvokeOptions<TPayload>,
    log: N8nRequestLogger,
  ): Promise<N8nInvokeSuccess<TResponse>> {
    const { url, envelope } = options;
    const timeoutMs = options.timeoutMs ?? this.options.defaultTimeoutMs;
    const startedAt = performance.now();
    const { correlationId } = envelope;

    log.info(
      {
        correlationId,
        webhookUrl: url,
        timestamp: envelope.timestamp,
      },
      'n8n outbound request started',
    );

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-correlation-id': correlationId,
        },
        body: JSON.stringify(envelope),
        signal: AbortSignal.timeout(timeoutMs),
      });

      const durationMs = Math.round(performance.now() - startedAt);
      const responseText = await response.text();
      let data: TResponse;

      try {
        data = responseText ? (JSON.parse(responseText) as TResponse) : ({} as TResponse);
      } catch {
        data = { raw: responseText } as TResponse;
      }

      if (!response.ok) {
        log.error(
          {
            correlationId,
            webhookUrl: url,
            durationMs,
            upstreamStatus: response.status,
          },
          'n8n outbound request failed — unexpected HTTP status',
        );

        throw new N8nWebhookError(
          'Upstream workflow returned an unexpected response',
          'UNEXPECTED_STATUS',
          correlationId,
          response.status,
        );
      }

      log.info(
        {
          correlationId,
          webhookUrl: url,
          durationMs,
          upstreamStatus: response.status,
        },
        'n8n outbound request completed',
      );

      return {
        ok: true,
        statusCode: response.status,
        durationMs,
        correlationId,
        data,
      };
    } catch (error) {
      const durationMs = Math.round(performance.now() - startedAt);

      if (error instanceof N8nWebhookError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'TimeoutError') {
        log.error(
          { correlationId, webhookUrl: url, durationMs, err: error },
          'n8n outbound request failed — timeout',
        );

        throw new N8nWebhookError(
          'Upstream workflow request timed out',
          'TIMEOUT',
          correlationId,
        );
      }

      log.error(
        { correlationId, webhookUrl: url, durationMs, err: error },
        'n8n outbound request failed — network error',
      );

      throw new N8nWebhookError(
        'Upstream workflow is unavailable',
        'NETWORK',
        correlationId,
      );
    }
  }
}
