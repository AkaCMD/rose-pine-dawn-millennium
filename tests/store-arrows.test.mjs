import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { connect } from '../scripts/cdp.mjs';

test('homepage image and SVG carousel arrows share the pine color in both directions and on hover',
  { skip: !process.env.STEAM_CDP_TEST, timeout: 30000 }, async () => {
    const endpoint = 'http://127.0.0.1:8080';
    const target = await (await fetch(`${endpoint}/json/new?about:blank`, { method: 'PUT' })).json();
    let client;
    try {
      client = await connect(target.webSocketDebuggerUrl);
      const css = (await Promise.all(['light', 'store'].map(name =>
        readFile(new URL(`../css/${name}.css`, import.meta.url), 'utf8')))).join('\n');
      // Steam home.css uses a white cut_arrow.svg background, with direction
      // supplied by transforms on its empty child div rather than SVG markup.
      const image = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 50 100' fill='%23fff'%3E%3Cpolygon points='0,0 0,26 24,50 0,74 0,100 50,50'/%3E%3C/svg%3E";
      const html = `<html><head><style>
        .carousel_container .arrow { width:45px; height:50px; }
        .carousel_container .arrow > div { width:23px; height:50px; background:url("${image}") center/contain no-repeat; }
        .carousel_container .arrow.left > div { transform:rotate(180deg); }
        .carousel_container .arrow.left > div:dir(rtl) { transform:none; }
        .carousel_container .arrow.right > div:dir(rtl) { transform:rotate(180deg); }
        .carousel_container .arrow.left, .carousel_container .arrow.right { opacity:.7; }
        .carousel_container .arrow:hover { opacity:1; background:none; }
        .CarouselBtnLeft svg, .CarouselBtnRight svg { width:23px; height:50px; fill:white; }
        ${css}
        </style></head><body class="home_page_body_ctn">
        ${['ltr', 'rtl'].map(dir => `<section dir="${dir}" class="carousel_container">
          <div id="${dir}-left" class="arrow left"><div></div></div>
          <div id="${dir}-right" class="arrow right"><div></div></div>
        </section>`).join('')}
        ${['Left', 'Right'].map(dir => `<button id="svg-${dir}" class="CarouselBtn${dir}"><svg viewBox="0 0 50 100"><path d="M0 0L50 50L0 100Z"/></svg></button>`).join('')}
        </body></html>`;
      const evaluate = async expression => {
        const result = await client.call('Runtime.evaluate', { expression, returnByValue: true });
        assert.equal(result.exceptionDetails, undefined);
        return result.result.value;
      };
      await evaluate(`document.open();document.write(${JSON.stringify(html)});document.close();true`);
      await client.call('DOM.enable');
      await client.call('CSS.enable');
      const { root } = await client.call('DOM.getDocument');
      for (const id of ['ltr-left', 'ltr-right', 'rtl-left', 'rtl-right', 'svg-Left', 'svg-Right']) {
        const { nodeId } = await client.call('DOM.querySelector', { nodeId: root.nodeId, selector: `#${id}` });
        for (const hover of [false, true]) {
          await client.call('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: hover ? ['hover'] : [] });
          const actual = await evaluate(`(() => {
            const button = document.getElementById(${JSON.stringify(id)});
            const icon = button.firstElementChild;
            const s = getComputedStyle(icon);
            return { ink: icon.tagName === 'svg' ? s.fill : s.backgroundColor,
              image: s.backgroundImage, mask: s.maskImage, transform: s.transform,
              opacity: getComputedStyle(button).opacity };
          })()`);
          assert.equal(actual.ink, 'rgb(40, 105, 131)', `${id}, hover=${hover}: visible arrow uses pine`);
          assert.equal(actual.opacity, '1', `${id}: matching opacity across arrow implementations`);
          if (!id.startsWith('svg')) {
            assert.equal(actual.image, 'none', `${id}: white image no longer covers the themed ink`);
            assert.notEqual(actual.mask, 'none', `${id}: arrow silhouette remains visible`);
            const rotated = ['ltr-left', 'rtl-right'].includes(id);
            assert.equal(actual.transform, rotated ? 'matrix(-1, 0, 0, -1, 0, 0)' : 'none', `${id}: direction preserved`);
          }
        }
      }
    } finally {
      client?.close();
      await fetch(`${endpoint}/json/close/${target.id}`);
    }
  });
