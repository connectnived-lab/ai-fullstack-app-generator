import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { generateApp } from '../../src/core/agent.js';

// The scaffolded project must install nothing and pass its own tests with Node's runner.
test('a generated project passes its own tests', async () => {
  const { files } = await generateApp({ brief: 'An app called Bakery Orders. Track customers, orders and products.', settings: {} });
  const dir = mkdtempSync(join(tmpdir(), 'fsg-'));
  try {
    for (const [path, text] of Object.entries(files)) {
      mkdirSync(dirname(join(dir, path)), { recursive: true });
      writeFileSync(join(dir, path), text);
    }
    const env = { ...process.env };
    delete env.NODE_TEST_CONTEXT;
    const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', join(dir, 'tests', 'api.test.js')], { encoding: 'utf8', env, cwd: dir });
    assert.match(out, /# pass 6\b/);
    assert.match(out, /# fail 0/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
