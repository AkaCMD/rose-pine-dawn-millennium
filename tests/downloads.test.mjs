import test from 'node:test';
import assert from 'node:assert/strict';
import { withBrowserFixture } from './helpers/browser-fixture.mjs';

const browser = { skip: !process.env.STEAM_CDP_TEST, timeout: 30000 };
const surface = 'rgb(255, 250, 243)';
const overlay = 'rgb(242, 233, 225)';
const ink = 'rgb(70, 66, 97)';

// Steam's Section is a list, not a download row. The nested SectionItem owns
// the dark active/hover/drag backgrounds, including the active graph header.
const html = `<main class="_1bq4x9pa4-9RLY-dXWUZTp">
  <section class="_3Mbhnlk1Go2j8yCdjthzc7">
    <h2>即将进行 (1)</h2>
    <div class="_21P7c4MWmsU2QSZeL-uyZo">
      <div class="_1VNuYHM6BPBOJspC6zPf5r">
        <img id="artwork" alt="" style="filter:none;opacity:.8" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E">
        <div class="_35eOQ6EeVHNV5HGBrJ1-Vu">Steamworks 常见可再发行文件</div>
        <div class="_1SyggnJY6qbRSmbZpkK3-H"><span>下一个</span>
          <div class="_1vMU1vG5ZtLihr3mfXUymR"><div style="width:40%"></div></div>
        </div>
        <div class="_14DhZoqwtCm4l0yDeN6QZe"><svg><path d="M0 1h10"/></svg></div>
        <button class="DialogButton Primary"><span>继续</span></button>
      </div>
    </div>
  </section>
</main>`;

// Minimal native rules from Steam's sp.css. Keep the actual state selectors:
// an unstyled row would miss the screenshot's failure on hover and active rows.
const nativeCss = `
  main { font:14px sans-serif; } section { padding:12px; }
  ._1VNuYHM6BPBOJspC6zPf5r { padding:12px; }
  ._1VNuYHM6BPBOJspC6zPf5r:hover,
  ._1VNuYHM6BPBOJspC6zPf5r._3-SbBb63lDnu6LzKV-q3Cg { background-color:#3d4450; }
  ._1VNuYHM6BPBOJspC6zPf5r.IbePLaw-vSvhG1GTenYFg { background:#000; }
  ._21P7c4MWmsU2QSZeL-uyZo.gpfocus:not(._74yh4KBx-CqtDEw0dDxpH)
    ._1VNuYHM6BPBOJspC6zPf5r.IbePLaw-vSvhG1GTenYFg { background-color:#3d4450; }
  ._35eOQ6EeVHNV5HGBrJ1-Vu { color:white; }
  ._14DhZoqwtCm4l0yDeN6QZe { color:#67707b; }
  ._1SyggnJY6qbRSmbZpkK3-H ._1vMU1vG5ZtLihr3mfXUymR { background-color:#3d4450; }
  ._1SyggnJY6qbRSmbZpkK3-H ._1vMU1vG5ZtLihr3mfXUymR div { background-color:#1a9fff; }
`;

test('download rows keep light surfaces and readable labels in queue and active states', browser, async () => {
  for (const active of [false, true]) {
    for (const state of ['hover', 'normal', 'dragging', 'focus']) {
      await withBrowserFixture({ html, nativeCss }, async page => {
        await page.evaluate(`(() => {
          const row=document.querySelector('._1VNuYHM6BPBOJspC6zPf5r');
          row.classList.toggle('IbePLaw-vSvhG1GTenYFg', ${active});
          row.classList.toggle('_3-SbBb63lDnu6LzKV-q3Cg', ${state === 'dragging'});
          row.parentElement.classList.toggle('gpfocus', ${state === 'focus'});
        })()`);
        await page.forcePseudoState('main, section, ._1VNuYHM6BPBOJspC6zPf5r', state === 'hover' ? ['hover'] : []);
        const actual = await page.evaluate(`(() => {
          const css = selector => getComputedStyle(document.querySelector(selector));
          return {
            section:css('section').backgroundColor,
            row:css('._1VNuYHM6BPBOJspC6zPf5r').backgroundColor,
            title:css('._35eOQ6EeVHNV5HGBrJ1-Vu').color,
            label:css('._1SyggnJY6qbRSmbZpkK3-H span').color,
            track:css('._1vMU1vG5ZtLihr3mfXUymR').backgroundColor,
            progress:css('._1vMU1vG5ZtLihr3mfXUymR div').backgroundColor,
            primary:css('.Primary span').color,
            filter:css('#artwork').filter, opacity:css('#artwork').opacity
          };
        })()`);
        const context = `${active ? 'active' : 'queued'} / ${state}`;
        assert.equal(actual.row, state === 'normal' ? surface : overlay, context);
        assert.equal(actual.section, surface, context);
        assert.equal(actual.title, ink, context);
        assert.equal(actual.label, 'rgb(86, 82, 106)', context);
        assert.equal(actual.track, 'rgb(223, 218, 217)', context);
        assert.equal(actual.progress, 'rgb(40, 105, 131)', context);
        assert.equal(actual.primary, surface, context);
        assert.equal(actual.filter, 'none', context);
        assert.equal(actual.opacity, '0.8', context);
      });
    }
  }
});
