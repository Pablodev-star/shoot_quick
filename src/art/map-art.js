/**
 * SHOOT! — Trail-map art.
 *
 * The Map item no longer prints a line of text: it opens a drawn map of the
 * stretch of road you are on. This file paints that map. The panel that lets
 * you drag and zoom around it is `src/ui/map-panel.js`; everything here is
 * pigment.
 *
 * IT IS THE WORLD SEEN FROM ABOVE, NOT A PIECE OF PARCHMENT
 * ---------------------------------------------------------------------------
 * The obvious way to draw a treasure map is a sheet of brown paper with a
 * squiggle on it. That is a picture of a *prop*, and it would have told the
 * player nothing about where they actually are. So the sheet is the ground
 * itself: the desert is sand, ripples and saguaro; the prairie is grass,
 * ponds and trees. Walk from world 1 into world 2 and the map changes biome
 * with the road, which is the whole point of it.
 *
 * The map furniture — the dashed road, the red X over the boss, the compass
 * rose — is the only thing on it borrowed from cartography, and it is drawn in
 * the same palette as everything else.
 *
 * THE GROUND HAS A SHAPE, NOT A COLOUR
 * ---------------------------------------------------------------------------
 * The first version of this map painted a flat fill and dropped seventy soft
 * ellipses on it. From above that reads as a *stain*: there is no high ground,
 * no hollow, nothing for the road to be going around. So the ground is now a
 * height field — four octaves of value noise, built once per map — and every
 * pass reads from it:
 *
 *   COLOUR   the elevation picks a step of the biome's own five-colour ramp,
 *            Bayer-dithered between steps so the ramp reads as one continuous
 *            landscape and still resolves to five flat colours up close.
 *   RELIEF   the slope of the field lightens ground that faces the sun and
 *            darkens ground that turns away from it. One sun, top-left, over
 *            every map in the game.
 *   CONTOURS every few steps of height, a thin line of the biome's deepest
 *            tone — the one piece of real cartography on the sheet, and what
 *            makes a rise read as a rise rather than as a smudge.
 *   PLACEMENT water pools in the hollows, scrub climbs the slopes, and the
 *            props thin out on the high ground.
 *
 * WHERE THE SCENERY COMES FROM
 * ---------------------------------------------------------------------------
 * Nothing here draws a cactus or a tree. The props scattered over the map are
 * the biome's own roadside props, pulled straight out of the bundle the
 * parallax renderer uses (`getEnvironmentSprites`), placed in profile the way a
 * pictorial map has always drawn its forests and its hills. That means a new
 * biome gets a new map for free: write `src/art/biomes/<id>.js`, and its map is
 * its own props on its own ground.
 *
 * Every world has its own landscape now, so every world has its own map: sand,
 * grass, snow, black water, basalt, grave earth, and the shelf out past the
 * last horizon.
 * What differs between them is only the TERRAIN entry below and the props the
 * bundle hands over — no map code is aware of any particular place. The three
 * things that separate one world's sheet from another's are all data: which
 * five colours the ramp is made of, which *detail passes* run over it (arroyos,
 * ice cracks, magma fissures, astral veins are one routine with four colour
 * sets), and whether there is running water on it.
 */

import { PALETTE } from './palette.js';
import { bake, makeCanvas } from './pixel.js';
import { drawTextCentered, measureText } from './font.js';
import { KEY } from './env-kit.js';
import { makeRng } from '../core/rng.js';
import { getEnvironmentSprites } from './sprites-environment.js';

/**
 * The markers are drawn with the shared environment key and nothing else.
 *
 * There used to be a MAP_KEY here: the shared key plus six letters of its own
 * for white, shadow and three blues. Half of them were never used by any
 * marker, and when the last four biomes arrived every one of those letters had
 * been claimed by a landscape — so the map was quietly baking `L` as shadow
 * while the bayou was baking it as bog water, which is precisely the thing the
 * shared key exists to prevent. The two colours the markers actually needed are
 * both already in the key (`1` is white, `k` is the game's hole colour), so the
 * override is gone rather than renamed.
 */

/** Source size of every marker. They are square so they can be centred blind. */
export const MARKER_SIZE = 16;

/**
 * The markers.
 *
 * Each one is a *picture of the thing*, not a symbol standing in for it: a
 * store with an awning, a house with a lit lantern, crossed revolvers, a skull
 * in a hat. A map legend you have to learn is a map you read twice.
 *
 * Every one of them is drawn against an ink edge, because a marker has to land
 * on six different grounds. A white-walled store reads beautifully on sand and
 * disappears completely on snow; the same store with a dark rim reads on both,
 * and the rim is what makes the pin look printed on the map rather than mixed
 * into it.
 */
const MARKERS = {
  /** Trailhead: the signpost the road starts at — a board, a post, an arm. */
  start: [
    '................',
    '...kkkkkkkkkk...',
    '...kWWWWWWWWk...',
    '...kWXXXXXXWk...',
    '...kWXWWWWXWk...',
    '...kWXXXXXXWk...',
    '...kWWWWWWWWk...',
    '...kkkkWWkkkk...',
    '......kWWk......',
    '......kWWkkkkk..',
    '......kWWWWWWk..',
    '......kWWkkkkk..',
    '......kWWk......',
    '.....zrRRrz.....',
    '.....zkkkkz.....',
    '................',
  ],

  /**
   * A duel: two revolvers crossed, grips down and out.
   *
   * Every barrel carries an ink edge down its right side. It is the one marker
   * without a silhouette of its own — a shop is a box and a skull is a skull,
   * but two thin bars of steel laid on pale sand simply disappear, and the ink
   * is what gives them an outline to be read against.
   */
  duel: [
    '..kk........kk..',
    '.kYYk......kYYk.',
    '..kYYk....kYYk..',
    '...kYYk..kYYk...',
    '....kYYkkYYk....',
    '.....kYYYYk.....',
    '......kYYk......',
    '.....kYYYYk.....',
    '....kYYkkYYk....',
    '...kYYk..kYYk...',
    '..kyyk....kyyk..',
    '..kttk....kttk..',
    '..kTTk....kTTk..',
    '..kTTk....kTTk..',
    '...kk......kk...',
    '................',
  ],

  /** A shop: false front, striped awning, two windows, a barrel by the door. */
  shop: [
    '................',
    '....kkkkkkkk....',
    '...kWWWWWWWWk...',
    '...kWXXXXXXWk...',
    '...kWXOOOOXWk...',
    '...kWXXXXXXWk...',
    '..kWWWWWWWWWWk..',
    '..ke1e1e1e1e1k..',
    '..kkkkkkkkkkkk..',
    '..kWcCcWkkWWWk..',
    '..kWcCcWkOoOWk..',
    '..kWWWWWkOoOWk..',
    '..kWWWWWkkkWWk..',
    '..kWtTtWWWWWWk..',
    '..kMMMMMMMMMMk..',
    '..kkkkkkkkkkkk..',
  ],

  /** An inn: pitched roof, chimney with smoke, and a lantern left burning. */
  inn: [
    '.....y..........',
    '....yy.kk.......',
    '.....y.kXk......',
    '....kkkXXkkk....',
    '...kqqqqqqqqk...',
    '..kqqqqqqqqqqk..',
    '.kqqqqqqqqqqqqk.',
    'kkkkkkkkkkkkkkkk',
    '.kWcCcWkkOoOWWk.',
    '.kWcCcWkkOoOWWk.',
    '.kWWWWWkkkkWWWk.',
    '.kWWXXXWWWWWWWk.',
    '.kWWXXXWWtTtWWk.',
    '.kMMMMMMMMMMMMk.',
    '.kkkkkkkkkkkkkk.',
    '................',
  ],

  /**
   * A forge: the shed, seen from the road. A stack with smoke coming off it, a
   * roof, the furnace mouth burning under it and the anvil standing beside it.
   *
   * It used to be a floating anvil with two grey ticks over it and an orange
   * bar behind, which on the sheet read as a lump of rock. Every other marker
   * on this map is a PLACE — a store with an awning, a house with a lantern —
   * and the forge is the one place on the road where something is being made,
   * so it is drawn as the building with the fire lit in it.
   */
  forge: [
    '.....y..........',
    '....y.kk........',
    '.....ykqqk......',
    '..kkkkqqkkkkk...',
    '.kXXXXXXXXXXXk..',
    'kXXXXXXXXXXXXXk.',
    'kkkkkkkkkkkkkkkk',
    'kWWWWWWWWWWWWWWk',
    'kkkkkkkkkkkkkkkk',
    'kk<~<kkkkYYkkkkk',
    'k<~O~<kkkYYYkkkk',
    'k<~~~<kkkkYkkkkk',
    'kk<~<kkkkkYkkkkk',
    'kkkkkkkkkMMMkkkk',
    'kMMMMMMMMMMMMMMk',
    'kkkkkkkkkkkkkkkk',
  ],

  /**
   * The clothier: a false front with a lit shop window under a striped awning,
   * and a dressed figure standing in the glass.
   *
   * It has to be told from the general store at a glance on a sheet where both
   * are sixteen pixels, so the two differ where a map marker can afford to: the
   * store is a box with two dark windows and a barrel, this is a box with ONE
   * big pale window and something standing in it. Light where the other is
   * dark, and one shape instead of two.
   */
  tailor: [
    '................',
    '....kkkkkkkk....',
    '...kWWWWWWWWk...',
    '...kWXXXXXXWk...',
    '...kWXOOOOXWk...',
    '...kWXXXXXXWk...',
    '..kWWWWWWWWWWk..',
    '..ke1e1e1e1e1k..',
    '..kkkkkkkkkkkk..',
    '..kW111111111k..',
    '..kW11kek1111k..',
    '..kW1keeek111k..',
    '..kW1keeek111k..',
    '..kW11keek111k..',
    '..kMMMMMMMMMMk..',
    '..kkkkkkkkkkkk..',
  ],

  /**
   * A stop nobody has reached yet: the trailhead's own signboard, blank except
   * for a question mark burned into it.
   *
   * It is deliberately the SAME board the road starts on rather than a symbol
   * of its own. Every other marker on this map is a picture of a place, and
   * the one thing this cannot be a picture of is the place — so it is a
   * picture of the sign that would be telling you, standing there with nothing
   * written on it yet.
   */
  unknown: [
    '................',
    '...kkkkkkkkkk...',
    '...kWWWWWWWWk...',
    '...kWX1111XWk...',
    '...kW11..11Wk...',
    '...kWXX..11Wk...',
    '...kWXX111XWk...',
    '...kWXX11XXWk...',
    '...kWXXXXXXWk...',
    '...kWXX11XXWk...',
    '...kWWWWWWWWk...',
    '...kkkkWWkkkk...',
    '......kWWk......',
    '......kWWk......',
    '.....zrRRrz.....',
    '.....zkkkkz.....',
  ],

  /** The boss: a skull wearing the hat, with the band and a jaw under it. */
  boss: [
    '................',
    '....kkkkkkkk....',
    '...kkkkkkkkkk...',
    '...kk111111kk...',
    '.kkkkkkkkkkkkkk.',
    '.kkkkkkkkkkkkkk.',
    '...kbbbbbbbbk...',
    '..kbbbbbbbbbbk..',
    '..kbkkbbbbkkbk..',
    '..kbkkbbbbkkbk..',
    '..kbbbbkkbbbbk..',
    '...kbbbbbbbbk...',
    '...kbkbkbkbbk...',
    '....kbbbbbbk....',
    '.....kkkkkk.....',
    '................',
  ],
};

/** Baked markers, cached per scale — the panel only ever asks for one. */
const markerCache = new Map();

/**
 * @param {number} scale multiple of the 16px source
 * @returns {Record<string, HTMLCanvasElement>}
 */
export function getMapMarkers(scale = 2) {
  const cached = markerCache.get(scale);
  if (cached) return cached;
  const baked = {};
  for (const [name, rows] of Object.entries(MARKERS)) {
    baked[name] = bake({ key: KEY, rows }, scale);
  }
  markerCache.set(scale, baked);
  return baked;
}

// ---------------------------------------------------------------------------
// Ground
// ---------------------------------------------------------------------------

/**
 * How each biome's ground looks from above.
 *
 * `ramp` is the whole landscape: five steps of the biome's own family, light to
 * dark, and every square inch of ground is one of them. It is the same ramp the
 * side-on art uses, so a map of the prairie and a walk through the prairie are
 * the same five greens.
 *
 * `base` is where the flat ground sits on that ramp, `spread` how much of it a
 * map actually uses — how hilly the country is — and `relief` how hard the sun
 * rakes across it. The three together are the difference between a plain and a
 * broken one, and `base` is the one that has to be right first: the ramps run
 * from the brightest colour in the game to nearly black, and a map that centres
 * itself on the middle step is a map of the same country at dusk.
 *
 * `ripples` and `blades` pick which texture pass runs over the top: sand and
 * snow lie in wind-blown arcs, grass and reed stand up in short strokes, and
 * swapping the two is the fastest way to make a biome look like the other one
 * wearing a filter.
 *
 * `veins` is the one routine four worlds share and no two use the same way: a
 * wandering, branching, tapering crack. In the desert it is a dry wash cut into
 * the sand, in the pass an ice fracture, in the basin a fissure with magma
 * still in it, and out past the last horizon a seam of astral light. Same walk,
 * four colour sets, and a `glow` where the crack is lit from inside.
 *
 * `ponds` is how many pools of standing water to try to place, `river` whether
 * there is running water, and `water` says what either is made of. A prairie
 * pond is blue because it is holding the sky; a bayou pool is black because it
 * is holding nothing, and the basin's "ponds" are lava. Same routine, three
 * completely different readings — which is exactly the split that made it worth
 * passing the colours in rather than writing a second painter.
 */
const POND_WATER = {
  rim: PALETTE.grassDark,
  body: PALETTE.blueDark,
  top: PALETTE.blue,
  glint: PALETTE.blueLight,
  reed: PALETTE.grassDark,
};
const TERRAIN = {
  desert: {
    ramp: [PALETTE.sandLight, PALETTE.sand, PALETTE.sandMid, PALETTE.sandDark, PALETTE.sandDeep],
    base: 0.26,
    spread: 1.35,
    relief: 0.95,
    contour: { every: 0.1, color: PALETTE.sandDeep, alpha: 0.16 },
    grit: [PALETTE.sandMid, PALETTE.sandDark],
    road: { worn: PALETTE.sandMid, dash: PALETTE.sandDeep, lit: PALETTE.sandLight },
    clearing: PALETTE.sandMid,
    range: { body: PALETTE.sandDark, light: PALETTE.sandMid, dark: PALETTE.sandDeep },
    edge: PALETTE.sandDeep,
    ripples: true,
    ponds: 0,
    /**
     * Dry washes: the water that is not here any more. Pale sand in the bed of
     * them, cut banks either side — from above a wash is a *lighter* line than
     * the ground it runs through, which is the one thing that keeps it from
     * reading as a crack in dried mud.
     */
    veins: {
      count: 7,
      length: [90, 210],
      width: 3,
      core: PALETTE.sandLight,
      edge: PALETTE.sandDark,
      lip: PALETTE.sandDeep,
      wander: 0.13,
      branch: 0.5,
    },
    /** Stone breaking the surface where the sand is thinnest. */
    outcrops: { count: 12, body: PALETTE.sandDark, light: PALETTE.sandMid, dark: PALETTE.sandDeep },
  },

  meadow: {
    ramp: [PALETTE.grassLight, PALETTE.grass, PALETTE.grassMid, PALETTE.grassDark, PALETTE.grassDeep],
    base: 0.28,
    spread: 1.2,
    relief: 0.9,
    contour: { every: 0.12, color: PALETTE.grassDeep, alpha: 0.12 },
    grit: [PALETTE.grassMid, PALETTE.grassDark],
    road: { worn: PALETTE.soilLight, dash: PALETTE.soilDeep, lit: PALETTE.soil },
    clearing: PALETTE.soil,
    range: { body: PALETTE.hillHaze, light: PALETTE.hillHazeLight, dark: PALETTE.hillHazeDark },
    edge: PALETTE.grassDeep,
    blades: true,
    ponds: 2,
    river: { width: [5, 9], water: POND_WATER, bank: PALETTE.soilLight, reeds: PALETTE.grassDark },
    water: POND_WATER,
    blooms: [PALETTE.bloomPink, PALETTE.bloomBlue, PALETTE.bloomCream],
    outcrops: { count: 6, body: PALETTE.grey, light: PALETTE.boneDark, dark: PALETTE.greyDark },
  },

  /**
   * The pass. Ripples rather than blades — wind does the same thing to snow
   * that it does to sand, and sastrugi from above are the desert's arcs in a
   * colder ramp. The range along the top is the only place on any map where
   * the peaks are lighter than the ground they stand on.
   */
  snow: {
    ramp: [PALETTE.snowLight, PALETTE.snow, PALETTE.snowMid, PALETTE.snowShade, PALETTE.snowDeep],
    base: 0.19,
    spread: 1.25,
    relief: 1.1,
    contour: { every: 0.11, color: PALETTE.snowDeep, alpha: 0.14 },
    grit: [PALETTE.snowMid, PALETTE.snowShade],
    road: { worn: PALETTE.snowMid, dash: PALETTE.snowDeep, lit: PALETTE.snowLight },
    clearing: PALETTE.snowMid,
    range: { body: PALETTE.snowShade, light: PALETTE.snowLight, dark: PALETTE.snowDeep, cap: PALETTE.snowLight },
    edge: PALETTE.snowDeep,
    ripples: true,
    ponds: 3,
    water: {
      rim: PALETTE.snowShade,
      body: PALETTE.iceDark,
      top: PALETTE.ice,
      glint: PALETTE.iceLight,
      reed: PALETTE.snowDeep,
    },
    /**
     * Fractures, running where the snow is thin enough to show the ice under
     * it. The straightest cracks on any map and the most branched: ice splits,
     * it does not meander.
     */
    veins: {
      count: 10,
      length: [50, 130],
      width: 1.6,
      core: PALETTE.iceLight,
      edge: PALETTE.ice,
      lip: PALETTE.snowDeep,
      wander: 0.07,
      branch: 0.9,
    },
    outcrops: { count: 10, body: PALETTE.snowShade, light: PALETTE.snowMid, dark: PALETTE.snowDeep },
  },

  /**
   * The bayou. The most water of any map by a distance, and the darkest sheet
   * the panel ever shows — which is the point: it is the one map where the
   * road is easier to find than the ground is.
   */
  swamp: {
    ramp: [PALETTE.bogLight, PALETTE.bog, PALETTE.bogDark, PALETTE.bogDeep, PALETTE.ink],
    base: 0.3,
    spread: 1,
    relief: 0.8,
    contour: { every: 0.13, color: PALETTE.bogDeep, alpha: 0.14 },
    grit: [PALETTE.bogDark, PALETTE.grassDeep],
    road: { worn: PALETTE.soil, dash: PALETTE.soilDeep, lit: PALETTE.soilLight },
    clearing: PALETTE.soilDark,
    range: { body: PALETTE.bogHaze, light: PALETTE.lichen, dark: PALETTE.bogDark },
    edge: PALETTE.bogDeep,
    blades: true,
    blooms: [PALETTE.algae, PALETTE.lichen, PALETTE.bogLight],
    ponds: 7,
    river: {
      width: [8, 15],
      branches: 2,
      water: {
        rim: PALETTE.grassDeep,
        body: PALETTE.bogDark,
        top: PALETTE.bog,
        glint: PALETTE.bogLight,
        reed: PALETTE.algae,
      },
      // Mud, not the bayou's pale rot: a light bank on this dark a sheet turns
      // the channels into a second road.
      bank: PALETTE.soilDark,
      reeds: PALETTE.algae,
    },
    water: {
      rim: PALETTE.grassDeep,
      body: PALETTE.bogDeep,
      top: PALETTE.bogDark,
      glint: PALETTE.bogLight,
      reed: PALETTE.algae,
    },
    /** Fog lying in the hollows, which is where fog lies. */
    mist: { color: PALETTE.bogHaze, count: 26, alpha: 0.15 },
  },

  /** The basin, where the standing water is not water. */
  inferno: {
    ramp: [PALETTE.grey, PALETTE.charLight, PALETTE.char, PALETTE.charDark, PALETTE.shadow],
    base: 0.36,
    spread: 1.25,
    relief: 1,
    contour: { every: 0.12, color: PALETTE.shadow, alpha: 0.2 },
    grit: [PALETTE.charLight, PALETTE.charDark],
    road: { worn: PALETTE.charLight, dash: PALETTE.charDark, lit: PALETTE.grey },
    clearing: PALETTE.charLight,
    range: { body: PALETTE.charLight, light: PALETTE.grey, dark: PALETTE.charDark, glow: PALETTE.magmaDeep },
    edge: PALETTE.shadow,
    ripples: true,
    ponds: 4,
    water: {
      rim: PALETTE.charDark,
      body: PALETTE.magmaDeep,
      top: PALETTE.magma,
      glint: PALETTE.emberGlow,
      reed: PALETTE.charDark,
    },
    /** The fissures, and the only cracks in the game with fire still in them. */
    veins: {
      count: 12,
      length: [70, 210],
      width: 2.2,
      core: PALETTE.magma,
      edge: PALETTE.magmaDeep,
      lip: PALETTE.charDark,
      glow: PALETTE.magmaDeep,
      wander: 0.11,
      branch: 0.8,
    },
    outcrops: { count: 14, body: PALETTE.charDark, light: PALETTE.charLight, dark: PALETTE.shadow },
    /** Sparks over the whole basin, brightest near the fissures. */
    embers: { count: 220, colors: [PALETTE.magma, PALETTE.emberGlow, PALETTE.sulfur] },
  },


  /**
   * The Hollow. The flattest sheet the panel draws and the least contrast of
   * any of them, which is the whole picture: from above this valley is a
   * uniform grey field with a track through it and no water, no rock and no
   * colour to break it up.
   *
   * What it has instead is `craters` — reused from the void, where they are
   * meteor scars, and here they are the settled ground over the diggings. It is
   * exactly the same routine (a rim, a floor, a shadow), and it is the one
   * detail pass on this map that means anything: a field with two hundred
   * shallow round dips in it is a graveyard seen from the air, and nothing else
   * on the sheet says so.
   */
  hollow: {
    ramp: [PALETTE.pall, PALETTE.pallMid, PALETTE.gloam, PALETTE.gloamDark, PALETTE.gloamDeep],
    base: 0.3,
    spread: 1.1,
    relief: 0.85,
    contour: { every: 0.12, color: PALETTE.gloamDeep, alpha: 0.18 },
    grit: [PALETTE.gloam, PALETTE.gloamDark],
    road: { worn: PALETTE.pallMid, dash: PALETTE.gloamDeep, lit: PALETTE.pall },
    clearing: PALETTE.pallMid,
    range: { body: PALETTE.gloamDark, light: PALETTE.gloam, dark: PALETTE.gloamDeep },
    edge: PALETTE.gloamDeep,
    /** No standing water anywhere. Nothing collects out here, including rain. */
    ponds: 0,
    blades: true,
    /** The diggings, and the only thing on the sheet with a shape to it. */
    craters: { count: 34, rim: PALETTE.pall, floor: PALETTE.gloamDark, shade: PALETTE.gloamDeep },
    outcrops: { count: 8, body: PALETTE.gravewood, light: PALETTE.gravewoodLight, dark: PALETTE.gloamDeep },
    /** Ground fog lying in the low places, which out here is most of them. */
    mist: { color: PALETTE.pallMid, count: 34, alpha: 0.16 },
  },
  /**
   * The void. No ponds at all — there is nothing out there to hold a liquid —
   * and the "range" along the top edge is the far shelf, drawn in the same
   * violet it is drawn in on the road.
   */
  void: {
    ramp: [PALETTE.voidRockLight, PALETTE.voidRock, PALETTE.voidRockDark, PALETTE.cosmic, PALETTE.cosmicHigh],
    // The one map with a heavy colour wash over it — the Galaxy's violet is
    // nearly half opaque — so it is drawn with more contrast and more on it
    // than any other, purely so that there is something left after the wash.
    base: 0.26,
    spread: 1.5,
    relief: 1,
    contour: { every: 0.12, color: PALETTE.cosmicHigh, alpha: 0.2 },
    grit: [PALETTE.voidRockLight, PALETTE.voidRockDark],
    road: { worn: PALETTE.voidRockLight, dash: PALETTE.cosmicHigh, lit: PALETTE.astralDark },
    clearing: PALETTE.voidRockDark,
    range: { body: PALETTE.voidRockDark, light: PALETTE.voidRock, dark: PALETTE.cosmicHigh },
    edge: PALETTE.cosmicHigh,
    ripples: true,
    ponds: 0,
    /** Seams of light in the rock, and the only light out here that is not a star. */
    veins: {
      count: 16,
      length: [70, 200],
      width: 1.8,
      core: PALETTE.astralLight,
      edge: PALETTE.astral,
      lip: PALETTE.astralDark,
      glow: PALETTE.astralDark,
      wander: 0.1,
      branch: 0.9,
    },
    outcrops: { count: 12, body: PALETTE.voidRockDark, light: PALETTE.voidRock, dark: PALETTE.cosmicHigh },
    /** Craters, because nothing out here weathers — it only gets hit. */
    craters: { count: 18, rim: PALETTE.voidRockLight, floor: PALETTE.cosmic, shade: PALETTE.cosmicHigh },
    /** The sky is not above the void. It is in it. */
    stars: { count: 620, colors: [PALETTE.star, PALETTE.astralLight, PALETTE.white] },
  },
};

function getMapTerrain(biomeId) {
  return TERRAIN[biomeId] || TERRAIN.desert;
}

// ---------------------------------------------------------------------------
// The height field
// ---------------------------------------------------------------------------

/**
 * Three octaves of value noise, one float per map pixel, in 0..1.
 *
 * Value noise rather than anything cleverer because this is a 600-pixel sheet
 * seen from above: what it has to produce is broad high ground with smaller
 * folds in it, and three smoothstepped grids do that in a tenth of the code a
 * gradient noise would take. The whole field is materialised rather than
 * sampled on demand — every later pass wants its neighbours, and looking a
 * neighbour up has to be an array read, not four interpolations.
 *
 * Three and not four: the fourth octave lands at a wavelength of about ten
 * pixels, and since the relief is shaded from the *slope* of this field, a
 * ten-pixel wave is not a fold in the ground — it is grain, and it grains the
 * whole map. The finest octave here is a 25-pixel fold, which is the smallest
 * thing that still reads as a piece of country.
 */
function buildField(w, h, rng, { scale = 170, octaves = 3, gain = 0.45 } = {}) {
  const field = new Float32Array(w * h);
  let amp = 1;
  let total = 0;
  let step = scale;
  const smooth = (t) => t * t * (3 - 2 * t);

  for (let o = 0; o < octaves; o++) {
    const cols = Math.ceil(w / step) + 2;
    const rows = Math.ceil(h / step) + 2;
    const grid = new Float32Array(cols * rows);
    for (let i = 0; i < grid.length; i++) grid[i] = rng();

    for (let y = 0; y < h; y++) {
      const gy = y / step;
      const y0 = Math.floor(gy);
      const fy = smooth(gy - y0);
      const rowA = y0 * cols;
      const rowB = (y0 + 1) * cols;
      for (let x = 0; x < w; x++) {
        const gx = x / step;
        const x0 = Math.floor(gx);
        const fx = smooth(gx - x0);
        const a = grid[rowA + x0];
        const b = grid[rowA + x0 + 1];
        const c = grid[rowB + x0];
        const d = grid[rowB + x0 + 1];
        field[y * w + x] += amp * (a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy);
      }
    }
    total += amp;
    amp *= gain;
    step = Math.max(12, step * 0.42);
  }

  for (let i = 0; i < field.length; i++) field[i] /= total;
  return field;
}

/**
 * Ground, relief and contours, in one pass over the pixels.
 *
 * Doing it as an ImageData write rather than as a few thousand `fillRect`s is
 * what makes per-pixel shading affordable at all: the whole sheet is one buffer
 * and every pixel costs an array read, a compare and four stores.
 *
 * The dither is an ordered 4x4 Bayer matrix, which is the honest way to put a
 * gradient into a five-colour ramp. Rounding to the nearest step instead would
 * band the map into five flat plates; blending the colours would take the map
 * out of its own palette. Dithering keeps both — a hillside is a woven mix of
 * two ramp steps, and the mix is stable because the pattern is fixed rather
 * than random.
 */
const BAYER = [
  0.03125, 0.53125, 0.15625, 0.65625,
  0.78125, 0.28125, 0.90625, 0.40625,
  0.21875, 0.71875, 0.09375, 0.59375,
  0.96875, 0.46875, 0.84375, 0.34375,
];

function paintTerrain(ctx, w, h, field, terrain) {
  const img = ctx.createImageData(w, h);
  const px = img.data;
  const ramp = terrain.ramp.map(toRgb);
  const last = ramp.length - 1;
  const base = terrain.base ?? 0.3;
  const spread = terrain.spread ?? 1.2;
  const relief = terrain.relief ?? 1;
  const contour = terrain.contour;
  const contourRgb = contour ? toRgb(contour.color) : null;
  const every = contour ? contour.every : 0;
  const blend = contour ? contour.alpha : 0;

  // The slope is measured across three pixels either side rather than one. A
  // one-pixel stencil answers "how noisy is this pixel", which shades the map
  // like sandpaper; a three-pixel one answers "which way is this hillside
  // facing", which is the question.
  const REACH = 3;

  for (let y = 0; y < h; y++) {
    const yUp = Math.max(0, y - REACH) * w;
    const yDown = Math.min(h - 1, y + REACH) * w;
    const row = y * w;
    for (let x = 0; x < w; x++) {
      const i = row + x;
      const e = field[i];
      const xLeft = Math.max(0, x - REACH);
      const xRight = Math.min(w - 1, x + REACH);
      // The sun is over the top-left corner of every map in the game. Ground
      // that falls away from it is one dither step darker; ground that rises
      // into it is one step lighter, and that is the whole of the relief.
      const light = (field[row + xLeft] - field[row + xRight]) + (field[yUp + x] - field[yDown + x]);
      // The same sun, at the scale of the whole sheet: a lift in the north-west
      // corner falling away to the south-east. It lives in this loop rather
      // than in a wash painted over the map afterwards because a wash of
      // stepped alpha rectangles leaves visible steps, and here it is simply
      // one more term in the number the dither is resolving.
      const sun = (0.5 - (x / w + y / h) / 2) * 0.2;

      // `t` is darkness, so the ramp reads light-to-dark in source order.
      const t = clamp01(base - (e - 0.5) * spread - light * relief - sun);
      const f = t * last;
      let idx = Math.floor(f);
      if (idx > last - 1) idx = last - 1;
      const step = ramp[f - idx > BAYER[(y & 3) * 4 + (x & 3)] ? idx + 1 : idx];

      let r = step[0];
      let g = step[1];
      let b = step[2];

      // Contour lines: where the elevation crosses one of the bands, in the
      // deepest tone the biome has, at a whisper. They are drawn from the raw
      // field rather than from the shaded ramp so they follow the land and not
      // the lighting.
      if (contourRgb && (band(e, every) !== band(field[row + (x > 0 ? x - 1 : 0)], every)
        || band(e, every) !== band(field[(y > 0 ? row - w : row) + x], every))) {
        r += (contourRgb[0] - r) * blend;
        g += (contourRgb[1] - g) * blend;
        b += (contourRgb[2] - b) * blend;
      }

      const o = i * 4;
      px[o] = r;
      px[o + 1] = g;
      px[o + 2] = b;
      px[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

const band = (e, every) => Math.floor(e / every);

// ---------------------------------------------------------------------------
// Texture
// ---------------------------------------------------------------------------

/**
 * Wind ripples: shallow arcs, lit on top and shadowed underneath.
 *
 * They run *along* the contour rather than along the x axis — wind piles sand
 * and snow across a slope, and arcs all lying the same way read as corduroy.
 * Long ones on the flats, short ones on the steep ground, none at all where the
 * land is steepest, which is where the rock is.
 */
function paintRipples(ctx, w, h, rng, field, terrain) {
  const lit = terrain.ramp[0];
  ctx.globalAlpha = 0.75;
  for (let i = 0; i < 260; i++) {
    const x0 = rng.int(-12, w);
    const y0 = rng.int(6, h - 7);
    const len = rng.int(10, 36);
    const amp = rng.range(1.2, 3.6);
    // The arcs lean with the ground rather than all lying the same way: a
    // field of parallel strokes reads as corduroy, not as wind. The lean is
    // the local cross-slope, and where that slope is steep there is no ripple
    // at all — wind drifts on a flat and scours a face.
    const ix = Math.max(6, Math.min(w - 7, x0));
    const rise = field[y0 * w + ix + 6] - field[y0 * w + ix - 6];
    const fall = field[(y0 + 5) * w + ix] - field[(y0 - 5) * w + ix];
    if (Math.hypot(rise, fall) > 0.12) continue;
    const slant = Math.max(-0.3, Math.min(0.3, rise * 12)) + rng.range(-0.06, 0.06);
    const dark = rng.pick(terrain.grit);
    for (let t = 0; t < len; t++) {
      const x = x0 + t;
      if (x < 0 || x >= w) continue;
      const y = Math.round(y0 - Math.sin((t / len) * Math.PI) * amp + t * slant);
      if (y < 1 || y >= h - 1) continue;
      ctx.fillStyle = dark;
      ctx.fillRect(x, y + 1, 1, 1);
      // The lit crest of the ripple is the biome's own brightest tone, never
      // sand: wind carves snow and cinder into the same arcs, and only the
      // colour of them changes from one world to the next.
      ctx.fillStyle = lit;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  ctx.globalAlpha = 1;
}

/**
 * Blades: short upright strokes, never single dots — a dot field reads as
 * static. Denser in the hollows than on the high ground, because that is where
 * the water is, and the flowers come in clumps rather than one at a time.
 */
function paintBlades(ctx, w, h, rng, field, terrain) {
  for (let i = 0; i < 5200; i++) {
    const x = rng.int(0, w - 1);
    const y = rng.int(0, h - 2);
    // Low ground grows more than high ground does.
    if (rng() < field[y * w + x] * 0.75) continue;
    ctx.fillStyle = rng.pick(terrain.grit);
    ctx.fillRect(x, y, 1, rng.int(1, 3));
  }
  if (!terrain.blooms) return;
  for (let i = 0; i < 90; i++) {
    const cx = rng.int(4, w - 5);
    const cy = rng.int(4, h - 5);
    const color = rng.pick(terrain.blooms);
    for (let k = 0, n = rng.int(3, 9); k < n; k++) {
      ctx.fillStyle = color;
      ctx.fillRect(cx + rng.int(-5, 5), cy + rng.int(-4, 4), 1, 1);
    }
  }
}

/** Grit: single pixels of the darker ramp steps, thicker on the high ground. */
function paintGrit(ctx, w, h, rng, field, terrain) {
  for (let i = 0; i < 3400; i++) {
    const x = rng.int(0, w - 1);
    const y = rng.int(0, h - 1);
    if (rng() > 0.35 + field[y * w + x] * 0.65) continue;
    ctx.fillStyle = rng.pick(terrain.grit);
    ctx.fillRect(x, y, rng.chance(0.18) ? 2 : 1, 1);
  }
}

/**
 * Whatever is cracked open: a dry wash, an ice fracture, a magma fissure, a
 * seam of astral light. One walk — step, wander, taper, occasionally split —
 * and the four of them differ only in their colours and in whether the crack
 * is lit from inside.
 *
 * They run downhill, which is what a wash does and what a fracture does not,
 * but a fracture that ignores the land looks drawn *on* the map rather than
 * *in* it, so all four of them follow the slope and only the desert's follow it
 * hard.
 */
function paintVeins(ctx, w, h, rng, field, spec, topBand, nodes) {
  const clearOfNodes = (x, y) =>
    !nodes.some((n) => Math.abs(n.x - x) < 26 && Math.abs(n.y - y) < 24);

  const walk = (x, y, dir, len, width, depth) => {
    let cx = x;
    let cy = y;
    let angle = dir;
    for (let t = 0; t < len; t++) {
      const k = 1 - t / len;
      const wid = Math.max(1, Math.round(width * (0.35 + k * 0.65)));
      if (cx < 2 || cx > w - 3 || cy < topBand - 6 || cy > h - 3) return;
      // A crack that runs under a building is a building with a crack under it
      // — so the walk carries on through and simply is not drawn there. Ending
      // it instead would be the same rule with a worse result: every crack that
      // set off towards the middle of the map would die in the middle of the
      // map, and all the cracks that survived would be out at the edges.
      const hidden = !clearOfNodes(cx, cy);

      // Downhill, gently: sample the field either side and lean the walk the
      // way the ground falls.
      const ix = Math.round(cx);
      const iy = Math.round(cy);
      const gx = field[iy * w + Math.min(w - 1, ix + 2)] - field[iy * w + Math.max(0, ix - 2)];
      const gy = field[Math.min(h - 1, iy + 2) * w + ix] - field[Math.max(0, iy - 2) * w + ix];
      angle += rng.range(-spec.wander, spec.wander) - (gx * Math.cos(angle) + gy * Math.sin(angle)) * 2.5;

      const nx = Math.cos(angle);
      const ny = Math.sin(angle);
      // Perpendicular, so the crack has a width rather than a stroke weight.
      const px = -ny;
      const py = nx;
      if (!hidden) {
        if (spec.glow) {
          ctx.globalAlpha = 0.07;
          ctx.fillStyle = spec.glow;
          fillDisc(ctx, cx, cy, wid + 2);
          ctx.globalAlpha = 1;
        }
        for (let o = -wid; o <= wid; o++) {
          const ox = Math.round(cx + px * o);
          const oy = Math.round(cy + py * o);
          const outer = Math.abs(o) >= wid - 0.5;
          ctx.fillStyle = outer ? spec.edge : spec.core;
          ctx.fillRect(ox, oy, 1, 1);
        }
        // A lip on the shaded side, so the cut has a depth to it.
        ctx.fillStyle = spec.lip;
        ctx.fillRect(Math.round(cx + px * (wid + 1)), Math.round(cy + py * (wid + 1)), 1, 1);
      }

      cx += nx;
      cy += ny;

      // One generation of side branches and no more. Let a branch branch and
      // the crack stops being a crack and becomes a shrub — which is exactly
      // what the first pass of these looked like.
      if (depth < 1 && rng.chance(spec.branch / 120)) {
        walk(cx, cy, angle + rng.pick([-0.8, 0.8]), Math.round(len * rng.range(0.25, 0.45)), width * 0.55, depth + 1);
      }
    }
  };

  for (let i = 0; i < spec.count; i++) {
    // Started on the edge of the sheet as often as inside it, so some of them
    // run off the map instead of every one beginning and ending in shot.
    const edge = rng.chance(0.45) ? rng.int(0, 3) : -1;
    const x = edge === 0 ? 4 : edge === 2 ? w - 5 : rng.int(16, w - 17);
    const y = edge === 1 ? topBand + 2 : edge === 3 ? h - 6 : rng.int(topBand + 10, h - 12);
    walk(x, y, rng.range(0, Math.PI * 2), rng.int(spec.length[0], spec.length[1]), spec.width, 0);
  }
}

/** Rock breaking the surface: a lit crown, a body, and a shadow east of it. */
function paintOutcrops(ctx, w, h, rng, field, spec, topBand, samples) {
  for (let i = 0; i < spec.count; i++) {
    const cx = rng.int(10, w - 11);
    const cy = rng.int(topBand + 8, h - 12);
    if (nearRoad(samples, cx, cy, 16)) continue;
    // Rock stands on high ground, which is where the soil has gone.
    if (field[cy * w + cx] < 0.5) continue;
    const rx = rng.int(4, 11);
    const ry = Math.max(3, Math.round(rx * rng.range(0.5, 0.85)));
    ctx.fillStyle = spec.dark;
    fillEllipse(ctx, cx + 2, cy + 2, rx, ry);
    ctx.fillStyle = spec.body;
    fillEllipse(ctx, cx, cy, rx, ry);
    ctx.fillStyle = spec.light;
    fillEllipse(ctx, cx - 1, cy - 1, Math.max(1, rx - 3), Math.max(1, ry - 2));
    // A couple of fracture lines, so it is a boulder and not a bean.
    for (let k = 0; k < 3; k++) {
      ctx.fillStyle = spec.dark;
      const fx = cx + rng.int(-rx + 2, rx - 2);
      ctx.fillRect(fx, cy - ry + 1, 1, rng.int(2, ry + 1));
    }
  }
}

/** Craters, for the one landscape that is weathered by impact and nothing else. */
function paintCraters(ctx, w, h, rng, spec, topBand, samples) {
  for (let i = 0; i < spec.count; i++) {
    const cx = rng.int(14, w - 15);
    const cy = rng.int(topBand + 10, h - 14);
    const r = rng.int(5, 16);
    if (nearRoad(samples, cx, cy, r + 12)) continue;
    const ry = Math.max(3, Math.round(r * rng.range(0.55, 0.8)));
    ctx.fillStyle = spec.rim;
    fillEllipse(ctx, cx, cy, r, ry);
    ctx.fillStyle = spec.floor;
    fillEllipse(ctx, cx, cy, r - 2, ry - 2);
    ctx.fillStyle = spec.shade;
    fillEllipse(ctx, cx + 1, cy + 1, Math.max(1, r - 4), Math.max(1, ry - 3));
  }
}

/** Sparks, drifting over the whole basin and gathering in the low ground. */
function paintEmbers(ctx, w, h, rng, field, spec, topBand) {
  for (let i = 0; i < spec.count; i++) {
    const x = rng.int(1, w - 2);
    const y = rng.int(topBand, h - 2);
    if (rng() < field[y * w + x] * 0.8) continue;
    ctx.globalAlpha = rng.range(0.35, 0.9);
    ctx.fillStyle = rng.pick(spec.colors);
    ctx.fillRect(x, y, 1, 1);
  }
  ctx.globalAlpha = 1;
}

/**
 * Stars, for the map that is being walked *through* the sky rather than under
 * it. Three sizes: a field of single pixels, a few with a cross of light on
 * them, and a wash of nebula behind the lot.
 */
function paintStars(ctx, w, h, rng, spec) {
  for (let i = 0; i < 5; i++) {
    ctx.globalAlpha = rng.range(0.05, 0.12);
    ctx.fillStyle = rng.pick([PALETTE.purple, PALETTE.astralDark, PALETTE.cosmic]);
    fillEllipse(ctx, rng.int(0, w), rng.int(0, h), rng.int(50, 130), rng.int(30, 80));
  }
  ctx.globalAlpha = 1;
  for (let i = 0; i < spec.count; i++) {
    const x = rng.int(0, w - 1);
    const y = rng.int(0, h - 1);
    ctx.globalAlpha = rng.range(0.3, 1);
    ctx.fillStyle = rng.pick(spec.colors);
    ctx.fillRect(x, y, 1, 1);
    if (rng.chance(0.06)) {
      ctx.globalAlpha = 0.6;
      ctx.fillRect(x - 1, y, 3, 1);
      ctx.fillRect(x, y - 1, 1, 3);
    }
  }
  ctx.globalAlpha = 1;
}

/** Fog in the hollows: soft, low-contrast, and never over the road. */
function paintMist(ctx, w, h, rng, field, spec, topBand, samples) {
  for (let i = 0; i < spec.count; i++) {
    const cx = rng.int(10, w - 11);
    const cy = rng.int(topBand + 6, h - 10);
    if (field[cy * w + cx] > 0.45) continue;
    if (nearRoad(samples, cx, cy, 14)) continue;
    const rx = rng.int(14, 40);
    for (let k = 0; k < 3; k++) {
      ctx.globalAlpha = spec.alpha * rng.range(0.6, 1.2);
      ctx.fillStyle = spec.color;
      fillEllipse(ctx, cx + rng.int(-12, 12), cy + rng.int(-5, 5), rx, Math.round(rx * 0.32));
    }
  }
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------------------
// Water
// ---------------------------------------------------------------------------

/**
 * Standing water. Not an ellipse: a closed loop whose radius wanders with the
 * angle, because a pond with an axis of symmetry reads as a plate. A rim one
 * step darker, glints one step lighter, and reeds around the edge so it sits
 * *in* the field rather than on top of it.
 */
function paintPond(ctx, cx, cy, rx, ry, rng, water) {
  const wob = [rng.range(0, 6.3), rng.range(0, 6.3), rng.range(0, 6.3)];
  const radius = (a) =>
    1 + 0.1 * Math.sin(a * 2 + wob[0]) + 0.07 * Math.sin(a * 3 + wob[1]) + 0.04 * Math.sin(a * 5 + wob[2]);
  const blob = (ox, oy, sx, sy, color) => {
    ctx.fillStyle = color;
    for (let y = -sy - 2; y <= sy + 2; y++) {
      // Solve the wandering radius per scanline: walk the half-width in from
      // the outside until the point is inside the loop.
      let half = 0;
      for (let x = sx + 2; x >= 0; x--) {
        const a = Math.atan2(y / Math.max(1, sy), x / Math.max(1, sx));
        const r = radius(a);
        if ((x * x) / (sx * sx) + (y * y) / (sy * sy) <= r * r) {
          half = x;
          break;
        }
      }
      if (half > 0) ctx.fillRect(Math.round(cx + ox - half), Math.round(cy + oy + y), half * 2 + 1, 1);
    }
  };

  blob(0, 0, rx + 2, ry + 2, water.rim);
  blob(0, 0, rx, ry, water.body);
  blob(0, -1, Math.max(2, rx - 3), Math.max(2, ry - 2), water.top);

  for (let i = 0; i < 7; i++) {
    ctx.fillStyle = water.glint;
    ctx.fillRect(cx + rng.int(-rx + 4, rx - 6), cy + rng.int(-ry + 2, ry - 3), rng.int(2, 6), 1);
  }
  for (let i = 0; i < 18; i++) {
    const a = rng.range(0, Math.PI * 2);
    ctx.fillStyle = water.reed;
    ctx.fillRect(
      Math.round(cx + Math.cos(a) * (rx + 1) * radius(a)),
      Math.round(cy + Math.sin(a) * (ry + 1) * radius(a)) - 3,
      1,
      4,
    );
  }
}

/**
 * Running water: a meander from one edge of the map to the other.
 *
 * The route is a straight line between two edge points with three sine waves
 * laid over it, which is exactly enough to read as a river and cheap enough to
 * try ten of and keep the one that does not run through a building. It carries
 * banks, a lit inside edge, and — where the road crosses it — a plank bridge,
 * because a road that walks over open water is the one thing on the sheet a
 * player would actually notice.
 */
function buildRiver(w, h, rng, topBand) {
  const vertical = rng.chance(0.35);
  const from = vertical
    ? { x: rng.int(60, w - 60), y: topBand - 4 }
    : { x: -6, y: rng.int(topBand + 40, h - 40) };
  const to = vertical
    ? { x: rng.int(60, w - 60), y: h + 6 }
    : { x: w + 6, y: rng.int(topBand + 40, h - 40) };

  const waves = [
    { periods: rng.range(0.7, 1.4), amp: rng.range(24, 58), phase: rng.range(0, 6.3) },
    { periods: rng.range(1.8, 3.2), amp: rng.range(8, 22), phase: rng.range(0, 6.3) },
    { periods: rng.range(4, 7), amp: rng.range(3, 8), phase: rng.range(0, 6.3) },
  ];
  const span = Math.hypot(to.x - from.x, to.y - from.y);
  const steps = Math.max(40, Math.round(span));
  const nx = (to.x - from.x) / span;
  const ny = (to.y - from.y) / span;

  const points = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    let off = 0;
    for (const wv of waves) off += Math.sin(t * Math.PI * 2 * wv.periods + wv.phase) * wv.amp;
    points.push({ x: from.x + nx * span * t - ny * off, y: from.y + ny * span * t + nx * off, t });
  }
  return points;
}

/**
 * The best of twenty routes rather than the first acceptable one.
 *
 * Rejecting any river that passes near a building and trying again sounds like
 * the same thing and is not: a sheet with thirteen encounters on it has very
 * little clear country left, so "try until one misses everything" quietly means
 * "usually no river at all", which is how the prairie ended up dry. Scoring
 * every candidate by how far it stays from the nearest building and keeping the
 * roomiest one gives the map its water back, and only gives up when the best of
 * twenty would still run through somebody's front door.
 *
 * @param {number} portion how much of the route to keep, for tributaries
 */
function chooseRiver(w, h, rng, topBand, nodes, portion) {
  let best = null;
  let bestGap = 0;
  for (let attempt = 0; attempt < 20; attempt++) {
    const points = buildRiver(w, h, rng, topBand);
    if (portion < 1) points.length = Math.max(20, Math.round(points.length * portion));
    let gap = Infinity;
    for (const p of points) {
      for (const n of nodes) {
        gap = Math.min(gap, Math.hypot(p.x - n.x, p.y - n.y));
      }
    }
    if (gap > bestGap) {
      bestGap = gap;
      best = points;
    }
  }
  return bestGap >= 22 ? best : null;
}

function paintRiver(ctx, points, rng, spec) {
  const [wLow, wHigh] = spec.width;
  const water = spec.water;
  // The banks first, as one continuous wide stroke, then the water inside them.
  for (const pass of [
    { grow: 3, color: spec.bank, alpha: 0.55 },
    { grow: 1, color: water.rim, alpha: 1 },
    { grow: 0, color: water.body, alpha: 1 },
    { grow: -2, color: water.top, alpha: 1 },
  ]) {
    ctx.globalAlpha = pass.alpha;
    ctx.fillStyle = pass.color;
    for (const p of points) {
      const wide = wLow + (wHigh - wLow) * (0.4 + 0.6 * Math.sin(p.t * Math.PI));
      const r = wide / 2 + pass.grow;
      if (r > 0) fillDisc(ctx, p.x, p.y, r);
    }
  }
  ctx.globalAlpha = 1;

  // Glints on the water, and reeds on the inside of the bends.
  for (let i = 6; i < points.length - 6; i += rng.int(7, 18)) {
    const p = points[i];
    ctx.fillStyle = water.glint;
    ctx.fillRect(Math.round(p.x - 1), Math.round(p.y), rng.int(2, 4), 1);
  }
  for (let i = 2; i < points.length - 2; i += rng.int(4, 11)) {
    const p = points[i];
    const q = points[i + 1];
    const a = Math.atan2(q.y - p.y, q.x - p.x) + Math.PI / 2;
    const wide = wLow + (wHigh - wLow) * (0.4 + 0.6 * Math.sin(p.t * Math.PI));
    const side = rng.chance(0.5) ? 1 : -1;
    const rx = Math.round(p.x + Math.cos(a) * (wide / 2 + 2) * side);
    const ry = Math.round(p.y + Math.sin(a) * (wide / 2 + 2) * side);
    ctx.fillStyle = spec.reeds;
    ctx.fillRect(rx, ry - 3, 1, 4);
    ctx.fillRect(rx + 1, ry - 2, 1, 3);
  }
}

/**
 * Where the road meets the water, a plank bridge — laid across the road's own
 * direction, with two rails and a shadow under it.
 */
function paintBridges(ctx, samples, points, spec) {
  if (!points.length) return;
  const [, wHigh] = spec.width;
  const reach = wHigh / 2 + 5;

  // Which stretches of road are over water, and then the middle of each
  // stretch. Taking the first sample that touches the river instead puts the
  // bridge half a bridge upstream of the crossing, which is exactly where the
  // first version of this put it.
  const crossings = [];
  let runFrom = -1;
  for (let i = 4; i < samples.length - 4; i++) {
    const s = samples[i];
    let near = false;
    for (const p of points) {
      if (Math.abs(p.x - s.x) > reach || Math.abs(p.y - s.y) > reach) continue;
      near = true;
      break;
    }
    if (near && runFrom < 0) runFrom = i;
    if (!near && runFrom >= 0) {
      crossings.push((runFrom + i - 1) >> 1);
      runFrom = -1;
    }
  }
  if (runFrom >= 0) crossings.push((runFrom + samples.length - 5) >> 1);

  for (const i of crossings) {
    const s = samples[i];
    const a = Math.atan2(samples[i + 3].y - samples[i - 3].y, samples[i + 3].x - samples[i - 3].x);
    const half = wHigh / 2 + 6;
    const px = -Math.sin(a);
    const py = Math.cos(a);
    const nx = Math.cos(a);
    const ny = Math.sin(a);

    // Decking: planks laid across the run of the road.
    for (let t = -half; t <= half; t++) {
      const cx = s.x + nx * t;
      const cy = s.y + ny * t;
      for (let o = -5; o <= 5; o++) {
        const isRail = Math.abs(o) >= 4;
        ctx.fillStyle = isRail ? PALETTE.woodDeep : (Math.round(t) % 3 === 0 ? PALETTE.woodDark : PALETTE.wood);
        ctx.fillRect(Math.round(cx + px * o), Math.round(cy + py * o), 1, 1);
      }
    }
    // The two posts at either end, so the bridge lands on something.
    for (const end of [-half, half]) {
      ctx.fillStyle = PALETTE.woodDeep;
      fillDisc(ctx, s.x + nx * end, s.y + ny * end, 2);
    }
  }
}

/**
 * The range along the top edge: what the road is walking away from.
 *
 * Drawn in profile with the peaks pointing north, which is the one place a
 * pictorial map has always been allowed to cheat its viewpoint. Three rows now
 * rather than two — a hazed row at the back, a dark middle, a lit front — plus
 * a ridge line down the sunward face of every peak in the front row, a snow cap
 * where the biome asks for one, and a glow behind the crest where the mountains
 * are on fire.
 */
function paintRange(ctx, w, band, rng, colors) {
  if (colors.glow) {
    for (let y = 0; y < band + 6; y++) {
      ctx.globalAlpha = 0.1 * (y / (band + 6));
      ctx.fillStyle = colors.glow;
      ctx.fillRect(0, y, w, 1);
    }
    ctx.globalAlpha = 1;
  }

  // A single row of same-sized cones reads as a saw blade; a short hazed row
  // behind a dark one behind a taller lit one reads as distance.
  const rows = [
    { count: Math.ceil(w / 38), low: 0.2, high: 0.42, body: colors.dark, light: colors.dark, ridge: false, cap: 0 },
    { count: Math.ceil(w / 46), low: 0.36, high: 0.66, body: colors.dark, light: colors.body, ridge: false, cap: 0.82 },
    { count: Math.ceil(w / 54), low: 0.58, high: 1, body: colors.body, light: colors.light, ridge: true, cap: 0.72 },
  ];
  for (const row of rows) {
    for (let i = 0; i < row.count; i++) {
      const cx = rng.int(-14, w + 14);
      const peak = rng.int(Math.round(band * row.low), Math.round(band * row.high));
      const half = Math.round(peak * rng.range(1.1, 2.1));
      // Every hill ends on its own line, and a third of them are mesas rather
      // than cones. Cones of one size all ending at one height is a saw blade.
      const foot = rng.int(0, 13);
      const flat = rng.chance(0.34) ? rng.range(0.2, 0.4) : 0;
      const grain = rng.range(0.5, 1.4);
      let crown = -1;
      for (let dx = -half; dx <= half; dx++) {
        const x = cx + dx;
        if (x < 0 || x >= w) continue;
        const k = Math.abs(dx) / half;
        // A flat crown for the mesas, then the slope, then a little erosion so
        // the profile is rock rather than geometry.
        const slope = flat && k < flat ? 1 : (1 - k) / (1 - flat || 1);
        const hgt = Math.round(
          peak * Math.max(0, slope) + Math.sin(dx * grain) * 1.2 + Math.sin(dx * 0.31) * 1.6,
        );
        if (hgt <= 0) continue;
        const top = band + foot - hgt;
        ctx.fillStyle = row.body;
        ctx.fillRect(x, top, 1, hgt);
        // Lit on the left face, shadowed on the right: one sun over the whole map.
        ctx.fillStyle = dx < 0 ? row.light : colors.dark;
        ctx.fillRect(x, top, 1, 2);
        // Snow, or whatever the biome puts on its summits, sitting on the top
        // fifth of the peak and only on the peaks tall enough to earn it.
        if (colors.cap && row.cap && hgt > peak * row.cap && peak > band * 0.5) {
          ctx.fillStyle = dx < 0 ? colors.cap : row.light;
          ctx.fillRect(x, top, 1, Math.max(1, Math.round(hgt * 0.16)));
        }
        // One ridge line down the shoulder of the front row, so a mountain has
        // a face rather than a fill.
        if (row.ridge && crown < 0 && dx >= 0) {
          crown = x;
          ctx.fillStyle = colors.dark;
          for (let t = 2; t < hgt; t += 1) {
            ctx.fillRect(x + Math.round(t * 0.28), top + t, 1, 1);
          }
        }
      }
    }
  }
  // The range dissolves into the ground rather than ending on a cut line, and
  // it dissolves by a different depth in every column — a shadow of even depth
  // right across the sheet is a ruled line with a gradient on it, which is
  // precisely what the eye picks out.
  for (let x = 0; x < w; x++) {
    const depth = 10 + Math.round(6 * (Math.sin(x * 0.07) + Math.sin(x * 0.023 + 1.7)));
    for (let y = 0; y < depth; y++) {
      ctx.globalAlpha = 0.14 * (1 - y / depth);
      ctx.fillStyle = colors.dark;
      ctx.fillRect(x, band + y, 1, 1);
    }
  }
  // Scree off the feet of the range, thrown out onto the flat.
  for (let i = 0; i < 150; i++) {
    ctx.globalAlpha = rng.range(0.25, 0.6);
    ctx.fillStyle = rng.chance(0.5) ? colors.dark : colors.body;
    ctx.fillRect(rng.int(0, w - 1), band + rng.int(-4, 22), rng.chance(0.3) ? 2 : 1, 1);
  }
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------------------
// Map furniture
// ---------------------------------------------------------------------------

/**
 * The road: a worn band, two wheel ruts, kerb stones, and a line of dashes.
 *
 * Dashes, because a solid line across a map reads as a border. The worn band
 * beneath them is what makes it a road somebody has actually used, and the ruts
 * are what make it a road rather than a path — this country is crossed by
 * wagons, and a wagon leaves two lines, not one.
 */
function paintRoad(ctx, samples, terrain, rng) {
  // Verge, casing, surface. The casing is the load-bearing one: a light band on
  // pale ground and a dark band on dark ground both vanish, and a light band
  // with a dark line either side of it reads on all seven of them. It is the
  // oldest trick in road cartography and the map needed it — this is the one
  // line on the sheet that has to be findable at a glance.
  // Every other sample is enough for the bands: the route is sampled every two
  // and a half pixels and the narrowest of these discs is four across, so the
  // stroke is still solid and the map bakes in half the time.
  const band = (r, color, alpha) => {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    for (let i = 0; i < samples.length; i += 2) fillDisc(ctx, samples[i].x, samples[i].y, r);
    const last = samples[samples.length - 1];
    fillDisc(ctx, last.x, last.y, r);
  };
  band(8, terrain.road.worn, 0.28);
  band(6, terrain.road.dash, 0.82);
  band(4, terrain.road.worn, 1);
  band(2, terrain.road.lit, 0.55);
  ctx.globalAlpha = 1;

  // Ruts and kerb stones: the same route offset either side of its own
  // direction. This country is crossed by wagons, and a wagon leaves two lines.
  samples.forEach((p, i) => {
    const q = samples[Math.min(samples.length - 1, i + 2)];
    const a = Math.atan2(q.y - p.y, q.x - p.x) + Math.PI / 2;
    const dx = Math.cos(a) * 2.2;
    const dy = Math.sin(a) * 2.2;
    ctx.globalAlpha = 0.34;
    ctx.fillStyle = terrain.road.dash;
    ctx.fillRect(Math.round(p.x + dx), Math.round(p.y + dy), 1, 1);
    ctx.fillRect(Math.round(p.x - dx), Math.round(p.y - dy), 1, 1);
    if (i % 11 === 0 && rng.chance(0.55)) {
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = terrain.road.lit;
      const side = rng.chance(0.5) ? 1 : -1;
      ctx.fillRect(Math.round(p.x + Math.cos(a) * 6.5 * side), Math.round(p.y + Math.sin(a) * 6.5 * side), 2, 1);
    }
  });
  ctx.globalAlpha = 1;

  samples.forEach((p, i) => {
    if (Math.floor(i / 3) % 2 !== 0) return;
    ctx.fillStyle = terrain.road.dash;
    ctx.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 1, 3, 3);
    ctx.fillStyle = terrain.road.lit;
    ctx.fillRect(Math.round(p.x), Math.round(p.y) - 1, 1, 1);
  });
}

/**
 * Trodden ground under a marker, so nothing stands on untouched grass.
 *
 * A ragged pad rather than a soft ellipse — a perfect oval under every building
 * is the thing that made the old map look stamped — with a scatter of bare
 * ground around its edge where the traffic has worn through.
 */
function paintClearing(ctx, x, y, terrain, rng) {
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = terrain.clearing;
  for (let i = 0; i < 5; i++) {
    fillEllipse(ctx, x + rng.int(-5, 5), y + 2 + rng.int(-3, 3), rng.int(9, 14), rng.int(6, 9));
  }
  ctx.globalAlpha = 0.24;
  fillEllipse(ctx, x, y + 2, 20, 12);
  ctx.globalAlpha = 0.55;
  for (let i = 0; i < 26; i++) {
    const a = rng.range(0, Math.PI * 2);
    const d = rng.range(0.8, 1.35);
    ctx.fillRect(Math.round(x + Math.cos(a) * 17 * d), Math.round(y + 2 + Math.sin(a) * 10 * d), 1, 1);
  }
  ctx.globalAlpha = 1;
}

/**
 * X marks the spot — over the boss, because that is where the road ends.
 *
 * Drawn wider than the marker that lands on top of it, so the arms come out
 * past the skull's shoulders. An X the marker covers is an X nobody sees. The
 * strokes are brushed rather than ruled: the width swells in the middle and
 * frays at the ends, which is what a mark made in a hurry looks like.
 */
function paintCross(ctx, x, y, rng) {
  // Wide enough that the arms come out past the skull AND past the plaque with
  // the word on it. At the old width the bottom half of the X was under the
  // label, which left it reading as two red horns.
  const arm = 31;
  // Ink under the red, one pixel proud of it all the way round. Red on sand is
  // the loudest mark on the map and red on the basin's red-brown ground is
  // nearly invisible; the outline is what makes it the same mark on all seven.
  for (const pass of [
    { grow: 1, ink: true },
    { grow: 0, ink: false },
  ]) {
    for (let t = -arm; t <= arm; t++) {
      const k = 1 - Math.abs(t) / arm;
      const wide = Math.max(1, Math.round(1 + k * 3)) + pass.grow;
      for (let s = -wide; s <= wide; s++) {
        if (pass.ink) ctx.fillStyle = PALETTE.ink;
        else {
          const edge = Math.abs(s) >= wide - 0.5;
          ctx.fillStyle = edge ? PALETTE.redDeep : PALETTE.red;
          if (!edge && rng.chance(0.12)) ctx.fillStyle = PALETTE.redLight;
        }
        ctx.fillRect(Math.round(x + t + s), Math.round(y + t), 1, 1);
        ctx.fillRect(Math.round(x + t + s), Math.round(y - t), 1, 1);
      }
    }
  }
}

/**
 * An eight-point rose on a medallion: a dark disc, a gold ring, four long arms
 * and four short ones, and the letter over the north.
 */
function paintCompass(ctx, cx, cy) {
  const r = 19;
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = PALETTE.shadow;
  fillDisc(ctx, cx + 1, cy + 1, r + 6);
  ctx.globalAlpha = 0.82;
  ctx.fillStyle = PALETTE.inkSoft;
  fillDisc(ctx, cx, cy, r + 5);
  ctx.globalAlpha = 1;

  // The ring, drawn as a circle of pixels rather than a stroke so it stays on
  // the grid the rest of the map is drawn on.
  for (let a = 0; a < Math.PI * 2; a += 0.02) {
    ctx.fillStyle = PALETTE.goldDark;
    ctx.fillRect(Math.round(cx + Math.cos(a) * (r + 4)), Math.round(cy + Math.sin(a) * (r + 4)), 1, 1);
    ctx.fillStyle = PALETTE.gold;
    ctx.fillRect(Math.round(cx + Math.cos(a) * (r + 3)), Math.round(cy + Math.sin(a) * (r + 3)), 1, 1);
  }

  // The four diagonals, short and thin, then the four cardinals over them.
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    for (let t = 0; t <= r * 0.62; t++) {
      const wdt = Math.max(0, Math.round((1 - t / (r * 0.62)) * 1.6));
      for (let k = -wdt; k <= wdt; k++) {
        ctx.fillStyle = PALETTE.goldDark;
        ctx.fillRect(Math.round(cx + Math.cos(a) * t + k), Math.round(cy + Math.sin(a) * t), 1, 1);
      }
    }
  }
  for (let i = 0; i < 4; i++) {
    const dx = i === 1 ? 1 : i === 3 ? -1 : 0;
    const dy = i === 0 ? -1 : i === 2 ? 1 : 0;
    for (let t = 0; t <= r; t++) {
      const wdt = Math.max(0, Math.round((1 - t / r) * 4));
      for (let k = -wdt; k <= wdt; k++) {
        const x = Math.round(cx + dx * t + (dx === 0 ? k : 0));
        const y = Math.round(cy + dy * t + (dy === 0 ? k : 0));
        // The north arm is bone; the other three are gold. One arm brighter
        // than the rest is how a rose says which way it is pointing.
        ctx.fillStyle = i === 0 ? PALETTE.bone : PALETTE.goldDark;
        if (k === 0) ctx.fillStyle = i === 0 ? PALETTE.white : PALETTE.gold;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
  ctx.fillStyle = PALETTE.goldLight;
  ctx.fillRect(cx - 1, cy - 1, 3, 3);
  ctx.fillStyle = PALETTE.white;
  ctx.fillRect(cx, cy, 1, 1);
  drawTextCentered(ctx, 'N', cx + 1, cy - r - 15, {
    scale: 1,
    color: PALETTE.bone,
    shadow: PALETTE.shadow,
  });
}

/**
 * The name of the country, on a board nailed up at the edge of it.
 *
 * The panel already prints the world's name in its header; this is the same
 * name on the sheet itself, which is what turns a picture of some ground into a
 * map of somewhere. It is still not a number — the map's oldest rule is intact.
 */
function paintCartouche(ctx, mapW, topBand, title) {
  const scale = 2;
  /**
   * NOT upper-cased here. The font does that, and it TRANSLATES first (see
   * `normalise` in src/art/font.js) — so a world name shouted into capitals
   * before it gets there arrives as a key the Spanish table has never seen and
   * the board keeps its English. Hand it the name as written.
   */
  const text = String(title);
  // Measured from the font rather than guessed at: the longest world name is
  // three times the length of the shortest, and a board sized for "GALAXY" cuts
  // the W off "WHITECROWN PASS".
  const w = measureText(text, 1) * scale + 20;
  const h = 24;
  // Nailed up over the range itself, not on the flat below it.
  //
  // The board is baked into the map and scales with it; a marker is 32 CSS
  // pixels tall whatever the zoom. So a board on the open ground below the
  // hills is clear of the trailhead pin at the zoom it was placed at and under
  // it at the zoom the player actually reads the whole road at — the pin grows
  // upwards relative to the sheet as the sheet shrinks. Inside the range band
  // there is no such zoom: the nearest marker's foot is a full row of cells
  // below the board, and the pin would have to be three times its height to
  // reach it at the lowest zoom the panel allows.
  const left = Math.round(Math.min(mapW - w - 12, 14));
  const top = Math.round(Math.max(6, topBand - h - 12));

  ctx.globalAlpha = 0.4;
  ctx.fillStyle = PALETTE.shadow;
  ctx.fillRect(left + 3, top + 4, w, h);
  ctx.globalAlpha = 1;

  ctx.fillStyle = PALETTE.woodDeep;
  ctx.fillRect(left - 2, top - 2, w + 4, h + 4);
  ctx.fillStyle = PALETTE.woodDark;
  ctx.fillRect(left, top, w, h);
  ctx.fillStyle = PALETTE.wood;
  ctx.fillRect(left + 1, top + 1, w - 2, h - 2);
  // Two planks, and the grain across them.
  ctx.fillStyle = PALETTE.woodDark;
  ctx.fillRect(left + 1, top + Math.round(h / 2), w - 2, 1);
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(left + 3 + i * Math.round(w / 10), top + 3 + (i % 3), Math.round(w / 14), 1);
  }
  // Nails in the corners.
  for (const [nx, ny] of [[left + 3, top + 3], [left + w - 4, top + 3], [left + 3, top + h - 4], [left + w - 4, top + h - 4]]) {
    ctx.fillStyle = PALETTE.steelDark;
    ctx.fillRect(nx, ny, 2, 2);
    ctx.fillStyle = PALETTE.steel;
    ctx.fillRect(nx, ny, 1, 1);
  }
  drawTextCentered(ctx, text, left + w / 2, top + Math.round((h - 7 * scale) / 2), {
    scale,
    color: PALETTE.bone,
    shadow: PALETTE.woodDeep,
    spacing: 1,
  });
}

// ---------------------------------------------------------------------------
// The bake
// ---------------------------------------------------------------------------

/**
 * Paint one whole map.
 *
 * Everything that never changes while the panel is open is baked into a single
 * canvas here — ground, scenery, road, the X and the compass — so dragging and
 * zooming is one `drawImage` per frame no matter how much is on the map. Only
 * the markers and the player's position are drawn live, on top, at a fixed size.
 *
 * The order below is the order the country was made in, and it matters: the
 * land first, then what is cut into it, then what stands on it, then what has
 * been laid across the lot by somebody with a wagon.
 *
 * @param {object} o
 * @param {string} o.biomeId
 * @param {number} o.width @param {number} o.height  in map units
 * @param {number} o.seed
 * @param {Array<{x:number,y:number}>} o.samples  the road, densely sampled
 * @param {Array<{x:number,y:number,type:string}>} o.nodes  where the markers go
 * @param {{color:string, alpha:number}|null} [o.tint]  the world's colour wash
 * @param {number} [o.topBand] height of the range along the top edge
 * @param {string} [o.title] the name of the country, for the board on the sheet
 * @returns {HTMLCanvasElement}
 */
export function bakeMapBackground({
  biomeId,
  width,
  height,
  seed,
  samples,
  nodes,
  tint = null,
  topBand = 46,
  title = '',
}) {
  const terrain = getMapTerrain(biomeId);
  const env = getEnvironmentSprites(biomeId);
  const rng = makeRng(seed >>> 0);
  const { canvas, ctx } = makeCanvas(width, height);
  const field = buildField(width, height, rng);

  paintTerrain(ctx, width, height, field, terrain);
  if (terrain.stars) paintStars(ctx, width, height, rng, terrain.stars);
  if (terrain.ripples) paintRipples(ctx, width, height, rng, field, terrain);
  if (terrain.blades) paintBlades(ctx, width, height, rng, field, terrain);
  else paintGrit(ctx, width, height, rng, field, terrain);
  if (terrain.craters) paintCraters(ctx, width, height, rng, terrain.craters, topBand, samples);
  if (terrain.veins) paintVeins(ctx, width, height, rng, field, terrain.veins, topBand, nodes);
  if (terrain.outcrops) paintOutcrops(ctx, width, height, rng, field, terrain.outcrops, topBand, samples);

  // Standing water gathers in the hollows, keeps off the road, and never sits
  // where a building has to stand.
  for (let i = 0, tries = 0; i < (terrain.ponds || 0) && tries < 60; tries++) {
    const rx = rng.int(14, 32);
    const ry = Math.round(rx * rng.range(0.45, 0.75));
    const cx = rng.int(rx + 8, width - rx - 8);
    const cy = rng.int(topBand + ry + 12, height - ry - 12);
    if (nearRoad(samples, cx, cy, rx + 16)) continue;
    if (nodes.some((n) => Math.abs(n.x - cx) < rx + 30 && Math.abs(n.y - cy) < ry + 26)) continue;
    if (field[cy * width + cx] > 0.52) continue;
    paintPond(ctx, cx, cy, rx, ry, rng, terrain.water || POND_WATER);
    i++;
  }

  // Running water, if this country has any: try a few routes and keep the first
  // that misses every building on the sheet.
  let river = null;
  if (terrain.river) {
    river = chooseRiver(width, height, rng, topBand, nodes, 1);
    if (river) {
      paintRiver(ctx, river, rng, terrain.river);
      // Tributaries: shorter, narrower, and allowed to end in the middle of the
      // country the way a creek does when the ground stops falling.
      for (let b = 0; b < (terrain.river.branches || 0); b++) {
        const branch = chooseRiver(width, height, rng, topBand, nodes, rng.range(0.3, 0.55));
        if (!branch) continue;
        paintRiver(ctx, branch, rng, {
          ...terrain.river,
          width: terrain.river.width.map((n) => Math.max(3, n * 0.6)),
        });
      }
    }
  }

  if (terrain.mist) paintMist(ctx, width, height, rng, field, terrain.mist, topBand, samples);
  if (terrain.embers) paintEmbers(ctx, width, height, rng, field, terrain.embers, topBand);

  paintRange(ctx, width, topBand, rng, terrain.range);

  scatterProps(ctx, { width, height, topBand, rng, env, samples, nodes, field });

  paintRoad(ctx, samples, terrain, rng);
  if (river) paintBridges(ctx, samples, river, terrain.river);
  for (const node of nodes) paintClearing(ctx, node.x, node.y, terrain, rng);

  const boss = nodes.find((n) => n.type === 'boss');
  if (boss) paintCross(ctx, boss.x, boss.y, rng);

  if (tint) {
    ctx.globalAlpha = tint.alpha;
    ctx.fillStyle = tint.color;
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 1;
  }

  if (title) paintCartouche(ctx, width, topBand, title);
  paintCompass(ctx, width - 38, height - 38);
  paintEdges(ctx, width, height, terrain);

  return canvas;
}

/**
 * The scenery.
 *
 * One prop per cell at most, exactly the rule the roadside uses (see the note
 * on scatter in `parallax.js`) — it is what stops the map clumping. Props keep
 * clear of the road and of every marker, and are drawn back to front so a tree
 * in front of another tree overlaps it the right way round.
 *
 * On top of that rule, two things the old scatter did not do. Growth follows
 * the ground: the low, wet cells carry nearly everything and the high ground is
 * nearly bare, which is what puts the trees in the valleys and leaves the ridge
 * lines clear. And a third of the cells that do get a prop get a *stand* of
 * two or three of the same one, because scrub grows in company — an even
 * sprinkle of single plants is the tell of a generated map.
 */
function scatterProps(ctx, { width, height, topBand, rng, env, samples, nodes, field }) {
  const cell = env.scatterCell ? Math.round(env.scatterCell * 0.62) : 40;
  const table = env.scatter || [];
  const total = table.reduce((sum, entry) => sum + entry.weight, 0);
  if (!total) return;

  const pick = () => {
    let roll = rng() * total;
    for (const entry of table) {
      roll -= entry.weight;
      if (roll <= 0) return entry.name;
    }
    return table[0].name;
  };

  const placed = [];
  const put = (name, x, y) => {
    if (x < 6 || x > width - 6 || y < topBand - 8 || y > height - 6) return;
    if (nearRoad(samples, x, y, 20)) return;
    if (nodes.some((n) => Math.abs(n.x - x) < 32 && Math.abs(n.y - y) < 28)) return;
    const sprite = env.props[name];
    if (sprite) placed.push({ sprite, x, y, flip: rng.chance(0.4) });
  };

  for (let cy = topBand - 6; cy < height; cy += cell) {
    for (let cx = 0; cx < width; cx += cell) {
      const x = cx + rng.int(Math.round(cell * 0.2), Math.round(cell * 0.8));
      const y = cy + rng.int(Math.round(cell * 0.2), Math.round(cell * 0.8));
      const ix = Math.max(0, Math.min(width - 1, x));
      const iy = Math.max(0, Math.min(height - 1, y));
      // 0.95 in the hollows down to 0.3 on the tops.
      if (!rng.chance(0.95 - field[iy * width + ix] * 0.65)) continue;

      const name = pick();
      put(name, x, y);
      if (rng.chance(0.34)) {
        for (let k = 0, n = rng.int(1, 3); k < n; k++) {
          put(name, x + rng.int(-14, 14), y + rng.int(-9, 9));
        }
      }
    }
  }

  placed.sort((a, b) => a.y - b.y);
  for (const p of placed) {
    // A contact shadow first: a prop dropped straight onto the ground floats.
    // It is cast down and to the right, away from the sun the relief is lit by.
    ctx.globalAlpha = 0.24;
    ctx.fillStyle = PALETTE.shadow;
    fillEllipse(ctx, p.x + 2, p.y, Math.max(4, Math.round(p.sprite.width * 0.42)), 3);
    ctx.globalAlpha = 1;
    const dx = Math.round(p.x - p.sprite.width / 2);
    const dy = Math.round(p.y - p.sprite.height + 2);
    if (p.flip) {
      ctx.save();
      ctx.translate(dx + p.sprite.width, dy);
      ctx.scale(-1, 1);
      ctx.drawImage(p.sprite, 0, 0);
      ctx.restore();
    } else {
      ctx.drawImage(p.sprite, dx, dy);
    }
  }
}

/** The map darkens towards its edges, so it reads as a piece of country. */
function paintEdges(ctx, w, h, terrain) {
  const depth = 30;
  for (let i = 0; i < depth; i++) {
    ctx.globalAlpha = 0.52 * (1 - i / depth) ** 1.6;
    ctx.fillStyle = terrain.edge;
    ctx.fillRect(i, i, w - i * 2, 1);
    ctx.fillRect(i, h - i - 1, w - i * 2, 1);
    ctx.fillRect(i, i, 1, h - i * 2);
    ctx.fillRect(w - i - 1, i, 1, h - i * 2);
  }
  ctx.globalAlpha = 1;
  // A leather border with a lit inside edge: the sheet has a thickness.
  ctx.fillStyle = PALETTE.woodDeep;
  ctx.fillRect(0, 0, w, 3);
  ctx.fillRect(0, h - 3, w, 3);
  ctx.fillRect(0, 0, 3, h);
  ctx.fillRect(w - 3, 0, 3, h);
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = PALETTE.woodDark;
  ctx.fillRect(3, 3, w - 6, 1);
  ctx.fillRect(3, h - 4, w - 6, 1);
  ctx.fillRect(3, 3, 1, h - 6);
  ctx.fillRect(w - 4, 3, 1, h - 6);
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------------------
// Small geometry helpers
// ---------------------------------------------------------------------------

/** True when (x, y) is within `r` of any sampled point of the road. */
function nearRoad(samples, x, y, r) {
  const r2 = r * r;
  for (const p of samples) {
    const dx = p.x - x;
    if (dx > r || dx < -r) continue;
    const dy = p.y - y;
    if (dy > r || dy < -r) continue;
    if (dx * dx + dy * dy <= r2) return true;
  }
  return false;
}

/** Axis-aligned filled ellipse, drawn one scanline at a time to stay pixelly. */
function fillEllipse(ctx, cx, cy, rx, ry) {
  for (let y = -ry; y <= ry; y++) {
    const k = 1 - (y * y) / (ry * ry);
    if (k <= 0) continue;
    const half = Math.round(rx * Math.sqrt(k));
    ctx.fillRect(Math.round(cx - half), Math.round(cy + y), half * 2 + 1, 1);
  }
}

/**
 * Filled disc. The half-widths for a given radius are worked out once and kept
 * — the road alone asks for tens of thousands of these, and there are only ever
 * a dozen distinct radii on a map.
 */
const discRows = new Map();
function fillDisc(ctx, cx, cy, r) {
  const key = Math.round(r * 2);
  let rows = discRows.get(key);
  if (!rows) {
    const rr = key / 2;
    rows = [];
    for (let y = -Math.ceil(rr); y <= Math.ceil(rr); y++) {
      const k = rr * rr - y * y;
      if (k <= 0) continue;
      rows.push([y, Math.round(Math.sqrt(k))]);
    }
    discRows.set(key, rows);
  }
  const x = Math.round(cx);
  const y = Math.round(cy);
  for (const [dy, half] of rows) ctx.fillRect(x - half, y + dy, half * 2 + 1, 1);
}

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** '#rrggbb' → [r, g, b]. The palette is the only source of these. */
function toRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
