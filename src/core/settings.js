// Settings: the live-model endpoint, stored only in this browser (localStorage).
export const SETTINGS_KEY = 'ai25.settings';
export const DEFAULT_SETTINGS = Object.freeze({ baseUrl: '', apiKey: '', model: '', useLive: false });

export function normalizeSettings(input = {}) {
  const s = input && typeof input === 'object' ? input : {};
  return {
    baseUrl: String(s.baseUrl ?? '').trim().replace(/\/+$/, ''),
    apiKey: String(s.apiKey ?? '').trim(),
    model: String(s.model ?? '').trim(),
    useLive: s.useLive === true,
  };
}

export function validateBaseUrl(url) {
  if (!url) return { ok: false, error: 'Add the API base URL, for example https://host.example/v1' };
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, error: 'That base URL is not a valid address.' };
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { ok: false, error: 'The base URL must start with https:// or http://' };
  }
  return { ok: true, error: null };
}

export function isLiveConfigured(settings) {
  const s = normalizeSettings(settings);
  return s.useLive && s.baseUrl !== '' && s.apiKey !== '' && s.model !== '';
}

export function describeMode(settings) {
  return isLiveConfigured(settings)
    ? `Live · ${normalizeSettings(settings).model}`
    : 'Demo mode (offline)';
}

export function loadSettings(storage = globalThis.localStorage) {
  if (!storage) return { ...DEFAULT_SETTINGS };
  try {
    const raw = storage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return normalizeSettings(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings, storage = globalThis.localStorage) {
  if (!storage) throw new Error('Browser storage is not available here.');
  const normalized = normalizeSettings(settings);
  storage.setItem(SETTINGS_KEY, JSON.stringify(normalized));
  return normalized;
}

export function clearSettings(storage = globalThis.localStorage) {
  if (storage) storage.removeItem(SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS };
}
