import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { hashRequest, IdempotencyStore, isValidIdempotencyKey } from '../src/services/idempotency-store.js';

const OK = { success: true as const, carrier: 'dhl', trackingNumber: 'MOCKDHL1' };
const FAIL = { success: false as const, stage: 'send' as const, errors: [{ field: '(root)', message: 'down' }] };
const H = hashRequest({ shipment: { a: 1 } });

test('first use is new, and a concurrent repeat is in progress', () => {
  const s = new IdempotencyStore();
  assert.deepEqual(s.begin('c1', 'k', H), { kind: 'new' });
  assert.deepEqual(s.begin('c1', 'k', H), { kind: 'in-progress' });
});

test('a repeat after success replays the same reply', () => {
  const s = new IdempotencyStore();
  s.begin('c1', 'k', H);
  s.finish('c1', 'k', H, OK);
  assert.deepEqual(s.begin('c1', 'k', H), { kind: 'replay', reply: OK });
});

test('a failure is not remembered, so the key can be retried', () => {
  const s = new IdempotencyStore();
  s.begin('c1', 'k', H);
  s.finish('c1', 'k', H, FAIL);
  assert.deepEqual(s.begin('c1', 'k', H), { kind: 'new' });
});

test('an error frees the key', () => {
  const s = new IdempotencyStore();
  s.begin('c1', 'k', H);
  s.abandon('c1', 'k');
  assert.deepEqual(s.begin('c1', 'k', H), { kind: 'new' });
});

test('the same key with a different body is a mismatch', () => {
  const s = new IdempotencyStore();
  s.begin('c1', 'k', H);
  s.finish('c1', 'k', H, OK);
  assert.deepEqual(s.begin('c1', 'k', hashRequest({ shipment: { a: 2 } })), { kind: 'mismatch' });
});

test('keys are per client', () => {
  const s = new IdempotencyStore();
  s.begin('c1', 'k', H);
  s.finish('c1', 'k', H, OK);
  assert.deepEqual(s.begin('c2', 'k', H), { kind: 'new' });
});

test('replies expire after the time limit', () => {
  let t = 0;
  const s = new IdempotencyStore(undefined, () => t, 1000);
  s.begin('c1', 'k', H);
  s.finish('c1', 'k', H, OK);
  t = 1001;
  assert.deepEqual(s.begin('c1', 'k', H), { kind: 'new' });
});

test('stored replies survive a restart', () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'idem-')), 'keys.json');
  const first = new IdempotencyStore(file);
  first.begin('c1', 'k', H);
  first.finish('c1', 'k', H, OK);
  const second = new IdempotencyStore(file);
  assert.deepEqual(second.begin('c1', 'k', H), { kind: 'replay', reply: OK });
});

test('the request hash ignores key order', () => {
  assert.equal(hashRequest({ a: 1, b: { c: 2, d: 3 } }), hashRequest({ b: { d: 3, c: 2 }, a: 1 }));
});

test('key format', () => {
  assert.equal(isValidIdempotencyKey('order-123'), true);
  assert.equal(isValidIdempotencyKey(''), false);
  assert.equal(isValidIdempotencyKey('has space'), false);
  assert.equal(isValidIdempotencyKey('x'.repeat(256)), false);
});
