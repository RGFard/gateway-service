/** Result of API key validation — extend when subscription data comes from a database. */
export interface ApiKeyValidationResult {
  valid: boolean;
  subscriptionId?: string;
}

/**
 * Validates API keys. Swap implementations to load keys from a database later
 * without changing route middleware.
 */
export interface ApiKeyValidator {
  validate(apiKey: string): Promise<ApiKeyValidationResult>;
}

export function parseApiKeysFromEnv(raw: string): Set<string> {
  return new Set(
    raw
      .split(',')
      .map((key) => key.trim())
      .filter((key) => key.length > 0),
  );
}

/** MVP validator — checks keys against an in-memory allowlist from configuration. */
export class InMemoryApiKeyValidator implements ApiKeyValidator {
  constructor(private readonly allowedKeys: Set<string>) {}

  async validate(apiKey: string): Promise<ApiKeyValidationResult> {
    if (!this.allowedKeys.has(apiKey)) {
      return { valid: false };
    }

    return {
      valid: true,
      subscriptionId: apiKey,
    };
  }
}
