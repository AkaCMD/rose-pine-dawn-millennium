import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { connect } from '../scripts/cdp.mjs';
import { scanPage } from '../scripts/scan-page.mjs';
import { classify } from '../scripts/coverage-rules.mjs';

test('browser loading surfaces stay light before the palette stylesheet arrives',
  { skip: !process.env.STEAM_CDP_TEST, timeout: 30000 }, async () => {
    const endpoint = 'http://127.0.0.1:8080';
    const target = await (await fetch(`${endpoint}/json/new?about:blank`, { method: 'PUT', signal: AbortSignal.timeout(5000) })).json();
    let client;
    try {
      client = await connect(target.webSocketDebuggerUrl);
      const steamCss = await readFile(new URL('../css/steam.css', import.meta.url), 'utf8');
      const paletteCss = await readFile(new URL('../css/light.css', import.meta.url), 'utf8');
      const html = `<html><head><style>
        html,body { margin:0; height:100%; background:black; }
        ._1bGewp3tfzqAF6fVTFFUOz, ._29p1jfvZ-VdlXK24_7UGsK { width:100%; height:100%; background:black; }
        ${steamCss}
        </style></head><body><div class="_1bGewp3tfzqAF6fVTFFUOz"><div class="_29p1jfvZ-VdlXK24_7UGsK"></div></div></body></html>`;
      const evaluate = async expression => {
        const result = await client.call('Runtime.evaluate', { expression, returnByValue: true });
        assert.equal(result.exceptionDetails, undefined);
        return result.result.value;
      };
      await evaluate(`document.open();document.write(${JSON.stringify(html)});document.close();true`);
      const surfaces = () => evaluate(`[document.documentElement,document.body,...document.querySelectorAll('._1bGewp3tfzqAF6fVTFFUOz,._29p1jfvZ-VdlXK24_7UGsK')].map(e=>getComputedStyle(e).backgroundColor)`);
      assert.deepEqual(await surfaces(), Array(4).fill('rgb(250, 244, 237)'), 'loading does not depend on palette fetch order');
      await evaluate(`(()=>{const s=document.createElement('style');s.textContent=${JSON.stringify(paletteCss)};document.head.append(s);})()`);
      assert.deepEqual(await surfaces(), Array(4).fill('rgb(250, 244, 237)'));
      await evaluate(`(()=>{const e=document.createElement('div');e.id='loaded-content';e.style.cssText='background:rgb(255,250,243);width:100%;height:100%';document.querySelector('._29p1jfvZ-VdlXK24_7UGsK').append(e);})()`);
      assert.equal(await evaluate("getComputedStyle(document.querySelector('#loaded-content')).backgroundColor"), 'rgb(255, 250, 243)', 'loaded page content keeps its own background');
    } finally {
      client?.close();
      await fetch(`${endpoint}/json/close/${target.id}`, { signal: AbortSignal.timeout(5000) });
    }
  });

test('CEF scanner detects a real cascade gap and respects media, visibility and interaction states',
  { skip: !process.env.STEAM_CDP_TEST, timeout: 30000 }, async () => {
    const endpoint = 'http://127.0.0.1:8080';
    const target = await (await fetch(`${endpoint}/json/new?about:blank`, { method: 'PUT', signal: AbortSignal.timeout(5000) })).json();
    let client;
    try {
      client = await connect(target.webSocketDebuggerUrl);
      await client.call('Emulation.setDeviceMetricsOverride', { width: 1200, height: 900, deviceScaleFactor: 1, mobile: false });
      const css = (await Promise.all(['light', 'steam', 'store', 'library-game'].map(name =>
        readFile(new URL(`../css/${name}.css`, import.meta.url), 'utf8')))).join('\n');
      const html = `<html><head><style>
        body { margin: 0; } .fixture { display:block; width:180px; height:45px; margin:3px; }
        .game_language_options { background:#17191b; color:white; }
        #gap { background:#17191b; color:white; }
        #unreadable { background:#faf4ed; color:#f1eee9; }
        #gradient { background:linear-gradient(black,white); }
        #offscreen { position:absolute; top:2000px; background:black; }
        #transparent-parent { opacity:0; }
        #accent { background:#286983; color:#fffaf3; }
        #state:hover { background:#17191b; }
        #state:focus { color:#faf4ed; }
        ._276E6ijBpjMA2_iTxNhhjc { background:#17191b; }
        ._276E6ijBpjMA2_iTxNhhjc:hover { background:#333741; }
        ._2Szzh5sKyGgnLUR870zbDE.RtSv39ZoBOySnb8XQ5hJf { background:#5c7e10; color:white; }
        ._2Szzh5sKyGgnLUR870zbDE._5wILZhsLODVwGfcJ0hKmJ { background:#1999ff; color:white; }
        #occluded, #occluder { position:absolute; left:400px; top:20px; width:100px; height:60px; }
        #occluded { background:#17191b; } #occluder { background:#faf4ed; }
        #image-panel { position:absolute; left:400px; top:120px; width:100px; height:60px; background:rgba(0,0,0,.667); }
        #image-panel img { width:100%; height:100%; }
        #store-regressions { position:absolute; left:700px; top:20px; width:300px; }
        #store-regressions div { min-height:30px; }
        .community_recommendation_app .right_col { background:rgba(0,0,0,.2); }
        .community_recommendation_app .app_name { color:white; }
        .author_block .hours { color:#8091a2; }
        .see_more_text { color:#fff; }
        .home_content h2 a { color:#aaa; }
        .home_content h2 .header_inline { color:#999; }
        .topseller_title { color:#a1cd44; }
        #discounts_and_events_title { color:white; }
        ._2SAb6geDpe6toA1GaP0GjH, ._3LE-6w1ItIAB4CKJFCa3Od, ._2z8Na_s9JosX48wHF4HPiA { background:#17191b; color:white; }
        button._1kCN0pAntrcGCSmcc-vYdk { background:rgba(103,193,245,.2); color:rgb(103,193,245); }
        ._2aVnDeExEHiUFX0zwr_BTO { background:#2c3138; color:white; }
        ._2DUDvAhXoEOSsd8GTIsKLY { background:#000; color:white; }
        ._3ns9185LizH61StaAXuAp6 { background:#000; }
        ${css}
        </style></head><body>
        <div id="covered" class="fixture game_language_options">Readable themed panel</div>
        <div id="gap" class="fixture">Missed native dark panel</div>
        <div id="unreadable" class="fixture">Unreadable label</div>
        <div id="gradient" class="fixture">Gradient needs review</div>
        <img id="artwork" class="fixture" style="background:black" alt="">
        <div id="offscreen" class="fixture">Offscreen</div>
        <div id="transparent-parent"><div id="invisible" class="fixture">Invisible</div></div>
        <div id="accent" class="fixture">Accent</div>
        <div id="state" class="fixture" tabindex="0">Interaction state</div>
        <div id="gutter" class="fixture _276E6ijBpjMA2_iTxNhhjc"></div>
        <div id="notification" class="fixture _2Szzh5sKyGgnLUR870zbDE RtSv39ZoBOySnb8XQ5hJf _3L1c8C0o_xXzPy26aoLBFd">Notification</div>
        <div id="announcement" class="fixture _2Szzh5sKyGgnLUR870zbDE _5wILZhsLODVwGfcJ0hKmJ _1oEwirQksXfZ-3RWWslbAR">Announcement</div>
        <div id="read-notification" class="fixture _2Szzh5sKyGgnLUR870zbDE RtSv39ZoBOySnb8XQ5hJf _3qhGkQ5qLVNQQ-J2-uPoHt">Read notification</div>
        <div id="occluded"></div><div id="occluder"></div>
        <div id="image-panel"><img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='60'%3E%3Crect width='100' height='60' fill='red'/%3E%3C/svg%3E"></div>
        <section id="store-regressions" class="home_page_body_ctn">
          <div class="community_recommendation_app"><div class="right_col"><div id="recommendation-title" class="app_name">Recommendation</div></div></div>
          <div class="author_block"><div id="review-hours" class="hours">Playtime</div></div>
          <div class="see_more_link"><span id="see-more" class="see_more_text">See more</span></div>
          <div class="home_content"><h2><a id="section-link">Category</a><span id="section-secondary" class="header_inline">Description</span></h2></div>
          <div class="store_main_capsule"><div id="topseller" class="topseller_title">Top seller</div></div>
          <div id="discounts_and_events_title">Discounts and events</div>
        </section>
        <section id="library-game-regressions" class="_2l416KfEtI4CL0mCUEmOBw" style="position:absolute;left:0;top:620px;width:600px;">
          <div id="review-prompt" class="_2SAb6geDpe6toA1GaP0GjH _1E_ENwpaym7n3ke0XFpczv">Recommend?</div>
          <button id="review-yes" class="_1kCN0pAntrcGCSmcc-vYdk">Yes</button>
          <div id="achievement-tile" class="_2aVnDeExEHiUFX0zwr_BTO _3llpbyrXsfwsh1apqHhPfB Panel" style="display:inline-block;width:48px;height:48px">+31</div>
          <div id="character-card" class="_2DUDvAhXoEOSsd8GTIsKLY" style="display:inline-block;width:110px;height:128px"><div id="character-name" class="AVDXBqSa_LSoeGgEXKml8">Black Cat</div></div>
          <div id="ach-strip" class="_3ns9185LizH61StaAXuAp6" style="width:200px;height:8px"></div>
        </section>
        </body></html>`;
      const evaluate = async expression => {
        const result = await client.call('Runtime.evaluate', { expression, returnByValue: true });
        assert.equal(result.exceptionDetails, undefined);
        return result.result.value;
      };
      await evaluate(`document.open(); document.write(${JSON.stringify(html)}); document.close(); true`);
      await client.call('DOM.enable');
      await client.call('CSS.enable');
      const doc = await client.call('DOM.getDocument');
      const pseudo = async (selector, pseudoClasses) => {
        const { nodeId } = await client.call('DOM.querySelector', { nodeId: doc.root.nodeId, selector });
        await client.call('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: pseudoClasses });
      };
      const scan = () => evaluate(`(${scanPage.toString()})([])`);
      const result = await scan();
      const byId = id => result.samples.find(s => s.selector === `#${id}`);
      const allowed = [[40, 105, 131, 1]];
      assert.deepEqual(classify(byId('covered'), allowed), []);
      assert.ok(classify(byId('gap'), allowed).some(i => i.kind === 'dark-surface'));
      assert.ok(classify(byId('unreadable'), allowed).some(i => i.kind === 'low-contrast'));
      assert.equal(classify(byId('gradient'), allowed)[0].kind, 'manual-review');
      assert.deepEqual(classify(byId('accent'), allowed), []);
      for (const id of ['artwork', 'offscreen', 'invisible']) assert.equal(byId(id), undefined);
      assert.deepEqual(classify(byId('state'), allowed), []);
      assert.equal(byId('occluded'), undefined, 'an opaque sibling covers this background');
      assert.equal(byId('image-panel'), undefined, 'artwork covers the panel sample point');
      assert.deepEqual(byId('gutter').background, [223, 218, 217, 1], 'the resize gutter uses the theme separator');
      for (const id of ['notification', 'announcement']) {
        assert.deepEqual(byId(id).background, [40, 105, 131, 1], `${id} uses the theme accent`);
        assert.deepEqual(classify(byId(id), allowed), []);
      }
      assert.deepEqual(byId('read-notification').background, [242, 233, 225, 1]);
      assert.deepEqual(classify(byId('read-notification'), allowed), []);
      for (const id of ['recommendation-title', 'review-hours', 'see-more', 'section-link', 'section-secondary', 'topseller', 'discounts_and_events_title']) {
        assert.ok(byId(id), `${id} is inspected`);
        assert.deepEqual(classify(byId(id), allowed), [], `${id} remains readable on a light store surface`);
      }
      assert.deepEqual(byId('review-prompt').background, [255, 250, 243, 1], 'review prompt uses the surface');
      assert.deepEqual(classify(byId('review-prompt'), allowed), []);
      assert.deepEqual(byId('review-yes').background, [242, 233, 225, 1], 'review buttons use the overlay');
      assert.deepEqual(byId('review-yes').foreground, [40, 105, 131, 1], 'review buttons use the pine accent');
      assert.deepEqual(classify(byId('review-yes'), allowed), []);
      assert.deepEqual(byId('achievement-tile').background, [255, 250, 243, 1], 'achievement tiles use the surface');
      assert.deepEqual(classify(byId('achievement-tile'), allowed), []);
      assert.deepEqual(byId('character-card').background, [242, 233, 225, 1], 'character cards use the overlay');
      assert.deepEqual(byId('ach-strip').background, [206, 202, 205, 1], 'achievement strips use the highlight');
      await pseudo('#state', ['hover']);
      const hover = (await scan()).samples.find(s => s.selector === '#state');
      assert.ok(classify(hover, allowed).some(i => i.kind === 'dark-surface'));
      await pseudo('#state', []);
      await pseudo('#state', ['focus']);
      const focus = (await scan()).samples.find(s => s.selector === '#state');
      assert.ok(classify(focus, allowed).some(i => i.kind === 'low-contrast'));
      await pseudo('#gutter', ['hover']);
      assert.deepEqual((await scan()).samples.find(s => s.selector === '#gutter').background, [206, 202, 205, 1]);
    } finally {
      client?.close();
      await fetch(`${endpoint}/json/close/${target.id}`, { signal: AbortSignal.timeout(5000) });
    }
  });
