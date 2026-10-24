import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReport } from '../scripts/coverage-report.mjs';

const palette = {
  base: '#faf4ed', surface: '#fffaf3', overlay: '#f2e9e1', pine: '#286983',
  love: '#b4637a', gold: '#ea9d34', rose: '#d7827e', foam: '#56949f',
  iris: '#907aa9', 'highlight-low': '#f4ede8', 'highlight-med': '#dfdad9', 'highlight-high': '#cecacd',
};

const sample = { selector: '#x', area: 1000, rect: [0, 0, 10, 10],
  background: [250, 244, 237, 1], foreground: [70, 66, 97, 1], ownBackground: true,
  hasText: true, fontSize: 16, fontWeight: 400, disabled: false, uncertain: null };

function page(overrides = {}) {
  return { title: 'Steam', location: 'https://example.com', visibility: 'visible',
    viewport: [1280, 800], themeBase: palette.base, regions: ['frame'], totalElements: 10,
    visibleElements: 5, mediaSkipped: 0, samples: [sample], limitations: [], ...overrides };
}

test('classifies samples, derives counts and eligibility, and drops raw samples', () => {
  const pages = [page()];
  const { report } = buildReport(pages, { palette, state: 'current' });
  assert.equal(pages[0].sampleCount, 1);
  assert.equal(pages[0].eligible, true);
  assert.equal(pages[0].samples, undefined);
  assert.deepEqual(pages[0].findings, []);
  assert.deepEqual(pages[0].manualReview, []);
  assert.equal(report.regions[0].status, '本视口未发现问题');
});

test('routes dark surfaces and unreadable text to findings, ambiguity to review', () => {
  const dark = { ...sample, background: [23, 25, 27, 1], hasText: false };
  const unreadable = { ...sample, foreground: [240, 240, 240, 1] };
  const gradient = { ...sample, uncertain: 'background image or gradient' };
  const pages = [page({ samples: [dark, unreadable, gradient] })];
  const { report } = buildReport(pages, { palette, state: 'current' });
  assert.ok(pages[0].findings.some(i => i.kind === 'dark-surface'));
  assert.ok(pages[0].findings.some(i => i.kind === 'low-contrast'));
  assert.ok(pages[0].manualReview.some(i => i.kind === 'manual-review'));
  assert.equal(report.regions[0].findings, 2);
  assert.equal(report.regions[0].manualReview, 1);
});

test('hidden, empty and unthemed pages are never eligible', () => {
  for (const change of [{ visibility: 'hidden' }, { samples: [] }, { themeBase: '' }]) {
    const pages = [page(change)];
    buildReport(pages, { palette, state: 'current' });
    assert.equal(pages[0].eligible, false);
  }
});

test('failed pages are not eligible and render as collection failures in markdown', () => {
  const pages = [page({ error: 'closed', samples: [] })];
  const { markdown } = buildReport(pages, { palette, state: 'current' });
  assert.equal(pages[0].eligible, false);
  assert.match(markdown, /采集失败/);
  assert.match(markdown, /closed/);
});

test('markdown carries region status, element evidence and the preview hash', () => {
  const dark = { ...sample, background: [23, 25, 27, 1], hasText: false };
  const pages = [page({ samples: [dark] })];
  const { markdown } = buildReport(pages, { palette, state: 'current', previewCssSha256: 'abc123' });
  assert.match(markdown, /主窗口/);
  assert.match(markdown, /疑似遗漏/);
  assert.match(markdown, /dark-surface/);
  assert.match(markdown, /#x/);
  assert.match(markdown, /abc123/);
});
