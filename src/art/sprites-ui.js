/**
 * SHOOT! — Interface icons (Block 2d).
 *
 * The chrome of the UI — back arrows, close crosses, the help mark, the lock on
 * a private room — used to be typed characters (`◀`, `✕`, `?`, `·`). Those come
 * from the system font: they anti-alias, they change shape between platforms,
 * and next to hand-drawn 16x16 sprites they look like something the game
 * borrowed rather than something it owns.
 *
 * These are the replacements. Same 16 x 16 canvas as the item icons, same
 * palette, same 1px ink outline, so a back arrow and a coin belong to the same
 * set. Anything the interface needs to *say* with a picture is drawn here.
 */

import { PALETTE } from './palette.js';
import { bake, makeCanvas } from './pixel.js';

export const UI_ICON_SIZE = 16;

const KEY = {
  '.': null,
  k: PALETTE.ink,
  w: PALETTE.bone,
  d: PALETTE.boneDark,
  W: PALETTE.white,
  r: PALETTE.red,
  R: PALETTE.redLight,
  q: PALETTE.redDark,
  g: PALETTE.green,
  G: PALETTE.greenLight,
  o: PALETTE.gold,
  O: PALETTE.goldLight,
  y: PALETTE.goldDark,
  s: PALETTE.steel,
  S: PALETTE.steelDark,
  b: PALETTE.blue,
  B: PALETTE.blueLight,
  v: PALETTE.blueDark,
  t: PALETTE.leather,
  T: PALETTE.leatherDark,
  m: PALETTE.wood,
  M: PALETTE.woodDark,
  x: PALETTE.grey,
};

const ICONS = {
  /** Back. A chevron with weight to it, so it reads at 16px on a dark plate. */
  chevronLeft: [
    '................',
    '................',
    '..........kkk...',
    '.........kwwwk..',
    '........kwwwdk..',
    '.......kwwwdk...',
    '......kwwwdk....',
    '.....kwwwdk.....',
    '.....kwwwdk.....',
    '......kwwwdk....',
    '.......kwwwdk...',
    '........kwwwdk..',
    '.........kwwwk..',
    '..........kkk...',
    '................',
    '................',
  ],

  chevronRight: [
    '................',
    '................',
    '...kkk..........',
    '..kwwwk.........',
    '..kwwwdk........',
    '...kwwwdk.......',
    '....kwwwdk......',
    '.....kwwwdk.....',
    '.....kwwwdk.....',
    '....kwwwdk......',
    '...kwwwdk.......',
    '..kwwwdk........',
    '..kwwwk.........',
    '...kkk..........',
    '................',
    '................',
  ],

  /**
   * Down. The arrow on the game's own dropdown (see `select` in
   * src/ui/widgets.js), which is why it is a solid wedge rather than a rotated
   * chevron: it sits at the end of a field and has to read as "there is a list
   * under this" at a glance, and a thin outlined arrow at 16px does not.
   */
  chevronDown: [
    '................',
    '................',
    '................',
    '................',
    '...kkkkkkkkkk...',
    '...kwwwwwwwwk...',
    '...kdwwwwwwdk...',
    '....kdwwwwdk....',
    '.....kdwwdk.....',
    '......kddk......',
    '.......kk.......',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],

  /** Close. Two crossed planks rather than a font X. */
  close: [
    '................',
    '................',
    '..kkk......kkk..',
    '.kwwwk....kwwwk.',
    '.kwwwwk..kwwwwk.',
    '..kwwwwkkwwwwk..',
    '...kwwwwwwwwk...',
    '....kwwwwwwk....',
    '....kwwwwwwk....',
    '...kwwwwwwwwk...',
    '..kwwwwkkwwwwk..',
    '.kwwwwk..kwwwwk.',
    '.kwwwk....kwwwk.',
    '..kkk......kkk..',
    '................',
    '................',
  ],

  /** New / add. Used by the empty save slot. */
  plus: [
    '................',
    '................',
    '......kkkk......',
    '......kOOk......',
    '......kOOk......',
    '..kkkkkOOkkkkk..',
    '..kOOOOOOOOOOk..',
    '..kOOOOOOOOOOk..',
    '..kyyykOOkyyyk..',
    '......kOOk......',
    '......kOOk......',
    '......kyyk......',
    '......kkkk......',
    '................',
    '................',
    '................',
  ],

  /** The other half of a zoom control. Struck from the same bar as `plus`. */
  minus: [
    '................',
    '................',
    '................',
    '................',
    '................',
    '..kkkkkkkkkkkk..',
    '..kOOOOOOOOOOk..',
    '..kOOOOOOOOOOk..',
    '..kyyyyyyyyyyk..',
    '..kkkkkkkkkkkk..',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],

  /**
   * Recentre. A sight ring with a gap at each cardinal point, so it reads as
   * something you look *through* rather than a wheel.
   */
  crosshair: [
    '................',
    '................',
    '......kwwk......',
    '....kkkwwkkk....',
    '...kwwwkkwwwk...',
    '..kwwk....kwwk..',
    '..kwk..kk..kwk..',
    '.kwk..kwwk..kwk.',
    '.kwk..kwwk..kwk.',
    '..kwk..kk..kwk..',
    '..kwwk....kwwk..',
    '...kwwwkkwwwk...',
    '....kkkwwkkk....',
    '......kwwk......',
    '................',
    '................',
  ],

  /** Help. A stencilled question mark, punched like a sign. */
  question: [
    '................',
    '................',
    '....kkkkkk......',
    '...kwwwwwwk.....',
    '..kwwkkkkwwk....',
    '..kwwk..kwwk....',
    '..kkk...kwwk....',
    '.......kwwwk....',
    '......kwwwk.....',
    '......kwwk......',
    '......kwdk......',
    '......kkkk......',
    '................',
    '......kkkk......',
    '......kwwk......',
    '......kkkk......',
  ],

  /**
   * Edit. A carpenter's pencil laid on the diagonal: red rubber at the top,
   * a brass ferrule, the wood shaft, and the sharpened point with the graphite
   * showing at the bottom left.
   *
   * The diagonal is the whole reason it reads at 16px. Drawn upright it is a
   * grey stick and could be anything; on the 45 it has a point, and a point is
   * what says "you can change this". It hangs off the corner of the avatar on
   * the profile screen — see `.avatar-edit` in styles/menu.css.
   */
  pencil: [
    '................',
    '..........kkkk..',
    '.........kRRRk..',
    '........kRRRkk..',
    '.......kOOOkk...',
    '......kOOOkk....',
    '.....kmMMkk.....',
    '....kmMMkk......',
    '...kmMMkk.......',
    '..kmMMkk........',
    '..kwMkk.........',
    '.kwwkk..........',
    '.kxkk...........',
    '.kkk............',
    '................',
    '................',
  ],

  /** Private room. */
  lock: [
    '................',
    '.....kkkkk......',
    '....kSSSSSk.....',
    '...kSSkkkSSk....',
    '...kSk...kSk....',
    '...kSk...kSk....',
    '..kkkkkkkkkkk...',
    '..kOOOOOOOOOk...',
    '..kOOOyyyOOOk...',
    '..kOOOyyyOOOk...',
    '..kOOOOyOOOOk...',
    '..kOOOOyOOOOk...',
    '..kOyOOOOOyOk...',
    '..kkkkkkkkkkk...',
    '................',
    '................',
  ],

  /** Sheriff star. Ranks, records, anything earned. */
  star: [
    '.......kk.......',
    '.......kk.......',
    '......kOOk......',
    '......kOOk......',
    'kkkkkkkOOkkkkkkk',
    'kOOOOOOOOOOOOOOk',
    '.kOOOOOOOOOOOOk.',
    '..kOOOOOOOOOOk..',
    '...kOOOOOOOOk...',
    '...kOOOOOOOOk...',
    '...kOOOkkOOOk...',
    '..kOOOk..kOOOk..',
    '..kOOk....kOOk..',
    '.kOOk......kOOk.',
    '.kkk........kkk.',
    '................',
  ],

  /**
   * The revolver — Shoot.
   *
   * Barrel along the top, cylinder with a visible brass round in the middle,
   * grip falling away to the left. At 16px the silhouette is doing all the
   * work, so the barrel is deliberately long and the grip deliberately stubby.
   */
  revolver: [
    '................',
    '................',
    '....kk..........',
    '...kSk.kkkkkkkkk',
    '...kSkkksssssssk',
    '..kkkkkkSSSSSSSk',
    '.kssssssssSSSk..',
    '.ksoOkOosssSSk..',
    '.ksOookooOsSSk..',
    '.ksoOkOosssSSk..',
    '.kSSSSSSSSSSk...',
    '.kkTTTkkkkkk....',
    '..kTTTTk........',
    '..kTTTTk........',
    '...kTTk.........',
    '...kkk..........',
  ],

  /** The shield move. */
  shieldPlate: [
    '................',
    '..kkkkkkkkkkkk..',
    '.kBBBBBBBBBBBBk.',
    '.kBvvvvvvvvvvBk.',
    '.kBvBBBBBBBBvBk.',
    '.kBvBbbbbbbBvBk.',
    '.kBvBbbbbbbBvBk.',
    '.kBvBBBBBBBBvBk.',
    '.kBvvvvvvvvvvBk.',
    '..kBvvvvvvvvBk..',
    '...kBvvvvvvBk...',
    '....kBvvvvBk....',
    '.....kBvvBk.....',
    '......kBBk......',
    '.......kk.......',
    '................',
  ],

  /** Reload — the cylinder face, chambers loaded with brass. */
  chamber: [
    '................',
    '....kkkkkkkk....',
    '..kkSSSSSSSSkk..',
    '.kSSSSSSSSSSSSk.',
    '.kSSkkSSSSkkSSk.',
    'kSSkOOkSSkOOkSSk',
    'kSSkOOkSSkOOkSSk',
    'kSSkkkkSSkkkkSSk',
    'kSSSSSSSSSSSSSSk',
    'kSSkkkkSSkkkkSSk',
    'kSSkOOkSSkOOkSSk',
    '.kSkOOkSSkOOkSk.',
    '.kSSkkkkkkkkSSk.',
    '..kkSSSSSSSSkk..',
    '....kkkkkkkk....',
    '................',
  ],

  check: [
    '................',
    '................',
    '...........kkk..',
    '..........kGGk..',
    '.........kGGGk..',
    '..kk....kGGGk...',
    '..kGk..kGGGk....',
    '..kGGkkGGGk.....',
    '...kGGGGGk......',
    '....kGGGk.......',
    '.....kGk........',
    '......k.........',
    '................',
    '................',
    '................',
    '................',
  ],

  /** Something is not available yet. Used on the inert online controls. */
  hourglass: [
    '................',
    '...kkkkkkkkkk...',
    '...kMMMMMMMMk...',
    '....kEEEEEEk....',
    '.....kEEEEk.....',
    '......kEEk......',
    '.......kk.......',
    '.......kk.......',
    '......kEEk......',
    '.....kEEEEk.....',
    '....kEEEEEEk....',
    '...kEEEEEEEEk...',
    '...kMMMMMMMMk...',
    '...kkkkkkkkkk...',
    '................',
    '................',
  ],

  /** Trail marker — the world/place indicator in the travel band. */
  signpost: [
    '................',
    '..kkkkkkkkkkk...',
    '..kmMMMMMMMMk...',
    '..kmmmmmmmmmk...',
    '..kkkkkkkkkkk...',
    '......kmk.......',
    '..kkkkkkkkkkk...',
    '..kmMMMMMMMMk...',
    '..kmmmmmmmmmk...',
    '..kkkkkkkkkkk...',
    '......kmk.......',
    '......kmk.......',
    '......kmk.......',
    '.....kkkkk......',
    '................',
    '................',
  ],
};

// ---------------------------------------------------------------------------
// The duel shield
//
// Shielding used to be a stroked ellipse: a smooth vector curve laid over
// sprites whose every edge is a whole pixel, which read as a bug rather than a
// move. It is now two pieces of pixel art — a heater shield on the fighter's
// leading arm, matching the shieldPlate icon on the button that triggered it,
// and a chamfered aura around the body. Both are authored on the source-pixel
// grid and drawn at the same integer scale as the duellists, so nothing in the
// frame is smoother than anything else in it.
// ---------------------------------------------------------------------------

/**
 * Deliberately smaller than the 16 x 24 duellist. A shield big enough to hide
 * behind also hides the fighter, and the player needs to keep reading their
 * own character's pose while the round resolves.
 */
const SHIELD = [
  'kkkkkkkkkkk',
  'ksssssssssk',
  'ksBBBBBBBsk',
  'ksBbbbbbBsk',
  'ksBbOOObBsk',
  'ksBbOvObBsk',
  'ksBbOOObBsk',
  'ksBbbbbbBsk',
  'kSBvvvvvBSk',
  '.kSvvvvvSk.',
  '.kSSvvvSSk.',
  '..kSSvSSk..',
  '...kSSSk...',
  '....kkk....',
];

/**
 * A hexagonal ring: six straight runs and four 45-degree chamfers, every one
 * of them a whole number of pixels. Deliberately not a circle — a rasterised
 * circle at this size just looks like a failed ellipse.
 */
const SHIELD_AURA = [
  '........BBBBBB........',
  '......BB......BB......',
  '....BB..........BB....',
  '..BB..............BB..',
  'BB..................BB',
  'B....................B',
  'B....................B',
  'B....................B',
  'B....................B',
  'B....................B',
  'B....................B',
  'B....................B',
  'B....................B',
  'B....................B',
  'B....................B',
  'B....................B',
  'B....................B',
  'B....................B',
  'B....................B',
  'B....................B',
  'B....................B',
  'B....................B',
  'BB..................BB',
  '..BB..............BB..',
  '....BB..........BB....',
  '......BB......BB......',
  '........BBBBBB........',
  '......................',
];

const cache = { icons: null, shield: null, urls: new Map() };

function getUiSprites() {
  if (!cache.icons) {
    cache.icons = {};
    for (const [name, rows] of Object.entries(ICONS)) {
      cache.icons[name] = bake({ key: KEY, rows });
    }
  }
  return cache.icons;
}

/**
 * Baked shield art for the duel screen. `plate` is an 11 x 14 two-frame glint
 * cycle; `aura` is the 22 x 28 ring drawn behind it.
 */
export function getShieldSprites() {
  if (!cache.shield) {
    const lit = SHIELD.map((r) => r.replace(/B/g, 'W'));
    cache.shield = {
      plate: [bake({ key: KEY, rows: SHIELD }), bake({ key: KEY, rows: lit })],
      aura: bake({ key: KEY, rows: SHIELD_AURA }),
    };
  }
  return cache.shield;
}

export const UI_ICON_NAMES = Object.keys(ICONS);

/**
 * Data URL for a UI icon. Results are cached: these are drawn into buttons that
 * get rebuilt on every render, and re-encoding a PNG per button is wasteful.
 *
 * @param {keyof typeof ICONS} name
 * @param {number} scale integer multiple of the 16px source
 */
export function uiIconURL(name, scale = 2) {
  const cacheKey = `${name}@${scale}`;
  const hit = cache.urls.get(cacheKey);
  if (hit) return hit;

  const sprite = getUiSprites()[name];
  if (!sprite) return '';
  const size = UI_ICON_SIZE * scale;
  const { canvas, ctx } = makeCanvas(size, size);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sprite, 0, 0, size, size);
  const url = canvas.toDataURL('image/png');
  cache.urls.set(cacheKey, url);
  return url;
}
