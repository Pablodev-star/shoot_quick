/**
 * SHOOT! — The wordmark.
 *
 * The title used to be the built-in 5x7 UI font blown up eight times with a few
 * offset copies stacked behind it. That reads as "text with a shadow", not as a
 * logo: the strokes are one pixel thin at source resolution, so at title size
 * every letter is a hollow outline, and against a bright desert sky the whole
 * thing sits there with nothing separating it from the blue.
 *
 * This is a wordmark instead. Six letters drawn by hand on a 22-pixel cap
 * height, western display shapes — flared terminals, heavy 5px stems, chamfered
 * bowls — and then lit the way a piece of stamped brass would be: a hard ink
 * outline all the way round, a chiselled bevel on every edge, a gold-to-copper
 * gradient down the faces, and a solid red extrusion falling away to the
 * bottom-right so the letters have a side you can see.
 *
 * Everything below is authored in *source pixels* and painted at `SCALE` device
 * pixels each, so there is no smoothing anywhere and no sub-pixel geometry: a
 * bullet hole is a set of missing pixels, not an anti-aliased circle drawn on
 * top. That is what makes it match the sprites instead of sitting above them.
 */

import { PALETTE } from './palette.js';
import { onLanguageChange } from '../core/i18n.js';
import { makeCanvas } from './pixel.js';
import { drawText, measureText, GLYPH_H } from './font.js';

/**
 * Device pixels per source pixel.
 *
 * Chosen so the baked canvas comes out a little *narrower* than the width the
 * title screen gives it, because `image-rendering: pixelated` upscales evenly
 * and downscales by throwing rows away — at three, a one-pixel bevel survives
 * the trip to the screen on every display we care about.
 */
const SCALE = 3;

/** Cap height, in source pixels. Every glyph below is exactly this tall. */
const CAP_H = 22;

/**
 * Space between letters, and how far the extrusion falls behind the faces.
 *
 * These two are locked together. The side wall of a letter falls diagonally
 * into whatever is to its bottom-right — the next letter, or its own counter —
 * so a deep extrusion on a 6px counter simply fills the counter in and the word
 * turns into a red slab. Three is as far as these shapes take before the H
 * closes up; the tracking then has to clear the extrusion as well as the
 * letters, which is why it is twice the depth.
 */
const TRACK = 6;
const DEPTH = 3;

/* --------------------------------------------------------------------------
   The letterforms.

   Only the six characters the title needs. They are display shapes, not a
   font: `T` gets a drooping bar because it looks like a saloon sign, and `!`
   is narrow because the word ends better on a thin note than a fat one.
   -------------------------------------------------------------------------- */

const LETTERS = {
  S: [
    '....############....',
    '..################..',
    '.##################.',
    '#####..........#####',
    '#####..........#####',
    '#####...............',
    '#####...............',
    '#####...............',
    '.#####..............',
    '..################..',
    '..################..',
    '..################..',
    '...################.',
    '..............#####.',
    '...............#####',
    '...............#####',
    '#####..........#####',
    '#####..........#####',
    '.##################.',
    '..################..',
    '....############....',
    '......########......',
  ],

  H: [
    '.#######....#######.',
    '.#######....#######.',
    '..#####......#####..',
    '..#####......#####..',
    '..#####......#####..',
    '..#####......#####..',
    '..#####......#####..',
    '..#####......#####..',
    '..#####......#####..',
    '..################..',
    '..################..',
    '..################..',
    '..################..',
    '..#####......#####..',
    '..#####......#####..',
    '..#####......#####..',
    '..#####......#####..',
    '..#####......#####..',
    '..#####......#####..',
    '..#####......#####..',
    '.#######....#######.',
    '.#######....#######.',
  ],

  O: [
    '......########......',
    '....############....',
    '..################..',
    '.##################.',
    '.#####........#####.',
    '.#####........#####.',
    '.#####........#####.',
    '.#####........#####.',
    '.#####........#####.',
    '.#####........#####.',
    '.#####........#####.',
    '.#####........#####.',
    '.#####........#####.',
    '.#####........#####.',
    '.#####........#####.',
    '.#####........#####.',
    '.#####........#####.',
    '.#####........#####.',
    '.##################.',
    '..################..',
    '....############....',
    '......########......',
  ],

  T: [
    '####################',
    '####################',
    '####################',
    '###....######....###',
    '.......######.......',
    '.......######.......',
    '.......######.......',
    '.......######.......',
    '.......######.......',
    '.......######.......',
    '.......######.......',
    '.......######.......',
    '.......######.......',
    '.......######.......',
    '.......######.......',
    '.......######.......',
    '.......######.......',
    '.......######.......',
    '.......######.......',
    '.......######.......',
    '.....##########.....',
    '.....##########.....',
  ],

  '!': [
    '#########',
    '#########',
    '.#######.',
    '.#######.',
    '.#######.',
    '..#####..',
    '..#####..',
    '..#####..',
    '..#####..',
    '..#####..',
    '...###...',
    '...###...',
    '...###...',
    '..#####..',
    '..#####..',
    '.........',
    '.........',
    '.........',
    '..#####..',
    '.#######.',
    '.#######.',
    '..#####..',
  ],
};

const WORD = 'SHOOT!';

/**
 * Where the gunfire landed, in word-mask coordinates.
 *
 * A hole only reads as a hole if there is metal left all the way round it, and
 * nothing in a 22-pixel wordmark is thick enough for that: the stems are five
 * pixels, so anything big enough to look like a bullet went through cuts the
 * letter in half instead. (The old title had exactly this problem — its second
 * O had a bite out of it and read as a U.) So the letters only take edge damage
 * — grazes and chips, always eating inwards from a silhouette edge, never
 * severing a stroke — and the shots that actually went through are punched
 * through the plank below, which has the depth to hold them.
 */
const WORD_CHIPS = [
  { x: 45, y: 6, r: 1.8 },
  { x: 9, y: 1, r: 1.3 },
  { x: 2, y: 16, r: 1.1 },
  { x: 29, y: 21, r: 1.1 },
  { x: 67, y: 2, r: 1.3 },
  { x: 97, y: 12, r: 1.2 },
  { x: 104, y: 1, r: 1.3 },
  { x: 123, y: 2, r: 1.2 },
  { x: 136, y: 21, r: 1 },
];

/**
 * The two shots through the sign, in banner coordinates — the second one is
 * placed from the right edge, so it stays put if the subtitle ever changes
 * length. `cracks` are angles in radians: hairline splits running on from the
 * rim, which is what sells it as wood that was hit rather than wood that was
 * drawn with a gap in it.
 */
const BANNER_SHOTS = [
  { x: 14, y: 7, r: 3.2, cracks: [-2.3, 0.7] },
  { fromRight: 15, y: 7, r: 2.6, cracks: [1.4] },
  { x: 31, y: 1, r: 1 },
  { fromRight: 36, y: 13, r: 1.1 },
];

const SUBTITLE = 'WESTERN DUELS';
const SUB_SPACING = 3;
const BANNER_H = 15;
const BANNER_DEPTH = 2;
const BANNER_OVERHANG = 7;
const BANNER_GAP = 5;
const PAD = 2;

/* --------------------------------------------------------------------------
   Masks
   -------------------------------------------------------------------------- */

function makeMask(w, h) {
  return { w, h, px: new Uint8Array(w * h) };
}

function maskAt(m, x, y) {
  if (x < 0 || y < 0 || x >= m.w || y >= m.h) return 0;
  return m.px[y * m.w + x];
}

function maskSet(m, x, y, v) {
  if (x < 0 || y < 0 || x >= m.w || y >= m.h) return;
  m.px[y * m.w + x] = v;
}

/** Lay the six glyphs out on one grid, letter-spaced by TRACK. */
function buildWordMask() {
  const glyphs = [...WORD].map((ch) => LETTERS[ch]);
  const width = glyphs.reduce((sum, g) => sum + g[0].length, 0) + TRACK * (glyphs.length - 1);
  const mask = makeMask(width, CAP_H);

  let x = 0;
  for (const glyph of glyphs) {
    for (let gy = 0; gy < glyph.length; gy++) {
      const row = glyph[gy];
      for (let gx = 0; gx < row.length; gx++) {
        if (row[gx] === '#') maskSet(mask, x + gx, gy, 1);
      }
    }
    x += glyph[0].length + TRACK;
  }
  return mask;
}

/** Clear a filled disc of pixels — the shot itself. */
function clearDisc(mask, cx, cy, r) {
  const r2 = r * r;
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r2) maskSet(mask, x, y, 0);
    }
  }
}

/** Clear a hairline running outwards from a rim — the split the shot opened. */
function clearCrack(mask, cx, cy, r, angle, length) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  for (let t = r - 0.5; t <= r + length; t += 0.4) {
    maskSet(mask, Math.round(cx + dx * t), Math.round(cy + dy * t), 0);
  }
}

/** Apply a list of shots, grazes and chips to a mask. */
function damage(mask, marks) {
  for (const mark of marks) {
    const x = mark.fromRight === undefined ? mark.x : mask.w - mark.fromRight;
    clearDisc(mask, x, mark.y, mark.r);
    for (const angle of mark.cracks ?? []) {
      clearCrack(mask, x, mark.y, mark.r, angle, mark.r * 0.6);
    }
  }
}

/** A rounded plate with a swallowtail bitten out of each end. */
function buildBannerMask(width) {
  const mask = makeMask(width, BANNER_H);
  const mid = (BANNER_H - 1) / 2;
  for (let y = 0; y < BANNER_H; y++) {
    // The V cut is deepest on the centre line and closes at the edges; the
    // corners are shaved by a pixel so the plate reads as stamped, not sawn.
    const tail = Math.max(0, Math.round(6 - Math.abs(y - mid) * 1.1));
    const corner = y === 0 || y === BANNER_H - 1 ? 1 : 0;
    for (let x = tail + corner; x < width - tail - corner; x++) maskSet(mask, x, y, 1);
  }
  return mask;
}

/* --------------------------------------------------------------------------
   Lighting
   -------------------------------------------------------------------------- */

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Blend two palette hexes. Used to build ramps, never to invent new hues. */
function mix(a, b, t) {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const c = (x, y) => Math.round(x + (y - x) * t);
  return `rgb(${c(ar, br)},${c(ag, bg)},${c(ab, bb)})`;
}

/**
 * Build a per-row colour ramp from a list of `[position, colour]` stops, so a
 * face can be shaded down its height without any gradient object — one flat
 * colour per source pixel row, which is how pixel art shades.
 */
function buildRamp(height, stops) {
  const ramp = [];
  for (let y = 0; y < height; y++) {
    const t = height === 1 ? 0 : y / (height - 1);
    let i = 0;
    while (i < stops.length - 2 && t > stops[i + 1][0]) i++;
    const [p0, c0] = stops[i];
    const [p1, c1] = stops[i + 1];
    const span = p1 - p0 || 1;
    ramp.push(mix(c0, c1, Math.min(1, Math.max(0, (t - p0) / span))));
  }
  return ramp;
}

/**
 * Brass: hot at the top, copper at the bottom.
 *
 * The faces stay in the top half of the gold ramp on purpose. The title sits
 * over a midday desert sky, and gold that runs all the way down to `goldDark`
 * lands at the same value as the sand behind it — the darkness in the mark has
 * to come from the red side wall and the ink line, not from the faces, or the
 * word goes muddy exactly where it should be brightest.
 */
const GOLD_STYLE = {
  depth: DEPTH,
  face: (h) =>
    buildRamp(h, [
      [0, PALETTE.sandLight],
      [0.45, PALETTE.goldLight],
      [1, PALETTE.gold],
    ]),
  top: PALETTE.bone,
  bottom: PALETTE.redDark,
  left: PALETTE.bone,
  right: PALETTE.goldDark,
  extrude: [PALETTE.redDark, PALETTE.redDeep, PALETTE.woodDeep],
};

/** The banner: an oiled plank, so it reads as hung under the sign. */
const WOOD_STYLE = {
  depth: BANNER_DEPTH,
  face: (h) =>
    buildRamp(h, [
      [0, PALETTE.wood],
      [0.45, PALETTE.woodDark],
      [1, PALETTE.woodDeep],
    ]),
  top: PALETTE.woodLight,
  bottom: PALETTE.shadow,
  left: PALETTE.woodLight,
  right: PALETTE.woodDeep,
  extrude: [PALETTE.woodDeep, PALETTE.shadow],
};

/**
 * Paint a mask: outline, extrusion, faces, bevel — in that order, so each pass
 * sits on top of the one that should be behind it.
 */
function paintMask(ctx, mask, style, ox, oy) {
  const { depth, extrude } = style;
  const ramp = style.face(mask.h);
  const put = (x, y, color) => {
    ctx.fillStyle = color;
    ctx.fillRect((ox + x) * SCALE, (oy + y) * SCALE, SCALE, SCALE);
  };

  // How far behind the face a pixel sits: 0 on the face, 1..depth on the side
  // wall, -1 for empty space.
  const depthAt = (x, y) => {
    if (maskAt(mask, x, y)) return 0;
    for (let d = 1; d <= depth; d++) if (maskAt(mask, x - d, y - d)) return d;
    return -1;
  };

  // Pass 1 — the ink line around the whole silhouette, faces and side wall
  // alike. This is the single biggest reason the mark holds up over a bright
  // sky: without it, gold on pale blue has nowhere near enough separation.
  for (let y = -1; y <= mask.h + depth; y++) {
    for (let x = -1; x <= mask.w + depth; x++) {
      if (depthAt(x, y) >= 0) continue;
      let touches = false;
      for (let dy = -1; dy <= 1 && !touches; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if ((dx || dy) && depthAt(x + dx, y + dy) >= 0) {
            touches = true;
            break;
          }
        }
      }
      if (touches) put(x, y, PALETTE.shadow);
    }
  }

  // Pass 2 — the side wall, darkening as it falls away.
  for (let y = 0; y < mask.h + depth; y++) {
    for (let x = 0; x < mask.w + depth; x++) {
      const d = depthAt(x, y);
      if (d > 0) put(x, y, extrude[Math.min(d - 1, extrude.length - 1)]);
    }
  }

  // Pass 3 — the faces, plus a one-pixel bevel wherever a face meets air. Top
  // edges catch the light, bottom edges fall into shadow; because the bullet
  // holes are simply missing mask pixels, their rims get lit by the same rule
  // and read as punched through rather than painted on.
  for (let y = 0; y < mask.h; y++) {
    const base = ramp[y];
    for (let x = 0; x < mask.w; x++) {
      if (!maskAt(mask, x, y)) continue;
      let color = base;
      if (!maskAt(mask, x, y - 1)) color = mix(base, style.top, 0.72);
      else if (!maskAt(mask, x, y + 1)) color = mix(base, style.bottom, 0.6);
      else if (!maskAt(mask, x - 1, y)) color = mix(base, style.left, 0.42);
      else if (!maskAt(mask, x + 1, y)) color = mix(base, style.right, 0.38);
      put(x, y, color);
    }
  }
}

/* --------------------------------------------------------------------------
   Assembly
   -------------------------------------------------------------------------- */

let cache = null;

/**
 * The logo has words in it, and the words have a language. Baking it once and
 * keeping it forever is right — it is the most expensive picture in the game —
 * but the cache has to let go when the player changes language, or the title
 * screen keeps saying WESTERN DUELS under a Spanish menu.
 */
onLanguageChange(() => {
  cache = null;
});

/**
 * Bake the wordmark and return the canvas. Cached: it is the same picture every
 * time, and building it touches a few hundred thousand pixels.
 */
export function buildLogo() {
  if (cache) return cache;

  const word = buildWordMask();
  damage(word, WORD_CHIPS);

  const banner = buildBannerMask(word.w + BANNER_OVERHANG * 2);
  damage(banner, BANNER_SHOTS);

  const wordSilW = word.w + DEPTH;
  const bannerSilW = banner.w + BANNER_DEPTH;
  const innerW = Math.max(wordSilW, bannerSilW);

  const w = innerW + PAD * 2;
  const h = PAD * 2 + word.h + DEPTH + BANNER_GAP + banner.h + BANNER_DEPTH;
  const { canvas, ctx } = makeCanvas(w * SCALE, h * SCALE);

  const wordX = PAD + Math.round((innerW - wordSilW) / 2);
  const bannerX = PAD + Math.round((innerW - bannerSilW) / 2);
  const bannerY = PAD + word.h + DEPTH + BANNER_GAP;

  paintMask(ctx, word, GOLD_STYLE, wordX, PAD);
  paintMask(ctx, banner, WOOD_STYLE, bannerX, bannerY);

  // The subtitle rides on the plank, on the same pixel grid as everything else
  // — the built-in font is 5x7 source pixels, drawn at SCALE, so its pixels are
  // exactly the size of the wordmark's.
  const subW = measureText(SUBTITLE, SUB_SPACING);
  const subX = bannerX + Math.round((banner.w - subW) / 2);
  const subY = bannerY + Math.round((banner.h - GLYPH_H) / 2);
  drawText(ctx, SUBTITLE, subX * SCALE, subY * SCALE, {
    scale: SCALE,
    spacing: SUB_SPACING,
    color: PALETTE.goldLight,
    shadow: PALETTE.shadow,
  });

  cache = canvas;
  return canvas;
}
