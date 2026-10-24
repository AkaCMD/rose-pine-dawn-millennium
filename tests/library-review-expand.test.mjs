import test from 'node:test';
import assert from 'node:assert/strict';
import { withBrowserFixture } from './helpers/browser-fixture.mjs';

// The library review uses OverflowBox and the shared TextButton control.
const html = `<body><div class="_2l416KfEtI4CL0mCUEmOBw">
  <div class="_17qc0iT2Uzbk8umX0qMOMJ">
    <div class="_3C0istohNAM4_kDuBULbcw _3ZTURoVnx3Ld8Hu5Ozd70v" style="max-height:200px;overflow:hidden">
      <div style="height:400px">好友评测正文</div>
    </div>
    <div><button type="button" class="TextButton" onclick="this.parentElement.previousElementSibling.style.maxHeight='400px'">展开阅读</button></div>
  </div></div></body>`;
const nativeCss = `button.TextButton { background-color:transparent; border:0px hidden transparent;
  padding:0; color:white; cursor:pointer; font-weight:100; }
  button.TextButton:hover,button.TextButton.gpfocus { color:white; }`;

test('library review expand control remains readable in normal, hover and keyboard focus states',
  { skip: !process.env.STEAM_CDP_TEST }, async () => {
    await withBrowserFixture({ html, nativeCss }, async ({ evaluate, forcePseudoState }) => {
      const color = () => evaluate(`getComputedStyle(document.querySelector('button.TextButton')).color`);
      assert.equal(await color(), 'rgb(32, 87, 109)');
      for (const state of [['hover'], ['focus-visible']]) {
        await forcePseudoState('button.TextButton', state);
        assert.equal(await color(), 'rgb(32, 87, 109)');
      }
      await evaluate(`document.querySelector('button.TextButton').classList.add('gpfocus')`);
      assert.equal(await color(), 'rgb(32, 87, 109)');
      assert.deepEqual(await evaluate(`(()=>{const content=document.querySelector('._3C0istohNAM4_kDuBULbcw');
        const before=content.clientHeight;document.querySelector('button.TextButton').click();
        return [before,content.clientHeight];})()`), [200, 400]);
    });
  });
