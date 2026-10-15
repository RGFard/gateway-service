import assert from 'node:assert/strict';
import test from 'node:test';
import { readShipmentTarget } from '../src/routes/shipments.js';
import { parseWorkflowReply } from '../src/lib/workflow-reply.js';

test('a missing or empty target header is an error', () => {
  for (const headers of [{}, { 'x-target-system': '' }, { 'x-target-system': '  ' }]) {
    const result = readShipmentTarget(headers);
    assert.ok('error' in result);
    assert.match(result.error, /No target system determined/);
  }
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
