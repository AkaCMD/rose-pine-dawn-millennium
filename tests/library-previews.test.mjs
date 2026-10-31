import test from 'node:test';
import assert from 'node:assert/strict';
import { withBrowserFixture } from './helpers/browser-fixture.mjs';

const browser = { skip: !process.env.STEAM_CDP_TEST, timeout: 30000 };
const image = '<img alt="" style="filter:none;opacity:.8" src="data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\'/%3E">';

// RecentGameFooter and AppPortraitHover are separate Steam components. Both
// put text above a blurred copy of the cover, independent of the page surface.
test('library playtime footers and hover previews use theme surfaces without tinting artwork', browser, async () => {
  await withBrowserFixture({
    html: `<article id="tile">
      ${image}
      <div class="_2d1hSvdpY5L2-GN1EnUb9Z">
        <div class="RhmvOTLHkomDhCTDX9hLA">${image}</div>
        <div class="_3bkuozxKIatrWG3aeisthc">
          <div class="_3bkuozxKIatrWG3aeisthc _2zIRlEsAfHhI-_3bZ3X60z">游戏时间</div>
          <div class="_3bkuozxKIatrWG3aeisthc _3JWBBEulYkYmDLJr485oex">过去两周：0 分钟</div>
          <div class="_3bkuozxKIatrWG3aeisthc ma8y_VgPze1mscYhW6-oS">总数：0 分钟</div>
        </div>
      </div>
    </article>
    <aside class="_2sGn0cBsD44TjnUIh-lx9d">
      <div class="Yts2cS2BIbHJoh5UorpDq"><div class="AcLtE9axR9tWhAVfDP9lv">${image}</div></div>
      <div class="_12UNIdjT-Kv1ib31jk6J37">
        <div class="_1RfxlV1H3JsSs-aRaXVJQt"><div class="_1Kdi2PBxcdQwDpa-48hrf2">Satelital Demo</div></div>
        <div id="screenshot">${image}</div>
        <div class="_1VGPO4xU5sgRK6DFt4t74O"><div class="MIHa_O-B1JXrzkoGc255n">游戏时间</div>
          <div>过去两周：<span>8 分钟</span></div><div>总数：<span>8 分钟</span></div>
        </div>
      </div>
    </aside>`,
    nativeCss: `
      ._2d1hSvdpY5L2-GN1EnUb9Z { background-color:#686868; }
      .RhmvOTLHkomDhCTDX9hLA { background:black; filter:blur(16px); }
      ._3bkuozxKIatrWG3aeisthc.ma8y_VgPze1mscYhW6-oS,
      ._3bkuozxKIatrWG3aeisthc._3JWBBEulYkYmDLJr485oex { color:hsla(0,0%,100%,.51); }
      ._2sGn0cBsD44TjnUIh-lx9d { background-color:#363c45; }
      .AcLtE9axR9tWhAVfDP9lv { filter:blur(18px) opacity(50%) saturate(.7); }
      ._1Kdi2PBxcdQwDpa-48hrf2 { color:white; text-shadow:1px 1px 1px #0006; }
      ._1VGPO4xU5sgRK6DFt4t74O { color:#f7f7f7; }
      ._1VGPO4xU5sgRK6DFt4t74O .MIHa_O-B1JXrzkoGc255n { color:white; }
    `,
  }, async page => {
    const actual = await page.evaluate(`(() => {
      const css = selector => getComputedStyle(document.querySelector(selector));
      return {
        footer:css('._2d1hSvdpY5L2-GN1EnUb9Z').backgroundColor,
        preview:css('aside').backgroundColor,
        title:css('._1Kdi2PBxcdQwDpa-48hrf2').color,
        titleShadow:css('._1Kdi2PBxcdQwDpa-48hrf2').textShadow,
        labels:[...document.querySelectorAll('._3bkuozxKIatrWG3aeisthc, ._3bkuozxKIatrWG3aeisthc span, ._1VGPO4xU5sgRK6DFt4t74O, ._1VGPO4xU5sgRK6DFt4t74O div, ._1VGPO4xU5sgRK6DFt4t74O span')].map(el=>getComputedStyle(el).color),
        decorations:['.RhmvOTLHkomDhCTDX9hLA', '.Yts2cS2BIbHJoh5UorpDq'].map(selector=>css(selector).display),
        artwork:[...document.querySelectorAll('#tile > img, #screenshot img')].map(el=>({filter:getComputedStyle(el).filter,opacity:getComputedStyle(el).opacity}))
      };
    })()`);
    assert.equal(actual.footer, 'rgb(255, 250, 243)');
    assert.equal(actual.preview, 'rgb(255, 250, 243)');
    assert.equal(actual.title, 'rgb(70, 66, 97)');
    assert.equal(actual.titleShadow, 'none');
    assert.ok(actual.labels.length >= 10);
    for (const color of actual.labels) assert.equal(color, 'rgb(70, 66, 97)');
    assert.deepEqual(actual.decorations, ['none', 'none']);
    assert.deepEqual(actual.artwork, Array(2).fill({ filter:'none', opacity:'0.8' }));
  });
});

test('Play Next recommendation footers, captions and download actions use theme colors', browser, async () => {
  for (const footer of ['_2d1hSvdpY5L2-GN1EnUb9Z', '_1CmuxC6KBmGPJ77aSRQfEq']) {
    await withBrowserFixture({
      html: `<article class="_2a9SnCjTTOhX5y6SfbKFkC">
        <div id="cover">${image}</div>
        <button class="_3AjoLnMNKxYmNTGTJCLfgs _3yGiLsl__NlNYprnB7rt14" aria-label="安装">
          <svg viewBox="0 0 16 16"><path d="M2 8h12v4H2z"/></svg>
        </button>
        <div class="${footer}">
          <div class="_3gwMkKp82bb5aZj4EeQnpi">
            <div class="_3gwMkKp82bb5aZj4EeQnpi _3CRLA2FFclTRCznNBgtiIH">在像您一样的玩家中最热门</div>
            <div class="_3gwMkKp82bb5aZj4EeQnpi _3DR9f2B3JQKviESgdrHp1u">推荐游戏</div>
          </div>
          <div class="RhmvOTLHkomDhCTDX9hLA">${image}</div>
        </div>
      </article>`,
      nativeCss: `
        ._2d1hSvdpY5L2-GN1EnUb9Z { background-color:#686868; }
        .RhmvOTLHkomDhCTDX9hLA { filter:blur(16px); }
        ._3gwMkKp82bb5aZj4EeQnpi._3DR9f2B3JQKviESgdrHp1u { color:hsla(0,0%,100%,.5); }
        ._3AjoLnMNKxYmNTGTJCLfgs { background:radial-gradient(#0c3547,#082735); }
        ._3AjoLnMNKxYmNTGTJCLfgs:hover { background:radial-gradient(#66cfff,#1883b1); }
      `,
    }, async page => {
      for (const state of [[], ['hover'], ['focus', 'focus-visible']]) {
        await page.forcePseudoState('button', state);
        const actual = await page.evaluate(`(() => {
          const css = selector => getComputedStyle(document.querySelector(selector));
          return {footer:css('.${footer}').backgroundColor,
            decoration:css('.RhmvOTLHkomDhCTDX9hLA').display,
            caption:css('._3CRLA2FFclTRCznNBgtiIH').color,
            detail:css('._3DR9f2B3JQKviESgdrHp1u').color,
            action:css('button').backgroundColor, gradient:css('button').backgroundImage,
            icon:css('svg').color, fill:css('svg').fill,
            imageFilter:css('#cover img').filter, imageOpacity:css('#cover img').opacity};
        })()`);
        assert.equal(actual.detail, 'rgb(86, 82, 106)', footer);
        assert.equal(actual.caption, 'rgb(70, 66, 97)', footer);
        assert.equal(actual.footer, 'rgb(255, 250, 243)', footer);
        assert.equal(actual.decoration, 'none', footer);
        assert.equal(actual.action, 'rgb(40, 105, 131)', footer);
        assert.equal(actual.gradient, 'none', footer);
        assert.equal(actual.icon, 'rgb(255, 250, 243)', footer);
        assert.equal(actual.fill, actual.icon, footer);
        assert.equal(actual.imageFilter, 'none', footer);
        assert.equal(actual.imageOpacity, '0.8', footer);
      }
    });
  }
});
