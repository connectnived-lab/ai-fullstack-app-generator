import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scaffoldProject } from '../../src/core/scaffold.js';
import { validateSpec, parseSpecJson, slugify, FIELD_TYPES } from '../../src/core/spec.js';

const SPEC = {
  name: 'Bakery Orders',
  description: 'Take orders for a bakery.',
  entities: [
    { name: 'order', fields: [{ name: 'customer', type: 'text' }, { name: 'total', type: 'number' }] },
    { name: 'customer', fields: [{ name: 'email', type: 'email' }, { name: 'vip', type: 'boolean' }] },
  ],
};

test('scaffoldProject writes the expected files', () => {
  const { files, spec } = scaffoldProject(SPEC);
  assert.equal(spec.slug, 'bakery-orders');
  for (const path of ['package.json', 'README.md', 'server.js', 'src/entities.js', 'src/runtime.js',
    'public/index.html', 'public/app.js', 'public/schema.json', 'tests/api.test.js']) {
    assert.ok(path in files, path);
  }
});

test('the generated package has no dependencies and the right scripts', () => {
  const pkg = JSON.parse(scaffoldProject(SPEC).files['package.json']);
  assert.deepEqual(pkg.dependencies, undefined);
  assert.equal(pkg.scripts.start, 'node server.js');
  assert.equal(pkg.type, 'module');
});

test('entities are written with their fields', () => {
  const { files } = scaffoldProject(SPEC);
  assert.match(files['src/entities.js'], /"order": \{/);
  assert.match(files['public/schema.json'], /"email"/);
});

test('the runtime copied into the project carries the real functions', () => {
  const { files } = scaffoldProject(SPEC);
  assert.match(files['src/runtime.js'], /export function validateRecord\(fields, data\) \{/);
  assert.match(files['src/runtime.js'], /export function routeRequest\(/);
});

test('the generated test file covers every entity', () => {
  const t = scaffoldProject(SPEC).files['tests/api.test.js'];
  assert.match(t, /order: create, list, read, replace and delete/);
  assert.match(t, /customer: an empty body is refused with reasons/);
  assert.match(t, /"email":"sample@example.com"/);
});

test('the page title is escaped', () => {
  const { files } = scaffoldProject({ ...SPEC, name: 'A <b>&</b> "x"' });
  assert.match(files['public/index.html'], /<title>A &lt;b&gt;&amp;&lt;\/b&gt; &quot;x&quot;<\/title>/);
});

test('the README names the routes and the generator credit', () => {
  const readme = scaffoldProject(SPEC).files['README.md'];
  assert.match(readme, /`GET \/api\/order`/);
  assert.match(readme, /Nived NS/);
});

test('validateSpec rejects bad entities, fields and types', () => {
  assert.throws(() => validateSpec({ name: '', entities: [] }), /needs a name/);
  assert.throws(() => validateSpec({ name: 'x', entities: [] }), /at least one entity/);
  assert.throws(() => validateSpec({ name: 'x', entities: Array(7).fill({ name: 'a1', fields: [{ name: 'f', type: 'text' }] }) }), /six entities/);
  assert.throws(() => validateSpec({ name: 'x', entities: [{ name: 'Bad Name', fields: [{ name: 'f', type: 'text' }] }] }), /lowercase/);
  assert.throws(() => validateSpec({ name: 'x', entities: [{ name: 'api', fields: [{ name: 'f', type: 'text' }] }] }), /not allowed/);
  assert.throws(() => validateSpec({ name: 'x', entities: [{ name: 'ab', fields: [] }] }), /between 1 and 8/);
  assert.throws(() => validateSpec({ name: 'x', entities: [{ name: 'ab', fields: [{ name: '1x', type: 'text' }] }] }), /Field names/);
  assert.throws(() => validateSpec({ name: 'x', entities: [{ name: 'ab', fields: [{ name: 'f', type: 'date' }] }] }), /Field type/);
  assert.throws(() => validateSpec({ name: 'x', entities: [{ name: 'ab', fields: [{ name: 'f', type: 'text' }, { name: 'f', type: 'text' }] }] }), /twice/);
  assert.throws(() => validateSpec({ name: 'x', entities: [{ name: 'ab', fields: [{ name: 'f', type: 'text' }] }, { name: 'ab', fields: [{ name: 'g', type: 'text' }] }] }), /appears twice/);
  assert.throws(() => validateSpec(null), /must be an object/);
});

test('parseSpecJson reads a spec out of prose and validates it', () => {
  const spec = parseSpecJson('Here: {"name":"Tiny","entities":[{"name":"item","fields":[{"name":"label","type":"text"}]}]} ok');
  assert.equal(spec.name, 'Tiny');
  assert.throws(() => parseSpecJson('no json here'), /did not return a spec/);
  assert.throws(() => parseSpecJson('{"name": oops}'), /could not read/);
});

test('slugify makes safe package names and never returns empty', () => {
  assert.equal(slugify('  Bakery & Cafe!! '), 'bakery-cafe');
  assert.equal(slugify('!!!'), 'my-app');
  assert.equal(slugify('x'.repeat(100)).length, 60);
  assert.deepEqual(FIELD_TYPES, ['text', 'number', 'email', 'boolean']);
});
