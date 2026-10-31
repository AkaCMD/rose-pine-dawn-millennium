import test from 'node:test';
import assert from 'node:assert/strict';
import { withBrowserFixture } from './helpers/browser-fixture.mjs';

// Current personalcalendarhome.css module names; these replaced the earlier
// _326_uhqq2I-hJwNRSqIZK4 namespace used by the theme's legacy calendar rules.
test('personal calendar headings, date panels and count badges use Dawn colors',
  { skip: !process.env.STEAM_CDP_TEST, timeout: 30000 }, async () => {
    const variants = ['', '_8XPG-IbvHHs-', 'N3v3VnhKgU8-'];
    await withBrowserFixture({
      html: `<body class="v7"><section class="nHdn-Ea4zSg-"><div class="IdjQXo6E9yc-"><span class="x8jWPgfdVoI-">新</span>您的个人日历</div>
        <p class="sGDLZ2AYREY-">您专属的个性化游戏列表</p>${variants.map((v, i) => `<article id="day-${i}" class="maxz19gKOQc- ${v}">
          <div class="CAnATFwmik4-"><span class="FeN6na6SvAg-">周一</span><span class="bLQQ-syFWHg-">10/26</span><span class="lGsGMjZ-9IE-">今天</span></div>
          <div class="N83ri6QShHM-"><div class="MDx-yf8h-Ww-">暂无游戏 <a href="#calendar">探索更多</a></div>
            <div class="e217oOT2n-w-"><img class="ojxRGZ9ipx0-" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E"><div class="ds_flag ds_wishlist_flag"><span>已在愿望单中</span></div></div>
          </div><a class="rsPEubiF9HI-" href="#more">+1 项</a>
        </article>`).join('')}</section></body>`,
      nativeCss: `.nHdn-Ea4zSg- .IdjQXo6E9yc- { color:white; }
        .nHdn-Ea4zSg- .sGDLZ2AYREY- { color:#ffffffb3;text-shadow:1px 1px 2px #0004; }
        .nHdn-Ea4zSg- .maxz19gKOQc- { background:linear-gradient(#2b53768c,#21364da6),radial-gradient(#5eaeff33,#0061c499); }
        .nHdn-Ea4zSg- .maxz19gKOQc-._8XPG-IbvHHs-, .nHdn-Ea4zSg- .maxz19gKOQc-.N3v3VnhKgU8- { background:linear-gradient(315deg,#b01e54a8,#174a6b); }
        .nHdn-Ea4zSg- .maxz19gKOQc- .CAnATFwmik4- .FeN6na6SvAg- { color:#fff9; }
        .bLQQ-syFWHg-, .lGsGMjZ-9IE- { color:#fffd; }
        .nHdn-Ea4zSg- .maxz19gKOQc- .N83ri6QShHM- .MDx-yf8h-Ww- { color:#dcdedf;background:#ffffff12; }
        .MDx-yf8h-Ww- a { color:#dcdedf; } .MDx-yf8h-Ww- a:hover { color:white; }
        .nHdn-Ea4zSg- .maxz19gKOQc- .rsPEubiF9HI- { color:white;background:#436081;box-shadow:0 0 6px #0008; }
        .nHdn-Ea4zSg- .maxz19gKOQc- .rsPEubiF9HI-:hover { background:#4f6f94; }
        .x8jWPgfdVoI- { color:white;background:#1a9fff; }
        body.v7 .ds_flag.ds_wishlist_flag { color:white;background:url('data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg"/%3E') no-repeat #03628b; }
      `,
    }, async page => {
      const css = (selector, property) => page.evaluate(`getComputedStyle(document.querySelector(${JSON.stringify(selector)}))[${JSON.stringify(property)}]`);
      assert.equal(await css('.IdjQXo6E9yc-', 'color'), 'rgb(70, 66, 97)');
      assert.equal(await css('.sGDLZ2AYREY-', 'color'), 'rgb(86, 82, 106)');
      assert.equal(await css('.sGDLZ2AYREY-', 'textShadow'), 'none');
      for (const [i] of variants.entries()) {
        assert.equal(await css(`#day-${i}`, 'backgroundColor'), i ? 'rgb(242, 233, 225)' : 'rgb(255, 250, 243)');
        assert.equal(await css(`#day-${i}`, 'backgroundImage'), 'none');
      }
      for (const selector of ['.FeN6na6SvAg-', '.bLQQ-syFWHg-', '.lGsGMjZ-9IE-', '.MDx-yf8h-Ww-']) assert.equal(await css(selector, 'color'), 'rgb(70, 66, 97)', selector);
      for (const state of [[], ['hover'], ['focus', 'focus-visible']]) {
        await page.forcePseudoState('.rsPEubiF9HI-, .MDx-yf8h-Ww- a', state);
        assert.equal(await css('.rsPEubiF9HI-', 'backgroundColor'), state.length ? 'rgb(223, 218, 217)' : 'rgb(242, 233, 225)');
        assert.equal(await css('.rsPEubiF9HI-', 'color'), 'rgb(32, 87, 109)');
        assert.equal(await css('.rsPEubiF9HI-', 'boxShadow'), 'none');
        assert.equal(await css('.MDx-yf8h-Ww- a', 'color'), 'rgb(32, 87, 109)');
      }
      for (const selector of ['.x8jWPgfdVoI-', '.ds_wishlist_flag', '.ds_wishlist_flag span']) assert.equal(await css(selector, 'color'), 'rgb(255, 250, 243)', selector);
      for (const selector of ['.x8jWPgfdVoI-', '.ds_wishlist_flag']) assert.equal(await css(selector, 'backgroundColor'), 'rgb(40, 105, 131)', selector);
      assert.ok((await css('.ds_wishlist_flag', 'backgroundImage')).includes('data:image/svg+xml'));
      assert.equal(await css('img.ojxRGZ9ipx0-', 'filter'), 'none');
      assert.equal(await css('img.ojxRGZ9ipx0-', 'opacity'), '1');
    });
  });
