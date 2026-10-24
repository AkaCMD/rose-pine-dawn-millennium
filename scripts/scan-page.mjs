// scanPage is serialized into the selected Steam renderer. It calls the shared
// color helpers by name; probeExpression injects their source into the eval scope.
import { rgba, composite } from './color.mjs';

export function scanPage(regionDefinitions) {
  const styleCache = new WeakMap();
  const style = el => {
    if (!styleCache.has(el)) styleCache.set(el, getComputedStyle(el));
    return styleCache.get(el);
  };
  const visible = el => {
    const s = style(el), r = el.getBoundingClientRect();
    if (s.display === 'none' || s.visibility !== 'visible' || Number(s.opacity) === 0 ||
        r.width <= 0 || r.height <= 0 || r.bottom <= 0 || r.right <= 0 || r.top >= innerHeight || r.left >= innerWidth) return false;
    for (let parent = el.parentElement; parent; parent = parent.parentElement) {
      if (Number(style(parent).opacity) === 0 || style(parent).contentVisibility === 'hidden') return false;
    }
    const x = (Math.max(0, r.left) + Math.min(innerWidth, r.right)) / 2;
    const y = (Math.max(0, r.top) + Math.min(innerHeight, r.bottom)) / 2;
    const top = document.elementFromPoint(x, y);
    return !!top && (top === el || el.contains(top));
  };
  const locator = el => {
    const parts = [];
    for (let node = el; node && parts.length < 7; node = node.parentElement) {
      if (node.id) { parts.unshift(`#${CSS.escape(node.id)}`); break; }
      const classes = [...node.classList].slice(0, 2).map(c => `.${CSS.escape(c)}`).join('');
      const index = node.parentElement ? [...node.parentElement.children].indexOf(node) + 1 : 1;
      parts.unshift(`${node.localName}${classes}:nth-child(${index})`);
    }
    return parts.join(' > ');
  };
  const nodes = [...document.querySelectorAll('*')];
  const samples = [];
  let mediaSkipped = 0, visibleElements = 0;
  for (const el of nodes) {
    if (!visible(el)) continue;
    visibleElements++;
    if (el.closest('img, video, canvas, svg, picture')) { mediaSkipped++; continue; }
    const s = style(el), r = el.getBoundingClientRect();
    const own = rgba(s.backgroundColor);
    const hasText = [...el.childNodes].some(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
    const x = (Math.max(0, r.left) + Math.min(innerWidth, r.right)) / 2;
    const y = (Math.max(0, r.top) + Math.min(innerHeight, r.bottom)) / 2;
    const top = document.elementFromPoint(x, y);
    if (!hasText && top?.closest('img, video, canvas, svg, picture') && el.contains(top)) {
      mediaSkipped++;
      continue;
    }
    const foreground = rgba(s.color);
    if (!foreground || !own || (!hasText && own[3] === 0 && s.backgroundImage === 'none')) continue;
    let background = [0, 0, 0, 0], uncertain = null;
    for (let parent = el; parent; parent = parent.parentElement) {
      const ps = style(parent);
      if (Number(ps.opacity) < 1 || ps.filter !== 'none' || ps.mixBlendMode !== 'normal' || ps.backdropFilter !== 'none') uncertain ||= 'opacity/filter/blending';
      if (background[3] < .999) {
        if (ps.backgroundImage !== 'none') uncertain ||= 'background image or gradient';
        const color = rgba(ps.backgroundColor);
        if (color) background = composite(background, color);
      }
    }
    if (background[3] < .999) uncertain ||= 'transparent canvas background';
    samples.push({ selector: locator(el), area: Math.round(r.width * r.height),
      rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
      background, foreground, ownBackground: own[3] > 0, hasText,
      fontSize: parseFloat(s.fontSize), fontWeight: parseFloat(s.fontWeight) || 400,
      disabled: !!el.closest(':disabled, [aria-disabled="true"], .Disabled'), uncertain });
  }
  let route;
  try { route = decodeURIComponent(location.href); } catch { route = location.href; }
  const regions = regionDefinitions.filter(region =>
    (region.origin && location.origin === region.origin) ||
    (region.route && route.includes(region.route)) ||
    (region.titles?.includes(document.title)) ||
    [...document.querySelectorAll(region.selectors)].some(visible)).map(r => r.id);
  return { visibility: document.visibilityState, viewport: [innerWidth, innerHeight],
    themeBase: style(document.documentElement).getPropertyValue('--rp-base').trim(),
    regions, totalElements: nodes.length, visibleElements, mediaSkipped, samples,
    limitations: ['Current viewport only; no scrolling or interaction is performed.',
      'Pseudo-elements, shadow DOM and child frames are not inspected.',
      'Topmost center hit-testing approximates occlusion; partially exposed backgrounds and pointer-events:none elements may be missed.',
      'Non-text containers with media at the sample point preserve artwork and skip background classification.',
      'Renderer visibility does not prove a native popup window is displayed.'] };
}

// Self-contained probe expression for Runtime.evaluate: the shared color helpers
// are spliced into the eval scope so the renderer runs the exact implementation
// that classification rules and tests use.
export function probeExpression(regionDefinitions) {
  return `(() => {
    const rgba = ${rgba.toString()};
    const composite = ${composite.toString()};
    return (${scanPage.toString()})(${JSON.stringify(regionDefinitions)});
  })()`;
}
