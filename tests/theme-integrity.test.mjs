import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('skin.json', root), 'utf8'));
const paths = [...new Set(manifest.Patches.flatMap(p => p.TargetCss))];
const css = (await Promise.all(paths.map(path => readFile(new URL(path, root), 'utf8')))).join('\n');

test('manifest loads existing theme files and a light palette', () => {
  assert.ok(paths.includes('css/light.css'));
  assert.match(css, /color-scheme:\s*light/);
});
test('every theme variable reference has a definition', () => {
  const source = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const definitions = new Set([...source.matchAll(/(--rp-[\w-]+)\s*:/g)].map(m => m[1]));
  const references = [...source.matchAll(/var\(\s*(--rp-[\w-]+)/g)].map(m => m[1]);
  assert.deepEqual([...new Set(references.filter(name => !definitions.has(name)))], []);
});
test('the theme palette matches the repository palette data', async () => {
  const palette = JSON.parse(await readFile(new URL('palette.json', root), 'utf8')).dawn;
  for (const [key, value] of Object.entries(palette)) {
    assert.match(css, new RegExp(`--rp-${key}:\\s*${value}\\s*;`, 'i'));
  }
});
