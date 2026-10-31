import test from 'node:test';
import assert from 'node:assert/strict';
import { withBrowserFixture } from './helpers/browser-fixture.mjs';

const browser = { skip: !process.env.STEAM_CDP_TEST, timeout: 30000 };
const base = 'rgb(250, 244, 237)';
const surface = 'rgb(255, 250, 243)';
const overlay = 'rgb(242, 233, 225)';
const ink = 'rgb(70, 66, 97)';
const pine = 'rgb(40, 105, 131)';

// Current cart modules: the backdrop is a sibling of the cart root; the
// combobox options are portalled outside it. Price badges have nested fills.
export const html = `<body class="v6"><section class="jGMVnjZbmZM-">
  <div class="_68SYvTNlZNs-"><div class="otLXAz3VIiY-" style="background-image:linear-gradient(#182535,#384d74)"></div>
    <main class="cE9cj0nbqpY- Panel"><h1>您的购物车（1 个项目）</h1>
      <div class="escxTMUGmsQ-"><div class="ieJQh9DBcSw-">
        <div class="i-xXuvHLioU-"><div class="bKkQiLkI-vk-">
          <img id="artwork" width="200" height="94" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='94'%3E%3Crect width='200' height='94' fill='%23907aa9'/%3E%3C/svg%3E">
          <div><h2>Dice Have No Eyes &amp; STICKER/BALL</h2><p>包含 1 个项目: 贴纸弹珠 | STICKER/BALL</p>
            <div class="Cj7J5QHbL-0- _3BsNYqJmlVM-"><div class="rsMD9WnTopA-"><div class="YLLe1vrKgVE-">-10%</div><div class="hPiY1A-1izA-">-37%</div></div></div>
            <div class="vPLNUdbJs30-"><div role="combobox" tabindex="0" aria-controls="purchase-options" class="pXN5O3YW9VE- Fn08FaIrTv4- yMOo9ZLp2rI-"><span>用于我的账户</span><svg><path fill="currentColor"/></svg></div></div>
          </div>
        </div></div>
        <a class="inqz7Zdx9Xg-" data-accent-color="dull"><span>继续购物</span></a>
        <div class="K2UfkCIuEhY- f-0zARERCAw-"><div class="KY4Cd9W1L6Q- StoreSaleDiscountBox"><span>-78%</span></div><div class="YHonIqDIZys-">¥15.52</div></div>
        <div class="Cj7J5QHbL-0- tlSMj6Uqveg-"><div class="rsMD9WnTopA-"><div class="hPiY1A-1izA- TljK1RYI2aA-">-10%</div></div></div>
      </div><aside class="NKiRqw1jQHg-"><div class="i1XZFikuzME-">
        <div role="combobox" tabindex="0" aria-controls="country-options" class="pXN5O3YW9VE- Fn08FaIrTv4- yMOo9ZLp2rI-"><span>中国（大陆） (¥)</span></div>
        <p>预计总额 <strong>¥20.79</strong></p><button class="inqz7Zdx9Xg-"><span>跳转至支付</span></button>
      </div><div class="nfxC9n3FRVE-"><p>购买数字产品将会授予该产品在 Steam 上的许可</p></div></aside></div>
    </main>
  </div></section>
  <div class="UBjkU6geb1U-" id="purchase-options" role="listbox"><div class="MAqUxA6kCJo-" role="option" data-selected="true"><span>用于我的账户</span></div><div class="MAqUxA6kCJo-" role="option" data-focused="true">作为礼物</div></div>
  <div class="UBjkU6geb1U-" id="country-options" role="listbox"><div class="MAqUxA6kCJo-" role="option">中国（大陆） (¥)</div></div>
</body>`;

export const nativeCss = `
  body { font:14px sans-serif; } ._68SYvTNlZNs- { position:relative; color:#c6d4df; }
  .otLXAz3VIiY- { z-index:-1; opacity:.3; position:absolute; inset:0; }
  .cE9cj0nbqpY- { max-width:1200px; padding:25px 2%; margin:auto; }
  .escxTMUGmsQ- { display:flex; gap:20px; } .ieJQh9DBcSw- { flex:1; min-width:0; }
  .NKiRqw1jQHg- { width:32%; } .i-xXuvHLioU-, .i1XZFikuzME- { background:#0004; padding:15px; }
  .bKkQiLkI-vk- { display:flex; gap:15px; } h2 { font-size:16px; }
  .nfxC9n3FRVE- { background:radial-gradient(#67c1f549,#0000001a); padding:21px; }
  .Fn08FaIrTv4- { background:#3d4450; padding:10px; color:white; }
  .Fn08FaIrTv4-.yMOo9ZLp2rI-:hover { background:#464d58; }
  .UBjkU6geb1U- { background:#292e36; padding:8px; box-shadow:0 4px 12px #0008; }
  .MAqUxA6kCJo- { color:white; padding:8px; }
  .MAqUxA6kCJo-[data-selected=true], .MAqUxA6kCJo-[data-focused=true] { background:#464d58; }
  .rsMD9WnTopA- { display:flex; color:#beee11; }
  .rsMD9WnTopA- .hPiY1A-1izA- { background:#4c6b22; padding:0 5px; }
  .rsMD9WnTopA- .hPiY1A-1izA-.TljK1RYI2aA- { color:#b8bcbf; background:#000; }
  .rsMD9WnTopA- .YLLe1vrKgVE- { background:#0008; color:#8b929a; }
  ._3BsNYqJmlVM- .rsMD9WnTopA-:has(.YLLe1vrKgVE-) { background:#4c6b22; flex-direction:column; align-items:flex-end; }
  ._3BsNYqJmlVM- .rsMD9WnTopA-:has(.YLLe1vrKgVE-) .YLLe1vrKgVE- { color:inherit; opacity:.5; }
  .f-0zARERCAw-.f-0zARERCAw- .KY4Cd9W1L6Q- { background:#a1cd44; color:#000; }
  .inqz7Zdx9Xg- { background:#1a9fff; color:white; padding:10px; display:inline-block; }
  @media (max-width:840px) { .escxTMUGmsQ-, .bKkQiLkI-vk- { flex-direction:column; } .NKiRqw1jQHg- { width:100%; } }
`;

test('cart backdrop and controls use Dawn colors, including detached options', browser, async () => {
  await withBrowserFixture({ html, nativeCss }, async page => {
    const css = (selector, property) => page.evaluate(`getComputedStyle(document.querySelector(${JSON.stringify(selector)}))[${JSON.stringify(property)}]`);
    assert.equal(await css('._68SYvTNlZNs-', 'backgroundColor'), base);
    assert.equal(await css('.otLXAz3VIiY-', 'backgroundImage'), 'none');
    for (const selector of ['.i-xXuvHLioU-', '.i1XZFikuzME-', '.nfxC9n3FRVE-', '[role=listbox]']) {
      assert.equal(await css(selector, 'backgroundColor'), surface, selector);
      assert.equal(await css(selector, 'backgroundImage'), 'none', selector);
    }
    for (const state of [[], ['hover'], ['focus', 'focus-visible']]) {
      await page.forcePseudoState('[role=combobox], [role=option]', state);
      for (const selector of ['.vPLNUdbJs30- [role=combobox]', '.i1XZFikuzME- [role=combobox]']) {
        assert.equal(await css(selector, 'backgroundColor'), state.includes('hover') ? 'rgb(223, 218, 217)' : overlay, selector);
        assert.equal(await css(`${selector} span`, 'color'), ink, selector);
        if (state.includes('focus-visible')) assert.equal(await css(selector, 'outlineColor'), pine);
      }
      for (const selector of ['[role=option]', '[role=option] span']) assert.equal(await css(selector, 'color'), ink, selector);
      assert.equal(await css('[role=option][data-focused=true]', 'backgroundColor'), overlay);
    }
    assert.equal(await css('#artwork', 'filter'), 'none');
    assert.equal(await css('#artwork', 'opacity'), '1');
  });
});

test('nested cart discount fills and text retain contrast alongside purchase actions', browser, async () => {
  await withBrowserFixture({ html, nativeCss }, async page => {
    const actual = await page.evaluate(`(() => {
      const css=s=>getComputedStyle(document.querySelector(s));
      return ['.rsMD9WnTopA-', '.hPiY1A-1izA-', '.hPiY1A-1izA-.TljK1RYI2aA-', '.KY4Cd9W1L6Q-', '.KY4Cd9W1L6Q- span', '.YLLe1vrKgVE-', 'button.inqz7Zdx9Xg-', 'button.inqz7Zdx9Xg- span'].map(s=>({selector:s,bg:css(s).backgroundColor,color:css(s).color,opacity:css(s).opacity}));
    })()`);
    for (const item of actual) {
      assert.equal(item.color, surface, item.selector);
      assert.equal(item.opacity, '1', item.selector);
      if (!item.selector.endsWith(' span') && item.selector !== '.YLLe1vrKgVE-') assert.equal(item.bg, pine, item.selector);
    }
  });
});
