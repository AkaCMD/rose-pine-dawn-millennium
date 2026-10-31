import test from 'node:test';
import assert from 'node:assert/strict';
import { withBrowserFixture } from './helpers/browser-fixture.mjs';

test('homepage row titles, tags, dates and ranks stay readable in both row layouts',
  { skip: !process.env.STEAM_CDP_TEST, timeout: 30000 }, async () => {
    // Current home.css uses tab_row_item; older clients still use tab_item.
    const rows = ['tab_row_item', 'tab_item'];
    await withBrowserFixture({
      html: `<body class="v7"><div class="home_page_body_ctn">${rows.map(cls => `
        <a class="${cls}" href="#game">
          <div class="tab_item_rank">1</div>
          <div class="tab_item_content"><div class="tab_item_col">
            <div class="tab_item_title">越过山丘 over the hill</div>
            <div class="tab_item_tags"><span class="top_tag">驾驶</span></div>
            <div class="tab_item_release_date">发行于: 2026 年 10 月 14 日</div>
          </div><div class="discount_block"><div class="discount_pct">-20%</div>
            <div class="discount_prices"><div class="discount_final_price">¥61.92</div></div>
          </div></div>
        </a>`).join('')}</div></body>`,
      nativeCss: `body { font:14px sans-serif; }
        .tab_row_item { display:flex; background:var(--light-ctn-bg); }
        .tab_row_item:hover,.tab_row_item.focus { background:var(--light-ctn-bg-hover); }
        .tab_item_title,.tab_item_rank { color:#fff; }
        .tab_item_tags { color:rgba(255,255,255,.8); }
        .tab_item_release_date { color:rgba(255,255,255,.5); }
        .tab_item_content { display:flex; padding:7px; }
        .tab_item_col { display:flex; flex-direction:column; }
        .discount_pct { background:#a1cd44; color:#000; }`,
    }, async ({ evaluate, forcePseudoState }) => {
      for (const selected of [false, true]) {
        await evaluate(`document.querySelectorAll('a').forEach(row => row.classList.toggle('focus', ${selected}))`);
        for (const state of [[], ['hover'], ['focus', 'focus-visible']]) {
          await forcePseudoState('a, a *', state);
          const actual = await evaluate(`[...document.querySelectorAll('a')].map(row => {
            const color = selector => getComputedStyle(row.querySelector(selector)).color;
            return { title:color('.tab_item_title'), tags:color('.top_tag'),
              date:color('.tab_item_release_date'),rank:color('.tab_item_rank'),
              discount:color('.discount_pct'),price:color('.discount_final_price') };
          })`);
          for (const [index, row] of actual.entries()) {
            const context = `${rows[index]} selected=${selected} state=${state}`;
            assert.equal(row.title, 'rgb(70, 66, 97)', context);
            assert.equal(row.rank, 'rgb(70, 66, 97)', context);
            assert.equal(row.tags, 'rgb(86, 82, 106)', context);
            assert.equal(row.date, 'rgb(86, 82, 106)', context);
            assert.equal(row.discount, 'rgb(255, 250, 243)', context);
            assert.equal(row.price, 'rgb(70, 66, 97)', context);
          }
        }
      }
    });
  });

test('featured recommendations and preview tags have readable text on light badges',
  { skip: !process.env.STEAM_CDP_TEST, timeout: 30000 }, async () => {
    await withBrowserFixture({
      html: `<body class="v7"><div class="home_page_body_ctn"><div class="store_main_capsule">
        <div class="reason"><div class="main bytags"><strong>为您推荐</strong>，因为您玩过有以下标签的游戏：
          <div class="tags"><span>故事架构丰富</span><span>由剧情推动</span></div>
        </div></div><div class="main_reason_topseller"><div class="topseller_title">热销商品</div></div>
        <div class="discount_pct">-30%</div>
      </div><div class="tab_preview"><div class="tags"><a href="#tag">开放世界</a></div></div></div></body>`,
      nativeCss: `.store_main_capsule .reason .main strong { color:#a4d007; }
        .store_main_capsule .main_reason_topseller .topseller_title { color:#a4d007; }
        .store_main_capsule .reason .main .tags > span, .tab_preview .tags > a {
          background:rgba(255,255,255,.1); color:white; display:inline-block; padding:2px 8px;
        }`,
    }, async page => {
      const css = (selector, property) => page.evaluate(`getComputedStyle(document.querySelector(${JSON.stringify(selector)}))[${JSON.stringify(property)}]`);
      for (const selector of ['.reason strong', '.topseller_title']) assert.equal(await css(selector, 'color'), 'rgb(32, 87, 109)', selector);
      for (const state of [[], ['hover'], ['focus', 'focus-visible']]) {
        await page.forcePseudoState('.tags > span, .tags > a', state);
        for (const selector of ['.reason .tags > span', '.tab_preview .tags > a']) {
          assert.equal(await css(selector, 'color'), 'rgb(70, 66, 97)', selector);
          assert.equal(await css(selector, 'backgroundColor'), state.length ? 'rgb(223, 218, 217)' : 'rgb(242, 233, 225)', selector);
          assert.equal(await css(selector, 'textShadow'), 'none', selector);
        }
        assert.equal(await css('.discount_pct', 'color'), 'rgb(255, 250, 243)', 'discount badges retain their accent foreground');
      }
    });
  });
