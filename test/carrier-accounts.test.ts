import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { CarrierAccountStore } from '../src/services/carrier-account-store.js';
import { withClientAccount } from '../src/routes/shipments.js';

function storeWith(content: unknown): { store: CarrierAccountStore; file: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'accounts-'));
  const file = path.join(dir, 'carrier-accounts.json');
  fs.writeFileSync(file, JSON.stringify(content));
  return { store: new CarrierAccountStore(file), file };
}

test('looks up an account by client and carrier, ignoring comments', () => {
  const { store } = storeWith({ _comment: 'x', acme: { dhl: '123', FedEx: '456', _note: 'y' } });
  assert.equal(store.get('acme', 'dhl'), '123');
  assert.equal(store.get('acme', 'fedex'), '456');
  assert.equal(store.get('acme', 'ups'), undefined);
  assert.equal(store.get('other', 'dhl'), undefined);
});

test('a missing file means no stored accounts', () => {
  const store = new CarrierAccountStore('/nonexistent/carrier-accounts.json');
  assert.equal(store.get('acme', 'dhl'), undefined);
});

test('picks up edits to the file', () => {
  const { store, file } = storeWith({ acme: { dhl: '123' } });
  assert.equal(store.get('acme', 'dhl'), '123');
  fs.writeFileSync(file, JSON.stringify({ acme: { dhl: '999' } }));
  const later = new Date(Date.now() + 5000);
  fs.utimesSync(file, later, later);
  assert.equal(store.get('acme', 'dhl'), '999');
});

test('adds the stored account, but a header account wins', () => {
  const { store } = storeWith({ acme: { dhl: '123' } });
  assert.deepEqual(withClientAccount({ system: 'dhl' }, 'acme', store), { system: 'dhl', accountNumber: '123' });
  assert.deepEqual(withClientAccount({ system: 'dhl', accountNumber: '777' }, 'acme', store), { system: 'dhl', accountNumber: '777' });
  assert.deepEqual(withClientAccount({ system: 'fedex' }, 'acme', store), { system: 'fedex' });
  assert.deepEqual(withClientAccount({ system: 'dhl' }, undefined, store), { system: 'dhl' });
});
