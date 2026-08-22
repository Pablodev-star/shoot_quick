/**
 * SHOOT! — Built-in 5x7 pixel font.
 *
 * Used for anything drawn *inside* the canvas (the title logo, floating combat
 * numbers, world banners). HTML UI uses the CSS font stack instead; this exists
 * so canvas text is truly pixel-perfect instead of anti-aliased browser text.
 */

import { makeCanvas } from './pixel.js';
import { t } from '../core/i18n.js';

const G = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.###.'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
  J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#.#.#', '#..##', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  0: ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  1: ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  2: ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  3: ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  4: ['#..#.', '#..#.', '#..#.', '#####', '...#.', '...#.', '...#.'],
  5: ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  6: ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'],
  7: ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  8: ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  9: ['.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  '?': ['.###.', '#...#', '....#', '..##.', '..#..', '.....', '..#..'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.....', '..#..'],
  ',': ['.....', '.....', '.....', '.....', '.....', '..#..', '.#...'],
  ':': ['.....', '..#..', '.....', '.....', '.....', '..#..', '.....'],
  '-': ['.....', '.....', '.....', '.###.', '.....', '.....', '.....'],
  '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
  "'": ['..#..', '..#..', '.....', '.....', '.....', '.....', '.....'],
  '/': ['....#', '....#', '...#.', '..#..', '.#...', '#....', '#....'],
  '(': ['...#.', '..#..', '.#...', '.#...', '.#...', '..#..', '...#.'],
  ')': ['.#...', '..#..', '...#.', '...#.', '...#.', '..#..', '.#...'],
  '%': ['##..#', '##.#.', '..#..', '.#...', '#.##.', '..##.', '.....'],
  '*': ['.....', '#.#.#', '.###.', '#####', '.###.', '#.#.#', '.....'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],

  /**
   * SPANISH
   * -------------------------------------------------------------------------
   * Three glyphs the alphabet above cannot fake, and one rule for everything
   * else. Ñ, ¡ and ¿ carry meaning no substitute has — an N is a different
   * letter, and an upside-down mark is half of the punctuation of a Spanish
   * sentence — so they are drawn.
   *
   * The accented vowels are NOT here, and that is a decision rather than an
   * omission. This face is five pixels wide and seven tall with no room above
   * the cap line: an Á would have to lose a row of the A to carry its accent,
   * which at the sizes this font is drawn (world banners, the logo, floating
   * numbers) turns into a smudge on top of a letter. `normalise` below strips
   * them instead, which is the same compromise every set-in-caps sign in the
   * language makes, and it only ever affects canvas text — the HTML UI uses a
   * real font and keeps every accent.
   */
  'Ñ': ['.###.', '.....', '#...#', '##..#', '#.#.#', '#..##', '#...#'],
  '¡': ['..#..', '.....', '..#..', '..#..', '..#..', '..#..', '..#..'],
  '¿': ['..#..', '.....', '..#..', '.##..', '#....', '#...#', '.###.'],
};

/** Accented vowels down to their bare letters — see the note above. */
const FOLD = {
  'Á': 'A', 'À': 'A', 'Ä': 'A', 'Â': 'A',
  'É': 'E', 'È': 'E', 'Ë': 'E', 'Ê': 'E',
  'Í': 'I', 'Ì': 'I', 'Ï': 'I', 'Î': 'I',
  'Ó': 'O', 'Ò': 'O', 'Ö': 'O', 'Ô': 'O',
  'Ú': 'U', 'Ù': 'U', 'Û': 'U',
  'Ü': 'U',
  'Ç': 'C',
};

/**
 * Translate, upper-case and fold, which is what every reader of this font
 * wants.
 *
 * The translation happens here for the same reason it happens in `el` (see the
 * note at the top of src/core/dom.js): this is the one door canvas text walks
 * through, so a world banner, the logo and a floating word cannot be missed.
 *
 * It is one pass over the string rather than a chain of replaces, because it
 * runs per glyph on text drawn every frame — the floating damage numbers go
 * through here sixty times a second.
 */
function normalise(text) {
  const upper = t(String(text)).toUpperCase();
  let out = '';
  for (const ch of upper) out += FOLD[ch] || ch;
  return out;
}

export const GLYPH_W = 5;
export const GLYPH_H = 7;

/** Measure a string in source pixels (before scaling). */
export function measureText(text, letterSpacing = 1) {
  const chars = normalise(text).length;
  return chars * GLYPH_W + Math.max(0, chars - 1) * letterSpacing;
}

/**
 * Draw pixel text directly onto a context.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {number} x @param {number} y  top-left, in device pixels
 * @param {{scale?:number,color?:string,shadow?:string,spacing?:number}} opts
 */
export function drawText(ctx, text, x, y, opts = {}) {
  const scale = opts.scale ?? 2;
  const color = opts.color ?? '#ffffff';
  const spacing = opts.spacing ?? 1;
  const str = normalise(text);
  let cursor = Math.round(x);
  const top = Math.round(y);

  for (const ch of str) {
    const glyph = G[ch] || G['?'];
    for (let gy = 0; gy < glyph.length; gy++) {
      for (let gx = 0; gx < glyph[gy].length; gx++) {
        if (glyph[gy][gx] !== '#') continue;
        if (opts.shadow) {
          ctx.fillStyle = opts.shadow;
          ctx.fillRect(cursor + gx * scale + scale, top + gy * scale + scale, scale, scale);
        }
      }
    }
    cursor += (GLYPH_W + spacing) * scale;
  }

  cursor = Math.round(x);
  for (const ch of str) {
    const glyph = G[ch] || G['?'];
    ctx.fillStyle = color;
    for (let gy = 0; gy < glyph.length; gy++) {
      for (let gx = 0; gx < glyph[gy].length; gx++) {
        if (glyph[gy][gx] !== '#') continue;
        ctx.fillRect(cursor + gx * scale, top + gy * scale, scale, scale);
      }
    }
    cursor += (GLYPH_W + spacing) * scale;
  }
  return cursor - Math.round(x);
}

/** Draw pixel text centred on `cx`. */
export function drawTextCentered(ctx, text, cx, y, opts = {}) {
  const scale = opts.scale ?? 2;
  const spacing = opts.spacing ?? 1;
  const width = measureText(text, spacing) * scale;
  return drawText(ctx, text, cx - width / 2, y, opts);
}

/** Bake a string into its own canvas (handy for HTML <img> use). */
export function bakeText(text, opts = {}) {
  const scale = opts.scale ?? 2;
  const spacing = opts.spacing ?? 1;
  const pad = opts.shadow ? scale : 0;
  const w = measureText(text, spacing) * scale + pad;
  const h = GLYPH_H * scale + pad;
  const { canvas, ctx } = makeCanvas(w, h);
  drawText(ctx, text, 0, 0, opts);
  return canvas;
}
