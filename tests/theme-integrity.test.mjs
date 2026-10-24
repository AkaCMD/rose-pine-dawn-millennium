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

test('semantic text colors meet normal-text contrast on every light palette surface', async () => {
  const { contrast } = await import('../scripts/color.mjs');
  const tokens = new Map([...css.matchAll(/(--rp-[\w-]+):\s*(#[a-f\d]{6})\s*;/gi)].map(m => [m[1], m[2]]));
  const rgb = name => tokens.get(name).slice(1).match(/../g).map(c => parseInt(c, 16));
  for (const foreground of ['--rp-text', '--rp-secondary', '--rp-link', '--rp-status-game', '--rp-negative']) {
    for (const background of ['--rp-base', '--rp-surface', '--rp-overlay', '--rp-highlight-low', '--rp-highlight-med', '--rp-highlight-high']) {
      assert.ok(contrast(rgb(foreground), rgb(background)) >= 4.5, `${foreground} on ${background}`);
    }
  }
  assert.ok(contrast(rgb('--rp-on-accent'), rgb('--rp-pine')) >= 4.5);
});

test('the serialized probe embeds the shared color engine', async () => {
  const { rgba, composite } = await import('../scripts/color.mjs');
  const { probeExpression, scanPage } = await import('../scripts/scan-page.mjs');
  const source = probeExpression([]);
  assert.ok(source.includes(rgba.toString()), 'probe carries the exact rgba implementation');
  assert.ok(source.includes(composite.toString()), 'probe carries the exact composite implementation');
  assert.doesNotMatch(scanPage.toString(), /const parse =/);
  assert.doesNotMatch(scanPage.toString(), /const blend =/);
});
