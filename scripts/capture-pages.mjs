import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { connect } from './cdp.mjs';
import { regions } from './coverage-rules.mjs';
import { probeExpression } from './scan-page.mjs';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function safeLocation(url) {
  if (/^https?:/i.test(url)) {
    try { const location = new URL(url); return location.origin + location.pathname; }
    catch { return '(invalid Steam page location)'; }
  }
  if (/^data:/i.test(url)) return 'data: (Steam renderer)';
  return url.split(/[?#]/)[0];
}

function safeTitle(title) { return /^(data:|https?:)/i.test(title) ? '(Steam renderer)' : title; }

// Owns discovery and renderer lifetimes. The transport seam also lets tests
// exercise page failures without depending on a running Steam renderer.
export async function capturePages({ endpoint = 'http://127.0.0.1:8080', target: targetId,
  preview = false, root = repositoryRoot } = {}, transport = { fetch: globalThis.fetch, connect }) {
  const discovery = new URL(endpoint);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(discovery.hostname) || discovery.protocol !== 'http:') {
    throw new Error('Use a loopback HTTP CDP endpoint');
  }

  let previewCss;
  if (preview) {
    const manifest = JSON.parse(await readFile(resolve(root, 'skin.json'), 'utf8'));
    const paths = [...new Set(manifest.Patches.flatMap(patch => patch.TargetCss))];
    previewCss = (await Promise.all(paths.map(path => readFile(resolve(root, path), 'utf8')))).join('\n');
  }

  const response = await transport.fetch(new URL('/json/list', discovery), { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`CDP discovery returned ${response.status}`);
  const targets = (await response.json()).filter(target => target.type === 'page' && target.webSocketDebuggerUrl &&
    target.title !== 'SharedJSContext' && !target.url.startsWith('chrome:') && (!targetId || target.id === targetId));
  if (!targets.length) throw new Error('No eligible Steam page targets found');

  let expression = probeExpression(regions);
  if (previewCss) expression = `(() => {
    const style = document.createElement('style');
    style.textContent = ${JSON.stringify(previewCss)};
    document.documentElement.appendChild(style);
    try { return ${expression}; } finally { style.remove(); }
  })()`;

  const pages = [];
  for (const target of targets) {
    let client;
    const page = { title: safeTitle(target.title), location: safeLocation(target.url) };
    try {
      client = await transport.connect(target.webSocketDebuggerUrl);
      const result = await client.call('Runtime.evaluate', { expression, returnByValue: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
      Object.assign(page, result.result.value);
    } catch (error) { page.error = error.message; }
    finally {
      try { await client?.close(); }
      catch (error) { page.error ||= error.message; }
    }
    pages.push(page);
  }
  return { pages, previewCssSha256: previewCss ? createHash('sha256').update(previewCss).digest('hex') : null };
}
