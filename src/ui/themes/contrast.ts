/**
 * WCAG contrast helpers for theme tokens (used by the contrast test; pure, no React).
 * Colors are `#RGB`, `#RRGGBB` or `rgba(r,g,b,a)`; translucent colors are composited over a base.
 */

export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

export function parseColor(color: string): Rgba {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (hex) {
    const h =
      hex[1].length === 3
        ? hex[1]
            .split('')
            .map((c) => c + c)
            .join('')
        : hex[1];
    const n = parseInt(h, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
  }
  const rgba = /^rgba?\(([^)]+)\)$/i.exec(color.trim());
  if (rgba) {
    const [r, g, b, a = '1'] = rgba[1].split(',').map((p) => p.trim());
    return { r: Number(r), g: Number(g), b: Number(b), a: Number(a) };
  }
  throw new Error(`Unsupported color: ${color}`);
}

/** `top` painted over `base` (base must end up opaque). */
export function composite(top: string | Rgba, base: string | Rgba): Rgba {
  const t = typeof top === 'string' ? parseColor(top) : top;
  const b = typeof base === 'string' ? parseColor(base) : base;
  const a = t.a + b.a * (1 - t.a);
  if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
  const mix = (x: number, y: number) => (x * t.a + y * b.a * (1 - t.a)) / a;
  return { r: mix(t.r, b.r), g: mix(t.g, b.g), b: mix(t.b, b.b), a };
}

function channel(v: number): number {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

export function luminance(color: string | Rgba): number {
  const c = typeof color === 'string' ? parseColor(color) : color;
  return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
}

/**
 * Contrast ratio (1–21) of `fg` on `bg`. Translucent colors are composited: `bg` over `base`
 * (default white... pass the screen background), then `fg` over the result.
 */
export function contrastRatio(fg: string, bg: string, base = '#FFFFFF'): number {
  const back = composite(bg, base);
  const front = composite(fg, back);
  const l1 = luminance(front);
  const l2 = luminance(back);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}
