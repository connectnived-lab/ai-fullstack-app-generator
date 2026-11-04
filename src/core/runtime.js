// The runtime that every generated app ships. These functions are written as plain code with no imports,
// so the generator can copy their source text into the new project and the tests here check the same code.

export function validateRecord(fields, data) {
  const errors = [];
  const out = {};
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, errors: ['the body must be a JSON object'], value: null };
  }
  for (const f of fields) {
    const raw = data[f.name];
    if (raw === undefined || raw === null || raw === '') {
      if (f.required !== false) errors.push(f.name + ' is required');
      continue;
    }
    if (f.type === 'number') {
      const n = typeof raw === 'number' ? raw : Number(raw);
      if (!Number.isFinite(n)) errors.push(f.name + ' must be a number');
      else out[f.name] = n;
    } else if (f.type === 'boolean') {
      if (typeof raw !== 'boolean') errors.push(f.name + ' must be true or false');
      else out[f.name] = raw;
    } else if (f.type === 'email') {
      const s = String(raw).trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s)) errors.push(f.name + ' must be an email address');
      else out[f.name] = s;
    } else {
      out[f.name] = String(raw).trim();
    }
  }
  return { ok: errors.length === 0, errors, value: errors.length ? null : out };
}

export function createStore(entities) {
  const data = {};
  const nextId = {};
  for (const name of Object.keys(entities)) {
    data[name] = [];
    nextId[name] = 1;
  }
  return {
    list(name) {
      return data[name].slice();
    },
    get(name, id) {
      return data[name].find((r) => r.id === id) || null;
    },
    create(name, values) {
      const rec = Object.assign({ id: nextId[name]++ }, values);
      data[name].push(rec);
      return rec;
    },
    update(name, id, values) {
      const rec = data[name].find((r) => r.id === id);
      if (!rec) return null;
      Object.assign(rec, values);
      return rec;
    },
    remove(name, id) {
      const i = data[name].findIndex((r) => r.id === id);
      if (i === -1) return false;
      data[name].splice(i, 1);
      return true;
    },
  };
}

export function routeRequest(store, entities, method, url, body) {
  const path = String(url).split('?')[0];
  const parts = path.split('/').filter(Boolean);
  if (parts[0] !== 'api' || parts.length < 2 || parts.length > 3) {
    return { status: 404, body: { error: 'not found' } };
  }
  const name = parts[1];
  const spec = entities[name];
  if (!spec) return { status: 404, body: { error: 'unknown resource: ' + name } };
  const id = parts.length === 3 ? Number(parts[2]) : null;
  if (id !== null && !Number.isInteger(id)) return { status: 400, body: { error: 'the id must be a number' } };
  if (method === 'GET' && id === null) return { status: 200, body: store.list(name) };
  if (method === 'GET') {
    const rec = store.get(name, id);
    return rec ? { status: 200, body: rec } : { status: 404, body: { error: 'not found' } };
  }
  if (method === 'POST' && id === null) {
    const v = validateRecord(spec.fields, body);
    if (!v.ok) return { status: 422, body: { errors: v.errors } };
    return { status: 201, body: store.create(name, v.value) };
  }
  if (method === 'PUT' && id !== null) {
    const v = validateRecord(spec.fields, body);
    if (!v.ok) return { status: 422, body: { errors: v.errors } };
    const rec = store.update(name, id, v.value);
    return rec ? { status: 200, body: rec } : { status: 404, body: { error: 'not found' } };
  }
  if (method === 'DELETE' && id !== null) {
    return store.remove(name, id) ? { status: 204, body: null } : { status: 404, body: { error: 'not found' } };
  }
  return { status: 405, body: { error: 'method not allowed' } };
}
