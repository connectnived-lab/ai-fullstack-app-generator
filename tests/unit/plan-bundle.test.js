import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describePlan, endpointsFor } from '../../src/core/plan.js';
import { toBundle, parseBundle } from '../../src/core/bundle.js';

const SPEC = { name: 'Shop', entities: [{ name: 'order', fields: [{ name: 'total', type: 'number' }] }] };

test('endpointsFor lists the five routes for each entity', () => {
  const rows = endpointsFor(SPEC);
  assert.equal(rows.length, 5);
  assert.deepEqual(rows.map((r) => r.method), ['GET', 'POST', 'GET', 'PUT', 'DELETE']);
  assert.equal(rows[2].path, '/api/order/:id');
});

test('describePlan states the entities, fields and route count', () => {
  const text = describePlan(SPEC);
  assert.match(text, /Shop: 1 entity\./);
  assert.match(text, /- order: total \(number\)/);
  assert.match(text, /5 API routes/);
});

test('describePlan pluralises entities', () => {
  const text = describePlan({ name: 'X', entities: [SPEC.entities[0], { name: 'task', fields: [{ name: 'done', type: 'boolean' }] }] });
  assert.match(text, /2 entities\./);
});

test('toBundle writes files in sorted order with headers', () => {
  const b = toBundle({ 'b.js': 'two\n', 'a.js': 'one\n' });
  assert.ok(b.indexOf('=== a.js ===') < b.indexOf('=== b.js ==='));
  assert.match(b, /=== a\.js ===\none/);
});

test('parseBundle recovers each file name and its text', () => {
  const files = parseBundle(toBundle({ 'src/x.js': 'export const x = 1;\n', 'README.md': '# Hi\n' }));
  assert.deepEqual(Object.keys(files).sort(), ['README.md', 'src/x.js']);
  assert.match(files['src/x.js'], /export const x = 1;/);
});
