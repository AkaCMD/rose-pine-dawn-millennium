import test from 'node:test';
import assert from 'node:assert/strict';
import { withBrowserFixture } from './helpers/browser-fixture.mjs';

const browser = { skip: !process.env.STEAM_CDP_TEST, timeout: 30000 };
const ink = 'rgb(70, 66, 97)';

test('library scroll-to-top icon paints its own light surface in normal, hover and focus states', browser, async () => {
  // Steam paints the SVG itself, independently of the already themed wrapper.
  for (const state of [[], ['hover'], ['focus', 'focus-visible']]) {
    await withBrowserFixture({
      html: `<button class="uE7Pj4tb2n3_Bx4vjEX0a rkfSfuCLRt8sqpkXJqxYo" aria-label="滚动到顶部">
        <svg class="SVGIcon_Arrow" viewBox="0 0 128 128"><polyline fill="none" points="32,80 64,48 96,80"/></svg>
      </button>`,
      nativeCss: `
        .uE7Pj4tb2n3_Bx4vjEX0a .SVGIcon_Arrow { background-color:rgba(62,64,71,.4); border:1px solid #36383e; }
        .uE7Pj4tb2n3_Bx4vjEX0a .SVGIcon_Arrow polyline { stroke:#a9a9a9; }
        .uE7Pj4tb2n3_Bx4vjEX0a:hover .SVGIcon_Arrow { background-color:#3e4047; }
        .uE7Pj4tb2n3_Bx4vjEX0a:hover .SVGIcon_Arrow polyline { stroke:white; }
      `,
    }, async page => {
      await page.forcePseudoState('button', state);
      const actual = await page.evaluate(`(() => {
        const button=getComputedStyle(document.querySelector('button'));
        const icon=getComputedStyle(document.querySelector('svg'));
        return {button:button.backgroundColor,icon:icon.backgroundColor,border:icon.borderColor,
          stroke:getComputedStyle(document.querySelector('polyline')).stroke};
      })()`);
      const background = state.includes('hover') ? 'rgb(223, 218, 217)' : 'rgb(242, 233, 225)';
      assert.equal(actual.icon, background);
      assert.equal(actual.button, background);
      assert.equal(actual.border, 'rgb(206, 202, 205)');
      assert.equal(actual.stroke, ink);
    });
  }
});

test('Steam text and rich tooltips use theme surfaces and readable nested copy', browser, async () => {
  await withBrowserFixture({
    html: `<div class="_2FxbHJzYoH024ko7zqcJOf">滚动到顶部 <span>提示</span></div>
      <div class="_3XGRklQrZMakU2xaYB0cLD">
        <div class="_1LhVfNukndDa_XWzq0vdg1">标题</div>
        <div class="i4LuYcvtfPgYKx3qqvKUq">说明 <a href="#">详情</a></div>
      </div>`,
    nativeCss: `
      ._2FxbHJzYoH024ko7zqcJOf { background:radial-gradient(#cfd1d3,#b3b8bc); color:#17181c; text-shadow:1px 1px 2px #ffffff4d; }
      ._2FxbHJzYoH024ko7zqcJOf span { color:white; }
      ._3XGRklQrZMakU2xaYB0cLD { background-color:#696773; color:#e0e1e6; }
      ._3XGRklQrZMakU2xaYB0cLD ._1LhVfNukndDa_XWzq0vdg1 { color:#e0e1e6; }
      ._3XGRklQrZMakU2xaYB0cLD .i4LuYcvtfPgYKx3qqvKUq { color:#aaacb6; }
    `,
  }, async page => {
    const actual = await page.evaluate(`(() => {
      const css=selector=>getComputedStyle(document.querySelector(selector));
      return {panels:['._2FxbHJzYoH024ko7zqcJOf','._3XGRklQrZMakU2xaYB0cLD'].map(selector=>{
        const s=css(selector);return {background:s.backgroundColor,image:s.backgroundImage,color:s.color,shadow:s.textShadow};
      }),nested:css('span').color,title:css('._1LhVfNukndDa_XWzq0vdg1').color,
        detail:css('.i4LuYcvtfPgYKx3qqvKUq').color,link:css('a').color};
    })()`);
    for (const panel of actual.panels) {
      assert.equal(panel.background, 'rgb(255, 250, 243)');
      assert.equal(panel.image, 'none');
      assert.equal(panel.color, ink);
      assert.equal(panel.shadow, 'none');
    }
    assert.equal(actual.nested, ink);
    assert.equal(actual.title, ink);
    assert.equal(actual.detail, 'rgb(86, 82, 106)');
    assert.equal(actual.link, 'rgb(32, 87, 109)');
  });
});
