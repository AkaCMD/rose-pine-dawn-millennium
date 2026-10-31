import { readFile } from 'node:fs/promises';
import { connect } from '../../scripts/cdp.mjs';

const root = new URL('../../', import.meta.url);

async function stylesheets(styles) {
  const paths = styles === 'manifest'
    ? JSON.parse(await readFile(new URL('skin.json', root), 'utf8')).Patches.flatMap(patch => patch.TargetCss)
    : styles;
  // Keep manifest order, including repeats: repeated styles can change the cascade.
  return Promise.all(paths.map(path => readFile(new URL(path, root), 'utf8')));
}

/** Own one temporary browser page for the entire scenario, including failed setup. */
export async function withBrowserFixture({
  html,
  nativeCss = '',
  styles = 'manifest',
  viewport = { width: 1200, height: 900 },
  endpoint = process.env.STEAM_CDP_ENDPOINT ?? 'http://127.0.0.1:8080',
}, scenario) {
  const response = await fetch(`${endpoint}/json/new?about:blank`, {
    method: 'PUT', signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`Could not create browser fixture: HTTP ${response.status}`);
  const target = await response.json();
  if (!target.id) throw new Error('Browser fixture target has no id');
  let client;
  let failure;
  try {
    client = await connect(target.webSocketDebuggerUrl);
    const evaluate = async expression => {
      const result = await client.call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) {
        const details = result.exceptionDetails;
        throw new Error(`Browser fixture evaluation failed: ${details.exception?.description ?? details.text ?? 'unknown exception'}`);
      }
      return result.result.value;
    };
    const addStyles = async paths => {
      for (const css of await stylesheets(paths)) {
        await evaluate(`(()=>{const style=document.createElement('style');style.textContent=${JSON.stringify(css)};document.head.append(style);})()`);
      }
    };
    await client.call('Emulation.setDeviceMetricsOverride', { ...viewport, deviceScaleFactor: 1, mobile: false });
    await evaluate(`document.open();document.write(${JSON.stringify(html)});document.close();true`);
    // Native declarations precede theme styles, just as they do in the client.
    await evaluate(`(()=>{const style=document.createElement('style');style.textContent=${JSON.stringify(nativeCss)};document.head.append(style);})()`);
    await addStyles(styles);
    let pseudoEnabled = false;
    const forcePseudoState = async (selector, pseudoClasses) => {
      if (!pseudoEnabled) {
        await client.call('DOM.enable');
        await client.call('CSS.enable');
        pseudoEnabled = true;
      }
      const { root } = await client.call('DOM.getDocument');
      const { nodeIds } = await client.call('DOM.querySelectorAll', { nodeId: root.nodeId, selector });
      if (!nodeIds.length) throw new Error(`Browser fixture selector matched no nodes: ${selector}`);
      for (const nodeId of nodeIds) {
        await client.call('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: pseudoClasses });
      }
    };
    const screenshot = async () => {
      const { data } = await client.call('Page.captureScreenshot', { format: 'png' });
      return data;
    };
    return await scenario({ evaluate, addStyles, forcePseudoState, screenshot });
  } catch (error) {
    failure = error;
    throw error;
  } finally {
    // Close only the target created above; never an existing Steam page.
    let cleanupFailure;
    try { client?.close(); } catch (error) { cleanupFailure = error; }
    try {
      const closed = await fetch(`${endpoint}/json/close/${encodeURIComponent(target.id)}`, { signal: AbortSignal.timeout(5000) });
      if (!closed.ok) throw new Error(`Could not close browser fixture: HTTP ${closed.status}`);
    } catch (error) { cleanupFailure ??= error; }
    // Keep the scenario's error actionable if cleanup also fails.
    if (!failure && cleanupFailure) throw cleanupFailure;
  }
}
