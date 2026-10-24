import { composite, contrast, luminance } from './color.mjs';

export function classify(sample, allowedBackgrounds) {
  const issues = [];
  const bg = sample.background;
  if (sample.uncertain) return [{ kind: 'manual-review', reason: sample.uncertain }];
  if (sample.ownBackground && sample.area >= 400 && luminance(bg) < .2 &&
      !allowedBackgrounds.some(c => c.every((v, i) => i === 3 || Math.abs(v - bg[i]) < 2))) {
    issues.push({ kind: 'dark-surface', background: bg });
  }
  if (sample.hasText && !sample.disabled) {
    const ratio = contrast(composite(sample.foreground, bg), bg);
    const minimum = sample.fontSize >= 24 || (sample.fontSize >= 18.66 && sample.fontWeight >= 700) ? 3 : 4.5;
    if (ratio < minimum) issues.push({ kind: 'low-contrast', ratio: +ratio.toFixed(2), minimum });
  }
  return issues;
}

export const regions = [
  { id: 'frame', label: '主窗口', selectors: '[class*="steamdesktop_"], [class*="bottombar_"]', titles: ['Steam'] },
  { id: 'library-home', label: '库首页', selectors: '[class*="libraryhome_"], [class*="libraryhomeshowcases_"]', route: '/library/home' },
  { id: 'collections', label: '收藏夹', selectors: '[class*="collectionview_"], [class*="collectionspage_"]', route: '/library/collection' },
  { id: 'game-details', label: '游戏详情', selectors: '[class*="appdetails_"], ._2l416KfEtI4CL0mCUEmOBw, ._3FmxxjyWNHU1PrBGnBe6tm', route: '/library/app/' },
  { id: 'downloads', label: '下载', selectors: '[class*="downloads_DownloadsPage"], [class*="downloads_" ]', route: '/downloads' },
  { id: 'settings', label: '设置', selectors: '[class*="SettingsDialog"], [class*="desktopsettings_"], [class*="settings_SettingsDialog"]' },
  { id: 'menus', label: '菜单', selectors: '.contextMenu, .contextMenuContents, .ContextMenuPopup, [class*="contextmenu_"]', titles: ['Account Menu', 'Notifications Menu', 'Help Root Menu', 'Games Root Menu', 'Friends Root Menu', 'Steam Root Menu', 'View Root Menu'] },
  { id: 'store', label: '商店', selectors: 'body.v6, body.v7, .home_page_body_ctn, .game_page_background, .search_results', origin: 'https://store.steampowered.com' },
];

export function summarize(pages, base) {
  return regions.map(region => {
    const matching = pages.filter(p => p.regions?.includes(region.id) && !p.error && p.visibility === 'visible' && p.sampleCount > 0 && p.themeBase === base);
    const findings = matching.reduce((n, p) => n + p.findings.length, 0);
    const manualReview = matching.reduce((n, p) => n + p.manualReview.length, 0);
    return { ...region, status: !matching.length ? '未验证' : findings ? '疑似遗漏' : manualReview ? '需人工复核' : '本视口未发现问题',
      pages: matching.length, findings, manualReview };
  });
}
