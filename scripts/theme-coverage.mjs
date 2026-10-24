import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { createHash } from 'node:crypto';
import { connect } from './cdp.mjs';
import { classify, regions, summarize } from './coverage-rules.mjs';
import { scanPage } from './scan-page.mjs';

const { values } = parseArgs({ options: {
  endpoint: { type: 'string', default: 'http://127.0.0.1:8080' },
  out: { type: 'string', default: 'reports/theme-coverage' },
  target: { type: 'string' }, state: { type: 'string', default: 'current' },
  strict: { type: 'boolean', default: false },
  preview: { type: 'boolean', default: false },
} });
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const palette = JSON.parse(await readFile(resolve(root, 'palette.json'), 'utf8')).dawn;
const allowedBackgrounds = ['base', 'surface', 'overlay', 'pine', 'love', 'gold', 'rose', 'foam', 'iris',
  'highlight-low', 'highlight-med', 'highlight-high'].map(key => [...palette[key].slice(1).match(/../g).map(c => parseInt(c, 16)), 1]);

function safeLocation(url) {
  if (/^https?:/.test(url)) { const u = new URL(url); return u.origin + u.pathname; }
  if (url.startsWith('data:')) return 'data: (Steam renderer)';
  return url.split(/[?#]/)[0];
}
function safeTitle(title) { return /^(data:|https?:)/.test(title) ? '(Steam renderer)' : title; }
function markdown(report) {
  const lines = ['# Steam 主题覆盖检查', '', `采集时间：${report.capturedAt}。状态标签：${report.state}。`, '',
    '疑似遗漏需要复核。未验证表示缺少可用页面或主题变量，不能视为已通过。', '',
    '| 区域 | 状态 | 可用页面 | 疑似遗漏 | 人工复核 |', '| --- | --- | ---: | ---: | ---: |'];
  for (const region of report.regions) lines.push(`| ${region.label} | ${region.status} | ${region.pages} | ${region.findings} | ${region.manualReview} |`);
  if (report.previewCssSha256) lines.push('', `本报告使用临时注入的仓库 CSS，采集结束后移除。CSS SHA-256：\`${report.previewCssSha256}\`。不代表主题已安装。`);
  lines.push('', '## 元素证据', '', '| 页面 | 问题 | 元素 | 计算值 |', '| --- | --- | --- | --- |');
  const escape = value => String(value).replaceAll('|', '\\|').replaceAll('`', '\\`').replaceAll('\n', ' ');
  for (const page of report.pages) {
    for (const issue of page.eligible ? page.findings : []) lines.push(`| ${escape(page.title)} | ${issue.kind} | \`${escape(issue.selector)}\` | ${escape(issue.ratio ? `${issue.ratio}:1 < ${issue.minimum}:1` : JSON.stringify(issue.background.map(n => +n.toFixed(2))))} |`);
    if (page.error) lines.push(`| ${escape(page.title)} | 采集失败 | | ${escape(page.error)} |`);
  }
  lines.push('', '## 页面采集情况', '', '| 页面 | 可见状态 | 主题变量匹配 | 样本数 | 区域识别 |', '| --- | --- | --- | ---: | --- |');
  for (const page of report.pages) lines.push(`| ${escape(page.title)} | ${page.visibility ?? '未知'} | ${page.themeBase === palette.base ? '是' : '否'} | ${page.sampleCount ?? 0} | ${page.regions?.join(', ') || '未识别'} |`);
  lines.push('', '## 检查边界', '',
    'JSON 保留所有需人工复核元素、坐标和计算样式。报告不保存文字内容、Cookie、查询参数或会话值。', '',
    '只检查当前视口；悬停、键盘焦点、选中、弹出菜单和滚动后的内容需要分别打开并重新采集。', '',
    '好友聊天、社区、Big Picture 和游戏内覆盖层属于后续范围。', '',
    '背景图片、渐变、透明画布、滤镜及混合效果列为人工复核。图片、视频、SVG 和画布保留原色。', '',
    '深色背景是疑似遗漏；调色板强调色允许用作背景。对比度阈值为普通文字 4.5:1、大字 3:1。', '',
    '可见性采用中心点最上层元素命中近似判断；无直接文字且中心被子级素材覆盖的容器跳过背景检查。伪元素、Shadow DOM、子框架和原生窗口遮挡没有覆盖。', '',
    'themeBase 只验证当前渲染器存在主题变量，不能证明加载的是本次仓库版本。', '',
    '退出码：0 表示采集完成；1 表示 strict 检查发现遗漏、待复核、未验证或采集失败；2 表示接口或参数错误。', '');
  return lines.join('\n');
}

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
      let expression = `(${scanPage.toString()})(${JSON.stringify(regions)})`;
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
      page.findings = [];
      page.manualReview = [];
      for (const sample of page.samples) {
        for (const issue of classify(sample, allowedBackgrounds)) {
          (issue.kind === 'manual-review' ? page.manualReview : page.findings).push({ ...sample, ...issue });
        }
      }
      page.sampleCount = page.samples.length;
      page.eligible = page.visibility === 'visible' && page.sampleCount > 0 && page.themeBase === palette.base;
      delete page.samples;
    } catch (error) { page.error = error.message; page.findings = []; page.manualReview = []; }
    finally { client?.close(); }
    pages.push(page);
  }
  const summary = summarize(pages, palette.base);
  const report = { capturedAt: new Date().toISOString(), state: values.state,
    previewCssSha256: previewCss ? createHash('sha256').update(previewCss).digest('hex') : null,
    regions: summary, pages };
  const output = resolve(values.out);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(`${output}.json`, JSON.stringify(report, null, 2) + '\n');
  await writeFile(`${output}.md`, markdown(report));
  console.table(summary.map(({ label, status, pages, findings, manualReview }) => ({ label, status, pages, findings, manualReview })));
  console.log(`Report: ${output}.md`);
  if (values.strict && (pages.some(p => p.error) || summary.some(r => r.status !== '本视口未发现问题'))) process.exitCode = 1;
} catch (error) { console.error(error.message); process.exitCode = 2; }
