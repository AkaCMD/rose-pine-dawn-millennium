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
