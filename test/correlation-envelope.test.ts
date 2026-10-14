import assert from 'node:assert/strict';
import test from 'node:test';
import { createCorrelationEnvelope } from '../src/lib/correlation-envelope.js';

test('includes clientId when provided', () => {
  const envelope = createCorrelationEnvelope({ foo: 'bar' }, 'corr-1', 'sub-123');

  assert.equal(envelope.clientId, 'sub-123');
  assert.equal(envelope.correlationId, 'corr-1');
  assert.deepEqual(envelope.payload, { foo: 'bar' });
});

test('omits clientId when not provided', () => {
  const envelope = createCorrelationEnvelope({ foo: 'bar' }, 'corr-2');

  assert.equal('clientId' in envelope, false);
});
