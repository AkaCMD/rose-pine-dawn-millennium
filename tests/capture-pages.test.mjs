import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { capturePages } from '../scripts/capture-pages.mjs';

const run = promisify(execFile);
const cli = new URL('../scripts/theme-coverage.mjs', import.meta.url);
const pageTarget = (id, overrides = {}) => ({ id, type: 'page', title: 'Steam',
  url: 'https://store.steampowered.com/library/?token=secret#session',
  webSocketDebuggerUrl: `ws://127.0.0.1:8080/${id}`, ...overrides });

// A scripted CDP adapter exercises discovery/transport failures and evaluates
// the real probe in a minimal document to observe temporary stylesheet lifetime.
function scriptedTransport(targets, scenes = {}) {
  const opened = [], closed = [], discoveries = [], inserted = [], remaining = new Set();
  return {
    opened, closed, discoveries, inserted, remaining,
    async fetch(url, options) {
      discoveries.push({ url: String(url), signal: options.signal });
      return { ok: true, async json() { return targets; } };
    },
    async connect(url) {
      const id = new URL(url).pathname.slice(1);
      const scene = scenes[id] ?? {};
      if (scene.connectError) throw new Error(scene.connectError);
      opened.push(id);
      return {
        async call(method, { expression, returnByValue }) {
          assert.equal(method, 'Runtime.evaluate');
          assert.equal(returnByValue, true);
          if (scene.callError) throw new Error(scene.callError);
          const document = {
            title: 'Steam', visibilityState: 'visible',
            documentElement: { appendChild(style) { inserted.push(style.textContent); remaining.add(style); } },
            createElement(name) {
              assert.equal(name, 'style');
              return { textContent: '', remove() { remaining.delete(this); } };
            },
            querySelectorAll(selector) {
              if (scene.scanError && selector === '*') throw new Error(scene.scanError);
              return [];
            },
          };
          try {
            const value = runInNewContext(expression, {
              document, location: new URL('https://store.steampowered.com/'),
              innerWidth: 1280, innerHeight: 800,
              getComputedStyle() { return { getPropertyValue() { return '#faf4ed'; } }; },
            }, { timeout: 1000 });
            return { result: { value: structuredClone(value) } };
          } catch (error) {
            return { exceptionDetails: { text: error.message } };
          }
        },
        close() {
          closed.push(id);
          if (scene.closeError) throw new Error(scene.closeError);
        },
      };
    },
  };
}

async function temporaryDirectory(t) {
  const path = await mkdtemp(join(tmpdir(), 'theme-capture-test-'));
  t.after(() => rm(path, { recursive: true, force: true }));
  return path;
}

test('discovers eligible pages at the default loopback endpoint and filters a selected target', async () => {
  const targets = [pageTarget('worker', { type: 'worker' }), pageTarget('no-socket', { webSocketDebuggerUrl: '' }),
    pageTarget('shared', { title: 'SharedJSContext' }), pageTarget('internal', { url: 'chrome://version/' }),
    pageTarget('first'), pageTarget('second')];
  const transport = scriptedTransport(targets);
  const { pages, previewCssSha256 } = await capturePages({}, transport);
  assert.deepEqual(transport.opened, ['first', 'second']);
  assert.deepEqual(transport.closed, transport.opened);
  assert.equal(transport.discoveries[0].url, 'http://127.0.0.1:8080/json/list');
  assert.ok(transport.discoveries[0].signal instanceof AbortSignal);
  assert.equal(pages.length, 2);
  assert.equal(pages[0].themeBase, '#faf4ed');
  assert.equal(previewCssSha256, null);
  assert.deepEqual(transport.inserted, []);

  const selected = scriptedTransport(targets);
  assert.equal((await capturePages({ target: 'second' }, selected)).pages.length, 1);
  assert.deepEqual(selected.opened, ['second']);
});

test('redacts credentials, query strings, fragments, and URL-like renderer titles', async () => {
  const transport = scriptedTransport([
    pageTarget('http', { title: 'https://private.invalid/?token=secret',
      url: 'https://user:password@store.steampowered.com/app/1?token=secret#session' }),
    pageTarget('data', { title: 'data:text/html,secret', url: 'data:text/html,secret' }),
    pageTarget('local', { title: 'Steam Settings', url: 'steam://settings?token=secret#session' }),
    pageTarget('malformed', { url: 'https://[invalid?token=secret' }),
  ]);
  const { pages } = await capturePages({}, transport);
  assert.deepEqual(pages.map(({ title, location }) => ({ title, location })), [
    { title: '(Steam renderer)', location: 'https://store.steampowered.com/app/1' },
    { title: '(Steam renderer)', location: 'data: (Steam renderer)' },
    { title: 'Steam Settings', location: 'steam://settings' },
    { title: 'Steam', location: '(invalid Steam page location)' },
  ]);
  assert.doesNotMatch(JSON.stringify(pages), /secret|password|session/);
});

test('continues after connection, transport, renderer, and close failures while closing every opened client', async () => {
  const ids = ['offline', 'disconnected', 'broken', 'close-failed', 'healthy'];
  const transport = scriptedTransport(ids.map(id => pageTarget(id)), {
    offline: { connectError: 'connection refused' }, disconnected: { callError: 'CDP disconnected' },
    broken: { scanError: 'document unavailable' }, 'close-failed': { closeError: 'close failed' },
  });
  const { pages } = await capturePages({}, transport);
  assert.deepEqual(pages.map(page => page.error), [
    'connection refused', 'CDP disconnected', 'document unavailable', 'close failed', undefined,
  ]);
  assert.deepEqual(transport.closed, ['disconnected', 'broken', 'close-failed', 'healthy']);
  assert.equal(pages[4].visibility, 'visible');
});

test('preview uses manifest order once per CSS path, hashes the injected CSS, and removes it on success and scan failure', async t => {
  const root = await temporaryDirectory(t);
  const first = ':root { --example: "quoted"; }', second = 'body { color: red; }';
  await writeFile(join(root, 'first.css'), first);
  await writeFile(join(root, 'second.css'), second);
  await writeFile(join(root, 'skin.json'), JSON.stringify({ Patches: [
    { TargetCss: ['second.css', 'first.css'] }, { TargetCss: ['second.css'] },
  ] }));
  const transport = scriptedTransport([pageTarget('healthy'), pageTarget('broken'), pageTarget('last')],
    { broken: { scanError: 'scan failed' } });
  const { pages, previewCssSha256 } = await capturePages({ preview: true, root }, transport);
  const expectedCss = `${second}\n${first}`;
  assert.deepEqual(transport.inserted, [expectedCss, expectedCss, expectedCss]);
  assert.equal(transport.remaining.size, 0);
  assert.deepEqual(transport.closed, ['healthy', 'broken', 'last']);
  assert.equal(pages[1].error, 'scan failed');
  assert.equal(pages[2].visibility, 'visible');
  assert.equal(previewCssSha256, createHash('sha256').update(expectedCss).digest('hex'));
});

test('rejects non-loopback or non-HTTP endpoints before discovery', async () => {
  const transport = scriptedTransport([]);
  for (const endpoint of ['https://127.0.0.1:8080', 'http://example.com', 'http://127.0.0.1.example.com']) {
    await assert.rejects(capturePages({ endpoint }, transport), /Use a loopback HTTP CDP endpoint/);
  }
  assert.equal(transport.discoveries.length, 0);
  for (const endpoint of ['http://localhost:8080', 'http://[::1]:8080']) {
    await assert.rejects(capturePages({ endpoint }, transport), /No eligible Steam page targets found/);
  }
});

test('discovery and manifest failures reject the capture without opening any renderer', async t => {
  const transport = scriptedTransport([pageTarget('healthy')]);
  const root = await temporaryDirectory(t);
  await assert.rejects(capturePages({ root, preview: true }, transport), /ENOENT/);
  assert.equal(transport.discoveries.length, 0);
  await assert.rejects(capturePages({ target: 'missing' }, transport), /No eligible Steam page targets found/);
  await assert.rejects(capturePages({}, { ...transport,
    async fetch() { return { ok: false, status: 503 }; },
  }), /CDP discovery returned 503/);
  await assert.rejects(capturePages({}, { ...transport,
    async fetch() { throw new Error('discovery unavailable'); },
  }), /discovery unavailable/);
  assert.deepEqual(transport.opened, []);
});

test('CLI keeps report output, state labels, and exit codes 0, 1, and 2', async t => {
  const root = await temporaryDirectory(t);
  const server = createServer((request, response) => {
    assert.equal(request.url, '/json/list');
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify([pageTarget('unavailable', {
      webSocketDebuggerUrl: `ws://127.0.0.1:${server.address().port}/unavailable`,
    })]));
  });
  server.on('upgrade', (request, socket) => socket.destroy());
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const endpoint = `http://127.0.0.1:${server.address().port}`;
  const output = join(root, 'capture');
  const args = [cli.pathname, '--endpoint', endpoint, '--out', output, '--state', 'test-state'];
  const completed = await run(process.execPath, args, { timeout: 10000 });
  assert.match(completed.stdout, /Report:/);
  const report = JSON.parse(await readFile(`${output}.json`, 'utf8'));
  assert.equal(report.state, 'test-state');
  assert.equal(report.pages[0].error, 'CDP connection failed');
  assert.equal(report.pages[0].location, 'https://store.steampowered.com/library/');
  assert.match(await readFile(`${output}.md`, 'utf8'), /采集失败/);
  await assert.rejects(run(process.execPath, [...args, '--strict'], { timeout: 10000 }), error => error.code === 1);
  await assert.rejects(run(process.execPath, [cli.pathname, '--endpoint', 'https://127.0.0.1:8080'],
    { timeout: 10000 }), error => error.code === 2 && /Use a loopback HTTP CDP endpoint/.test(error.stderr));
});
