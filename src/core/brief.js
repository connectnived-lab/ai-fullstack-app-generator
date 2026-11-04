// Demo planner: reads a product brief with keywords and returns a spec. Live mode asks a model instead.
import { validateSpec } from './spec.js';

export const KNOWN = {
  customer: [['name', 'text'], ['email', 'email'], ['phone', 'text']],
  order: [['customer', 'text'], ['total', 'number'], ['status', 'text']],
  product: [['name', 'text'], ['price', 'number'], ['stock', 'number']],
  booking: [['guest', 'text'], ['date', 'text'], ['party', 'number']],
  task: [['title', 'text'], ['done', 'boolean']],
  ticket: [['subject', 'text'], ['priority', 'text'], ['status', 'text']],
  lead: [['name', 'text'], ['company', 'text'], ['stage', 'text']],
  invoice: [['client', 'text'], ['amount', 'number'], ['due', 'text']],
  note: [['title', 'text'], ['body', 'text']],
  event: [['title', 'text'], ['date', 'text']],
};

const PLURALS = {
  customers: 'customer', orders: 'order', products: 'product', bookings: 'booking', tasks: 'task',
  tickets: 'ticket', leads: 'lead', invoices: 'invoice', notes: 'note', events: 'event',
};

export function guessName(brief) {
  const m = /(?:called|named)\s+["“']?((?:[A-Z][\w-]*)(?:\s+[A-Z][\w-]*){0,2})/.exec(brief);
  return m ? m[1].trim() : 'My App';
}

export function guessEntities(brief) {
  const found = [];
  const re = new RegExp(`\\b(${Object.keys(PLURALS).join('|')}|${Object.keys(KNOWN).join('|')})\\b`, 'gi');
  let m;
  while ((m = re.exec(brief))) {
    const word = m[1].toLowerCase();
    const key = PLURALS[word] ?? word;
    if (!found.includes(key)) found.push(key);
  }
  return found;
}

export function planFromBrief(brief) {
  const text = String(brief ?? '').trim();
  if (!text) throw new Error('Describe the business or product first.');
  const name = guessName(text);
  let keys = guessEntities(text.split(name).join(' '));
  if (keys.length === 0) keys = ['task'];
  const entities = keys.slice(0, 6).map((k) => ({ name: k, fields: KNOWN[k].map(([name, type]) => ({ name, type })) }));
  const description = text.split(/\n/)[0].slice(0, 160);
  return validateSpec({ name, description, entities });
}
