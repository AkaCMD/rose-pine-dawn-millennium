import test from 'node:test';
import assert from 'node:assert/strict';
import { withBrowserFixture } from './helpers/browser-fixture.mjs';

const browser = { skip: !process.env.STEAM_CDP_TEST, timeout: 30000 };
const surface = 'rgb(255, 250, 243)';
const ink = 'rgb(70, 66, 97)';
const secondary = 'rgb(86, 82, 106)';
const link = 'rgb(32, 87, 109)';

// GamePlaySummary + PageableContainer from Steam's desktop library. The inset
// shadow belongs to the carousel's ::after, not its outer details section.
const summary = `<section class="_1OMmVJHDgNwOt0Wqn0hrf9">
  <header><div class="P_gQ8X-yCsgXeXpP68KS0">玩后总结</div>
    <div class="_2dB1oJFsqNThak1cFya2-q" tabindex="0"><svg viewBox="0 0 100 100"><line x1="10" y1="10" x2="90" y2="90" stroke="white"/></svg></div></header>
  <div class="_2MKO5j24KqDdD-92hH5FXi"><div class="_30OZKo30O8GHw5FK12Zu8V">
    <div class="_1iO7MC6rgUjbDf49AE6hCm"><div class="_3ugJ_KPVlOd9oeYm-fYC_w">今天</div>
      <div class="_3OGeKUgr_1EvormVh8S7uH"><div class="_1r3z58m4uvAtp2Nfee0kDg">
        <div class="_2rFZPzLu-BjxsrVUj5lhNI _1j_gja8bHXjiS-BeSQk8hb" tabindex="0" role="link">
          <img class="zcasgBSVIteabq-j_3g1m" width="48" height="48" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E">
          <div class="_1s_9cSxUjb4609MSH0EjWH"><div class="_39Y01uSRcLiDg5DneTTR0m">光束发射器</div>
            <div class="_2gLHbXukQBdrIKhqEYVvOe">完成初始战役。</div><div class="VKo9pLPbwpF3xIzL8Wnou">34.0% 的玩家拥有此成就</div></div>
        </div>
      </div></div>
    </div><div class="_1ms0i1dxwTqiqcXV59nenw"></div>
    <div class="_1ms0i1dxwTqiqcXV59nenw _1I8mXP1uH7vUUbbc6_-nHR"></div>
    <div class="_284XbL-B7aHiK4XgyI2DPS"></div>
    <div class="_1iO7MC6rgUjbDf49AE6hCm"><div class="_3ugJ_KPVlOd9oeYm-fYC_w"></div>
      <img class="_22q2XMkRbHZD96i_GXOaHh" width="224" height="126" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E"></div>
  </div></div></section>`;
const nativeCss = `
  ._2MKO5j24KqDdD-92hH5FXi { background:radial-gradient(100% 150% at 33% 45%,#1d222b4d,#0a0b0e4d);position:relative; }
  ._2MKO5j24KqDdD-92hH5FXi:after { content:"";box-shadow:inset 1px 1px 12px #000;position:absolute;inset:0;pointer-events:none; }
  .P_gQ8X-yCsgXeXpP68KS0 { color:#94a1a6; } ._3ugJ_KPVlOd9oeYm-fYC_w { color:#cacbcd; }
  ._1j_gja8bHXjiS-BeSQk8hb ._1s_9cSxUjb4609MSH0EjWH ._39Y01uSRcLiDg5DneTTR0m { color:#ffffffe0; }
  ._1j_gja8bHXjiS-BeSQk8hb ._1s_9cSxUjb4609MSH0EjWH ._2gLHbXukQBdrIKhqEYVvOe { color:#ffffff80; }
  ._1j_gja8bHXjiS-BeSQk8hb ._1s_9cSxUjb4609MSH0EjWH .VKo9pLPbwpF3xIzL8Wnou { color:#717070; }
  ._22q2XMkRbHZD96i_GXOaHh { height:126px;box-shadow:2px 2px 8px #000; }
  ._2dB1oJFsqNThak1cFya2-q { width:16px;height:16px;opacity:.8; } svg { width:16px;height:16px; }
  ._1ms0i1dxwTqiqcXV59nenw { background:#849ab64d; } ._1ms0i1dxwTqiqcXV59nenw._1I8mXP1uH7vUUbbc6_-nHR { background:transparent; }
  ._284XbL-B7aHiK4XgyI2DPS { background:#849ab699; }
`;

test('post-game summary removes dark gradients and inset shadows while keeping artwork intact', browser, async () => {
  for (const root of ['_2l416KfEtI4CL0mCUEmOBw', '_3FmxxjyWNHU1PrBGnBe6tm']) {
    await withBrowserFixture({ html:`<main class="${root}">${summary}</main>`, nativeCss }, async page => {
      const css = (selector, property, pseudo = null) => page.evaluate(`getComputedStyle(document.querySelector(${JSON.stringify(selector)}),${JSON.stringify(pseudo)})[${JSON.stringify(property)}]`);
      assert.equal(await css('._2MKO5j24KqDdD-92hH5FXi', 'backgroundColor'), surface);
      assert.equal(await css('._2MKO5j24KqDdD-92hH5FXi', 'backgroundImage'), 'none');
      assert.equal(await css('._2MKO5j24KqDdD-92hH5FXi', 'boxShadow', '::after'), 'none');
      assert.equal(await css('._22q2XMkRbHZD96i_GXOaHh', 'boxShadow'), 'none');
      assert.equal(await css('.P_gQ8X-yCsgXeXpP68KS0', 'color'), ink);
      assert.equal(await css('._39Y01uSRcLiDg5DneTTR0m', 'color'), ink);
      for (const selector of ['._3ugJ_KPVlOd9oeYm-fYC_w', '._2gLHbXukQBdrIKhqEYVvOe', '.VKo9pLPbwpF3xIzL8Wnou']) assert.equal(await css(selector, 'color'), secondary, selector);
      assert.equal(await css('._1I8mXP1uH7vUUbbc6_-nHR', 'backgroundColor'), 'rgba(0, 0, 0, 0)');
      for (const state of [[], ['hover'], ['focus', 'focus-visible']]) {
        await page.forcePseudoState('._2dB1oJFsqNThak1cFya2-q, [role=link]', state);
        assert.equal(await css('svg line', 'stroke'), link);
        assert.equal(await css('._2dB1oJFsqNThak1cFya2-q', 'opacity'), '1');
      }
      for (const selector of ['img.zcasgBSVIteabq-j_3g1m', 'img._22q2XMkRbHZD96i_GXOaHh']) {
        assert.equal(await css(selector, 'filter'), 'none');
        assert.equal(await css(selector, 'opacity'), '1');
        assert.equal(await css(selector, 'visibility'), 'visible');
      }
      assert.equal(await css('img._22q2XMkRbHZD96i_GXOaHh', 'height'), '126px');
    });
  }
});
