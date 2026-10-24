import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readdirSync, existsSync, readFileSync, rmSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const source = fileURLToPath(new URL('../', import.meta.url));
const installer = join(source, 'install.sh');

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'rose-pine-install-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'config'));
  return { root, themes: join(root, 'millennium/themes'), dest: join(root, 'millennium/themes/rose-pine-dawn') };
}

test('updates remove old backups and obsolete files while preserving other themes', t => {
  const { root, themes, dest } = fixture(t);
  execFileSync('bash', [installer, root]);
  writeFileSync(join(dest, 'css/obsolete.css'), 'old');
  for (const name of ['rose-pine-dawn.backup-20261024-061405', 'rose-pine-dawn.backup-20261024-062818', 'another-theme']) {
    mkdirSync(join(themes, name));
    writeFileSync(join(themes, name, 'skin.json'), '{}');
  }
  for (let i = 0; i < 2; i++) execFileSync('bash', [installer, root]);
  assert.deepEqual(readdirSync(themes).sort(), ['another-theme', 'rose-pine-dawn']);
  assert.equal(existsSync(join(dest, 'css/obsolete.css')), false);
  assert.equal(readFileSync(join(dest, 'skin.json'), 'utf8'), readFileSync(join(source, 'skin.json'), 'utf8'));
});

test('running the installed script still cleans legacy backups', t => {
  const { root, themes, dest } = fixture(t);
  execFileSync('bash', [installer, root]);
  mkdirSync(join(themes, 'rose-pine-dawn.backup-20261024-061405'));
  execFileSync('bash', [join(dest, 'install.sh'), root]);
  assert.deepEqual(readdirSync(themes), ['rose-pine-dawn']);
  assert.ok(existsSync(join(dest, 'skin.json')));
});

test('failed staging leaves the installed theme and backups intact', t => {
  const { root, themes, dest } = fixture(t);
  execFileSync('bash', [installer, root]);
  const backup = join(themes, 'rose-pine-dawn.backup-20261024-061405');
  mkdirSync(backup);
  const incompleteSource = join(root, 'incomplete-source');
  mkdirSync(incompleteSource);
  cpSync(installer, join(incompleteSource, 'install.sh'));
  assert.throws(() => execFileSync('bash', [join(incompleteSource, 'install.sh'), root], { stdio: 'pipe' }));
  assert.ok(existsSync(join(dest, 'skin.json')));
  assert.ok(existsSync(backup));
});
