// Demo mode plans from keywords; live mode asks a model for the spec. Both produce files with the same scaffold.
import { chatCompletion } from './llm.js';
import { isLiveConfigured, normalizeSettings } from './settings.js';
import { planFromBrief } from './brief.js';
import { parseSpecJson } from './spec.js';
import { scaffoldProject } from './scaffold.js';
import { describePlan, endpointsFor } from './plan.js';
import { toBundle } from './bundle.js';

export function buildSpecMessages(brief) {
  return [
    {
      role: 'system',
      content: 'You design small full-stack apps. Reply with one JSON object and nothing else: '
        + '{"name":"App name","description":"one line","entities":[{"name":"lowercase_letters_only","fields":[{"name":"camelCase","type":"text|number|email|boolean"}]}]}. '
        + 'Use at most six entities and at most eight fields each.',
    },
    { role: 'user', content: `Design the app for this brief:\n\n${brief}` },
  ];
}

export async function generateApp({ brief, settings, fetchImpl } = {}) {
  const s = normalizeSettings(settings);
  let spec;
  let mode = 'demo';
  if (isLiveConfigured(s)) {
    mode = 'live';
    const text = await chatCompletion({
      baseUrl: s.baseUrl,
      apiKey: s.apiKey,
      model: s.model,
      messages: buildSpecMessages(String(brief ?? '')),
      fetchImpl,
    });
    spec = parseSpecJson(text);
  } else {
    spec = planFromBrief(brief);
  }
  const { files } = scaffoldProject(spec);
  return {
    mode,
    spec,
    plan: describePlan(spec),
    routes: endpointsFor(spec),
    files,
    bundle: toBundle(files),
  };
}
