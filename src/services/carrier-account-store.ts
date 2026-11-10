import fs from 'node:fs';

/**
 * Each client's account numbers with the carriers it ships with, keyed by client ID
 * (the token's `sub`) and then target system:
 *
 *   { "dev-user": { "dhl": "123456789", "fedex": "740561073" } }
 *
 * The gateway adds the matching account to the envelope when the caller didn't send
 * X-Account-Number, so callers don't have to. Keys starting with "_" are comments.
 * The file is re-read when it changes; a missing file means no stored accounts.
 *
 * A JSON file is the stand-in while testing. At scale this becomes a database table
 * (client, carrier, account) behind the same get().
 */
export class CarrierAccountStore {
  private accounts: Record<string, Record<string, string>> = {};
  private loadedMtimeMs = -1;

  constructor(private readonly filePath: string) {}

  get(clientId: string, system: string): string | undefined {
    this.reloadIfChanged();
    const value = this.accounts[clientId]?.[system];
    return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
  }

  private reloadIfChanged(): void {
    let mtimeMs: number;
    try {
      mtimeMs = fs.statSync(this.filePath).mtimeMs;
    } catch {
      this.accounts = {};
      this.loadedMtimeMs = -1;
      return;
    }
    if (mtimeMs === this.loadedMtimeMs) return;
    const raw = JSON.parse(fs.readFileSync(this.filePath, 'utf8')) as Record<string, unknown>;
    const next: Record<string, Record<string, string>> = {};
    for (const [client, carriers] of Object.entries(raw)) {
      if (client.startsWith('_') || carriers === null || typeof carriers !== 'object') continue;
      next[client] = Object.fromEntries(
        Object.entries(carriers as Record<string, unknown>)
          .filter(([system, acct]) => !system.startsWith('_') && typeof acct === 'string')
          .map(([system, acct]) => [system.toLowerCase(), acct as string]),
      );
    }
    this.accounts = next;
    this.loadedMtimeMs = mtimeMs;
  }
}
