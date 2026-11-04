// Describes what a spec will build, before anything is written.
export function endpointsFor(spec) {
  const rows = [];
  for (const e of spec.entities) {
    const base = `/api/${e.name}`;
    rows.push({ method: 'GET', path: base, does: `list ${e.name}s` });
    rows.push({ method: 'POST', path: base, does: `create a ${e.name}` });
    rows.push({ method: 'GET', path: `${base}/:id`, does: `read one ${e.name}` });
    rows.push({ method: 'PUT', path: `${base}/:id`, does: `replace a ${e.name}` });
    rows.push({ method: 'DELETE', path: `${base}/:id`, does: `delete a ${e.name}` });
  }
  return rows;
}

export function describePlan(spec) {
  const lines = [`${spec.name}: ${spec.entities.length} ${spec.entities.length === 1 ? 'entity' : 'entities'}.`];
  for (const e of spec.entities) {
    lines.push(`- ${e.name}: ${e.fields.map((f) => `${f.name} (${f.type})`).join(', ')}`);
  }
  lines.push(`${endpointsFor(spec).length} API routes, a web screen per entity, and generated tests.`);
  return lines.join('\n');
}
