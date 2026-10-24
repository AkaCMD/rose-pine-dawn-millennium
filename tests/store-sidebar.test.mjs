import test from 'node:test';
import assert from 'node:assert/strict';
import { withBrowserFixture } from './helpers/browser-fixture.mjs';

// Both generations of the store's feature rows remain in use.
const html = `<body class="v6"><div class="game_meta_data">
  <a class="game_area_details_specs_ctn" href="#"><div class="icon"><img class="category_icon" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E"></div><div class="label">家庭共享</div></a>
  <div class="game_area_details_specs_ctn learning_about"><div class="icon"></div><div class="label">Steam 正在了解该游戏</div></div>
  <div class="game_area_details_specs"><div class="icon"></div><a class="name" href="#">单人</a></div>
  <div class="game_area_details_specs"><div class="icon"></div><div class="name">Steam 云</div></div>
</div></body>`;
const nativeCss = `
.game_area_details_specs_ctn { background-color:rgba(0,0,0,.2); }
.game_area_details_specs_ctn .label { background:rgba(103,193,245,.1); color:#acb2b8; }
a.game_area_details_specs_ctn .label { color:#66c0f4; }
a.game_area_details_specs_ctn:hover .label { background:linear-gradient(135deg,#67c1f5,#417a9b); color:white; }
.game_area_details_specs { background:rgba(0,0,0,.2); }
.game_area_details_specs a.name,.game_area_details_specs div.name { background:rgba(103,193,245,.1); }
.game_area_details_specs a.name:hover { background:linear-gradient(135deg,#67c1f5,#417a9b); }
.game_area_details_specs a.name:dir(rtl):hover { background:linear-gradient(-135deg,#67c1f5,#417a9b); }
`;

test('store feature rows use Dawn backgrounds in normal, hover and keyboard focus states',
  { skip: !process.env.STEAM_CDP_TEST }, async () => {
    await withBrowserFixture({ html, nativeCss }, async ({ evaluate, forcePseudoState }) => {
      const style = (selector, property) => evaluate(`getComputedStyle(document.querySelector(${JSON.stringify(selector)}))[${JSON.stringify(property)}]`);
      for (const selector of ['.game_area_details_specs_ctn', '.game_area_details_specs_ctn .label', '.game_area_details_specs .name']) {
        assert.equal(await style(selector, 'backgroundColor'), 'rgb(242, 233, 225)', selector);
        assert.equal(await style(selector, 'backgroundImage'), 'none', selector);
      }
      for (const pseudo of ['hover', 'focus-visible']) {
        await forcePseudoState('a.game_area_details_specs_ctn, a.name', [pseudo]);
        for (const selector of ['a.game_area_details_specs_ctn .label', 'a.name']) {
          assert.equal(await style(selector, 'backgroundColor'), 'rgb(223, 218, 217)', `${pseudo}: ${selector}`);
          assert.equal(await style(selector, 'backgroundImage'), 'none', `${pseudo}: ${selector}`);
          assert.equal(await style(selector, 'color'), 'rgb(40, 105, 131)', `${pseudo}: ${selector}`);
        }
      }
      await evaluate(`document.documentElement.dir='rtl'`);
      await forcePseudoState('a.name', ['hover']);
      assert.equal(await style('a.name', 'backgroundImage'), 'none');
    });
  });

const reactHtml = `<body class="v6"><div class="game_meta_data">
<div data-featuretarget="store-sidebar-accessibility-info"><details open>
<summary><div class="_29jQMo9DGCmcSKyDIC3V7M"><svg></svg></div><span class="_3sRe2CGQBgablPBz9Bc9c2"><span class="ny6hWVK6ii05H200KRhds">辅助功能</span></span></summary>
<ul><li><a class="_1RmibngWLogcFmO93kGFgq" href="#"><span class="_3sRe2CGQBgablPBz9Bc9c2">字幕选项</span></a></li></ul></details></div>
<div data-featuretarget="store-sidebar-controller-support-info"><a class="_2xZaMR-NKc0LbkeM50cZq8" href="#"><div class="dxuI55RF56-dzbuXjj2W0"><svg></svg></div><div class="_3KAysk4dlhWETa6ixz7V2j"><div class="_3FBEGAfvLQj4qYjstmZAPE">Xbox 控制器</div></div></a></div>
<div data-featuretarget="achievements"><a href="#"><div class="Cgo8G5L7D0oP0OHVGcq_D" style="--background:#0d2847"><span>Steam 成就</span></div></a>
<div class="lqD2vDqW515szC9Dt3o8c"><a class="_2773Feh3LQ2SD5dtpRj6hJ" href="#"><div class="_1smYxH70zcX0D3CUQDwF3o">?</div><div class="IfnLtAVfojeH3V-6ObQjr" style="--background:#1d1f23"><span>查看全部</span></div><img class="achievement_art" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E"></a></div></div>
<a class="linkbar" href="#"><svg><path></path></svg>查看讨论</a></div></body>`;
const reactNativeCss = `
._29jQMo9DGCmcSKyDIC3V7M,.dxuI55RF56-dzbuXjj2W0 { background:#101822; color:white; }
._2xZaMR-NKc0LbkeM50cZq8 { background:rgba(0,0,0,.2); }
._3sRe2CGQBgablPBz9Bc9c2,._3KAysk4dlhWETa6ixz7V2j,.linkbar { background:rgba(103,193,245,.1); }
summary:hover ._3sRe2CGQBgablPBz9Bc9c2,._2xZaMR-NKc0LbkeM50cZq8:hover ._3KAysk4dlhWETa6ixz7V2j { background:linear-gradient(135deg,#67c1f5,#417a9b); }
.Cgo8G5L7D0oP0OHVGcq_D,.IfnLtAVfojeH3V-6ObQjr { background:var(--background); }
.lqD2vDqW515szC9Dt3o8c { background:linear-gradient(90deg,#0008 5%,#000a 95%); }
._1smYxH70zcX0D3CUQDwF3o { background:linear-gradient(to right,#3b414a,#2c3138); box-shadow:2px 2px 4px black; color:#cacbcd; }
[data-featuretarget="achievements"] span { color:#9a9fa5; }
.game_meta_data .linkbar svg { fill:white; }
`;

test('React sidebar controls, expanded accessibility and achievement tiles use Dawn colors',
  { skip: !process.env.STEAM_CDP_TEST }, async () => {
    await withBrowserFixture({ html: reactHtml, nativeCss: reactNativeCss }, async ({ evaluate, forcePseudoState }) => {
      const style = (selector, property) => evaluate(`getComputedStyle(document.querySelector(${JSON.stringify(selector)}))[${JSON.stringify(property)}]`);
      const overlay = ['summary', '._3sRe2CGQBgablPBz9Bc9c2', '._1RmibngWLogcFmO93kGFgq', '._29jQMo9DGCmcSKyDIC3V7M', '._2xZaMR-NKc0LbkeM50cZq8', '.dxuI55RF56-dzbuXjj2W0', '._3KAysk4dlhWETa6ixz7V2j', '._1smYxH70zcX0D3CUQDwF3o', '.IfnLtAVfojeH3V-6ObQjr', '.linkbar'];
      for (const selector of overlay) {
        assert.equal(await style(selector, 'backgroundColor'), 'rgb(242, 233, 225)', selector);
        assert.equal(await style(selector, 'backgroundImage'), 'none', selector);
      }
      for (const selector of ['.Cgo8G5L7D0oP0OHVGcq_D', '.lqD2vDqW515szC9Dt3o8c']) {
        assert.equal(await style(selector, 'backgroundColor'), 'rgb(255, 250, 243)', selector);
        assert.equal(await style(selector, 'backgroundImage'), 'none', selector);
      }
      assert.equal(await style('.game_meta_data .linkbar svg', 'fill'), 'rgb(40, 105, 131)');
      assert.equal(await style('[data-featuretarget="achievements"] span', 'color'), 'rgb(70, 66, 97)');
      assert.equal(await style('.achievement_art', 'filter'), 'none');
      for (const pseudo of ['hover', 'focus-visible']) {
        await forcePseudoState('summary, ._1RmibngWLogcFmO93kGFgq, ._2xZaMR-NKc0LbkeM50cZq8, [data-featuretarget="achievements"] a, .linkbar', [pseudo]);
        for (const selector of ['summary ._3sRe2CGQBgablPBz9Bc9c2', '._1RmibngWLogcFmO93kGFgq ._3sRe2CGQBgablPBz9Bc9c2', '._3KAysk4dlhWETa6ixz7V2j', '.IfnLtAVfojeH3V-6ObQjr', '.linkbar']) {
          assert.equal(await style(selector, 'backgroundColor'), 'rgb(223, 218, 217)', `${pseudo}: ${selector}`);
          assert.equal(await style(selector, 'backgroundImage'), 'none', `${pseudo}: ${selector}`);
        }
      }
    });
  });
