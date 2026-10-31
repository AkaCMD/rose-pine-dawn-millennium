import test from 'node:test';
import assert from 'node:assert/strict';
import { withBrowserFixture } from './helpers/browser-fixture.mjs';

const browser = { skip: !process.env.STEAM_CDP_TEST, timeout: 30000 };
const surface = 'rgb(255, 250, 243)';
const base = 'rgb(250, 244, 237)';
const overlay = 'rgb(242, 233, 225)';
const ink = 'rgb(70, 66, 97)';
const pine = 'rgb(40, 105, 131)';

// Current store-menu-v7 classes from the public store. The old navigation
// classes do not match this root, its radial background or its search controls.
test('current store navigation, menus and search actions use Dawn colors', browser, async () => {
  await withBrowserFixture({
    html: `<div data-featuretarget="store-menu-v7"><div class="XLbP8xOkCYw-">
      <div role="navigation"><button class="_2U8ldyeSqVI-" aria-expanded="true"><div>浏览</div></button>
        <form role="search"><input class="rFKwchjD-WU-" placeholder="搜索商店">
          <button class="A42lZ-U1dhI-" type="submit"><svg><path fill="currentColor"/></svg></button>
        </form>
        <a id="wishlist" href="/wishlist/"><span>愿望单</span></a>
        <a id="cart" href="/cart/" style="background:#1a9fff;color:white"><span>购物车</span></a>
      </div>
      <div class="dUvJZktS6bk-"><a class="PcE8-n5Eb6Y-"><div>商店主页</div></a></div>
      <div class="O2jUvAs3OiU-"><a class="JhiIqI-S0Js-"><span>高级搜索</span></a></div>
    </div><div id="positioning-layer"></div></div>`,
    nativeCss: `
      .XLbP8xOkCYw- { background:radial-gradient(#18253533,#192330); color:#dcdedf; }
      button._2U8ldyeSqVI- { color:white; text-shadow:1px 1px 1px #0008; }
      .rFKwchjD-WU- { color:white; } .rFKwchjD-WU-::placeholder { color:#dcdedf; }
      .rFKwchjD-WU-:focus-visible { background:#242931; }
      .A42lZ-U1dhI- { background:#1a9fff; color:white; }
      .A42lZ-U1dhI-:hover { background:#45acff; }
      .O2jUvAs3OiU- { background:linear-gradient(#404655,#262a32); }
      a.JhiIqI-S0Js- { color:#f7f8f8; background:#a3bad333; }
      .dUvJZktS6bk- { background:linear-gradient(90deg,#7eabff1a,#384d741a); }
      .PcE8-n5Eb6Y- { color:#dcdedf; }
    `,
  }, async page => {
    for (const state of [[], ['hover'], ['focus', 'focus-visible']]) {
      await page.forcePseudoState('button, input, a', state);
      const actual = await page.evaluate(`(() => {
        const css=selector=>getComputedStyle(document.querySelector(selector));
        return {
          nav:css('.XLbP8xOkCYw-').backgroundColor, gradient:css('.XLbP8xOkCYw-').backgroundImage,
          label:css('button[aria-expanded] div').color, shadow:css('button[aria-expanded]').textShadow,
          input:css('input').backgroundColor, placeholder:getComputedStyle(document.querySelector('input'),'::placeholder').color,
          action:css('button[type=submit]').backgroundColor, icon:css('svg').color,
          cart:css('#cart').backgroundColor, cartText:css('#cart span').color,
          wishText:css('#wishlist span').color,
          suggestions:css('.O2jUvAs3OiU-').backgroundColor,
          menu:css('.dUvJZktS6bk-').backgroundColor, menuText:css('.PcE8-n5Eb6Y- div').color,
          layer:css('#positioning-layer').backgroundColor
        };
      })()`);
      assert.equal(actual.nav, surface);
      assert.equal(actual.gradient, 'none');
      assert.equal(actual.label, 'rgb(32, 87, 109)');
      assert.equal(actual.shadow, 'none');
      assert.equal(actual.input, base);
      assert.equal(actual.placeholder, 'rgb(86, 82, 106)');
      assert.equal(actual.action, pine);
      assert.equal(actual.icon, surface);
      assert.equal(actual.cart, pine);
      assert.equal(actual.cartText, surface);
      assert.equal(actual.wishText, ink);
      assert.equal(actual.suggestions, surface);
      assert.equal(actual.menu, overlay);
      assert.equal(actual.menuText, ink);
      assert.equal(actual.layer, 'rgba(0, 0, 0, 0)', 'positioning layers remain transparent');
    }
    assert.equal(await page.evaluate(`(() => {
      const button=document.querySelector('button[aria-expanded]');
      button.setAttribute('aria-expanded','false');
      return getComputedStyle(button.firstElementChild).color;
    })()`), ink, 'collapsed menu labels use normal theme text');
  });
});

test('homepage takeover hit areas expose artwork and its edge fades use the page color', browser, async () => {
  await withBrowserFixture({
    html: `<main class="home_page_body_ctn"><div class="store_bg_overlay">
        <div class="gradient_left"></div><div class="gradient_right"></div>
      </div><div class="static_takeover_ctn">
        <div id="artwork" class="page_background_holder" style="background-image:url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22/%3E');filter:none;opacity:.8"></div>
      </div><div class="home_page_takeover_link"><a class="home_page_takeover_sizer">宣传图链接</a></div>
    </main>`,
    nativeCss: `
      .store_bg_overlay { width:1854px; }
      .gradient_left { background:linear-gradient(to left,transparent,black); }
      .gradient_right { background:linear-gradient(to right,transparent,black); }
    `,
  }, async page => {
    const actual = await page.evaluate(`(() => {
      const css=selector=>getComputedStyle(document.querySelector(selector));
      return {hitAreas:['.home_page_takeover_link','.home_page_takeover_sizer'].map(selector=>css(selector).backgroundColor),
        fades:['.gradient_left','.gradient_right'].map(selector=>css(selector).backgroundImage),
        edgeWidth:document.querySelector('.store_bg_overlay').getBoundingClientRect().width,
        pageWidth:document.querySelector('main').getBoundingClientRect().width,
        artwork:css('#artwork').backgroundImage, filter:css('#artwork').filter, opacity:css('#artwork').opacity};
    })()`);
    assert.deepEqual(actual.hitAreas, ['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0)']);
    assert.ok(actual.edgeWidth <= actual.pageWidth, 'edge fades fit the visible page width');
    for (const fade of actual.fades) {
      assert.ok(fade.includes(base), fade);
      assert.ok(!fade.includes('rgb(0, 0, 0)'), fade);
    }
    assert.ok(actual.artwork.includes('data:image/svg+xml'));
    assert.equal(actual.filter, 'none');
    assert.equal(actual.opacity, '0.8');
  });
});

test('desktop store URL pill keeps a light hover background and readable text', browser, async () => {
  await withBrowserFixture({
    html: `<div class="_1bGewp3tfzqAF6fVTFFUOz"><div class="UkR3sY319PuaUNuUWks2K">
      <div class="_2m_orETo6AghzAnc0sISCt"><div class="MZPxEZcxAGtPDf1NYtouS">https://store.steampowered.com/</div></div>
    </div></div>`,
    nativeCss: `._1bGewp3tfzqAF6fVTFFUOz .UkR3sY319PuaUNuUWks2K ._2m_orETo6AghzAnc0sISCt:hover { background:#23262e; border-radius:16px; }`,
  }, async page => {
    await page.forcePseudoState('._2m_orETo6AghzAnc0sISCt', ['hover']);
    const actual = await page.evaluate(`(() => {
      const pill=document.querySelector('._2m_orETo6AghzAnc0sISCt');
      return {background:getComputedStyle(pill).backgroundColor,color:getComputedStyle(pill.firstElementChild).color};
    })()`);
    assert.equal(actual.background, overlay);
    assert.equal(actual.color, ink);
  });
});

test('wide takeover gutters match the page while desktop and mobile artwork keep their original pixels', browser, async () => {
  const artwork = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1854" height="220"><rect width="1854" height="220" fill="#907aa9"/></svg>')}`;
  for (const className of ['page_background_holder', 'page_background_holder_mobile']) {
    for (const width of [2560, 1280]) {
      await withBrowserFixture({
        viewport: { width, height: 260 },
        html: `<main class="home_page_body_ctn"><div class="static_takeover_ctn">
          <div class="${className}" style="background-image:url('${artwork}'),linear-gradient(to right,black 50%,black 50%)"></div>
        </div></main>`,
        nativeCss: `body { margin:0; }
          .${className} { height:220px; background-repeat:no-repeat; background-position:center top; }`,
      }, async page => {
        await page.evaluate(`(async()=>{const image=new Image();image.src=${JSON.stringify(artwork)};await image.decode();return true})()`);
        const screenshot = await page.screenshot();
        const pixels = await page.evaluate(`(async()=>{
          const image=new Image();image.src=${JSON.stringify(`data:image/png;base64,${screenshot}`)};
          await image.decode();
          const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
          const context=canvas.getContext('2d');context.drawImage(image,0,0);
          return [10,${width / 2},${width - 10}].map(x=>[...context.getImageData(x,100,1,1).data]);
        })()`);
        const context = `${className} / ${width}px`;
        const art = [144, 122, 169, 255];
        const gutter = width > 1854 ? [250, 244, 237, 255] : art;
        assert.deepEqual(pixels, [gutter, art, gutter], context);
      });
    }
  }
});
