import test from 'node:test';
import assert from 'node:assert/strict';
import { rgba, composite, contrast, classify, summarize } from '../scripts/coverage-rules.mjs';

const cream = [250, 244, 237, 1], pine = [40, 105, 131, 1];
const sample = { background: cream, foreground: [70, 66, 97, 1], ownBackground: true,
  hasText: true, disabled: false, fontSize: 16, fontWeight: 400, area: 1000 };

test('parses computed color and rejects unsupported formats', () => {
  assert.deepEqual(rgba('rgba(1, 2, 3, 0.5)'), [1, 2, 3, .5]);
  assert.equal(rgba('transparent'), null);
});
test('composites translucent layers before measuring contrast', () => {
  assert.deepEqual(composite([0, 0, 0, .5], [255, 255, 255, 1]), [127.5, 127.5, 127.5, 1]);
  assert.deepEqual(composite([0, 0, 0, 0], [0, 0, 0, 0]), [0, 0, 0, 0]);
  assert.equal(contrast([0, 0, 0, 1], [255, 255, 255, 1]), 21);
});
test('finds an unknown dark surface but allows palette emphasis', () => {
  assert.ok(classify({ ...sample, background: [23, 25, 27, 1], hasText: false }, [pine]).some(i => i.kind === 'dark-surface'));
  assert.deepEqual(classify({ ...sample, background: pine, hasText: false }, [pine]), []);
  assert.deepEqual(classify(sample, [cream]), []);
});
test('finds unreadable text including translucent foreground', () => {
  assert.equal(classify({ ...sample, foreground: [240, 240, 240, 1] }, [cream])[0].kind, 'low-contrast');
  assert.equal(classify({ ...sample, foreground: [0, 0, 0, .1] }, [cream])[0].kind, 'low-contrast');
});
test('uses large text thresholds and skips disabled text', () => {
  const medium = { ...sample, background: [255, 255, 255, 1], foreground: [140, 140, 140, 1] };
  assert.equal(classify(medium, [cream])[0].kind, 'low-contrast');
  assert.deepEqual(classify({ ...medium, fontSize: 24 }, [cream]), []);
  assert.deepEqual(classify({ ...medium, fontSize: 19, fontWeight: 700 }, [cream]), []);
  assert.deepEqual(classify({ ...medium, disabled: true }, [cream]), []);
});
test('routes image and gradient ambiguity to review, never a passing result', () => {
  assert.deepEqual(classify({ ...sample, uncertain: 'background image or gradient' }, []), [
    { kind: 'manual-review', reason: 'background image or gradient' },
  ]);
});
test('empty, hidden, unthemed and failed pages cannot satisfy regional coverage', () => {
  const p = { regions: ['frame'], sampleCount: 2, themeBase: '#faf4ed', visibility: 'visible', findings: [], manualReview: [] };
  for (const change of [{ visibility: 'hidden' }, { sampleCount: 0 }, { themeBase: '' }, { error: 'closed' }]) {
    assert.equal(summarize([{ ...p, ...change }], '#faf4ed')[0].status, '未验证');
  }
  assert.equal(summarize([], '#faf4ed')[0].status, '未验证');
  assert.equal(summarize([p], '#faf4ed')[0].status, '本视口未发现问题');
  assert.equal(summarize([{ ...p, manualReview: [{}] }], '#faf4ed')[0].status, '需人工复核');
  assert.equal(summarize([{ ...p, findings: [{}] }], '#faf4ed')[0].status, '疑似遗漏');
});
