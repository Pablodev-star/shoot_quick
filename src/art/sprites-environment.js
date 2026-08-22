/**
 * SHOOT! — Environment art (Block 2b).
 *
 * The registry. Everything here is either *shared by every biome* or the code
 * that assembles a biome's bundle; the art itself lives one directory down, in
 * `src/art/biomes/<id>.js`.
 *
 * Shared, because they belong to the sky and to the frontier rather than to a
 * landscape:
 *
 *  1. SKY BODIES — the sun (two tones, cross-faded by elevation) and the moon
 *     (eight phases), rasterised on the same pixel grid as everything else
 *     instead of being stroked as circles.
 *  2. BUILDINGS — the shop and the inn, drawn big and blocky so they read from
 *     far away while the camera scrolls past. The only thing a biome changes
 *     about them is the ground they stand on.
 *  3. THE STORM DECK — the overcast layer the weather system fades in. Rain
 *     cloud is rain cloud wherever you are.
 *
 * The tumbleweed used to be a fourth entry on that list. It lives in
 * `env-kit.js` now, because three places want it — this registry, the menu
 * backdrop, and the desert's own ambient, which rolls one across the road —
 * and none of the three can import the other two.
 *
 * PARALLAX SPEC (consumed by src/explore/parallax.js)
 * ---------------------------------------------------------------------------
 * Every biome publishes six depth layers as a horizontally tileable canvas
 * each, plus a manifest giving each one a scroll `speed` (the fraction of the
 * camera's movement it travels at) and a `y` offset from the walk line:
 *
 *   clouds   speed 0.05   soft cloud band (a nebula, out in the void)
 *   far      speed 0.15   distant range
 *   mid      speed 0.40   middle hills / mesas
 *   dunes|hills|drifts|bank|crags|verge|shelf  speed 0.70  the rise just behind
 *                         the walk line, named for whatever it is made of.
 *                         Flagged `near: true` — that is the layer the far
 *                         prop band is planted behind
 *   ground   speed 1.00   the floor. It is NOT one speed: the renderer slices
 *                         it into depth bands and scrolls each at its own rate,
 *                         and the walk line lies PLANE_RISE rows down inside it
 *                         rather than along its top edge. See the long note in
 *                         `env-kit.js` for the geometry and for the one rule it
 *                         puts on the art (no mark may cross a band boundary)
 *   fringe   speed 1.90   the near bank, flagged `front: true` so it is drawn
 *                         after the props, the buildings and the traveller, and
 *                         `anchor: 'bottom'` so its `y` is measured from the
 *                         bottom edge of the frame instead of from the road
 *
 * The layer *names* are the biome's own — the desert's fourth layer is
 * `dunes` and the prairie's is `hills` — because the renderer only ever reads
 * them through the manifest. Layers are authored at 1x pixel scale and
 * upscaled by the renderer, so the pixel grid stays consistent with sprites.
 *
 * Every `y` above is measured from the TOP of the floor, not from the walk
 * line, so a manifest reads as a stack of things standing on the same horizon.
 *
 * A biome may also declare `landmarks` and a `buildLandmarks()` to bake them:
 * one-off silhouettes placed on their own wide world grid — the basin's
 * volcano, the prairie's barn — so the eye has something on the skyline that is
 * not back again in 320 pixels.
 *
 * On top of the layers a biome declares up to three bands of loose props, all
 * placed by the same seeded-cell machinery in `parallax.js`:
 *
 *   backdrop  { cell, y, gap, haze, hazeA, shrink, scatter } — hazed
 *             silhouettes standing behind the `near` layer. Their art is baked
 *             here, tinted, into `backdropProps`
 *   scatter   the roadside props, on the walk line
 *   clutter   litter on a much tighter `clutterCell`, drawn under the props
 *
 * ADDING A BIOME
 * ---------------------------------------------------------------------------
 * Write `src/art/biomes/<id>.js` exporting the same shape the desert and the
 * prairie do, add it to BIOME_ART below, give `src/game/biomes.js` a matching
 * entry for its weather, and point a world at it. Nothing else needs editing.
 */

import { PALETTE } from './palette.js';
import { onLanguageChange } from '../core/i18n.js';
import { bake, makeCanvas, tinted } from './pixel.js';
import { drawText, measureText, GLYPH_H } from './font.js';
import { KEY, LAYER_TILE_W, makeCloudLayer, getTumbleweedFrames } from './env-kit.js';
import { DESERT_ART } from './biomes/desert.js';
import { MEADOW_ART } from './biomes/meadow.js';
import { SNOW_ART } from './biomes/snow.js';
import { SWAMP_ART } from './biomes/swamp.js';
import { INFERNO_ART } from './biomes/inferno.js';
import { HOLLOW_ART } from './biomes/hollow.js';
import { VOID_ART } from './biomes/void.js';

export { LAYER_TILE_W };

/**
 * Every biome the art layer knows how to draw — one per world, in road order.
 *
 * The fourth layer's *name* differs from biome to biome (`dunes`, `hills`,
 * `drifts`, `bank`, `crags`, `verge`, `shelf`) and nothing outside each module
 * cares,
 * because the renderer only ever reaches layers through the manifest. That is
 * worth keeping: the name is a note to whoever reads the file about what the
 * rise in front of the horizon actually is.
 */
const BIOME_ART = {
  desert: DESERT_ART,
  meadow: MEADOW_ART,
  snow: SNOW_ART,
  swamp: SWAMP_ART,
  inferno: INFERNO_ART,
  hollow: HOLLOW_ART,
  void: VOID_ART,
};

export const DEFAULT_BIOME = 'desert';

// ---------------------------------------------------------------------------
// Sky bodies
//
// Both discs are rasterised rather than hand-typed, for one reason: they are
// the only art in the game that has to change. The sun is baked twice — a
// white-hot noon disc and a red low disc — and the renderer cross-fades between
// them by elevation. The moon is baked once per phase and walks the phases as
// the days pass.
//
// THE MOON'S DARK SIDE
// ---------------------------------------------------------------------------
// The unlit part is not drawn at all. Those pixels are transparent, so whatever
// the sky happens to be at that height shows through exactly. That is the only
// way the bite stays invisible against a gradient — a fill matched to one sky
// colour is wrong everywhere else on the screen, and wrong again a minute later
// as the day/night clock turns.
// ---------------------------------------------------------------------------

/** Source-pixel size of the sun and moon sprites. */
export const SKY_BODY_SIZE = 16;

/** How many moon phases are baked. One step per in-game day. */
export const MOON_PHASE_COUNT = 8;

/**
 * Sun tones: index 0 is the low, red sun; index 1 the high one.
 *
 * The high sun's core is a paler yellow, not white. A white centre is what a
 * camera does when it blows out an exposure, not what the sun looks like — and
 * against a palette this warm it read as a hole in the sprite.
 */
const SUN_TONES = [
  { rim: '#a83a12', body: '#e8642a', core: PALETTE.goldLight },
  { rim: PALETTE.goldDark, body: PALETTE.gold, core: '#ffea9e' },
];

function discPixels(size, plot) {
  const { canvas, ctx } = makeCanvas(size, size);
  const c = (size - 1) / 2;
  const r = size / 2 - 0.5;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - c;
      const dy = y - c;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > r) continue;
      const color = plot(dx, dy, d, r);
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return canvas;
}

/** A sun disc: rim, body, and a core highlight sitting up and to the left. */
function makeSun(tones) {
  return discPixels(SKY_BODY_SIZE, (dx, dy, d, r) => {
    if (d > r - 1.1) return tones.rim;
    const core = Math.sqrt((dx + 1.6) ** 2 + (dy + 1.6) ** 2);
    return core < r * 0.46 ? tones.core : tones.body;
  });
}

/** Source-pixel size of the halo that sits behind a sky body. */
export const SKY_GLOW_SIZE = 44;

/**
 * The halo behind the sun or the moon, as pixel art rather than a radial
 * gradient. The falloff is quantised into six steps, so the glow reads as a set
 * of concentric bands on the pixel grid instead of a smooth airbrushed blob
 * that gives away that a canvas gradient was involved.
 */
function makeGlow(color, strength) {
  const { canvas, ctx } = makeCanvas(SKY_GLOW_SIZE, SKY_GLOW_SIZE);
  const c = (SKY_GLOW_SIZE - 1) / 2;
  const r = SKY_GLOW_SIZE / 2;
  const steps = 8;
  for (let y = 0; y < SKY_GLOW_SIZE; y++) {
    for (let x = 0; x < SKY_GLOW_SIZE; x++) {
      const d = Math.sqrt((x - c) ** 2 + (y - c) ** 2) / r;
      if (d >= 1) continue;
      // A steep falloff, so the outermost band is almost nothing and the halo
      // has no visible rim where it stops.
      const falloff = (1 - d) ** 3.2;
      const band = Math.round(falloff * steps) / steps;
      if (band <= 0) continue;
      ctx.fillStyle = color;
      ctx.globalAlpha = band * strength;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  ctx.globalAlpha = 1;
  return canvas;
}

/**
 * One moon phase. `age` is 0..1 through the synodic month: 0 new, 0.25 first
 * quarter (lit on the right), 0.5 full, 0.75 last quarter (lit on the left).
 * The terminator is the projection of the disc's own circle, so the crescent
 * thins the way a real one does instead of being a circle cut by a circle.
 */
function makeMoonPhase(age) {
  const cosA = Math.cos(age * Math.PI * 2);
  const waxing = age <= 0.5;
  // Three fixed maria, in disc coordinates, so the face never rotates.
  const maria = [
    { x: -1.5, y: -2.2, r: 1.9 },
    { x: 1.8, y: 0.6, r: 2.4 },
    { x: -2.2, y: 2.4, r: 1.5 },
  ];
  return discPixels(SKY_BODY_SIZE, (dx, dy, d, r) => {
    const w = Math.sqrt(Math.max(0, r * r - dy * dy));
    const term = w * cosA;
    const lit = waxing ? dx >= term : dx <= -term;
    if (!lit) return null;
    // Limb darkening, and the same soft edge along the terminator.
    if (d > r - 1 || Math.abs(dx - (waxing ? term : -term)) < 0.9) return PALETTE.boneDark;
    for (const m of maria) {
      if (Math.sqrt((dx - m.x) ** 2 + (dy - m.y) ** 2) < m.r) return PALETTE.boneDark;
    }
    return PALETTE.bone;
  });
}

// ---------------------------------------------------------------------------
// Buildings — 60 source pixels wide, ground line on the last row.
//
// Both are false-front frontier buildings: a tall flat parapet hiding a low
// roof, a boardwalk under a porch, and a sign the player can read from across
// the screen. The shop is the wider, busier one; the inn is quieter and taller
// so the two never get mistaken for each other on the horizon.
//
// THEY ARE MEASURED AGAINST THE MAN, AND THEY USED NOT TO BE
// ---------------------------------------------------------------------------
// The first pair were 40 x 34, which is a shade over one and a third of the
// gunslinger's height, and a building a man could put his elbow on the roof of
// is not a building — it is a market stall. Every screenshot of the road had
// the same thing wrong with it and it was never the thing you noticed, because
// nothing on screen contradicted it: the props are small too.
//
// So the shop is 60 x 59 and the inn 60 x 68, which is two and a half to three
// times the traveller. That is enough to put a real storey above the porch — a
// row of lit upstairs windows over the inn, which is the whole reason anybody
// stops at one — and enough sign board to letter at 2x, so the word over the
// door is legible from the far side of the frame instead of being a smudge you
// learn by position.
//
// The only per-biome part is the apron they stand on — the last two rows,
// keyed `r` and `s`. A shop with a sand footprint dropped into a prairie was
// the one thing that gave away that the buildings had been drawn for somewhere
// else; see `structureGround` in each biome module.
// ---------------------------------------------------------------------------

const SHOP = [
  '..kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk..',
  '..kWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWk..',
  '..kXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXk..',
  '..kXwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwXk..',
  '..kXwWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWwXk..',
  '..kXwkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkwXk..',
  '..kXwkbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbkwXk..',
  '..kXwkbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbkwXk..',
  '..kXwkbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbkwXk..',
  '..kXwkbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbkwXk..',
  '..kXwkbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbkwXk..',
  '..kXwkbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbkwXk..',
  '..kXwkbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbkwXk..',
  '..kXwkbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbkwXk..',
  '..kXwkbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbkwXk..',
  '..kXwkbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbkwXk..',
  '..kXwkbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbkwXk..',
  '..kXwkbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbkwXk..',
  '..kXwkbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbkwXk..',
  '..kXwkbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbkwXk..',
  '..kXwkbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbkwXk..',
  '..kXwkbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbkwXk..',
  '..kXwkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkwXk..',
  '..kXwWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWwXk..',
  '..kXwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwXk..',
  '..kXwxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxwXk..',
  '..kXwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwXk..',
  '..kXwWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWwXk..',
  '..kXwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwXk..',
  '..kXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXk..',
  '.kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.',
  '.kWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWk.',
  '.kwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwk.',
  '.kxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxk.',
  '.kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.',
  '..WwxwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwWwx..',
  '..WwxwwwwkkkkkkkkkkkkkkwwwwwwwwwwwwwwkkkkkkkkkkkkkkwwwwWwx..',
  '..WwxwwwwkCCCCCCwCCCCCkwwwwwwwwwwwwwwkCCCCCCwCCCCCkwwwwWwx..',
  '..WwxxxxxkCCCCCCwCCCCCkxxxxxxxxxxxxxxkCCCCCCwCCCCCkxxxxWwx..',
  '..WwxwwwwkCCCCCCwCCCCCkwwwkkkkkkkkwwwkCCCCCCwCCCCCkwwwwWwx..',
  '..WwxwwwwkCCCCCCwCCCCCkwwwkXXXXXXkwwwkCCCCCCwCCCCCkwwwwWwx..',
  '..WwxwwwwkwwwwwwwwwwwwkwwwkxxxxxxkwwwkwwwwwwwwwwwwkwwwwWwx..',
  '..WwxxxxxkccccccwccccckxxxkXXXXXXkxxxkccccccwccccckxxxxWwx..',
  '..WwxwwwwkccccccwccccckwwwkXXXXXXkwwwkccccccwccccckwwwwWwx..',
  '..WwxwwwwkccccccwccccckwwwkXXXXXOkwwwkccccccwccccckwwwwWwx..',
  '..WwxwwwwkccccccwccccckwwwkXXXXXXkwwwkccccccwccccckwwwwWwx..',
  '..WwxxxxxkccccccwccccckxxxkxxxxxxkxxxkccccccwccccckxxxxWwx..',
  '..WwxwwwwkkkkkkkkkkkkkkwwwkXXXXXXkwwwkkkkkkkkkkkkkkwwwwWwx..',
  '..WwxwwwWWWWWWWWWWWWWWWWwwkXXXXXXkwwWWWWWWWWWWWWWWWWwwwWwx..',
  '..WwxwwwwwwwwwwwwwwwwwwwwwkXXXXXXkwwwwwwwwwwwwwwwwwwwwwWwx..',
  '..WwxxxxxxxxxxxxxxxxxxxxxxkXXXXXXkxxxxxxxxxxxxxxxxxxxxxWwx..',
  '..WwxwwwwwwwwwwwwwwwwwwwwwkXXXXXXkwwwwwwwwwwwwwwwwwwwwwWwx..',
  '..WwxwwwwwwwwwwwwwwwwwwwwwkkkkkkkkwwwwwwwwwwwwwwwwwwwwwWwx..',
  '.kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.',
  '.kWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWk.',
  '.kwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwk.',
  '.kxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxk.',
  '.rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr.',
  'ssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss',
];

const INN = [
  '.....kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.....',
  '.....kWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWk.....',
  '.....kXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXk.....',
  '.....kXwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwXk.....',
  '.....kXwWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWwXk.....',
  '.....kXwkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkwXk.....',
  '.....kXwkbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbkwXk.....',
  '.....kXwkbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbkwXk.....',
  '.....kXwkbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbkwXk.....',
  '.....kXwkbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbkwXk.....',
  '.....kXwkbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbkwXk.....',
  '.....kXwkbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbkwXk.....',
  '.....kXwkbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbkwXk.....',
  '.....kXwkbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbkwXk.....',
  '.....kXwkbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbkwXk.....',
  '.....kXwkbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbkwXk.....',
  '.....kXwkbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbkwXk.....',
  '.....kXwkbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbkwXk.....',
  '.....kXwkbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbkwXk.....',
  '.....kXwkbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbkwXk.....',
  '.....kXwkbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbkwXk.....',
  '.....kXwkbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbkwXk.....',
  '.....kXwkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkwXk.....',
  '.....kXwWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWwXk.....',
  '.....kXwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwXk.....',
  '.....kXwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwXk.....',
  '.....kXwwwwkkkkkkkkkkwwwwkkkkkkkkkkwwwwkkkkkkkkkkwwwwXk.....',
  '.....kXwwXWkOOOOxOOOkWXXWkOOOOxOOOkWXXWkOOOOxOOOkWXwwXk.....',
  '.....kXwxXWkOOOOxOOOkWXXWkOOOOxOOOkWXXWkOOOOxOOOkWXxwXk.....',
  '.....kXwwXWkOOOOxOOOkWXXWkOOOOxOOOkWXXWkOOOOxOOOkWXwwXk.....',
  '.....kXwwXWkooooxoookWXXWkooooxoookWXXWkooooxoookWXwwXk.....',
  '.....kXwwXWkOOOOxOOOkWXXWkOOOOxOOOkWXXWkOOOOxOOOkWXwwXk.....',
  '.....kXwwXWkOOOOxOOOkWXXWkOOOOxOOOkWXXWkOOOOxOOOkWXwwXk.....',
  '.....kXwxXWkOOOOxOOOkWXXWkOOOOxOOOkWXXWkOOOOxOOOkWXxwXk.....',
  '.....kXwwXWkOOOOxOOOkWXXWkOOOOxOOOkWXXWkOOOOxOOOkWXwwXk.....',
  '.....kXwwwwkkkkkkkkkkwwwwkkkkkkkkkkwwwwkkkkkkkkkkwwwwXk.....',
  '.....kXwwwWWWWWWWWWWWWwwWWWWWWWWWWWWwwWWWWWWWWWWWWwwwXk.....',
  '.....kXwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwXk.....',
  '.....kXwWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWwXk.....',
  '.....kXwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwXk.....',
  '.....kXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXk.....',
  '...kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk...',
  '...kWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWk...',
  '...kwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwk...',
  '...kxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxk...',
  '...kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk...',
  '....WwxwwwwwwwwwwkwwwwwwwwwwwwwwwwwwwwwwwwkwwwwwwwwwwWwx....',
  '....WwxwwwwwwwwwkOkwwwwwwwkkkkkkkkwwwwwwwkOkwwwwwwwwwWwx....',
  '....WwxwwwwwwwwkOOOkwwwwwwkXXXXXXkwwwwwwkOOOkwwwwwwwwWwx....',
  '....WwxxxxxxxxxkOoOkxxxxxxkxxxxxxkxxxxxxkOoOkxxxxxxxxWwx....',
  '....WwxwwwwwwwwwkokwwwwwwwkXOOOOXkwwwwwwwkokwwwwwwwwwWwx....',
  '....WwxwwwwwwwwwwwwwwwwwwwkXOOOOXkwwwwwwwwwwwwwwwwwwwWwx....',
  '....WwxwwwwwwwwwwwwwwwwwwwkXXXXXXkwwwwwwwwwwwwwwwwwwwWwx....',
  '....WwxxxxxxxxxxxxxxxxxxxxkXXXXXXkxxxxxxxxxxxxxxxxxxxWwx....',
  '....WwxwwwwwwwwwwwwwwwwwwwkXXXXXOkwwwwwwwwwwwwwwwwwwwWwx....',
  '....WwxwwwwwwwwwwwwwwwwwwwkxxxxxxkwwwwwwwwwwwwwwwwwwwWwx....',
  '....WwxwwwwwwwwwwwwwwwwwwwkXXXXXXkwwwwwwwwwwwwwwwwwwwWwx....',
  '....WwxxxWWWWWWWxxxxxxxxxxkXXXXXXkxxxxxxxxxxxxxxxxxxxWwx....',
  '....WwxwwxxxxxxxwwwwwwwwwwkXXXXXXkwwwwwwwwwwwwwwwwwwwWwx....',
  '....WwxwwwwwwwwwwwwwwwwwwwkXXXXXXkwwwwwwwwwwwwwwwwwwwWwx....',
  '....WwxwwxwwwwwxwwwwwwwwwwkXXXXXXkwwwwwwwwwwwwwwwwwwwWwx....',
  '....WwxxxxxxxxxxxxxxxxxxxxkkkkkkkkxxxxxxxxxxxxxxxxxxxWwx....',
  '...kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk...',
  '...kWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWk...',
  '...kwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwk...',
  '...kxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxk...',
  '..rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr..',
  '.ssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.',
];

/**
 * THE FORGE — 60 x 64, and the only roadside building with a FIRE in it.
 *
 * It used to be the inn with a different word painted on the sign, which meant
 * the road offered you a bed and a gun improvement from the same picture. A
 * smithy is not a false-front hotel: it is a shed with an open front, a stack
 * over the fire, and everything in it visible from the road because there is no
 * door on it — that is what a working forge looks like from a hundred yards,
 * and it is why the silhouette is a CHIMNEY rather than a parapet.
 *
 * Inside the shed, from the left: the furnace with its mouth, a wall of tongs
 * over a bench, and the anvil standing out where the light falls on it.
 *
 * `K` is the furnace mouth and nothing else in the art uses it. The parallax
 * renderer finds that rectangle with `FORGE_GLOW` and burns a live fire in it
 * as the building scrolls past — the one animated thing on any building in the
 * game, and the reason you can tell there is a smith working from further away
 * than you can read the sign.
 */
const FORGE = [
  '.......kkkkkkkkkkkk.........................................',
  '.......kYYYYYYYYYYk.........................................',
  '.......kkkkkkkkkkkk.........................................',
  '.......kqqqqqqqqqqk.........................................',
  '.......kq$qq$qq$qqk.........................................',
  '.......kqqqqqqqqqqk.........................................',
  '.......kq$qq$qq$qqk.........................................',
  '.......kqqqqqqqqqqk.........................................',
  '.......kq$qq$qq$qqk.........................................',
  '.....kkkkkkkkkkkkkkkk.......................................',
  '.....kqqqqqqqqqqqqqqk.......................................',
  '.....kqqqqqqqqqqqqqqk.......................................',
  '.....kqqqqqqqqqqqqqqk.......................................',
  '.....kqqqqqqqqqqqqqqk.......................................',
  '.kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.',
  '.kxxXxxxxxXxxxxxXxxxxxXxxxxxXxxxxxXxxxxxXxxxxxXxxxxxXxxxxxk.',
  '.kXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXk.',
  '.kxxxxxXxxxxxXxxxxxXxxxxxXxxxxxXxxxxxXxxxxxXxxxxxXxxxxxXxxk.',
  'kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk',
  'kWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWk',
  'kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk',
  '.kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.',
  '.kXwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwXk.',
  '.kXwBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBwXk.',
  '.kXwbbbubbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbubbbwXk.',
  '.kXwbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbwXk.',
  '.kXwbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbwXk.',
  '.kXwbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbwXk.',
  '.kXwbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbwXk.',
  '.kXwbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbwXk.',
  '.kXwbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbwXk.',
  '.kXwbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbwXk.',
  '.kXwbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbwXk.',
  '.kXwbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbwXk.',
  '.kXwbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbwXk.',
  '.kXwbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbwXk.',
  '.kXwbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbwXk.',
  '.kXwbbbubbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbubbbwXk.',
  '.kXwBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBwXk.',
  '.kXwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwXk.',
  '.kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.',
  '.kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.',
  '.kWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWk.',
  '.kxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxk.',
  '.kwx$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$xwk.',
  '.kwx$$$$$$$$$$$$$$$$$$$$$$kkkkkkkkkkkkkkkkkk$$$$$$$$$$$$xwk.',
  '.kwx$$kkkkkkkkkkkkkkkk$$$$kXXXXXXXXXXXXXXXXk$$$$$$$$$$$$xwk.',
  '.kwx$$keeeeeeeeeeeeeek$$$$kkkkkkkkkkkkkkkkkk$$$$$$$$$$$$xwk.',
  '.kwx$$kqqqqqqqqqqqqqqk$$$$$$$Y$$$Y$$$Y$$$Y$$$$$$$$$$$$$$xwk.',
  '.kwx$$kqkkkkkkkkkkkkqk$$$$$$$Y$$$Y$$$Y$$$Y$$$$$$$$$$$$$$xwk.',
  '.kwx$$kqkKKKKKKKKKKkqk$$$$$$$Y$$$Y$$$Y$$$Y$$$$$$$$$$$$$$xwk.',
  '.kwx$$kqkKKKKKKKKKKkqk$$$$$$$Y$$$Y$$$Y$$$Y$$$$$$$$$$$$$$xwk.',
  '.kwx$$kqkKKKKKKKKKKkqk$$$$$$$Y$$$Y$$$Y$$$Y$$$$kkkkkkkkkkxwk.',
  '.kwx$$kqkKKKKKKKKKKkqk$$$$$$$y$$$y$$$y$$$y$$$$kYYYYYYYYkxwk.',
  '.kwx$$kqkKKKKKKKKKKkqk$$$$$$$$$$$$$$$$$$$$$$$$kkkkkkkkkkxwk.',
  '.kwx$$kqkKKKKKKKKKKkqk$$$kkkkkkkkkkkkkkkkkkkk$$$$yyyy$$$xwk.',
  '.kwx$$kqkKKKKKKKKKKkqk$$$kWWWWWWWWWWWWWWWWWWk$$$$yyyy$$$xwk.',
  '.kwx$$kqkKKKKKKKKKKkqk$$$kxxxxxxxxxxxxxxxxxxk$$$$yyyy$$$xwk.',
  '.kwx$$kqkkkkkkkkkkkkqk$$$kxxxxxxxxxxxxxxxxxxk$$kkkkkkkk$xwk.',
  '.kwx$$keeeeeeeeeeeeeek$$$kxxxxxxxxxxxxxxxxxxk$$kyyyyyyk$xwk.',
  '.kwx$$kkkkkkkkkkkkkkkk$$$kkkkkkkkkkkkkkkkkkkk$$kkkkkkkk$xwk.',
  'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  'rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr',
  'ssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss',
];

/**
 * THE CLOTHIER — 60 x 65, and the only building on the road you can see INTO.
 *
 * The shop, the inn and the forge are all frontages: a wall, a door and a word
 * painted over it. This one has a plate-glass window with the stock standing
 * behind it, because that is what a clothing store is and always has been — the
 * whole business of the place is showing you what you could be wearing before
 * you have decided to want it. From the road you read it in this order: an
 * awning, two dressed figures in a lit window, and then the sign.
 *
 * The false front above the awning is the SHOP's, course for course. That is
 * deliberate rather than lazy: these two are the same kind of building in the
 * same street, put up by the same carpenter, and the pair of them being framed
 * identically is what makes the window underneath read as the difference
 * between them. It also means the sign is lettered off exactly the same board.
 *
 * `C` is the glass, and it is the one character in here that nothing else uses:
 * the parallax renderer finds that rectangle with `TAILOR_GLASS` and lays a warm
 * lamp glow over it as the building scrolls past, so the window is lit from
 * inside rather than being a grey panel. Measuring it off the art means a course
 * of clapboard can be added above without putting the lamp in the wall.
 */
const TAILOR = [
  '..kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk..',
  '..kWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWk..',
  '..kXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXk..',
  '..kXwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwXk..',
  '..kXwWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWwXk..',
  '..kXwkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkwXk..',
  '..kXwkbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbkwXk..',
  '..kXwkbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbkwXk..',
  '..kXwkbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbkwXk..',
  '..kXwkbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbkwXk..',
  '..kXwkbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbkwXk..',
  '..kXwkbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbkwXk..',
  '..kXwkbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbkwXk..',
  '..kXwkbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbkwXk..',
  '..kXwkbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbkwXk..',
  '..kXwkbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbkwXk..',
  '..kXwkbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbkwXk..',
  '..kXwkbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbkwXk..',
  '..kXwkbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbkwXk..',
  '..kXwkbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbkwXk..',
  '..kXwkbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbkwXk..',
  '..kXwkbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbkwXk..',
  '..kXwkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkwXk..',
  '..kXwWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWwXk..',
  '..kXwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwXk..',
  '..kXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXk..',
  '..kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk..',
  '..kddbbddbbddbbddbbddbbddbbddbbddbbddbbddbbddbbddbbddbbddk..',
  '..kbbddbbddbbddbbddbbddbbddbbddbbddbbddbbddbbddbbddbbddbbk..',
  '..kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk..',
  '...kWkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkWk..',
  '...kWkCCC.....kkkk.....CCCkkkkkkkkkkCCC.....kkkk.....CCCWk..',
  '...kWkCCC....kTTTTk....CCCkWWWWWWWWkCCC....kzzzzk....CCCWk..',
  '...kWkCCC...kTTTTTTk...CCCkWwwwwwwWkCCC...kzzzzzzk...CCCWk..',
  '...kWkCCC..kkTTTTTTkk..CCCkWwwwwwwWkCCC..kkzzzzzzkk..CCCWk..',
  '...kWkCCC.....kssk.....CCCkWwwwwwwWkCCC.....kssk.....CCCWk..',
  '...kWkCCC.....ksskk....CCCkWwwwwwwWkCCC.....ksskk....CCCWk..',
  '...kWkCCC....kkkkkk....CCCkWwwwwwwWkCCC....kkkkkk....CCCWk..',
  '...kWkCCC...keeeeeek...CCCkWwwwwwwWkCCC...k000000k...CCCWk..',
  '...kWkCCC..keeeqeeeek..CCCkWwwwwwwWkCCC..k000D0000k..CCCWk..',
  '...kWkCCC..keeeqeeeek..CCCkWwwwwwwWkCCC..k000D0000k..CCCWk..',
  '...kWkCCC..keeeqeeeek..CCCkWwwwwwwWkCCC..k000D0000k..CCCWk..',
  '...kWkCCC..keeeqeeeek..CCCkWwwwwwwWkCCC..k000D0000k..CCCWk..',
  '...kWkCCC..keeeeeeeek..CCCkWwwwwwwWkCCC..k00000000k..CCCWk..',
  '...kWkCCC.keeeeeeeeeek.CCCkWwwwOwwWkCCC.k0000000000k.CCCWk..',
  '...kWkCCC.kqqqqqqqqqqk.CCCkWwwwwwwWkCCC.kDDDDDDDDDDk.CCCWk..',
  '...kWkCCC.kkkkkkkkkkkk.CCCkWwwwwwwWkCCC.kkkkkkkkkkkk.CCCWk..',
  '...kWkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkWk..',
  '...kWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWk..',
  '...kxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxk..',
  '..kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.',
  '..kWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWk.',
  '..kwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwk.',
  '..kxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxk.',
  '..kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.',
  '..WwxwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwWwx.',
  '..WwxwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwWwx.',
  '..WwxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxWwx.',
  '..WwxwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwWwx.',
  '..WwxwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwWwx.',
  '...kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk..',
  '...kWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWk..',
  '...kxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxk..',
  '..rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr..',
  'ssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss',
];

/**
 * The sign boards above are left blank in the art and lettered here, using the
 * game's own 5x7 font at 2x. Hand-drawn letters at this size come out as
 * approximations of the real typeface; borrowing the font means the sign over
 * the shop and the text in the shop screen are literally the same glyphs.
 *
 * `board` is the blank panel in building coordinates — the word is centred in
 * it both ways, so nudging the art never means recounting a magic offset.
 */
const SIGNS = {
  shop: { text: 'SHOP', board: { x: 6, y: 6, w: 48, h: 16 } },
  inn: { text: 'INN', board: { x: 9, y: 6, w: 42, h: 16 } },
  /**
   * Five letters at 2x is 58 source pixels with the usual one-pixel gap, on a
   * building that is 60 wide — so the forge's sign is the one place in the game
   * that closes the letter spacing up. Painted signs are lettered tight; this
   * one has to be.
   */
  forge: { text: 'FORGE', spacing: 0, board: { x: 4, y: 24, w: 52, h: 16 } },
  /**
   * Four letters, because four at 2x is 40 source pixels and the board's cream
   * panel is 44 wide — five would run off it into the frame (which is exactly
   * what the first draft of this sign did). It is period slang for clothes, and
   * the sign is not what tells you what this place is anyway: the window under
   * it is, with two dressed figures standing in the light.
   */
  tailor: { text: 'DUDS', board: { x: 6, y: 6, w: 48, h: 16 } },
};

/** Painted, not carved: the letters get a highlight under them. */
const SIGN_SCALE = 2;

/**
 * The furnace mouth in the forge's art, in building coordinates, found by
 * looking for the `K` region rather than written down beside it.
 *
 * The parallax renderer burns a live fire into this rectangle as the building
 * goes past (see `drawStructures`), and a fire drawn outside the hole would
 * paint over the brickwork the sprite already laid down. Measuring the art
 * means editing a course of brick above can never put the fire in the wall.
 */
export const FORGE_GLOW = (() => {
  let x0 = Infinity;
  let x1 = -1;
  let y0 = Infinity;
  let y1 = -1;
  FORGE.forEach((row, y) => {
    const first = row.indexOf('K');
    if (first < 0) return;
    x0 = Math.min(x0, first);
    x1 = Math.max(x1, row.lastIndexOf('K'));
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  });
  return x1 < 0 ? { x: 0, y: 0, w: 0, h: 0 } : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
})();

/** Where the chimney comes out of the roof, for the smoke off it. */
export const FORGE_CHIMNEY = { x: 12, y: 0 };

/**
 * The clothier's window, measured off its own art the same way — the `C`
 * region. The renderer lays a lamp glow over exactly this rectangle as the
 * building scrolls past, so the stock behind the glass looks lit rather than
 * painted, and a clapboard added above it can never put the lamp in the wall.
 */
export const TAILOR_GLASS = (() => {
  let x0 = Infinity;
  let x1 = -1;
  let y0 = Infinity;
  let y1 = -1;
  TAILOR.forEach((row, y) => {
    const first = row.indexOf('C');
    if (first < 0) return;
    x0 = Math.min(x0, first);
    x1 = Math.max(x1, row.lastIndexOf('C'));
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  });
  return x1 < 0 ? { x: 0, y: 0, w: 0, h: 0 } : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
})();

function bakeBuilding(rows, sign, groundKey) {
  const canvas = bake({ key: groundKey ? { ...KEY, ...groundKey } : KEY, rows });
  const ctx = canvas.getContext('2d');
  const { board } = sign;
  const spacing = sign.spacing ?? 1;
  const width = measureText(sign.text, spacing) * SIGN_SCALE;
  const x = board.x + Math.floor((board.w - width) / 2);
  const y = board.y + Math.floor((board.h - GLYPH_H * SIGN_SCALE) / 2);
  // A one-pixel shadow under the word, in the same wood the frame is: paint on
  // a board catches the light along its lower edge, and without it the word
  // sits on the bone like a decal.
  drawText(ctx, sign.text, x, y + 1, {
    scale: SIGN_SCALE,
    spacing,
    color: PALETTE.boneDark,
  });
  drawText(ctx, sign.text, x, y, {
    scale: SIGN_SCALE,
    spacing,
    color: PALETTE.woodDeep,
  });
  return canvas;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Baked once and shared: the sky is the same sky over every biome. */
let skyCache = null;

function getSkyArt() {
  if (skyCache) return skyCache;
  skyCache = {
    /** Low (red) and high (white) sun, cross-faded by elevation. */
    sun: [makeSun(SUN_TONES[0]), makeSun(SUN_TONES[1])],
    /**
     * One canvas per phase. The range stops short of new moon at both ends:
     * a night with literally no moon in it reads as a missing sprite, not as
     * astronomy. Phase 4 of 8 is full.
     */
    moon: Array.from({ length: MOON_PHASE_COUNT }, (_, i) =>
      makeMoonPhase(0.12 + (i / MOON_PHASE_COUNT) * 0.76),
    ),
    /** Halos: [low sun, high sun] and the moon's colder, tighter one. */
    glow: [makeGlow('#ff9a4c', 0.55), makeGlow('#ffd766', 0.34)],
    moonGlow: makeGlow('#b9c9ff', 0.26),
  };
  return skyCache;
}

/**
 * The overcast deck. Not in any manifest — the parallax renderer fades it in
 * on top of the biome's own cloud band, by how much weather is out.
 */
let stormCache = null;

function getStormLayer() {
  if (!stormCache) {
    stormCache = makeCloudLayer({
      seed: 3391,
      height: 72,
      count: 11,
      size: [5, 11],
      sag: 3,
      tones: [PALETTE.grey, PALETTE.greyDark, '#2b2b33'],
    });
  }
  return stormCache;
}

const bundles = new Map();

/**
 * The signs over the shop, the inn, the forge and the clothier are TEXT, baked
 * into the building sprite in the game's pixel font. So a bundle is only good
 * for as long as the language it was baked in — drop the lot when that changes
 * and the next biome the road asks for rebuilds with the right words on it.
 */
onLanguageChange(() => {
  bundles.clear();
});

/**
 * Everything the parallax renderer needs to draw one biome.
 *
 * Bundles are built on first use and cached forever: a run that walks from the
 * desert into the prairie and back pays for each biome's art exactly once, and
 * the desert's bundle is the one the menu backdrop is already holding.
 *
 * @param {string} [biomeId] defaults to the desert
 */
export function getEnvironmentSprites(biomeId = DEFAULT_BIOME) {
  const art = BIOME_ART[biomeId] || BIOME_ART[DEFAULT_BIOME];
  const cached = bundles.get(art.id);
  if (cached) return cached;

  /**
   * Everything a biome declares passes straight through — `id`, `manifest`,
   * `scatter`, `scatterCell`, `groundFill`, `dust` — so adding a field to a
   * biome module never needs a matching line in here to carry it. It was a
   * missing line of exactly that kind that stranded the prairie on the
   * desert's scatter spacing when `scatterCell` was first added.
   *
   * Only the build-time entries are named, and they are pulled OUT of the
   * pass-through rather than copied into it: two of them are called here and
   * their results replace them, and the third is only meaningful while the
   * buildings are being baked.
   */
  const {
    props: propRows,
    buildLayers,
    buildLandmarks,
    ambient,
    structureGround,
    ...declared
  } = art;

  const props = {};
  for (const [name, rows] of Object.entries(propRows)) props[name] = bake({ key: KEY, rows });

  /**
   * The far band's art. Same props, washed with the biome's own haze before
   * anything is drawn with them.
   *
   * The wash is baked rather than applied per frame for the obvious reason —
   * it is the same wash every time — and the colour is the biome's, never a
   * neutral grey: distance drains a landscape *towards its own sky*, so the
   * prairie's far trees go blue-green and the basin's far crags go orange. A
   * grey wash on both would have made two different places recede the same way.
   */
  const backdropProps = {};
  if (declared.backdrop) {
    const { haze, hazeA = 0.5 } = declared.backdrop;
    for (const entry of declared.backdrop.scatter) {
      const source = props[entry.name];
      if (!source) continue;
      backdropProps[entry.name] = haze ? tinted(source, haze, hazeA) : source;
    }
  }

  const bundle = {
    ...declared,
    props,
    backdropProps,
    tumbleweed: getTumbleweedFrames(),
    sky: getSkyArt(),
    buildings: {
      shop: bakeBuilding(SHOP, SIGNS.shop, structureGround),
      inn: bakeBuilding(INN, SIGNS.inn, structureGround),
      forge: bakeBuilding(FORGE, SIGNS.forge, structureGround),
      tailor: bakeBuilding(TAILOR, SIGNS.tailor, structureGround),
    },
    layers: { ...buildLayers(), storm: getStormLayer() },
    /**
     * The big single things: one canvas each, drawn once every few hundred
     * paces from the `landmarks` table rather than tiled into a layer. A biome
     * with nothing worth recognising on its horizon builds none.
     */
    landmarkArt: buildLandmarks ? buildLandmarks() : null,
    /** Factory for the biome's drifting life, or null if it has none. */
    createAmbient: ambient,
  };
  bundles.set(art.id, bundle);
  return bundle;
}
