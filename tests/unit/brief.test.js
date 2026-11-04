import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planFromBrief, guessEntities, guessName, KNOWN } from '../../src/core/brief.js';

const BRIEF = 'An app called Bakery Orders for a small cake shop. We track customers, orders and products.';

test('guessName reads "called X" and falls back', () => {
  assert.equal(guessName(BRIEF), 'Bakery Orders');
  assert.equal(guessName('a tool named Pulse, for teams'), 'Pulse');
  assert.equal(guessName('no name here'), 'My App');
});

test('guessEntities maps plurals to known entities in order, without repeats', () => {
  assert.deepEqual(guessEntities(BRIEF), ['order', 'customer', 'product']);
  assert.deepEqual(guessEntities('order, orders, ORDER and tasks'), ['order', 'task']);
  assert.deepEqual(guessEntities('nothing relevant'), []);
});

test('planFromBrief builds a valid spec from the brief', () => {
  const spec = planFromBrief(BRIEF);
  assert.equal(spec.name, 'Bakery Orders');
  assert.equal(spec.slug, 'bakery-orders');
  assert.deepEqual(spec.entities.map((e) => e.name), ['customer', 'order', 'product']);
  assert.deepEqual(spec.entities[1].fields, KNOWN.order.map(([name, type]) => ({ name, type })));
});

test('planFromBrief falls back to a task list when nothing is recognised', () => {
  const spec = planFromBrief('Something for my garden.');
  assert.deepEqual(spec.entities.map((e) => e.name), ['task']);
});

test('planFromBrief refuses an empty brief', () => {
  assert.throws(() => planFromBrief('   '), /Describe the business/);
});

test('planFromBrief caps the entity count at six', () => {
  const spec = planFromBrief('customers orders products bookings tasks tickets leads invoices notes events');
  assert.equal(spec.entities.length, 6);
});

test('every known entity has at least one field that scaffolds', () => {
  for (const [name, fields] of Object.entries(KNOWN)) {
    assert.ok(fields.length > 0, name);
  }
});
