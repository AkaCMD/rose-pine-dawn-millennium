import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { withBrowserFixture } from './helpers/browser-fixture.mjs';

// Script the CDP transport, rather than pretending to implement a CSS engine.
// Real cascade/visibility checks remain in the opt-in browser scenarios.
function browserTransport(t, { connectionError = false, closeError = false } = {}) {
  const requests = [];
  const commands = [];
  const styles = [];
  const document = {
    open() {},
    write(html) { this.html = html; },
    close() {},
    createElement() { return {}; },
    head: { append(style) { styles.push(style.textContent); } },
  };
  let socketClosed = false;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    requests.push({ url, method: options?.method });
    if (url.endsWith('/json/new?about:blank')) {
      return { ok: true, json: async () => ({ id: 'fixture-only', webSocketDebuggerUrl: 'ws://fixture/page' }) };
    }
    if (closeError) throw new Error('fixture close failed');
    return { ok: true };
  });
  const originalWebSocket = globalThis.WebSocket;
  t.after(() => { globalThis.WebSocket = originalWebSocket; });
  globalThis.WebSocket = class extends EventTarget {
    constructor() {
      super();
      queueMicrotask(() => this.dispatchEvent(new Event(connectionError ? 'error' : 'open')));
    }
    send(data) {
      const { id, method, params } = JSON.parse(data);
      commands.push({ method, params });
      let result = {};
      if (method === 'Runtime.evaluate') {
        try {
          result = { result: { value: runInNewContext(params.expression, { document }) } };
        } catch (error) {
          result = { exceptionDetails: { exception: { description: error.message } } };
        }
      }
      if (method === 'DOM.getDocument') result = { root: { nodeId: 1 } };
      if (method === 'DOM.querySelectorAll') result = { nodeIds: params.selector === '.missing' ? [] : [2, 3] };
      queueMicrotask(() => this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify({ id, result }) })));
    }
    close() { socketClosed = true; this.dispatchEvent(new Event('close')); }
  };
  return { requests, commands, styles, document, get socketClosed() { return socketClosed; } };
}

const options = { html: '<main>Fixture</main>', nativeCss: 'main { color:white; }', endpoint: 'http://fixture' };

test('browser fixture uses manifest cascade order, supports staged styles, and closes its temporary page', async t => {
  const browser = browserTransport(t);
  const manifest = JSON.parse(await readFile(new URL('../skin.json', import.meta.url), 'utf8'));
  const expectedCss = await Promise.all(manifest.Patches.flatMap(patch => patch.TargetCss)
    .map(path => readFile(new URL(`../${path}`, import.meta.url), 'utf8')));
  const result = await withBrowserFixture(options, async page => {
    assert.equal(await page.evaluate('document.html'), options.html);
    assert.deepEqual(browser.styles, [options.nativeCss, ...expectedCss]);
    await page.addStyles(['css/light.css']);
    assert.equal(browser.styles.at(-1), await readFile(new URL('../css/light.css', import.meta.url), 'utf8'));
    await page.forcePseudoState('main *', ['hover']);
    const states = browser.commands.filter(command => command.method === 'CSS.forcePseudoState');
    assert.deepEqual(states.map(command => command.params), [
      { nodeId: 2, forcedPseudoClasses: ['hover'] },
      { nodeId: 3, forcedPseudoClasses: ['hover'] },
    ]);
    return 'scenario result';
  });
  assert.equal(result, 'scenario result');
  assert.equal(browser.socketClosed, true);
  assert.deepEqual(browser.requests, [
    { url: 'http://fixture/json/new?about:blank', method: 'PUT' },
    { url: 'http://fixture/json/close/fixture-only', method: undefined },
  ]);
});

test('browser fixture can load Steam before the palette without loading the manifest', async t => {
  const browser = browserTransport(t);
  await withBrowserFixture({ ...options, styles: ['css/steam.css'] }, async page => {
    assert.deepEqual(browser.styles, [options.nativeCss, await readFile(new URL('../css/steam.css', import.meta.url), 'utf8')]);
    await page.addStyles(['css/light.css']);
    assert.equal(browser.styles.length, 3);
  });
});

test('browser fixture closes its page even when the connection fails', async t => {
  const browser = browserTransport(t, { connectionError: true });
  await assert.rejects(withBrowserFixture(options, () => assert.fail('unreachable')), /CDP connection failed/);
  assert.equal(browser.requests.at(-1).url, 'http://fixture/json/close/fixture-only');
});

test('browser fixture reports evaluation errors and preserves them when cleanup fails', async t => {
  const browser = browserTransport(t, { closeError: true });
  await assert.rejects(withBrowserFixture({ ...options, styles: [] }, page =>
    page.evaluate('throw new Error("scenario failed")')), /Browser fixture evaluation failed: scenario failed/);
  assert.equal(browser.socketClosed, true);
  assert.equal(browser.requests.at(-1).url, 'http://fixture/json/close/fixture-only');
});

test('browser fixture rejects missing pseudo-state selectors and cleans up', async t => {
  const browser = browserTransport(t);
  await assert.rejects(withBrowserFixture({ ...options, styles: [] }, page =>
    page.forcePseudoState('.missing', ['focus'])), /selector matched no nodes: .missing/);
  assert.equal(browser.socketClosed, true);
  assert.equal(browser.requests.at(-1).url, 'http://fixture/json/close/fixture-only');
});

test('browser fixture reports cleanup failures after a successful scenario', async t => {
  browserTransport(t, { closeError: true });
  await assert.rejects(withBrowserFixture({ ...options, styles: [] }, async () => {}), /fixture close failed/);
});
