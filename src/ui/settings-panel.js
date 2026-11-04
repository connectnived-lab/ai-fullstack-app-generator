// Settings dialog: wires the markup from the shared page shell to core/settings.js.
import {
  loadSettings, saveSettings, clearSettings, normalizeSettings, validateBaseUrl, describeMode, isLiveConfigured,
} from '../core/settings.js';

export function initSettingsPanel({ doc = document, storage = globalThis.localStorage, onChange = () => {} } = {}) {
  const dialog = doc.getElementById('settings-dialog');
  const openBtn = doc.getElementById('open-settings');
  const badge = doc.getElementById('mode-badge');
  const fields = {
    baseUrl: doc.getElementById('set-base'),
    apiKey: doc.getElementById('set-key'),
    model: doc.getElementById('set-model'),
    useLive: doc.getElementById('set-live'),
  };
  const statusEl = doc.getElementById('set-status');
  let current = loadSettings(storage);

  function fill(s) {
    fields.baseUrl.value = s.baseUrl;
    fields.apiKey.value = s.apiKey;
    fields.model.value = s.model;
    fields.useLive.checked = s.useLive;
  }
  function readFields() {
    return normalizeSettings({
      baseUrl: fields.baseUrl.value,
      apiKey: fields.apiKey.value,
      model: fields.model.value,
      useLive: fields.useLive.checked,
    });
  }
  function paintBadge() {
    if (!badge) return;
    badge.textContent = describeMode(current);
    badge.classList.toggle('live', isLiveConfigured(current));
  }
  function say(message, kind) {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.className = `status ${kind}`;
  }

  openBtn?.addEventListener('click', () => {
    fill(current);
    say('', 'info');
    dialog.showModal();
  });
  doc.getElementById('set-save')?.addEventListener('click', () => {
    const next = readFields();
    if (next.useLive) {
      const check = validateBaseUrl(next.baseUrl);
      if (!check.ok) return say(check.error, 'err');
      if (!next.apiKey || !next.model) return say('Live mode needs an API key and a model name.', 'err');
    }
    current = saveSettings(next, storage);
    paintBadge();
    onChange(current);
    dialog.close();
  });
  doc.getElementById('set-clear')?.addEventListener('click', () => {
    current = clearSettings(storage);
    fill(current);
    paintBadge();
    onChange(current);
    say('Saved key removed from this browser. Demo mode is on.', 'ok');
  });
  doc.getElementById('set-cancel')?.addEventListener('click', () => dialog.close());

  paintBadge();
  return {
    get: () => current,
    refresh: () => {
      current = loadSettings(storage);
      paintBadge();
      return current;
    },
  };
}
