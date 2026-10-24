import test from 'node:test';
import assert from 'node:assert/strict';
import { withBrowserFixture } from './helpers/browser-fixture.mjs';

const browser = { skip: !process.env.STEAM_CDP_TEST, timeout: 30000 };
const ink = 'rgb(70, 66, 97)';
const surface = 'rgb(255, 250, 243)';
const overlay = 'rgb(242, 233, 225)';
const accent = 'rgb(40, 105, 131)';
const onAccent = 'rgb(255, 250, 243)';

// Native foregrounds deliberately differ from the theme. Check visible outcomes
// at the DOM styling seam, including surfaces which retain their own foreground.
test('store copy, links and owned dark surfaces keep their foregrounds across page and interaction states', browser, async () => {
  await withBrowserFixture({
    html: `<body class="newonsteam"><article class="tab_item" data-appid="1">
      <div id="copy" style="color:white;text-shadow:1px 1px black">Game name</div>
      <a id="link">Details</a>
      <div class="discount_block"><span id="discount" class="discount_pct" style="color:white">-50%</span>
        <span id="price" class="discount_final_price" style="color:white">9.99</span></div>
      <div class="_1tOSyFfIWM42bIEwzvMp8v broadcast-tile">
        <span id="broadcast" style="color:white">Live stream</span><a id="broadcast-link">Watch</a>
        <img id="artwork" alt="" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Crect width='20' height='20' fill='red'/%3E%3C/svg%3E">
      </div>
      <button id="button" class="DialogButton Primary"><span id="button-label">Buy</span></button>
    </article><div class="noOpinionatedGlobalStyles"><a id="opt-out">Own link styling</a></div></body>`,
    nativeCss: `body { margin:0; font:14px sans-serif; }
      article { background:#17191b; padding:12px; } article > * { display:block; padding:8px; }
      a, #button-label { color:white; } .noOpinionatedGlobalStyles a { color:rgb(10, 70, 100) !important; }
      .broadcast-tile { background:#17191b; } .broadcast-tile a { color:white !important; } .broadcast-tile img { filter:none; opacity:.8; }
      .tab_item:hover #copy, .tab_item:focus #copy { color:white; }
      .DialogButton.Primary { background:#1a9fff; color:white; }
      .discount_pct { background:#4c6b22; color:#beee11; }
      .discount_final_price { color:white; }`,
  }, async page => {
    for (const pageClass of ['newonsteam', 'search_page', 'sale_page_n_section', 'sale_page_background']) {
      await page.evaluate(`document.body.className=${JSON.stringify(pageClass)}`);
      for (const state of [[], ['hover'], ['focus', 'focus-visible']]) {
        await page.forcePseudoState('article, article *, #opt-out', state);
        const actual = await page.evaluate(`Object.fromEntries(['copy','link','discount','price','broadcast','broadcast-link','button','button-label','opt-out','artwork'].map(id => {
          const s=getComputedStyle(document.getElementById(id));
          return [id,{color:s.color,background:s.backgroundColor,filter:s.filter,opacity:s.opacity,textShadow:s.textShadow}];
        }))`);
        const context = `${pageClass} / ${state.join(',') || 'normal'}`;
        assert.equal(actual.copy.color, ink, context);
        assert.equal(actual.copy.textShadow, 'none', context);
        assert.equal(actual.link.color, ink, context);
        assert.equal(actual.discount.background, accent, context);
        assert.equal(actual.discount.color, onAccent, context);
        assert.equal(actual.price.color, ink, context);
        assert.equal(actual.broadcast.color, 'rgb(255, 255, 255)', context);
        assert.equal(actual['broadcast-link'].color, 'rgb(255, 255, 255)', context);
        assert.equal(actual.button.background, accent, context);
        assert.equal(actual['button-label'].color, onAccent, context);
        assert.equal(actual['opt-out'].color, 'rgb(10, 70, 100)', context);
        assert.equal(actual.artwork.filter, 'none', context);
        assert.equal(actual.artwork.opacity, '0.8', context);
      }
    }
  });
});

const detailRoots = ['_2l416KfEtI4CL0mCUEmOBw', '_3FmxxjyWNHU1PrBGnBe6tm'];
const partnerCards = ['_3QRf-tp5VddAF00vWY5Gn8', '_1AYE16384J_ecLpN0sEYc5',
  'fmLfuqm0Lxq5iPS5EHCAW', '_39Zk32AvV5cr6g-83IVRVS', '_3xi-HLpFVHaakihoqhQ_6C'];

test('library activity cards preserve scoped summaries, partner-event states, accent actions and artwork', browser, async () => {
  const placements = ['', ...detailRoots];
  await withBrowserFixture({
    html: `<body>${placements.map((root, index) => `<section class="${root}" id="placement-${index}">
      <div class="_2aVnDeExEHiUFX0zwr_BTO activity">Achievement</div>
      <div class="_38t1mljBjmJfqjpVzMT1CG summary">Summary</div>
      <button class="DialogButton Primary"><span>Play</span></button>
      ${partnerCards.map(card => `<article class="${card} partner">
        <span class="_1Cva_kor3lWBIoeu9cQxJq">Update title</span>
        <button class="_1WdC0YUP8FT0dYWZ-QIVZL">Open event</button>
        <img alt="" style="filter:none;opacity:.75" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E">
      </article>`).join('')}</section>`).join('')}</body>`,
    nativeCss: `body { margin:0; font:14px sans-serif; }
      section { display:inline-block; width:30%; vertical-align:top; }
      .partner { background:linear-gradient(#17191b,#222); box-shadow:0 0 5px black; color:white; }
      .partner:hover { background:#333; }
      .partner:hover ._1Cva_kor3lWBIoeu9cQxJq { color:white !important; }
      .activity, .summary { background:#17191b; color:white; }
      ._2l416KfEtI4CL0mCUEmOBw .activity,
      ._3FmxxjyWNHU1PrBGnBe6tm .activity { background:#17191b !important; }
      .DialogButton.Primary, ._1WdC0YUP8FT0dYWZ-QIVZL { background:#1a9fff; color:white; }`,
  }, async page => {
    for (const state of [[], ['hover'], ['focus', 'focus-visible']]) {
      await page.forcePseudoState('.partner, .partner *, .DialogButton, .DialogButton *', state);
      const actual = await page.evaluate(`[...document.querySelectorAll('section')].map(section => {
        const css = selector => { const s=getComputedStyle(section.querySelector(selector));return {color:s.color,background:s.backgroundColor}; };
        return {activity:css('.activity'),summary:css('.summary'),primary:css('.DialogButton span'),
          cards:[...section.querySelectorAll('.partner')].map(card => {
            const s=getComputedStyle(card), title=getComputedStyle(card.querySelector('span')),
              action=getComputedStyle(card.querySelector('button')), image=getComputedStyle(card.querySelector('img'));
            return {background:s.backgroundColor,backgroundImage:s.backgroundImage,shadow:s.boxShadow,title:title.color,
              actionBackground:action.backgroundColor,actionColor:action.color,filter:image.filter,opacity:image.opacity};
          })};
      })`);
      for (const [index, placement] of actual.entries()) {
        assert.equal(placement.activity.background, surface, `activity placement ${index}`);
        assert.equal(placement.summary.background, index ? overlay : surface, `summary placement ${index}`);
        assert.equal(placement.primary.color, onAccent, `primary placement ${index}`);
        for (const card of placement.cards) {
          assert.equal(card.background, state.includes('hover') ? overlay : surface);
          assert.equal(card.backgroundImage, 'none');
          assert.equal(card.shadow, 'none');
          assert.equal(card.title, ink);
          assert.equal(card.actionBackground, accent);
          assert.equal(card.actionColor, onAccent);
          assert.equal(card.filter, 'none');
          assert.equal(card.opacity, '0.75');
        }
      }
    }
  });
});
