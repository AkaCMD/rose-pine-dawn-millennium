import test from 'node:test';
import assert from 'node:assert/strict';
import { withBrowserFixture } from './helpers/browser-fixture.mjs';
import { probeExpression } from '../scripts/scan-page.mjs';
import { classify } from '../scripts/coverage-rules.mjs';

const cases = [
  ['legacy-friend', '<div class="friendsui-container"><div class="friend ingame"><span class="friendName">In game</span></div></div>'],
  ['friend-group-footer', '<div class="friendsui-container"><div class="friendlist"><div class="friendGroup gameGroup"><div class="SteamPlayerGroupFooter lastInGroup"><span class="SteamPlayerGroupFooterLabel">Game group</span><span class="count">12</span></div></div></div></div>'],
  ['friend-rich-presence', '<div class="friendsui-container"><div class="friendlist"><div class="in-game"><div class="_2-pwJCHlrc7zxN4iup2TR7"><span class="_1FgWIOIaRCAekjhGj0zFWq">Playing</span></div></div></div></div>'],
  ...['_3ENh9LzRnZgfTyfxp_J2rr', '_2NdiftmP-B3C4LPWnNGTCB'].flatMap((root, i) =>
    [i ? 'rN6p14MiFEoCZvdjnfpgQ' : '_3uSbhtY3vHtdj-3tpua_Pb',
      i ? '_35uWYHT2zJoSv9PE_euqxo' : '_3bqD-bBMgrGwLsBY2L1gSL'].map((cls, j) =>
      [`toast-${i}-${j}`, `<div class="_1OOQPJx0nCNP9ME9toCmV7"><div class="${root}"><span class="${cls}">Friend status</span></div></div>`])),
  ['feature-hover', '<a class="game_area_details_specs_ctn"><span class="label">Feature</span></a>'],
  ['store-react-title', '<span class="y5728HUyiI5XdCDBm5D7A native-label">Featured games</span>'],
  ['curator-negative', '<div class="referring_curator"><span class="color_not_recommended">Not recommended</span></div>'],
  ...['wishlist_ctn', 'modern-wishlist', 'modern-cart', 'legacy-cart'].map(id => [id,
    `<div ${id === 'wishlist_ctn' ? 'id="wishlist_ctn"' : `class="${{ 'modern-wishlist': 'awGgT3ZKumU-', 'modern-cart': 'cE9cj0nbqpY-', 'legacy-cart': 'cart_item' }[id]}"`}>
      <a class="btnv6_green_white_innerfade"><span>Buy now</span></a>
      <button class="DialogButton Primary"><span>Continue</span></button>
      <div class="discount_block"><span class="discount_pct">-50%</span></div>
    </div>`]),
  ['list-primary-link', '<div class="awGgT3ZKumU-"><a class="inqz7Zdx9Xg-"><span>Purchase</span></a></div>'],
  ['list-primary-nested-link', '<div class="awGgT3ZKumU-"><a class="oS2hPC3gY6k-"><span><b>Purchase</b></span></a></div>'],
  ['list-secondary-link', '<div class="awGgT3ZKumU-"><a class="inqz7Zdx9Xg-" data-accent-color="dull"><span>Remove</span></a></div>'],
  ['list-badge', '<div class="awGgT3ZKumU-"><div class="X3eWtXr50WY-"><span>Discount</span></div></div>'],
  ...['_2l416KfEtI4CL0mCUEmOBw', '_3FmxxjyWNHU1PrBGnBe6tm'].map((root, i) =>
    [`library-event-link-${i}`, `<div class="${root}"><a class="_3oMUSjOFNB0E9LWcL2sE7"><span><b>Open event</b></span></a></div>`]),
  ['library-event-action', '<div class="_2l416KfEtI4CL0mCUEmOBw"><button class="_1WdC0YUP8FT0dYWZ-QIVZL"><span>Open event</span></button></div>'],
];

test('status labels, purchase actions and list descendants retain contrast across interactions',
  { skip: !process.env.STEAM_CDP_TEST, timeout: 30000 }, async () => {
    await withBrowserFixture({
      html: `<body class="newonsteam"><main>${cases.map(([id, html]) => `<section data-case="${id}">${html}</section>`).join('')}</main></body>`,
      nativeCss: `body { margin:0; font:14px sans-serif; } main { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; }
        section { padding:8px; min-height:100px; } section > * { display:block; padding:8px; }
        .native-label { color:white; } a { display:block; } button { font:inherit; }`,
      viewport: { width: 1500, height: 1200 },
    }, async page => {
      for (const pageClass of ['newonsteam', 'search_page', 'sale_page_background', 'v6']) {
        await page.evaluate(`document.body.className=${JSON.stringify(pageClass)}`);
        for (const state of [[], ['hover'], ['focus', 'focus-visible']]) {
          await page.forcePseudoState('section *', state);
          const scan = await page.evaluate(probeExpression([]));
          const samples = scan.samples.filter(s => s.hasText);
          const inspected = await page.evaluate(`(${JSON.stringify(samples.map(s => s.selector))}).map(s => document.querySelector(s).closest('section')?.dataset.case)`);
          assert.deepEqual(cases.map(([id]) => id).filter(id => !inspected.includes(id)), [], 'all cases are visible');
          const failures = samples.flatMap(s => classify(s, [[40,105,131,1]])
            .map(issue => ({ selector: s.selector, ...issue })));
          assert.deepEqual(failures, [], `${pageClass} / ${state.join(',') || 'normal'}`);
        }
      }
    });
  });
