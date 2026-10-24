import { classify, summarize } from './coverage-rules.mjs';

const backgroundKeys = ['base', 'surface', 'overlay', 'pine', 'love', 'gold', 'rose', 'foam', 'iris',
  'highlight-low', 'highlight-med', 'highlight-high'];

function allowedBackgrounds(palette) {
  return backgroundKeys.map(key => [...palette[key].slice(1).match(/../g).map(c => parseInt(c, 16)), 1]);
}

function markdown(report, base) {
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
  for (const page of report.pages) lines.push(`| ${escape(page.title)} | ${page.visibility ?? '未知'} | ${page.themeBase === base ? '是' : '否'} | ${page.sampleCount ?? 0} | ${page.regions?.join(', ') || '未识别'} |`);
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

// Turns raw page captures into a classified report and its markdown rendering.
// Pure: no CDP, no filesystem, no process exit codes. Tests feed fixture pages.
export function buildReport(pages, { palette, state, previewCssSha256 = null }) {
  const backgrounds = allowedBackgrounds(palette);
  for (const page of pages) {
    page.findings = [];
    page.manualReview = [];
    for (const sample of page.samples ?? []) {
      for (const issue of classify(sample, backgrounds)) {
        (issue.kind === 'manual-review' ? page.manualReview : page.findings).push({ ...sample, ...issue });
      }
    }
    page.sampleCount = page.samples?.length ?? 0;
    page.eligible = !page.error && page.visibility === 'visible' && page.sampleCount > 0 && page.themeBase === palette.base;
    delete page.samples;
  }
  const report = { capturedAt: new Date().toISOString(), state,
    previewCssSha256, regions: summarize(pages, palette.base), pages };
  return { report, markdown: markdown(report, palette.base) };
}
