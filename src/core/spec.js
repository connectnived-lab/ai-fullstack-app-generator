// The app spec: a name and a list of entities, each with typed fields. Demo and live modes both end here.
export const FIELD_TYPES = ['text', 'number', 'email', 'boolean'];
const ENTITY_NAME = /^[a-z][a-z0-9]{1,30}$/;
const FIELD_NAME = /^[a-z][a-zA-Z0-9]{0,30}$/;
const RESERVED = new Set(['api', 'schema', 'public', 'src', 'tests', 'node']);

export function slugify(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'my-app';
}

export function validateSpec(input) {
  if (!input || typeof input !== 'object') throw new Error('The spec must be an object.');
  const name = String(input.name ?? '').trim();
  if (!name) throw new Error('The app needs a name.');
  if (!Array.isArray(input.entities) || input.entities.length === 0) throw new Error('Add at least one entity, such as orders or tasks.');
  if (input.entities.length > 6) throw new Error('Keep it to six entities or fewer for a first version.');
  const seen = new Set();
  const entities = input.entities.map((e) => {
    const ename = String(e?.name ?? '');
    if (!ENTITY_NAME.test(ename) || RESERVED.has(ename)) {
      throw new Error(`Entity names are lowercase letters and digits, starting with a letter: "${ename}" is not allowed.`);
    }
    if (seen.has(ename)) throw new Error(`Entity "${ename}" appears twice.`);
    seen.add(ename);
    if (!Array.isArray(e.fields) || e.fields.length === 0 || e.fields.length > 8) {
      throw new Error(`${ename} needs between 1 and 8 fields.`);
    }
    const fieldNames = new Set();
    const fields = e.fields.map((f) => {
      const fname = String(f?.name ?? '');
      if (!FIELD_NAME.test(fname)) throw new Error(`Field names start with a letter, then letters or digits: "${fname}".`);
      if (fieldNames.has(fname)) throw new Error(`${ename} has the field "${fname}" twice.`);
      fieldNames.add(fname);
      if (!FIELD_TYPES.includes(f.type)) throw new Error(`Field type must be one of ${FIELD_TYPES.join(', ')}: "${f.type}".`);
      return { name: fname, type: f.type };
    });
    return { name: ename, fields };
  });
  return { name, slug: slugify(name), description: String(input.description ?? '').trim(), entities };
}

export function parseSpecJson(text) {
  const m = /\{[\s\S]*\}/.exec(String(text || ''));
  if (!m) throw new Error('The model did not return a spec.');
  let json;
  try {
    json = JSON.parse(m[0]);
  } catch {
    throw new Error('The model returned a spec I could not read.');
  }
  return validateSpec(json);
}
