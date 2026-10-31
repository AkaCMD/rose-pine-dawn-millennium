import test from 'node:test';
import assert from 'node:assert/strict';
import { withBrowserFixture } from './helpers/browser-fixture.mjs';

const browser = { skip: !process.env.STEAM_CDP_TEST, timeout: 30000 };
const surface = 'rgb(255, 250, 243)';
const overlay = 'rgb(242, 233, 225)';
const ink = 'rgb(70, 66, 97)';
const secondary = 'rgb(86, 82, 106)';
const pine = 'rgb(40, 105, 131)';

// Current CapsuleHover preview, including its loading overlay, bundle discount,
// inline wishlist action and separate details panel. It may be portalled.
export const preview = `<article class="tWdu3iqQbcE-" tabindex="0">
  <div class="_2E-nnEXuOws-"><div class="A4b63axwn2c-"><video style="width:100%"></video><div class="spBDBpjPZo8-"></div></div>
    <div class="vlV-ugrnJq4-" tabindex="0"><svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 1 15 8 23 9 17 15 19 23 12 19 5 23 7 15 1 9 9 8Z"/></svg><div class="dbXwRg0gpXw-">加入愿望单</div></div>
    <div class="K8E3-d-usmQ-"><div class="paMIcy5ZYKQ-"><div class="NWpi8EWX2Q8-"><img alt="游戏封面" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='144' height='67'%3E%3Crect width='144' height='67' fill='%23b4637a'/%3E%3C/svg%3E"></div></div>
      <div class="K2UfkCIuEhY- StoreSalePriceWidgetContainer"><div class="gXsTTmkhkp8-"><span>-10%</span></div><div class="YHonIqDIZys-"><div class="Y9w82-bhx7g-">¥59.00</div><div class="QYFii1vIT5Q-">¥53.10</div></div></div>
    </div>
  </div><div class="XYegsy7Crd8-"><div class="_2tJ15BcsjnE-"><a class="Mqd3yjra1cQ-">美德与重锤</a>
    <div class="VCMhY-z6stE-"><div class="CMAk-Lj-B-c-"><span>特别好评</span><div>(149 篇用户评测)</div></div></div>
    <div class="Y8-xMgjFr6A-"><svg viewBox="0 0 16 16" style="width:16px;height:16px"><path fill="currentColor" d="M0 0H16V16H0Z"/></svg><span>2026年10月27日</span></div>
    <div class="-I7YBQirCO0-"><div class="_02Fcj6JP-KA-"><span class="sWBwy-DWHc0-">动作</span></div></div>
  </div></div></article>`;

export const nativeCss = `
  body { font:14px sans-serif; } .tWdu3iqQbcE- { width:290px;height:340px;background:linear-gradient(360deg,#5c6770 0%,#000 15%);display:flex;flex-direction:column;box-shadow:0 0 20px #000e; }
  .tWdu3iqQbcE- a,.tWdu3iqQbcE- a:hover { color:white; }
  .tWdu3iqQbcE- ._2E-nnEXuOws- { position:relative; } .A4b63axwn2c- { height:130px;position:relative; }
  .tWdu3iqQbcE- .A4b63axwn2c- .spBDBpjPZo8- { background:black;position:absolute;inset:0;opacity:1; }
  .tWdu3iqQbcE- .A4b63axwn2c- .spBDBpjPZo8-.-bJWi4m71TY- { opacity:0; }
  .tWdu3iqQbcE- .K8E3-d-usmQ- { display:flex;justify-content:space-between; }
  .paMIcy5ZYKQ- { width:50%; } .tWdu3iqQbcE- .paMIcy5ZYKQ- .NWpi8EWX2Q8- { box-shadow:0 0 10px #000b; } img { width:100%; }
  .XYegsy7Crd8- { background:linear-gradient(359.91deg,#2b333a 30%,#67717a4d 85%);color:white;backdrop-filter:blur(10px);box-shadow:0 0 12px #000e;flex:1; }
  .XYegsy7Crd8- ._2tJ15BcsjnE- .Mqd3yjra1cQ- { font-size:20px; }
  .XYegsy7Crd8- ._2tJ15BcsjnE- .VCMhY-z6stE- .CMAk-Lj-B-c- { color:#6b8aaa; }
  .XYegsy7Crd8- ._2tJ15BcsjnE- .Y8-xMgjFr6A- { opacity:.7; }
  .XYegsy7Crd8- ._2tJ15BcsjnE- .Y8-xMgjFr6A- svg { color:#6b8aaa;fill:#6b8aaa; } .Y8-xMgjFr6A- svg { width:16px;height:16px; }
  .XYegsy7Crd8- ._2tJ15BcsjnE- .-I7YBQirCO0- ._02Fcj6JP-KA- .sWBwy-DWHc0- { background:#70818940;color:#ffffffa6; }
  .vlV-ugrnJq4- { background:radial-gradient(at 100% 0,#0673c6,#03628b);position:absolute;right:8px;top:8px;display:flex;box-shadow:0 0 3px #000e; } .vlV-ugrnJq4- svg { width:24px;height:24px; }
  .vlV-ugrnJq4- .dbXwRg0gpXw- { color:transparent;width:0;height:0;overflow:hidden; }
  .vlV-ugrnJq4-:hover .dbXwRg0gpXw- { color:white;text-shadow:0 0 3px #000e;width:auto;height:auto; }
  .K2UfkCIuEhY- { display:flex; } .YHonIqDIZys- { padding:4px; }
  .K2UfkCIuEhY-:not(._-54SS2-Bx9o-) .gXsTTmkhkp8- { color:#b8bcbf;background:black; }
  .YHonIqDIZys- .QYFii1vIT5Q- { color:white;text-shadow:0 0 10px #000b; }
`;

test('store capsule previews use readable Dawn panels, discounts and wishlist actions', browser, async () => {
  for (const body of ['v6', 'search_page', 'newonsteam']) {
    for (const cart of [false, true]) {
      await withBrowserFixture({ html:`<body class="${body}">${cart ? `<div class="cE9cj0nbqpY-">${preview}</div>` : preview}</body>`, nativeCss }, async page => {
        const css = (selector, property) => page.evaluate(`getComputedStyle(document.querySelector(${JSON.stringify(selector)}))[${JSON.stringify(property)}]`);
        for (const selector of ['.tWdu3iqQbcE-', '.XYegsy7Crd8-', '.spBDBpjPZo8-']) {
          assert.equal(await css(selector, 'backgroundColor'), surface, selector);
          assert.equal(await css(selector, 'backgroundImage'), 'none', selector);
        }
        assert.equal(await css('.XYegsy7Crd8-', 'boxShadow'), 'none');
        assert.equal(await css('.XYegsy7Crd8-', 'backdropFilter'), 'none');
        assert.equal(await css('.Y8-xMgjFr6A-', 'opacity'), '1');
        assert.equal(await css('.sWBwy-DWHc0-', 'backgroundColor'), overlay);
        for (const selector of ['.Y9w82-bhx7g-', '.CMAk-Lj-B-c-', '.CMAk-Lj-B-c- div', '.Y8-xMgjFr6A- span']) assert.equal(await css(selector, 'color'), secondary, selector);
        for (const state of [[], ['hover'], ['focus', 'focus-visible']]) {
          await page.forcePseudoState('article, a, .vlV-ugrnJq4-', state);
          for (const selector of ['.Mqd3yjra1cQ-', '.QYFii1vIT5Q-']) {
            assert.equal(await css(selector, 'color'), ink, selector);
            assert.equal(await css(selector, 'textShadow'), 'none', selector);
          }
          for (const selector of ['.gXsTTmkhkp8-', '.vlV-ugrnJq4-']) assert.equal(await css(selector, 'backgroundColor'), pine, selector);
          for (const selector of ['.gXsTTmkhkp8-', '.gXsTTmkhkp8- span', '.vlV-ugrnJq4- svg', '.dbXwRg0gpXw-']) assert.equal(await css(selector, 'color'), surface, selector);
        }
        for (const selector of ['img', 'video']) {
          assert.equal(await css(selector, 'filter'), 'none');
          assert.equal(await css(selector, 'opacity'), '1');
        }
        await page.evaluate(`document.querySelector('.spBDBpjPZo8-').classList.add('-bJWi4m71TY-')`);
        assert.equal(await css('.spBDBpjPZo8-', 'opacity'), '0', 'loaded media keeps the loading overlay hidden');
      });
    }
  }
});
