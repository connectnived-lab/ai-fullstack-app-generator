// Writes the project files for a spec. Runtime code is copied from runtime.js as source text, so the
// generated app runs the same functions the unit tests cover.
import { validateSpec } from './spec.js';
import { validateRecord, createStore, routeRequest } from './runtime.js';
import { endpointsFor } from './plan.js';

const RUNTIME_FUNCTIONS = [validateRecord, createStore, routeRequest];

const SERVER = String.raw`import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createStore, routeRequest } from './src/runtime.js';
import { ENTITIES } from './src/entities.js';

const PUBLIC = new URL('./public/', import.meta.url);
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};

export function createApp(store = createStore(ENTITIES)) {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname.startsWith('/api/')) {
      let raw = '';
      for await (const chunk of req) raw += chunk;
      let body = null;
      if (raw) {
        try {
          body = JSON.parse(raw);
        } catch {
          res.writeHead(400, { 'content-type': 'application/json' });
          return res.end(JSON.stringify({ error: 'the body is not valid JSON' }));
        }
      }
      const out = routeRequest(store, ENTITIES, req.method, url.pathname + url.search, body);
      res.writeHead(out.status, { 'content-type': 'application/json' });
      return res.end(out.body === null ? '' : JSON.stringify(out.body));
    }
    const file = url.pathname === '/' ? 'index.html' : url.pathname.replace(/^\//, '');
    if (file.includes('..')) {
      res.writeHead(400);
      return res.end('bad path');
    }
    try {
      const data = await readFile(new URL(file, PUBLIC));
      res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end('not found');
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT) || 3000;
  createApp().listen(port, () => console.log('Running on http://localhost:' + port));
}
`;

const INDEX = String.raw`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="icon" href="data:,">
<title>__TITLE__</title>
<style>
body{margin:0;font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;background:#faf6f1;color:#1d1b19}
main{max-width:920px;margin:0 auto;padding:20px 16px}
h1{font-size:1.5rem;margin:0 0 12px}
nav{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}
.tab{font:inherit;border:1px solid #d6cabb;background:#fff;border-radius:999px;padding:7px 14px;cursor:pointer}
.tab[aria-pressed="true"]{background:#d9531e;color:#fff;border-color:#d9531e}
.card{background:#fff;border-radius:16px;box-shadow:0 10px 28px rgba(29,27,25,.08);padding:18px;margin-bottom:16px;overflow-x:auto}
label{display:grid;gap:4px;font-weight:600;font-size:.9rem;margin:8px 0}
input{font:inherit;padding:9px 10px;border:1px solid #d6cabb;border-radius:10px;min-width:0}
button.primary{font:inherit;font-weight:650;border:0;border-radius:999px;background:#d9531e;color:#fff;padding:9px 18px;cursor:pointer;margin-top:8px}
table{border-collapse:collapse;width:100%;font-size:.92rem}
th,td{text-align:left;border-bottom:1px solid #eae1d5;padding:7px 6px}
.err{color:#b42318;font-weight:600}
:focus-visible{outline:3px solid #1d1b19;outline-offset:2px}
</style>
</head>
<body>
<main>
<h1>__TITLE__</h1>
<nav id="tabs" aria-label="Resources"></nav>
<section class="card" id="form-card"></section>
<section class="card" id="list-card" aria-live="polite"></section>
</main>
<script type="module" src="app.js"></script>
</body>
</html>
`;

const APP_JS = String.raw`let schema = {};
let current = null;

function el(tag, attrs, kids) {
  const node = document.createElement(tag);
  Object.keys(attrs || {}).forEach(function (k) {
    if (k === 'text') node.textContent = attrs[k];
    else node.setAttribute(k, attrs[k]);
  });
  (kids || []).forEach(function (kid) {
    node.appendChild(typeof kid === 'string' ? document.createTextNode(kid) : kid);
  });
  return node;
}

function inputType(f) {
  if (f.type === 'number') return 'number';
  if (f.type === 'email') return 'email';
  if (f.type === 'boolean') return 'checkbox';
  return 'text';
}

async function show(name) {
  current = name;
  document.querySelectorAll('.tab').forEach(function (b) {
    b.setAttribute('aria-pressed', String(b.dataset.name === name));
  });
  renderForm();
  await renderList();
}

function renderForm() {
  const fields = schema[current].fields;
  const errors = el('p', { class: 'err', role: 'alert', id: 'errors' });
  const form = el('form', { id: 'create-form' });
  fields.forEach(function (f) {
    const attrs = { type: inputType(f), name: f.name, id: 'f-' + f.name };
    if (f.type !== 'boolean') attrs.required = '';
    form.appendChild(el('label', { for: attrs.id }, [f.name + ' (' + f.type + ')', el('input', attrs)]));
  });
  form.appendChild(el('button', { class: 'primary', type: 'submit', text: 'Add ' + current }));
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    const body = {};
    fields.forEach(function (f) {
      const input = document.getElementById('f-' + f.name);
      body[f.name] = f.type === 'boolean' ? input.checked : input.value;
    });
    const res = await fetch('/api/' + current, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const json = await res.json();
    if (!res.ok) {
      errors.textContent = (json.errors || [json.error]).join('; ');
      return;
    }
    errors.textContent = '';
    form.reset();
    await renderList();
  });
  const card = document.getElementById('form-card');
  card.replaceChildren(el('h2', { text: 'New ' + current }), errors, form);
}

async function renderList() {
  const res = await fetch('/api/' + current);
  const rows = await res.json();
  const fields = schema[current].fields;
  const head = el('tr', {}, [el('th', { text: 'id' })].concat(fields.map(function (f) { return el('th', { text: f.name }); })).concat([el('th', { text: '' })]));
  const body = rows.map(function (row) {
    const del = el('button', { type: 'button', text: 'Delete', 'aria-label': 'Delete ' + current + ' ' + row.id });
    del.addEventListener('click', async function () {
      await fetch('/api/' + current + '/' + row.id, { method: 'DELETE' });
      await renderList();
    });
    return el('tr', {}, [el('td', { text: String(row.id) })].concat(fields.map(function (f) {
      return el('td', { text: String(row[f.name] ?? '') });
    })).concat([el('td', {}, [del])]));
  });
  const table = el('table', {}, [el('thead', {}, [head]), el('tbody', {}, body)]);
  const card = document.getElementById('list-card');
  card.replaceChildren(el('h2', { text: current + ' (' + rows.length + ')' }), rows.length ? table : el('p', { text: 'Nothing here yet.' }));
}

async function start() {
  schema = await (await fetch('schema.json')).json();
  const nav = document.getElementById('tabs');
  Object.keys(schema).forEach(function (name) {
    const b = el('button', { type: 'button', class: 'tab', text: name, 'aria-pressed': 'false' });
    b.dataset.name = name;
    b.addEventListener('click', function () { show(name); });
    nav.appendChild(b);
  });
  const first = Object.keys(schema)[0];
  if (first) await show(first);
}

start();
`;

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function sample(type) {
  return { text: 'sample', number: 1, email: 'sample@example.com', boolean: true }[type];
}

function apiTest(spec) {
  const blocks = spec.entities.map((e) => {
    const body = {};
    e.fields.forEach((f) => { body[f.name] = sample(f.type); });
    const bodyLiteral = JSON.stringify(body);
    return [
      `test(${JSON.stringify(`${e.name}: create, list, read, replace and delete`)}, async () => {`,
      `  const base = await start();`,
      `  try {`,
      `    const created = await call(base, 'POST', '/api/${e.name}', ${bodyLiteral});`,
      `    assert.equal(created.status, 201);`,
      `    const list = await call(base, 'GET', '/api/${e.name}');`,
      `    assert.equal(list.body.length, 1);`,
      `    const one = await call(base, 'GET', '/api/${e.name}/' + created.body.id);`,
      `    assert.equal(one.status, 200);`,
      `    const put = await call(base, 'PUT', '/api/${e.name}/' + created.body.id, ${bodyLiteral});`,
      `    assert.equal(put.status, 200);`,
      `    const gone = await call(base, 'DELETE', '/api/${e.name}/' + created.body.id);`,
      `    assert.equal(gone.status, 204);`,
      `    assert.equal((await call(base, 'GET', '/api/${e.name}/' + created.body.id)).status, 404);`,
      `  } finally {`,
      `    await stop(base);`,
      `  }`,
      `});`,
      '',
      `test(${JSON.stringify(`${e.name}: an empty body is refused with reasons`)}, async () => {`,
      `  const base = await start();`,
      `  try {`,
      `    const res = await call(base, 'POST', '/api/${e.name}', {});`,
      `    assert.equal(res.status, 422);`,
      `    assert.ok(res.body.errors.length > 0);`,
      `  } finally {`,
      `    await stop(base);`,
      `  }`,
      `});`,
    ].join('\n');
  });
  return [
    "import { test } from 'node:test';",
    "import assert from 'node:assert/strict';",
    "import { createApp } from '../server.js';",
    '',
    'async function start() {',
    '  const server = createApp();',
    '  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));',
    '  return { server, url: `http://127.0.0.1:${server.address().port}` };',
    '}',
    '',
    'async function stop(base) {',
    '  await new Promise((resolve) => base.server.close(resolve));',
    '}',
    '',
    'async function call(base, method, path, body) {',
    '  const res = await fetch(base.url + path, {',
    '    method,',
    "    headers: { 'content-type': 'application/json' },",
    '    body: body === undefined ? undefined : JSON.stringify(body),',
    '  });',
    "  const text = await res.text();",
    '  return { status: res.status, body: text ? JSON.parse(text) : null };',
    '}',
    '',
    blocks.join('\n\n'),
    '',
  ].join('\n');
}

export function scaffoldProject(input) {
  const spec = validateSpec(input);
  const entities = {};
  for (const e of spec.entities) entities[e.name] = { fields: e.fields };
  const runtime = [
    '// Shared runtime. Copied from the generator; the same functions are unit-tested in the generator.',
    ...RUNTIME_FUNCTIONS.map((fn) => `export ${fn.toString()}\n`),
  ].join('\n');
  const endpointLines = endpointsFor(spec).map((r) => `- \`${r.method} ${r.path}\` to ${r.does}`).join('\n');
  const readme = [
    `# ${spec.name}`,
    '',
    spec.description || `A small app for ${spec.entities.map((e) => e.name).join(', ')}.`,
    '',
    '## Run it',
    '',
    '```bash',
    'npm start            # http://localhost:3000 (set PORT to change it)',
    'npm test             # runs the generated API tests',
    '```',
    '',
    'No dependencies to install: it uses Node 20 built-ins only.',
    '',
    '## Entities',
    '',
    ...spec.entities.map((e) => `- **${e.name}**: ${e.fields.map((f) => `${f.name} (${f.type})`).join(', ')}`),
    '',
    '## API',
    '',
    endpointLines,
    '',
    '## Notes',
    '',
    '- Storage is in memory: data resets when the server restarts. Swap `src/runtime.js` `createStore` for a database when you need one.',
    '- Generated by a scaffold. Read the code before you ship it.',
    '',
    'Generated with AI Full Stack App Generator by Nived NS (MIT).',
    '',
  ].join('\n');
  const files = {
    'package.json': JSON.stringify({
      name: spec.slug,
      version: '0.1.0',
      private: true,
      description: spec.description || spec.name,
      type: 'module',
      engines: { node: '>=20' },
      scripts: { start: 'node server.js', test: 'node --test tests/*.test.js' },
    }, null, 2) + '\n',
    'README.md': readme,
    '.gitignore': 'node_modules/\n*.log\n',
    'server.js': SERVER,
    'src/entities.js': `// Generated from the app spec.\nexport const ENTITIES = ${JSON.stringify(entities, null, 2)};\n`,
    'src/runtime.js': runtime,
    'public/index.html': INDEX.replace(/__TITLE__/g, escapeHtml(spec.name)),
    'public/app.js': APP_JS,
    'public/schema.json': JSON.stringify(entities, null, 2) + '\n',
    'tests/api.test.js': apiTest(spec),
  };
  return { spec, files };
}
