/**
 * SHOOT! — The Dusk Totem, at the size it is actually looked at.
 *
 * Every other item in the game is a sixteen-pixel icon and never needs to be
 * anything else: it sits on a shop counter, in a saddlebag grid, on a badge
 * under a fighter. This one has a scene of its own — the black screen you get
 * instead of a game over (see src/ui/totem.js) — where it floats alone in the
 * frame at ten times that size and then comes apart in your hands. Sixteen
 * pixels upscaled that far is a smudge, so the carving is drawn again here at
 * 18 x 32 with the detail that survives being the only thing on screen: horns,
 * a brow, a beak, teeth, the gold band and the chevrons cut into the shaft.
 *
 * WHY THE CRACKS ARE THEIR OWN SPRITES
 * ---------------------------------------------------------------------------
 * The totem does not have four versions. It has one, and three overlays drawn
 * on top of it in the same pixel grid at the same scale, so a fissure lands on
 * the same stone every time however far the thing has grown. Each tap of the
 * scene turns the next overlay on. The last tap does not draw a fourth; it
 * breaks the whole composed picture into shards (`shatterPieces`).
 *
 * WHAT MAKES A CRACK READ AS A CRACK AND NOT AS A LINE
 * ---------------------------------------------------------------------------
 * The first pass of this was one column of dark pixels down the face, and at
 * the size the scene draws it that is exactly what it looked like: a scratch on
 * the screen. Stone does not fail in a straight line, and a fissure is not a
 * mark on a surface — it is a hole with a distance behind it. So every crack in
 * here is built from four things at once, and it needs all four:
 *
 *   the opening   `k`, black, wandering a pixel either way as it descends
 *                 rather than running true, and never the same width for long
 *   the light     `~` and `<`, ember and magma, banked along the trailing edge
 *                 — the inside of the totem is lit, and a split lets it out
 *   the chipping  `!`, pale void-rock along the leading edge: the fresh stone
 *                 exposed where a flake came away
 *   the branches  short runs off the spine at the brow, the eyes, the mouth,
 *                 the gold band and the shaft, because a fracture propagates
 *
 * By the third overlay the core has gone white (`W`): the fissure is no longer
 * showing you the light inside, it IS the light, and the stone around it is
 * only what has not fallen off yet.
 *
 * All three overlays share one spine, so the split does not move between taps —
 * it opens. That is the whole trick of the sequence: the player is watching one
 * wound get worse, not three different totems.
 *
 * It is drawn in dusk colours on purpose: void-stone violet for the carving,
 * gold for the band, and ember for everything alive inside it. The 16px icon in
 * src/art/sprites-items.js uses the same five, so the thing in the shop and the
 * thing in the dark are recognisably one object.
 */
import { PALETTE } from './palette.js';
import { bake, makeCanvas } from './pixel.js';

/** Source size of the carving, in art pixels. */
export const TOTEM_W = 18;
export const TOTEM_H = 32;

const KEY = {
  '.': null,
  k: PALETTE.ink,
  '!': PALETTE.voidRockLight,
  '?': PALETTE.voidRock,
  '&': PALETTE.voidRockDark,
  '~': PALETTE.emberGlow,
  '<': PALETTE.magma,
  O: PALETTE.goldLight,
  o: PALETTE.gold,
  y: PALETTE.goldDark,
  W: PALETTE.white,
};

/**
 * The carving.
 *
 * Read top to bottom: two horned prongs, the crown slab, a brow, two ember
 * eyes, the beak, a mouth full of teeth, the gold band with its runes, the
 * chevroned shaft and the plinth it stands on.
 */
const BODY = [
  '....kok....kok....',
  '....kOk....kOk....',
  '....kyk....kyk....',
  '.kkkkkkkkkkkkkkkk.',
  '.k!!!!!!!!!!!!!!k.',
  '.k!!??????????!!k.',
  '.k??????????????k.',
  '.k?!!!!!!!!!!!!?k.',
  '.k??~~~????~~~??k.',
  '.k??~<~????~<~??k.',
  '.k??~~~????~~~??k.',
  '.k??????????????k.',
  '.k?????!!!!?????k.',
  '.k?????!!!!?????k.',
  '.k??????!!??????k.',
  '.k??????????????k.',
  '.k??&WWWWWWWW&??k.',
  '.k??&&&&&&&&&&??k.',
  '.k??????????????k.',
  '.kkkkkkkkkkkkkkkk.',
  '.kOOOOOOOOOOOOOOk.',
  '.kyOyyOyyOyyOyyOk.',
  '.kkkkkkkkkkkkkkkk.',
  '.k??????????????k.',
  '.k??!!!!!!!!!!??k.',
  '.k???!!!!!!!!???k.',
  '.k????!!!!!!????k.',
  '.k??????????????k.',
  '.kkkkkkkkkkkkkkkk.',
  'k&&&&&&&&&&&&&&&&k',
  'k&&&&&&&&&&&&&&&&k',
  '.kkkkkkkkkkkkkkkk.',
];

/**
 * First tap: the totem takes it, and one split opens from the crown down past
 * the mouth — a pixel wide, wandering, forking once across the left cheek and
 * once out towards the right ear. Light is already coming through it.
 */
const CRACK_ONE = [
  '..................',
  '..................',
  '..................',
  '..................',
  '.........!k<......',
  '..........k.......',
  '.........kk.k<....',
  '........!k~kk.....',
  '.........kk<......',
  '..........k.......',
  '........!kk.......',
  '.........k~.......',
  '........kk<.......',
  '......~kkkk.......',
  '........~.k.......',
  '.........kk.......',
  '........!k<.......',
  '.........kk.......',
  '..........k.......',
  '.........!k~......',
  '..................',
  '..................',
  '..................',
  '..................',
  '..................',
  '..................',
  '..................',
  '..................',
  '..................',
  '..................',
  '..................',
  '..................',
];

/**
 * Second tap: the same split, opened. The spine widens as it descends, the
 * chipping along its edge turns into missing stone, and five branches now run
 * out of it — through the brow, both cheeks, the gold band and the shaft.
 */
const CRACK_TWO = [
  '..................',
  '..................',
  '..................',
  '..................',
  '..........k~......',
  '.........!k<......',
  '..........k.......',
  '......~kkkk.......',
  '........kk<.......',
  '.........kk.......',
  '..........k~......',
  '........!kk.......',
  '.........k..kk....',
  '........!kk~.kk<..',
  '.........kkk<~....',
  '.........!kk......',
  '.........kk~......',
  '........kkk<......',
  '......kkkkkk......',
  '.....<k.~!kk~.....',
  '..........kk<.....',
  '........!kk..kk~..',
  '.........kk~kk....',
  '.........kkk<.....',
  '..........kk......',
  '........!kk~......',
  '.........kk<......',
  '.........kkk......',
  '..................',
  '..................',
  '..................',
  '..................',
];

/**
 * Third tap: the last one it survives. The core has gone white — the fissure
 * runs the full height of the carving and the stone is only what has not come
 * away yet. The next tap does not draw anything; it breaks the picture.
 */
const CRACK_THREE = [
  '..................',
  '..................',
  '..................',
  '..................',
  '..........kk~.....',
  '....~k...!kk<.....',
  '.....kkk..kk~.....',
  '.......kkkk<......',
  '.........kk~......',
  '.........kkk<.....',
  '..........kk~kk...',
  '........!kk<..kk..',
  '.........kk~..~...',
  '.......kkkWk<.....',
  '.....kkk.kkWk~....',
  '....<k.~.!kWk<kk..',
  '.....~...kWk~kk...',
  '........!kWk<.....',
  '....~k...kkWk~....',
  '.....kkk.!kWk<....',
  '.......kk.kWk~....',
  '........!kWk<.....',
  '.........kWk~.....',
  '.........kkWkkk...',
  '..........kWk~kk..',
  '....<k..!kWk<.~...',
  '.....kkk.kWk~.....',
  '.......kkkkWk<....',
  '..........kWk~....',
  '.........!kWk<....',
  '.........kkWk~....',
  '..................',
];

let cache = null;

/** The three crack overlays, in the order the taps turn them on. */
const CRACKS = [CRACK_ONE, CRACK_TWO, CRACK_THREE];

/** How many taps the totem takes before it comes apart. */
export const CRACK_STAGES = CRACKS.length;

/**
 * The baked layers, at 1x. The scene draws them at whatever size the moment
 * calls for — `imageSmoothingEnabled` is off everywhere, so upscaling keeps the
 * pixels square.
 *
 * @returns {{body: HTMLCanvasElement, cracks: HTMLCanvasElement[]}}
 */
export function getTotemArt() {
  if (cache) return cache;
  cache = {
    body: bake({ key: KEY, rows: BODY }),
    cracks: CRACKS.map((rows) => bake({ key: KEY, rows })),
  };
  return cache;
}

/**
 * The totem with `level` cracks on it, flattened into one canvas.
 *
 * Flattened rather than drawn as four layers every frame because the shatter
 * needs a single picture to cut up: a shard is a rectangle of *this*, thrown
 * across the screen, and it has to carry its share of the crack with it.
 *
 * The overlays STACK — level 3 is the body with all three drawn over it, not
 * the body with the third. Each one only ever adds to the wound: the widening
 * spine covers the hairline that came before it and the branches reach further
 * out, so what the player sees is one fissure opening rather than three
 * different pictures cutting between each other.
 *
 * @param {0|1|2|3} level how many taps have landed
 */
export function composeTotem(level = 0) {
  const art = getTotemArt();
  const { canvas, ctx } = makeCanvas(TOTEM_W, TOTEM_H);
  ctx.drawImage(art.body, 0, 0);
  for (let i = 0; i < Math.min(level, art.cracks.length); i++) {
    ctx.drawImage(art.cracks[i], 0, 0);
  }
  return canvas;
}

/**
 * Where the light gets out, in source pixels, for a totem cracked to `level`.
 *
 * The scene throws sparks and drops embers on every tap, and it used to throw
 * them from the middle of the frame — which is the one place on a totem that is
 * still solid. These are the actual ember and magma cells of the overlays that
 * are showing, so a spark leaves the carving from a hole that is really there,
 * and the deeper the crack the more places it can come from.
 *
 * @param {number} level
 * @returns {Array<{x: number, y: number, hot: boolean}>}
 */
export function crackVents(level = 0) {
  const vents = [];
  for (let i = 0; i < Math.min(level, CRACKS.length); i++) {
    CRACKS[i].forEach((row, y) => {
      [...row].forEach((ch, x) => {
        if (ch === '~' || ch === '<' || ch === 'W') vents.push({ x, y, hot: ch !== '~' });
      });
    });
  }
  return vents;
}

/**
 * Flakes knocked off the carving by a tap that did not break it.
 *
 * One or two pixels of stone each, thrown from a vent rather than from the
 * silhouette, because the point of them is that the tap moved something. They
 * are not shards: a shard is a piece of the picture with a crack drawn on it,
 * these are chips, and the totem is still whole after they have fallen.
 *
 * @param {number} level @param {number} count @param {() => number} rng
 */
export function chipFlakes(level, count = 10, rng = Math.random) {
  const vents = crackVents(level);
  if (!vents.length) return [];
  const out = [];
  for (let i = 0; i < count; i++) {
    const vent = vents[Math.floor(rng() * vents.length)];
    const dir = vent.x < TOTEM_W / 2 ? -1 : 1;
    out.push({
      x: vent.x,
      y: vent.y,
      size: rng() < 0.35 ? 2 : 1,
      hot: vent.hot || rng() < 0.4,
      vx: dir * (0.004 + rng() * 0.009),
      vy: -0.012 - rng() * 0.016,
      life: 0,
      ttl: 620 + rng() * 520,
    });
  }
  return out;
}

/**
 * Cut a composed totem into shards for the break.
 *
 * A jittered grid rather than a regular one: stone does not fail along straight
 * lines, and four by seven equal rectangles read as a chocolate bar being
 * snapped. Each piece carries where it came from (so it flies outward from the
 * middle rather than in a random direction), how fast it spins, and its own
 * slice of the source canvas.
 *
 * @param {number} cols @param {number} rows
 * @param {() => number} rng
 * @returns {Array<{sx,sy,sw,sh,vx,vy,vr,rot}>} in source pixels
 */
export function shatterPieces(cols = 4, rows = 7, rng = Math.random) {
  const pieces = [];
  // Column and row edges, nudged off the regular grid so no two shards match.
  const xs = [0];
  for (let i = 1; i < cols; i++) xs.push(Math.round((TOTEM_W / cols) * i + (rng() * 2 - 1)));
  xs.push(TOTEM_W);
  const ys = [0];
  for (let i = 1; i < rows; i++) ys.push(Math.round((TOTEM_H / rows) * i + (rng() * 2 - 1)));
  ys.push(TOTEM_H);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const sx = xs[c];
      const sy = ys[r];
      const sw = Math.max(1, xs[c + 1] - sx);
      const sh = Math.max(1, ys[r + 1] - sy);
      // Outward from the centre of the carving, with a lift on it: the totem
      // does not fall down, it goes off like something that was holding
      // pressure in.
      const dx = sx + sw / 2 - TOTEM_W / 2;
      const dy = sy + sh / 2 - TOTEM_H / 2;
      /**
       * Source pixels per millisecond, and they are small numbers on purpose:
       * a shard has to still be a recognisable piece of carved stone halfway
       * across the frame. The first pass of this threw everything off screen
       * inside a tenth of a second, which is not a totem breaking — it is a
       * totem disappearing.
       */
      const spread = 0.0035 + rng() * 0.0025;
      pieces.push({
        sx,
        sy,
        sw,
        sh,
        vx: dx * spread + (rng() * 0.008 - 0.004),
        vy: dy * spread * 0.6 - 0.022 - rng() * 0.012,
        vr: (rng() * 2 - 1) * 0.0022,
        rot: 0,
      });
    }
  }
  return pieces;
}
