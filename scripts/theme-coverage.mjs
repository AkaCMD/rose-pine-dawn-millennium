import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { capturePages } from './capture-pages.mjs';
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

try {
  const { pages, previewCssSha256 } = await capturePages(values);
  const { report, markdown } = buildReport(pages, { palette, state: values.state, previewCssSha256 });
  const output = resolve(values.out);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(`${output}.json`, JSON.stringify(report, null, 2) + '\n');
  await writeFile(`${output}.md`, markdown);
  console.table(report.regions.map(({ label, status, pages, findings, manualReview }) => ({ label, status, pages, findings, manualReview })));
  console.log(`Report: ${output}.md`);
  if (values.strict && (report.pages.some(p => p.error) || report.regions.some(r => r.status !== '本视口未发现问题'))) process.exitCode = 1;
} catch (error) { console.error(error.message); process.exitCode = 2; }
