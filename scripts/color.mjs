// Shared color math for classification rules, the serialized page probe and tests.
// One definition: the probe embeds these sources so the renderer and Node agree.
export function rgba(value) {
  const m = value.match(/^rgba?\(([^)]+)\)$/);
  if (!m) return null;
  const parts = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
  if (parts.length < 3 || parts.some(n => !Number.isFinite(n))) return null;
  return [...parts.slice(0, 3), parts[3] ?? 1];
}

export function composite(front, back) {
  const alpha = front[3] + back[3] * (1 - front[3]);
  return alpha === 0 ? [0, 0, 0, 0] : [
    ...front.slice(0, 3).map((c, i) => (c * front[3] + back[i] * back[3] * (1 - front[3])) / alpha), alpha,
  ];
}

export function luminance(color) {
  const linear = color.slice(0, 3).map(c => c / 255).map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4);
  return linear[0] * .2126 + linear[1] * .7152 + linear[2] * .0722;
}

export function contrast(a, b) {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}
