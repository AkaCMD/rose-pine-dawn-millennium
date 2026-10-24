import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { createHash } from 'node:crypto';
import { connect } from './cdp.mjs';
import { regions } from './coverage-rules.mjs';
import { probeExpression } from './scan-page.mjs';
import { buildReport } from './coverage-report.mjs';

const { values } = parseArgs({ options: {
  endpoint: { type: 'string', default: 'http://127.0.0.1:8080' },
  out: { type: 'string', default: 'reports/theme-coverage' },
  target: { type: 'string' }, state: { type: 'string', default: 'current' },
  strict: { type: 'boolean', default: false },
  preview: { type: 'boolean', default: false },
} });
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const palette = JSON.parse(await readFile(resolve(root, 'palette.json'), 'utf8')).dawn;

function safeLocation(url) {
  if (/^https?:/.test(url)) { const u = new URL(url); return u.origin + u.pathname; }
  if (url.startsWith('data:')) return 'data: (Steam renderer)';
  return url.split(/[?#]/)[0];
}
function safeTitle(title) { return /^(data:|https?:)/.test(title) ? '(Steam renderer)' : title; }

try {
  let previewCss;
  if (values.preview) {
    const manifest = JSON.parse(await readFile(resolve(root, 'skin.json'), 'utf8'));
    const paths = [...new Set(manifest.Patches.flatMap(p => p.TargetCss))];
    previewCss = (await Promise.all(paths.map(path => readFile(resolve(root, path), 'utf8')))).join('\n');
  }
  const endpoint = new URL(values.endpoint);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(endpoint.hostname) || endpoint.protocol !== 'http:') throw new Error('Use a loopback HTTP CDP endpoint');
  const response = await fetch(new URL('/json/list', endpoint), { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`CDP discovery returned ${response.status}`);
  const targets = (await response.json()).filter(t => t.type === 'page' && t.webSocketDebuggerUrl &&
    t.title !== 'SharedJSContext' && !t.url.startsWith('chrome:') && (!values.target || t.id === values.target));
  if (!targets.length) throw new Error('No eligible Steam page targets found');
  const pages = [];
  for (const target of targets) {
    let client;
    const page = { title: safeTitle(target.title), location: safeLocation(target.url) };
    try {
      client = await connect(target.webSocketDebuggerUrl);
      let expression = probeExpression(regions);
      if (previewCss) expression = `(() => {
        const style = document.createElement('style');
        style.textContent = ${JSON.stringify(previewCss)};
        document.documentElement.appendChild(style);
        try { return ${expression}; } finally { style.remove(); }
      })()`;
      const result = await client.call('Runtime.evaluate', {
        expression, returnByValue: true,
      });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
      Object.assign(page, result.result.value);
    } catch (error) { page.error = error.message; }
    finally { client?.close(); }
    pages.push(page);
  }
  const { report, markdown } = buildReport(pages, { palette, state: values.state,
    previewCssSha256: previewCss ? createHash('sha256').update(previewCss).digest('hex') : null });
  const output = resolve(values.out);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(`${output}.json`, JSON.stringify(report, null, 2) + '\n');
  await writeFile(`${output}.md`, markdown);
  console.table(report.regions.map(({ label, status, pages, findings, manualReview }) => ({ label, status, pages, findings, manualReview })));
  console.log(`Report: ${output}.md`);
  if (values.strict && (report.pages.some(p => p.error) || report.regions.some(r => r.status !== '本视口未发现问题'))) process.exitCode = 1;
} catch (error) { console.error(error.message); process.exitCode = 2; }
