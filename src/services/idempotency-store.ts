import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { ShipmentResponse } from '../models/shipment-response.types.js';

/** How long a successful reply is remembered for its key. */
export const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

/** Keys are caller-chosen; keep them to a sane, printable size. */
const KEY_PATTERN = /^[\x21-\x7e]{1,255}$/;

export type IdempotencyCheck =
  | { kind: 'new' }
  | { kind: 'replay'; reply: ShipmentResponse }
  | { kind: 'in-progress' }
  | { kind: 'mismatch' };

interface StoredReply {
  requestHash: string;
  reply: ShipmentResponse;
  storedAt: number;
}

export function isValidIdempotencyKey(key: string): boolean {
  return KEY_PATTERN.test(key);
}

/** Stable hash of the request body, so a key reused for a different shipment is caught. */
export function hashRequest(payload: unknown): string {
  return createHash('sha256').update(stableStringify(payload)).digest('hex');
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.keys(value as Record<string, unknown>)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableStringify((value as Record<string, unknown>)[k])}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

/**
 * Remembers successful shipment replies by Idempotency-Key, so a repeated request
 * gets the original reply instead of creating a second shipment.
 *
 * - Keys are scoped per client, so two clients can use the same key value.
 * - Only successes are stored. A failed request can be fixed and resent with the same key.
 * - Requests still running are tracked in memory only. After a restart nothing is
 *   "stuck in progress"; completed replies survive because they are written to disk.
 */
export class IdempotencyStore {
  private readonly done = new Map<string, StoredReply>();
  private readonly inProgress = new Map<string, string>();

  constructor(
    private readonly filePath?: string,
    private readonly now: () => number = Date.now,
    private readonly ttlMs: number = IDEMPOTENCY_TTL_MS,
  ) {
    this.load();
  }

  private scoped(clientId: string | undefined, key: string): string {
    return `${clientId ?? '-'}:${key}`;
  }

  /** Call before routing. Marks the key as in progress when it returns 'new'. */
  begin(clientId: string | undefined, key: string, requestHash: string): IdempotencyCheck {
    const id = this.scoped(clientId, key);
    this.dropExpired();

    const stored = this.done.get(id);
    if (stored) {
      return stored.requestHash === requestHash ? { kind: 'replay', reply: stored.reply } : { kind: 'mismatch' };
    }

    const running = this.inProgress.get(id);
    if (running !== undefined) {
      return running === requestHash ? { kind: 'in-progress' } : { kind: 'mismatch' };
    }

    this.inProgress.set(id, requestHash);
    return { kind: 'new' };
  }

  /** Call when routing finished. Stores the reply only if it was a success. */
  finish(clientId: string | undefined, key: string, requestHash: string, reply: ShipmentResponse): void {
    const id = this.scoped(clientId, key);
    this.inProgress.delete(id);
    if (reply.success) {
      this.done.set(id, { requestHash, reply, storedAt: this.now() });
      this.save();
    }
  }

  /** Call when routing threw. Frees the key for a retry. */
  abandon(clientId: string | undefined, key: string): void {
    this.inProgress.delete(this.scoped(clientId, key));
  }

  private dropExpired(): void {
    const cutoff = this.now() - this.ttlMs;
    let changed = false;
    for (const [id, entry] of this.done) {
      if (entry.storedAt < cutoff) {
        this.done.delete(id);
        changed = true;
      }
    }
    if (changed) this.save();
  }

  private load(): void {
    if (!this.filePath || !fs.existsSync(this.filePath)) return;
    const raw = JSON.parse(fs.readFileSync(this.filePath, 'utf8')) as Record<string, StoredReply>;
    for (const [id, entry] of Object.entries(raw)) this.done.set(id, entry);
    this.dropExpired();
  }

  private save(): void {
    if (!this.filePath) return;
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(Object.fromEntries(this.done), null, 2));
    fs.renameSync(tmp, this.filePath);
  }
}
