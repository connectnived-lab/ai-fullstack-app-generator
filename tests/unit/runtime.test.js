import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateRecord, createStore, routeRequest } from '../../src/core/runtime.js';

const ENTITIES = {
  order: { fields: [{ name: 'customer', type: 'text' }, { name: 'total', type: 'number' }, { name: 'paid', type: 'boolean', required: false }] },
  contact: { fields: [{ name: 'email', type: 'email' }] },
};

test('validateRecord accepts good values and trims text', () => {
  const v = validateRecord(ENTITIES.order.fields, { customer: '  Ana ', total: '12.5', paid: true });
  assert.deepEqual(v, { ok: true, errors: [], value: { customer: 'Ana', total: 12.5, paid: true } });
});

test('validateRecord lists every problem at once', () => {
  const v = validateRecord(ENTITIES.order.fields, { total: 'lots', paid: 'yes' });
  assert.equal(v.ok, false);
  assert.deepEqual(v.errors, ['customer is required', 'total must be a number', 'paid must be true or false']);
  assert.equal(v.value, null);
});

test('validateRecord checks email shape and non-object bodies', () => {
  assert.equal(validateRecord(ENTITIES.contact.fields, { email: 'nope' }).errors[0], 'email must be an email address');
  assert.equal(validateRecord(ENTITIES.contact.fields, { email: 'a@b.co' }).ok, true);
  assert.deepEqual(validateRecord([], null).errors, ['the body must be a JSON object']);
  assert.deepEqual(validateRecord([], [1]).errors, ['the body must be a JSON object']);
});

test('optional fields may be left out', () => {
  const v = validateRecord(ENTITIES.order.fields, { customer: 'A', total: 1 });
  assert.equal(v.ok, true);
  assert.equal('paid' in v.value, false);
});

test('the store creates, reads, updates and removes records with ids', () => {
  const s = createStore(ENTITIES);
  const a = s.create('order', { customer: 'A', total: 1 });
  const b = s.create('order', { customer: 'B', total: 2 });
  assert.equal(a.id, 1);
  assert.equal(b.id, 2);
  assert.equal(s.list('order').length, 2);
  assert.deepEqual(s.update('order', 2, { total: 9 }), { id: 2, customer: 'B', total: 9 });
  assert.equal(s.update('order', 99, {}), null);
  assert.equal(s.remove('order', 1), true);
  assert.equal(s.remove('order', 1), false);
  assert.equal(s.get('order', 1), null);
});

test('list returns a copy, so callers cannot edit the store', () => {
  const s = createStore(ENTITIES);
  s.create('contact', { email: 'a@b.co' });
  s.list('contact').pop();
  assert.equal(s.list('contact').length, 1);
});

test('routeRequest serves the full CRUD cycle', () => {
  const s = createStore(ENTITIES);
  const created = routeRequest(s, ENTITIES, 'POST', '/api/order', { customer: 'Ana', total: 5 });
  assert.equal(created.status, 201);
  const id = created.body.id;
  assert.equal(routeRequest(s, ENTITIES, 'GET', '/api/order').body.length, 1);
  assert.equal(routeRequest(s, ENTITIES, 'GET', '/api/order/' + id).status, 200);
  assert.equal(routeRequest(s, ENTITIES, 'PUT', '/api/order/' + id, { customer: 'Bo', total: 7 }).body.total, 7);
  assert.equal(routeRequest(s, ENTITIES, 'DELETE', '/api/order/' + id).status, 204);
  assert.equal(routeRequest(s, ENTITIES, 'GET', '/api/order/' + id).status, 404);
});

test('routeRequest gives clear errors for bad input', () => {
  const s = createStore(ENTITIES);
  assert.equal(routeRequest(s, ENTITIES, 'POST', '/api/order', {}).status, 422);
  assert.equal(routeRequest(s, ENTITIES, 'PUT', '/api/order/1', { customer: 'x', total: 'bad' }).status, 422);
  assert.equal(routeRequest(s, ENTITIES, 'GET', '/api/nothing').status, 404);
  assert.equal(routeRequest(s, ENTITIES, 'GET', '/other').status, 404);
  assert.equal(routeRequest(s, ENTITIES, 'GET', '/api/order/abc').status, 400);
  assert.equal(routeRequest(s, ENTITIES, 'PATCH', '/api/order/1', {}).status, 405);
  assert.equal(routeRequest(s, ENTITIES, 'PUT', '/api/order/404', { customer: 'x', total: 1 }).status, 404);
  assert.equal(routeRequest(s, ENTITIES, 'DELETE', '/api/order', null).status, 405);
  assert.equal(routeRequest(s, ENTITIES, 'DELETE', '/api/order/404', null).status, 404);
  assert.equal(routeRequest(s, ENTITIES, 'GET', '/api/order/404').status, 404);
});

test('routeRequest ignores query strings', () => {
  const s = createStore(ENTITIES);
  s.create('contact', { email: 'a@b.co' });
  assert.equal(routeRequest(s, ENTITIES, 'GET', '/api/contact?page=2').body.length, 1);
});
