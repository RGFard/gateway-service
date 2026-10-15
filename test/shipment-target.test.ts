import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_TARGET_SYSTEM, readShipmentTarget } from '../src/routes/shipments.js';
import { parseWorkflowReply } from '../src/lib/workflow-reply.js';

test('defaults to dhl when no header is sent', () => {
  assert.equal(DEFAULT_TARGET_SYSTEM, 'dhl');
  assert.deepEqual(readShipmentTarget({}), { system: 'dhl' });
});

test('reads and lowercases the target system, and passes the service code through', () => {
  assert.deepEqual(readShipmentTarget({ 'x-target-system': ' FedEx ', 'x-service-code': 'FEDEX_GROUND' }), {
    system: 'fedex',
    serviceCode: 'FEDEX_GROUND',
  });
});

test('rejects malformed headers', () => {
  assert.ok('error' in readShipmentTarget({ 'x-target-system': 'fed ex' }));
  assert.ok('error' in readShipmentTarget({ 'x-target-system': '../dhl' }));
  assert.ok('error' in readShipmentTarget({ 'x-service-code': 'has space' }));
});

test('accepts the target stage, and still the older dhl stage', () => {
  for (const stage of ['target', 'dhl']) {
    assert.ok(parseWorkflowReply({ success: false, stage, errors: [] }));
  }
});
