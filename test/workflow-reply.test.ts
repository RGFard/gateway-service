import assert from 'node:assert/strict';
import test from 'node:test';
import { parseWorkflowReply } from '../src/lib/workflow-reply.js';

test('passes a success reply through', () => {
  const reply = { success: true, carrier: 'dhl', trackingNumber: 'MOCKDHL8225631117' };
  assert.deepEqual(parseWorkflowReply(reply), reply);
});

test('passes a failure reply through, for each stage', () => {
  for (const stage of ['canonical', 'dhl', 'send']) {
    const reply = {
      success: false,
      stage,
      errors: [{ field: '(root)', message: "must have required property 'destination'" }],
    };
    assert.deepEqual(parseWorkflowReply(reply), reply);
  }
});

test('drops extra fields so internal detail is never forwarded', () => {
  const reply = parseWorkflowReply({
    success: true,
    carrier: 'dhl',
    trackingNumber: 'MOCKDHL1',
    targetPayload: { internal: true },
  });
  assert.deepEqual(reply, { success: true, carrier: 'dhl', trackingNumber: 'MOCKDHL1' });
});

test('rejects the empty body n8n sends when a node fails', () => {
  assert.equal(parseWorkflowReply({}), null);
  assert.equal(parseWorkflowReply(undefined), null);
  assert.equal(parseWorkflowReply({ raw: '' }), null);
});

test('rejects the old normalize response shape', () => {
  assert.equal(parseWorkflowReply({ plan: {}, targetPayload: {}, validation: { valid: true } }), null);
});

test('rejects malformed success and failure replies', () => {
  assert.equal(parseWorkflowReply({ success: true, carrier: 'dhl' }), null);
  assert.equal(parseWorkflowReply({ success: true, carrier: 'dhl', trackingNumber: '' }), null);
  assert.equal(parseWorkflowReply({ success: false, stage: 'other', errors: [] }), null);
  assert.equal(parseWorkflowReply({ success: false, stage: 'dhl' }), null);
  assert.equal(parseWorkflowReply({ success: false, stage: 'dhl', errors: [{ field: 1 }] }), null);
  assert.equal(parseWorkflowReply({ success: 'true', carrier: 'dhl', trackingNumber: 'X' }), null);
});
