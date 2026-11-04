// UI wiring only. Planning and file writing live in src/core.
import { initSettingsPanel } from './ui/settings-panel.js';
import { $, setStatus, setBusy, downloadText } from './ui/common.js';
import { generateApp } from './core/agent.js';

const SAMPLE = 'An app called Bakery Orders for a small cake shop. We track customers, orders (with a total and a status) and products with a price and stock.';
const settingsApi = initSettingsPanel();
const briefEl = $('brief-input');
const statusEl = $('status');
const runBtn = $('run-btn');
let lastBundle = '';
let lastName = 'app-bundle.txt';

function showFile(files, path) {
  $('file-name').textContent = path;
  $('file-preview').textContent = files[path];
  document.querySelectorAll('.file-btn').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.path === path));
  });
}

function renderRoutes(routes) {
  const body = $('routes');
  body.replaceChildren();
  for (const r of routes) {
    const tr = document.createElement('tr');
    [r.method, r.path, r.does].forEach((text) => {
      const td = document.createElement('td');
      td.textContent = text;
      tr.appendChild(td);
    });
    body.appendChild(tr);
  }
}

function renderFiles(files) {
  const list = $('file-list');
  list.replaceChildren();
  Object.keys(files).sort().forEach((path) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip file-btn';
    b.dataset.path = path;
    b.textContent = path;
    b.addEventListener('click', () => showFile(files, path));
    list.appendChild(b);
  });
  showFile(files, 'server.js');
}

$('sample-btn').addEventListener('click', () => {
  briefEl.value = SAMPLE;
  setStatus(statusEl, 'Sample brief loaded.', 'ok');
});

runBtn.addEventListener('click', async () => {
  setBusy(runBtn, true, 'Planning…');
  setStatus(statusEl, '');
  try {
    const result = await generateApp({ brief: briefEl.value, settings: settingsApi.get() });
    $('plan').textContent = result.plan;
    $('mode-note').textContent = result.mode === 'live' ? 'Spec designed by the live model.' : 'Spec planned offline from your brief.';
    renderRoutes(result.routes);
    renderFiles(result.files);
    lastBundle = result.bundle;
    lastName = `${result.spec.slug}-bundle.txt`;
    $('result').hidden = false;
    setStatus(statusEl, `Planned ${result.spec.name}: ${Object.keys(result.files).length} files.`, 'ok');
  } catch (err) {
    $('result').hidden = true;
    setStatus(statusEl, err.message, 'err');
  } finally {
    setBusy(runBtn, false);
  }
});

$('download-btn').addEventListener('click', () => downloadText(lastName, lastBundle, 'text/plain'));
