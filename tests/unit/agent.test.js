import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateApp, buildSpecMessages } from '../../src/core/agent.js';

const LIVE = { baseUrl: 'https://llm.example/v1', apiKey: 'k', model: 'm', useLive: true };

test('demo generation returns a plan, routes and files with no network', async () => {
  let called = false;
  const r = await generateApp({ brief: 'An app called Pantry for tasks and notes.', settings: {}, fetchImpl: async () => { called = true; } });
  assert.equal(called, false);
  assert.equal(r.mode, 'demo');
  assert.equal(r.spec.name, 'Pantry');
  assert.ok('server.js' in r.files);
  assert.equal(r.routes.length, 10);
  assert.match(r.bundle, /=== server\.js ===/);
});

test('live generation takes the spec from the model and validates it', async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, auth: init.headers.Authorization, body: JSON.parse(init.body) });
    const content = '{"name":"Garden Log","entities":[{"name":"plant","fields":[{"name":"species","type":"text"},{"name":"watered","type":"boolean"}]}]}';
    return { ok: true, json: async () => ({ choices: [{ message: { content } }] }) };
  };
  const r = await generateApp({ brief: 'Track my plants', settings: LIVE, fetchImpl });
  assert.equal(r.mode, 'live');
  assert.equal(r.spec.entities[0].name, 'plant');
  assert.equal(calls[0].auth, 'Bearer k');
  assert.match(calls[0].body.messages[1].content, /Track my plants/);
});

test('a model spec with a bad entity name is refused, not written', async () => {
  const fetchImpl = async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: '{"name":"x","entities":[{"name":"API","fields":[{"name":"a","type":"text"}]}]}' } }] }) });
  await assert.rejects(generateApp({ brief: 'x', settings: LIVE, fetchImpl }), /not allowed/);
});

test('buildSpecMessages asks for the JSON shape', () => {
  const m = buildSpecMessages('brief text');
  assert.match(m[0].content, /one JSON object/);
  assert.match(m[1].content, /brief text/);
});

test('an empty brief in demo mode is refused', async () => {
  await assert.rejects(generateApp({ brief: '', settings: {} }), /Describe the business/);
});
