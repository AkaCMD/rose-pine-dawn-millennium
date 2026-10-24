import test from 'node:test';
import assert from 'node:assert/strict';
import { withBrowserFixture } from './helpers/browser-fixture.mjs';
import { probeExpression } from '../scripts/scan-page.mjs';
import { classify } from '../scripts/coverage-rules.mjs';

// Native light labels paired with the surfaces the theme actually repaints.
const cases = [
  ['collection-artwork', '<div class="_3IWn-2rn7x98o5fDd0rAxb" style="background:linear-gradient(#123,#456)"><div class="_1J1LQ0vGtpM3n0xw7XwQM6"><div>Collection</div><div class="_36QQLBgXFUVTOhU9jMkCWD">12</div></div></div>'],
  ['activity-achievements', '<div class="_2l416KfEtI4CL0mCUEmOBw"><div class="_2aVnDeExEHiUFX0zwr_BTO"><div class="_1-H7tKj_QcGHLUbx5wVsGg">Achievement description</div></div></div>'],
  ['achievement-summary', '<div class="_2l416KfEtI4CL0mCUEmOBw"><div class="_38t1mljBjmJfqjpVzMT1CG"><div>13 / 41 unlocked</div></div></div>'],
  ['trading-cards-summary', '<div class="_2l416KfEtI4CL0mCUEmOBw"><div class="_2aVnDeExEHiUFX0zwr_BTO"><div>Level 1 badge</div></div></div>'],
  ['notification-card', '<div class="_3B8wRA4H7e_oSksYNqpSPv"><div class="_26v9mHAi56x63OwY-jxett">Game on sale</div><div class="_3hEeummFKRey8l5VXxZwxz">Now <span>50.00</span></div></div>'],
  ['notification-summary', '<div class="_3k90ug209sE23xAMqcM74s"><div class="h-lNlCUnCRbIcn38-Oqaw">New items</div></div>'],
  ['notification-all', '<button class="_1oERP7bVictkby2hP4BBva">View all</button>'],
  ['download-stat', '<div class="_1bq4x9pa4-9RLY-dXWUZTp"><div class="eXF8xL2LUtzeWMbK-FSRz">Download speed</div></div>'],
  ['download-row', '<div class="_1bq4x9pa4-9RLY-dXWUZTp"><div class="_3Mbhnlk1Go2j8yCdjthzc7"><div class="TK9wvF55dyA6RcOclozC8">Game</div><div class="_1CGnw50aAma6AYKF51Qzsm">Queued</div></div></div>'],
  ['download-primary', '<div class="_1bq4x9pa4-9RLY-dXWUZTp"><button class="DialogButton Primary"><span>Resume</span></button></div>'],
  ['friends-heading', '<div class="friendsui-container"><div class="friendlistListContainer"><div class="groupName">Online <span class="groupCount">12</span></div></div></div>'],
  ['friends-game', '<div class="friendsui-container"><div class="friend ingame"><div class="in-game"><div class="_2n0EiKMGRP-r_BI5tDtttu">Playing game</div></div></div></div>'],
  ['friends-group', '<div class="friendsui-container"><div class="chatRoomListContainer"><div class="chatRoomName">Group name</div></div></div>'],
  ['chat-tab', '<div class="friendsui-container"><div class="ChatTabs"><div class="_2XZq-_f6npaQdAgeRzKIkz"><div class="nOdcT-MoOaXGePXLyPe0H">Friend</div></div></div></div>'],
  ['chat-header', '<div class="friendsui-container"><div class="chatHeader"><div class="nOdcT-MoOaXGePXLyPe0H">Friend name</div></div></div>'],
  ['chat-composer', '<div class="friendsui-container"><div class="chatEntry"><div class="_3Ule3rolhZJiBN4yNNtk1s"><button class="RVIs84dAE6wHcjH9tkinc">Attach</button></div></div></div>'],
  ['chat-timestamp', '<div class="friendsui-container"><div class="chatHistoryScroll"><div class="chatHistory"><div class="msg timeDivision">Today</div></div></div></div>'],
  ['chat-message', '<div class="friendsui-container"><div class="chatWindow"><div class="chatHistoryScroll"><div class="chatMessageBody">Message body</div></div></div></div>'],
  ['collection-create', '<div class="_2Th-vimU76KOpmdy45yu52"><div class="_34I5HgBL6QP2CcuI4emtaM"><div class="_2890MptFADbe-IUQFQ8L1O">Create collection</div></div></div>'],
  ['store-title', '<a class="tab_item"><div class="tab_item_title">Game title</div></a>'],
  ['store-tags', '<a class="tab_item"><div class="tab_item_tags"><span class="top_tag">Adventure</span></div></a>'],
  ['store-release', '<a class="tab_item"><div class="tab_item_release_date">Release date</div></a>'],
  ['search-warning', '<div id="search_results_filtered_warning_persistent"><div>Filtered results</div></div>'],
  ['store-widget', '<div class="_3PAP1PfUymQrLEveRsxQxP"><div class="_3u1HeR7JRPiiuKIT78j2Cc">Explore</div></div>'],
  ['store-home-title', '<div class="home_page_body_ctn"><div class="home_title">Top <b>categories</b></div></div>'],
  ['store-preview-title', '<div class="tab_preview"><span class="tab_title">Preview title</span></div>'],
  ['store-subtitle', '<div class="home_page_body_ctn"><div class="home_section_subtitle">Featured tags</div></div>'],
  ['bundle-label', '<div class="game_area_purchase_game"><span class="bundle_label">Bundle</span></div>'],
  ['bundle-tooltip', '<div class="game_area_purchase_game"><span class="bundle_label"><span class="bundle_label_tooltip">Bundle details</span></span></div>'],
  ['package-content', '<div class="game_area_purchase_game"><div class="package_contents"><div>Included games</div></div></div>'],
  ['devnotes', '<div class="early_access_header"><a id="devnotes_expander">Read more</a></div>'],
  ['early-access', '<div class="early_access_banner"><p>Early access explanation</p></div>'],
  ['announcement', '<div class="early_access_announcements"><div class="_1TRFtE8IfXpDQ_loHnB_bU">All announcements</div></div>'],
  ['modern-price', '<div class="CapsuleBottomBar"><div class="StoreSalePriceWidgetContainer"><div class="kauOU9QnW8Fs0QpxzTBph">Final price</div></div></div>'],
  ['modern-original-price', '<div class="StoreSalePriceWidgetContainer"><div class="_1odBXcjq8-Q8SFXViJa7c6">Original price</div></div>'],
  ['modern-discount', '<div class="StoreSalePriceWidgetContainer"><div class="StoreSaleDiscountBox">-50%</div></div>'],
  ['notification-read', '<div class="_2Szzh5sKyGgnLUR870zbDE RtSv39ZoBOySnb8XQ5hJf"><span class="native-label">Read notification</span></div>'],
  ['notification-unread', '<div class="_2Szzh5sKyGgnLUR870zbDE RtSv39ZoBOySnb8XQ5hJf _3L1c8C0o_xXzPy26aoLBFd"><span class="native-label">Unread notification</span></div>'],
  ['menu-label', '<div class="contextMenu"><div class="contextMenuItem"><span class="native-label">Menu item</span></div></div>'],
  ['dropdown-label', '<div class="DialogDropDownMenu"><div class="DialogDropDownMenu_Item"><span class="native-label">Option</span></div></div>'],
  ['primary-detail', '<button class="DialogButton Primary"><span class="_3Wb9yDmYPUJksCr7HmaT9H">Primary detail</span></button>'],
  ...['_2l416KfEtI4CL0mCUEmOBw', '_3FmxxjyWNHU1PrBGnBe6tm'].map((cls, i) =>
    [`library-primary-${i}`, `<div class="${cls}"><button class="DialogButton Primary"><span>Primary action</span></button></div>`]),
  ['secondary-button', '<button class="DialogButton"><span class="native-label">Secondary action</span></button>'],
  ['purchase-button', '<div class="game_purchase_action"><a class="btn_green_steamui"><span>Purchase</span></a></div>'],
  ['legacy-discount', '<div class="discount_block"><div class="discount_pct">-50%</div></div>'],
];

test('native light labels stay readable on themed surfaces in normal, hover and focus states',
  { skip: !process.env.STEAM_CDP_TEST, timeout: 30000 }, async () => {
    const nativeCss = `
        body { margin:0; } main { display:grid; grid-template-columns:repeat(5,1fr); gap:8px; }
        section { height:110px; padding:8px; background:#faf4ed; font:14px sans-serif; }
        section > * { display:block; padding:8px; } a { display:block; }
        .home_title,.home_title b,.tab_title,.tab_item_title,.early_access_banner p,._1TRFtE8IfXpDQ_loHnB_bU,.native-label { color:white; }
        #search_results_filtered_warning_persistent { background:rgba(0,0,0,.2); color:#fafad2; }
        ._3u1HeR7JRPiiuKIT78j2Cc { background:#1a9fff; color:white; }
        .tab_item_title:hover,.tab_item_title:focus,.contextMenuItem:hover .native-label { color:white; }
        .home_section_subtitle,.top_tag,.tab_item_release_date,._2890MptFADbe-IUQFQ8L1O { color:rgba(255,255,255,.55); }
        .bundle_label { color:#a4d7f5; } .bundle_label_tooltip,.package_contents div,#devnotes_expander { color:#8f98a0; }
        .CapsuleBottomBar { background:black; } .StoreSalePriceWidgetContainer { background:#344654; }
        .StoreSaleDiscountBox { background:#4c6b22; color:#beee11; }
        .kauOU9QnW8Fs0QpxzTBph { color:white; } ._1odBXcjq8-Q8SFXViJa7c6 { color:#738895; }
        ._2aVnDeExEHiUFX0zwr_BTO { background:#2c3138; }
        ._38t1mljBjmJfqjpVzMT1CG { background:#34393e; }
        ._3B8wRA4H7e_oSksYNqpSPv,._3k90ug209sE23xAMqcM74s,._1oERP7bVictkby2hP4BBva { background:#323640; }
        ._26v9mHAi56x63OwY-jxett,.h-lNlCUnCRbIcn38-Oqaw,._3hEeummFKRey8l5VXxZwxz span { color:white; }
        ._1bq4x9pa4-9RLY-dXWUZTp { background:radial-gradient(#3d4450,#23262e); }
        ._3Mbhnlk1Go2j8yCdjthzc7 { background:#0e141b; }
        .eXF8xL2LUtzeWMbK-FSRz,.TK9wvF55dyA6RcOclozC8 { color:white; }
        ._1CGnw50aAma6AYKF51Qzsm { color:#8b929a; }
        .friendlistListContainer,.chatRoomListContainer { background:radial-gradient(#212329,#1c1d22); }
        .groupName,.chatRoomName { color:#c5d6d4; } .groupCount,.in-game ._2n0EiKMGRP-r_BI5tDtttu { color:#91c257; }
        .ChatTabs,._2XZq-_f6npaQdAgeRzKIkz { background:#3a3e46; } .chatHeader { background:linear-gradient(to right,#3a3e46,#2c3037); }
        ._3Ule3rolhZJiBN4yNNtk1s { background:#1b1c20; } .RVIs84dAE6wHcjH9tkinc { background:#2c3036; color:#c9c9c9; }
        .chatMessageBody { color:#dfe3e6; }
    `;
    const html = `<main>${cases.map(([id, content]) => `<section id="${id}">${content}</section>`).join('')}</main>`;
    await withBrowserFixture({ html, nativeCss, viewport: { width: 1600, height: 1300 } }, async ({ evaluate, forcePseudoState }) => {
      for (const state of [[], ['hover'], ['focus', 'focus-visible']]) {
        await forcePseudoState('section *,section', state);
        const scan = await evaluate(probeExpression([]));
        const inspected = new Set(await evaluate(`(${JSON.stringify(scan.samples.filter(s => s.hasText).map(s => s.selector))}).map(selector => document.querySelector(selector).closest('section')?.id)`));
        assert.deepEqual(cases.map(([id]) => id).filter(id => !inspected.has(id)), [], 'each fixture must have a visible text sample');
        const failures = scan.samples.filter(s => s.hasText).flatMap(s => classify(s, [[40,105,131,1]])
          .map(issue => ({ selector: s.selector, ...issue })));
        assert.deepEqual(failures, [], `unreadable text in state ${state.join(',') || 'normal'}`);
      }
    });
  });
