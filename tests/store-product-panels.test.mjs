import test from 'node:test';
import assert from 'node:assert/strict';
import { withBrowserFixture } from './helpers/browser-fixture.mjs';

// Legacy curator markup and React events-row classes from the product page.
const html = `<body class="v6"><div class="referring_curator_ctn">
  <div class="referring_curator"><div class="blurb">
    <span class="review_title color_recommended">推荐</span>
    <div class="referringSteamCurator">来自 <a>鉴赏家</a><span class="curator_review_date">2026年9月17日</span></div>
    <p>鉴赏家评测内容</p><div class="readmore_button_ctn"><span><a>阅读评测</a></span></div>
  </div></div></div>
  <div data-featuretarget="events-row"><div class="early_access_announcements">
    <h2>最后更新于：10月5日<div class="_3n8swQFM3I_ARVM_5bPhAs" role="button" tabindex="0">查看全部</div></h2>
    <a class="OtherEvents_EventCtn _1MwNf8slOG9lOvAeOshmuu">
      <div class="_2pPj9UWoWM6h318uBN0-8X" style="background-color:white"></div>
      <div class="_3-EtNa1Nr_737K0kglkT9C"><div class="_2jc1DpJ_WzFtigRh5qDWce">更新标题</div>
      <div class="_2BWwVF5N-3fDuJRblB6gHb">补丁说明</div><span class="HZ6b2d4r4EFnT_1BeU5vo">2026年10月5日</span>
      <div class="ENbI1gFgvIca6HSKAbfiJ">更新摘要</div></div>
      <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E">
    </a></div></div></body>`;
const nativeCss = `
.referring_curator { background:linear-gradient(60deg,#576674 5%,#313b46 95%); box-shadow:0 0 5px #000; }
.referring_curator .blurb { color:white; } .referringSteamCurator,.referringSteamCurator .curator_review_date { color:#93b0bb; }
.color_recommended { color:#66c0f4; } .readmore_button_ctn>span { background:#1b2838; }
.readmore_button_ctn a { color:#66c0f4; }
.OtherEvents_EventCtn { background:radial-gradient(at 0% 0%,#42454c,#25282e); box-shadow:2px 2px 10px #0006; }
.OtherEvents_EventCtn:hover { background:radial-gradient(#555,#222); }
._2jc1DpJ_WzFtigRh5qDWce,.ENbI1gFgvIca6HSKAbfiJ { color:white; }
.HZ6b2d4r4EFnT_1BeU5vo { color:#aaa; } ._2BWwVF5N-3fDuJRblB6gHb { color:#1a9fff; }
._3n8swQFM3I_ARVM_5bPhAs { color:white; border:1px solid white; }
`;

test('product curator and announcement panels use Dawn surfaces and readable copy',
  { skip: !process.env.STEAM_CDP_TEST }, async () => {
    await withBrowserFixture({ html, nativeCss }, async ({ evaluate, forcePseudoState }) => {
      const color = (selector, property) => evaluate(`getComputedStyle(document.querySelector(${JSON.stringify(selector)}))[${JSON.stringify(property)}]`);
      for (const selector of ['.referring_curator', '.OtherEvents_EventCtn']) {
        assert.equal(await color(selector, 'backgroundColor'), 'rgb(255, 250, 243)', selector);
        assert.equal(await color(selector, 'backgroundImage'), 'none', selector);
        assert.equal(await color(selector, 'boxShadow'), 'none', selector);
      }
      for (const selector of ['.blurb p', '._2jc1DpJ_WzFtigRh5qDWce', '.ENbI1gFgvIca6HSKAbfiJ']) {
        assert.equal(await color(selector, 'color'), 'rgb(70, 66, 97)', selector);
      }
      for (const selector of ['.curator_review_date', '.HZ6b2d4r4EFnT_1BeU5vo']) {
        assert.equal(await color(selector, 'color'), 'rgb(86, 82, 106)', selector);
      }
      for (const selector of ['.review_title', '.readmore_button_ctn a', '._3n8swQFM3I_ARVM_5bPhAs', '._2BWwVF5N-3fDuJRblB6gHb']) {
        assert.equal(await color(selector, 'color'), 'rgb(40, 105, 131)', selector);
      }
      await forcePseudoState('.OtherEvents_EventCtn,._3n8swQFM3I_ARVM_5bPhAs,.readmore_button_ctn>span', ['hover']);
      assert.equal(await color('.OtherEvents_EventCtn', 'backgroundColor'), 'rgb(242, 233, 225)');
      assert.equal(await color('.OtherEvents_EventCtn', 'backgroundImage'), 'none');
      assert.equal(await color('.OtherEvents_EventCtn img', 'filter'), 'none');
    });
  });
