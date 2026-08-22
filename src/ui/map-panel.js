/**
 * SHOOT! — The trail map.
 *
 * The Map used to be a consumable that printed three words in a toast ("Shop
 * just ahead   Duel far off"). It is now a tool you keep, and this is what it
 * opens: a drawn map of the stretch of road you are on, with every duel, shop,
 * inn and the boss marked on it, your own position on it as a blue circle, and
 * nothing stopping you from dragging it around and leaning in.
 *
 * WHAT THE MAP IS ALLOWED TO SAY
 * ---------------------------------------------------------------------------
 * The spec's oldest rule is that the player never sees a precise progress
 * readout — no bar, no timer, no "412 m to the next fight". The map keeps that
 * rule: there is not a single number on it. What it shows is *shape* — how many
 * fights are left, whether the next thing is a shop or a boss, how far along
 * the road you have come — which is exactly what a map is for and exactly what
 * a progress bar is not.
 *
 * HOW IT IS DRAWN
 * ---------------------------------------------------------------------------
 * Two layers, and the split is what keeps it fast and legible:
 *
 *   MAP SPACE   ground, scenery, road, the red X, the compass. Baked once into
 *               a single canvas by `src/art/map-art.js` and blitted under the
 *               current pan/zoom — one drawImage per frame however big the
 *               world gets.
 *   SCREEN SPACE  markers, labels, the blue circle. Drawn at a FIXED size no
 *               matter the zoom, the way a real map's pins are printed on the
 *               glass rather than on the paper. Scale them with the map and
 *               they are unreadable the moment you zoom out to see the whole
 *               road, which is the one thing you open a map to do.
 *
 * THE LAYOUT
 * ---------------------------------------------------------------------------
 * The road is a single line of encounters in the walk engine, and a straight
 * line is a bad map. The encounters are laid out on a serpentine — left to
 * right, drop a row, right to left — jittered off the grid by a seeded RNG and
 * joined with a Catmull-Rom spline, so the road bends and doubles back like
 * country instead of reading as a flowchart. Same segment seed, same map, every
 * time you open it.
 */

import { el } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { attachButtonSounds, play } from '../core/audio.js';
import { makeRng } from '../core/rng.js';
import { crisp } from '../art/pixel.js';
import { PALETTE } from '../art/palette.js';
import { drawTextCentered, measureText, GLYPH_H } from '../art/font.js';
import { bakeMapBackground, getMapMarkers, MARKER_SIZE } from '../art/map-art.js';
import { getState } from '../game/player.js';
import { getEngine } from '../game/run.js';
import { track as trackAchievement } from '../game/achievements.js';
import { getWorld } from '../game/worlds.js';
import { getBiome } from '../game/biomes.js';
import { HORSE_TIME_MUL } from '../game/progression.js';
import { effectiveDistance, ENCOUNTER_LABELS } from '../explore/encounters.js';
import { closeButton, iconButton } from './widgets.js';
import { toast } from './toast.js';

// --- Layout, in map units (one map unit is one source pixel) ----------------
/**
 * How many encounters fit across one row of the serpentine.
 *
 * Not a constant: the column count is chosen when the panel opens, from the
 * shape of the window it opened into (see `chooseColumns`). A five-across map
 * is right on a laptop and a disaster on a phone held upright, where it leaves
 * two thirds of the frame as empty black above and below a letterboxed strip.
 */
const COL_CHOICES = [2, 3, 4, 5, 6];
const CELL_W = 118;
const CELL_H = 108;
const MARGIN = 54;
/** The range of hills along the top edge. Nothing is laid out inside it. */
const TOP_BAND = 46;

// --- Screen-space furniture, in CSS pixels ----------------------------------
const MARKER_SCALE = 2;
const MARKER_PX = MARKER_SIZE * MARKER_SCALE;
/** Markers sit a little above their spot on the ground, like a pin. */
const MARKER_LIFT = 6;
const MIN_ZOOM_FLOOR = 0.45;
const MAX_ZOOM = 4;
/** Below this, duel labels are dropped — the road is too crowded to read. */
const DUEL_LABEL_ZOOM = 1.35;

/**
 * What each marker is called. The encounter names are the game's own — one
 * table, in `encounters.js` — plus the one thing on the map that is not an
 * encounter.
 */
const MARKER_LABELS = { start: 'Trailhead', ...ENCOUNTER_LABELS };

/**
 * Encounter type → marker art.
 *
 * `unknown` is not an encounter type the game ever routes to — it is what the
 * map calls a stop the run has not been told about yet. See REVEAL_AHEAD in
 * src/explore/encounters.js: a world deals five stops face up and holds the
 * rest face down, so the sheet is a real map of the road you can see and an
 * honest row of blank signposts for the road you cannot.
 */
const MARKER_ART = {
  start: 'start',
  enemy: 'duel',
  shop: 'shop',
  inn: 'inn',
  forge: 'forge',
  tailor: 'tailor',
  boss: 'boss',
  unknown: 'unknown',
};

// ---------------------------------------------------------------------------
// The model
// ---------------------------------------------------------------------------

/** Map size for a given number of nodes across. */
function mapSize(nodeCount, cols) {
  const rows = Math.max(1, Math.ceil(nodeCount / cols));
  return {
    rows,
    width: MARGIN * 2 + cols * CELL_W,
    height: TOP_BAND + MARGIN + rows * CELL_H,
  };
}

/**
 * The column count whose map is shaped most like the frame it has to live in.
 * Compared in log space so "twice as wide" and "half as wide" count the same.
 */
function chooseColumns(nodeCount, frameW, frameH) {
  const want = Math.log((frameW || 1) / (frameH || 1));
  let best = COL_CHOICES[0];
  let bestGap = Infinity;
  for (const cols of COL_CHOICES) {
    const { width, height } = mapSize(nodeCount, cols);
    const gap = Math.abs(Math.log(width / height) - want);
    if (gap < bestGap) {
      bestGap = gap;
      best = cols;
    }
  }
  return best;
}

/**
 * Lay the segment out as a map: node positions, the spline through them, and a
 * dense sample of that spline for drawing and for placing the player.
 *
 * @param {object} segment the walk engine's segment
 * @param {boolean} mounted
 * @param {number} cols how many encounters run across one row
 */
function buildModel(segment, mounted, cols) {
  const events = segment.events;
  const count = events.length + 1; // the trailhead counts as a node
  const { rows, width, height } = mapSize(count, cols);

  // Derived from the segment seed, never the segment's own stream: the same
  // road always draws the same map, but changing how the map wanders can never
  // reshuffle which encounters are on it.
  const rng = makeRng(((segment.seed ?? segment.worldId ?? 1) ^ 0x9e3779b9) >>> 0);
  const nodes = [];
  for (let k = 0; k < count; k++) {
    const row = Math.floor(k / cols);
    const slot = k % cols;
    // Serpentine: every other row runs the other way, so the road folds back on
    // itself instead of jumping from the right edge to the left.
    const col = row % 2 === 0 ? slot : cols - 1 - slot;
    const event = k === 0 ? null : events[k - 1];
    nodes.push({
      index: k,
      // A hidden stop has no type yet — the map is the one place in the game
      // that has to draw the absence of one rather than fall over on it.
      type: k === 0 ? 'start' : event.hidden ? 'unknown' : event.type,
      resolved: k === 0 ? true : event.resolved,
      distance: k === 0 ? 0 : effectiveDistance(event, mounted, HORSE_TIME_MUL),
      x: Math.round(MARGIN + col * CELL_W + CELL_W / 2 + rng.range(-20, 20)),
      y: Math.round(
        TOP_BAND + MARGIN * 0.7 + row * CELL_H + CELL_H / 2 + rng.range(-15, 15),
      ),
    });
  }

  return { nodes, samples: densify(nodes), width, height, rows };
}

/** One point on the Catmull-Rom spline running through the node list. */
function pointOnRoute(nodes, segIndex, t) {
  const at = (i) => nodes[Math.max(0, Math.min(nodes.length - 1, i))];
  const p0 = at(segIndex - 1);
  const p1 = at(segIndex);
  const p2 = at(segIndex + 1);
  const p3 = at(segIndex + 2);
  const t2 = t * t;
  const t3 = t2 * t;
  const axis = (a, b, c, d) =>
    0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
  return { x: axis(p0.x, p1.x, p2.x, p3.x), y: axis(p0.y, p1.y, p2.y, p3.y) };
}

/** The whole route as closely spaced points — used to draw it and to dodge it. */
function densify(nodes) {
  const out = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    const span = Math.hypot(nodes[i + 1].x - nodes[i].x, nodes[i + 1].y - nodes[i].y);
    const steps = Math.max(8, Math.round(span / 2.5));
    for (let s = 0; s < steps; s++) out.push(pointOnRoute(nodes, i, s / steps));
  }
  out.push({ x: nodes[nodes.length - 1].x, y: nodes[nodes.length - 1].y });
  return out;
}

/**
 * Where the traveller is standing, in map units.
 *
 * Between two markers the position is interpolated by *distance walked*, not by
 * spline parameter, so the circle moves at the pace the road does.
 */
function playerPoint(nodes, travelled) {
  for (let i = 0; i < nodes.length - 1; i++) {
    const from = nodes[i];
    const to = nodes[i + 1];
    if (travelled > to.distance) continue;
    const span = Math.max(1, to.distance - from.distance);
    const t = Math.max(0, Math.min(1, (travelled - from.distance) / span));
    return pointOnRoute(nodes, i, t);
  }
  const last = nodes[nodes.length - 1];
  return { x: last.x, y: last.y };
}

// ---------------------------------------------------------------------------
// The panel
// ---------------------------------------------------------------------------

/**
 * Open the map over whatever is on screen.
 *
 * @param {object} opts
 * @param {object} opts.engine the walk engine — the map reads the live segment
 * @param {() => void} [opts.onClose]
 * @returns {{close: () => void}|null} null when there is no road to draw
 */
export function openTrailMap(opts = {}) {
  const engine = opts.engine;
  const segment = engine?.getSegment();
  if (!segment || !segment.events.length) return null;

  // Every door into the map — the road, the shop counter, the inn, the forge —
  // comes through here, so this is where the ledger hears it was read. After
  // the guard above: a map that could not be drawn was not read.
  trackAchievement('mapOpened');

  const player = getState();
  const world = getWorld(player.world);
  const biome = getBiome(world.biome);
  const markers = getMapMarkers(MARKER_SCALE);

  /**
   * Both are built on the first measurement rather than here, because the
   * layout depends on the shape of the frame and the frame does not exist
   * until the panel is in the document.
   */
  let model = null;
  let background = null;

  // --- view state --------------------------------------------------------
  /** Where the map sits in the frame: `x`/`y` are the map origin, in CSS px. */
  const view = { zoom: 1, x: 0, y: 0, minZoom: MIN_ZOOM_FLOOR };
  /** The frame's live size in CSS pixels, and the display's pixel ratio. */
  const port = { w: 0, h: 0, dpr: 1 };
  const pointers = new Map();
  let pinchDistance = 0;
  let frame = 0;
  let started = 0;

  const canvas = el('canvas.map-canvas', {
    role: 'img',
    'aria-label': t('Trail map of {world}', { world: t(world.name) }),
  });
  const ctx = canvas.getContext('2d');

  const frameNode = el('div.map-frame', {}, [
    canvas,
    el('div.map-controls', {}, [
      iconButton('plus', { onClick: () => zoomBy(1.35), label: 'Zoom in' }),
      iconButton('minus', { onClick: () => zoomBy(1 / 1.35), label: 'Zoom out' }),
      iconButton('crosshair', { onClick: () => centreOnPlayer(true), label: 'Find me' }),
    ]),
    el('div.map-hint', { text: 'Drag to move · scroll to zoom' }),
  ]);

  const backdrop = el('div.modal-backdrop.map-backdrop', {
    onclick: (e) => {
      if (e.target === backdrop) close();
    },
  });

  const modal = el('div.panel.modal.modal--wide.map-modal', {
    role: 'dialog',
    'aria-label': 'Trail map',
  }, [
    el('div.modal-header', {}, [
      el('div.col', { style: { gap: '2px' } }, [
        el('h2.panel-title', { text: 'Trail Map' }),
        el('div.map-place', { text: `${t(world.name)} · ${t(biome.label)}` }),
      ]),
      closeButton(close),
    ]),
    frameNode,
    el('div.map-legend', {}, [
      legendChip(markers.duel, 'Duel'),
      legendChip(markers.shop, 'Shop'),
      legendChip(markers.inn, 'Inn'),
      legendChip(markers.forge, 'Forge'),
      legendChip(markers.tailor, 'Clothier'),
      legendChip(markers.boss, 'Boss'),
      legendChip(markers.unknown, 'Unknown'),
      el('span.chip.map-legend-you', {}, [el('span.map-you-dot'), 'You']),
    ]),
  ]);

  backdrop.append(modal);
  document.getElementById('app').append(backdrop);
  attachButtonSounds(modal);

  // --- sizing ------------------------------------------------------------
  function resize() {
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    // The FRAME is measured, never the canvas: the canvas is what this function
    // resizes, and measuring the thing you are about to resize is how a canvas
    // ends up chasing its own tail across the layout.
    const w = Math.max(1, frameNode.clientWidth);
    const h = Math.max(1, frameNode.clientHeight);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    port.w = w;
    port.h = h;
    port.dpr = dpr;

    // First measurement: this is where the map itself gets made, now that
    // there is a frame to shape it to.
    if (!model) {
      model = buildModel(segment, player.hasHorse, chooseColumns(segment.events.length + 1, w, h));
      background = bakeMapBackground({
        biomeId: world.biome,
        width: model.width,
        height: model.height,
        seed: (segment.seed ?? 1) ^ (player.world * 2654435761),
        samples: model.samples,
        nodes: model.nodes,
        tint: world.tint,
        topBand: TOP_BAND,
        // The header of the panel says where you are; so does the sheet, on a
        // board nailed up in the corner of it. The header belongs to the
        // window and goes away with it — the name on the map belongs to the
        // map, which is what makes it a map of somewhere.
        title: world.name,
      });
      // Open fitted to the map's width, which is the axis the road runs along:
      // you see the full breadth of the country and scroll down it, rather than
      // starting on a stamp in the middle of an empty frame.
      view.zoom = Math.min(MAX_ZOOM, 1.6, w / model.width);
    }

    // Never let the map be smaller than the window it is shown in: below that
    // there is nothing to pan and the paper floats in the middle of the frame.
    view.minZoom = Math.max(
      MIN_ZOOM_FLOOR,
      Math.min(1, Math.min(w / model.width, h / model.height)),
    );
    view.zoom = Math.max(view.minZoom, Math.min(MAX_ZOOM, view.zoom));
    clampPan();
  }

  const observer = new ResizeObserver(() => {
    const first = !model;
    if (!first && frameNode.clientWidth === port.w && frameNode.clientHeight === port.h) {
      return;
    }
    resize();
    if (first) centreOnPlayer(false);
  });
  observer.observe(frameNode);

  // --- view maths --------------------------------------------------------
  function clampPan() {
    if (!model) return;
    const w = port.w || 1;
    const h = port.h || 1;
    const mw = model.width * view.zoom;
    const mh = model.height * view.zoom;
    // A little slack so the edge of the world is reachable, never a void.
    const slack = 24;
    view.x = mw + slack * 2 <= w
      ? Math.round((w - mw) / 2)
      : Math.min(slack, Math.max(w - mw - slack, view.x));
    view.y = mh + slack * 2 <= h
      ? Math.round((h - mh) / 2)
      : Math.min(slack, Math.max(h - mh - slack, view.y));
  }

  function zoomAt(nextZoom, sx, sy) {
    const clamped = Math.max(view.minZoom, Math.min(MAX_ZOOM, nextZoom));
    if (clamped === view.zoom) return;
    // Keep the map point under the cursor under the cursor.
    const mx = (sx - view.x) / view.zoom;
    const my = (sy - view.y) / view.zoom;
    view.zoom = clamped;
    view.x = sx - mx * view.zoom;
    view.y = sy - my * view.zoom;
    clampPan();
  }

  function zoomBy(factor) {
    zoomAt(view.zoom * factor, port.w / 2, port.h / 2);
  }

  function centreOnPlayer(animate) {
    if (!model) return;
    const p = playerPoint(model.nodes, engine.getTravelled());
    const targetX = port.w / 2 - p.x * view.zoom;
    const targetY = port.h / 2 - p.y * view.zoom;
    if (!animate) {
      view.x = targetX;
      view.y = targetY;
      clampPan();
      return;
    }
    const fromX = view.x;
    const fromY = view.y;
    const startedAt = performance.now();
    const step = () => {
      const k = Math.min(1, (performance.now() - startedAt) / 260);
      const ease = 1 - (1 - k) ** 3;
      view.x = fromX + (targetX - fromX) * ease;
      view.y = fromY + (targetY - fromY) * ease;
      clampPan();
      if (k < 1) requestAnimationFrame(step);
    };
    step();
  }

  // --- input -------------------------------------------------------------
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) pinchDistance = pointerSpread();
    canvas.classList.add('is-dragging');
  });

  canvas.addEventListener('pointermove', (e) => {
    const previous = pointers.get(e.pointerId);
    if (!previous) return;
    const dx = e.clientX - previous.x;
    const dy = e.clientY - previous.y;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.size >= 2) {
      const spread = pointerSpread();
      if (pinchDistance > 0 && spread > 0) {
        const rect = canvas.getBoundingClientRect();
        const mid = pointerMidpoint();
        zoomAt(view.zoom * (spread / pinchDistance), mid.x - rect.left, mid.y - rect.top);
      }
      pinchDistance = spread;
      return;
    }

    view.x += dx;
    view.y += dy;
    clampPan();
  });

  const endPointer = (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinchDistance = 0;
    if (pointers.size === 0) canvas.classList.remove('is-dragging');
  };
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    // Trackpads report tiny deltas and mice report ~100 per notch; normalising
    // by sign alone makes both feel the same.
    const step = e.deltaY > 0 ? 1 / 1.18 : 1.18;
    zoomAt(view.zoom * step, e.clientX - rect.left, e.clientY - rect.top);
  }, { passive: false });

  function pointerSpread() {
    const [a, b] = [...pointers.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  }

  function pointerMidpoint() {
    const [a, b] = [...pointers.values()];
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  /**
   * Keys are captured, not bubbled: the map opens on top of the saddlebag, and
   * the saddlebag closes on Escape and on I. Letting either through would shut
   * the panel underneath the one being read.
   */
  const onKey = (e) => {
    const pan = e.shiftKey ? 120 : 48;
    switch (e.key) {
      case 'Escape':
      case 'm':
      case 'M':
        close();
        break;
      // Swallowed, not handled. I is the saddlebag key, and it is live on the
      // road AND inside the open saddlebag this map may be sitting on top of.
      // Either one would resume the walk behind the map when it closed, and an
      // encounter would then fire under an open panel.
      case 'i':
      case 'I':
        break;
      case 'ArrowLeft': view.x += pan; break;
      case 'ArrowRight': view.x -= pan; break;
      case 'ArrowUp': view.y += pan; break;
      case 'ArrowDown': view.y -= pan; break;
      case '+':
      case '=': zoomBy(1.35); break;
      case '-':
      case '_': zoomBy(1 / 1.35); break;
      case '0': centreOnPlayer(true); break;
      default: return;
    }
    clampPan();
    e.preventDefault();
    e.stopPropagation();
  };
  document.addEventListener('keydown', onKey, true);

  // --- render ------------------------------------------------------------
  function render(now) {
    frame = requestAnimationFrame(render);
    if (!model) return;
    if (!started) started = now;
    const time = now - started;

    ctx.setTransform(port.dpr, 0, 0, port.dpr, 0, 0);
    crisp(ctx);
    ctx.fillStyle = PALETTE.shadow;
    ctx.fillRect(0, 0, port.w, port.h);

    ctx.save();
    ctx.translate(Math.round(view.x), Math.round(view.y));
    ctx.scale(view.zoom, view.zoom);
    ctx.drawImage(background, 0, 0);
    ctx.restore();

    const nextIndex = engine.nextIndex();
    for (const node of model.nodes) {
      const sx = view.x + node.x * view.zoom;
      const sy = view.y + node.y * view.zoom;
      if (sx < -80 || sy < -80 || sx > port.w + 80 || sy > port.h + 80) continue;
      // `nextIndex` counts events; node 0 is the trailhead, so it is offset.
      const isNext = nextIndex >= 0 && node.index === nextIndex + 1;
      drawMarker(ctx, markers, node, sx, sy, { isNext, time, zoom: view.zoom });
    }

    drawPlayer(ctx, view, model, engine.getTravelled(), time);
  }
  frame = requestAnimationFrame(render);

  // --- teardown ----------------------------------------------------------
  function close() {
    cancelAnimationFrame(frame);
    observer.disconnect();
    document.removeEventListener('keydown', onKey, true);
    backdrop.remove();
    play('back');
    if (opts.onClose) opts.onClose();
  }

  return { close };
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

function drawMarker(ctx, markers, node, sx, sy, { isNext, time, zoom }) {
  const sprite = markers[MARKER_ART[node.type]] || markers.duel;
  const x = Math.round(sx - MARKER_PX / 2);
  const y = Math.round(sy - MARKER_PX + MARKER_LIFT);

  // The one you are walking towards wears a gold ring, pulsing. It replaces
  // the old "what is next" toast the Map used to print, and it is the only
  // thing on the map competing for attention.
  if (isNext) {
    const pulse = 0.5 + 0.5 * Math.sin(time / 420);
    ctx.save();
    ctx.globalAlpha = 0.35 + pulse * 0.4;
    ctx.strokeStyle = PALETTE.goldLight;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx, sy - MARKER_PX / 2 + MARKER_LIFT, MARKER_PX * 0.62 + pulse * 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.globalAlpha = node.resolved ? 0.42 : 1;
  ctx.drawImage(sprite, x, y, MARKER_PX, MARKER_PX);
  ctx.restore();

  // Cleared ground is struck through — a map that never changes as you walk it
  // is a map you stop opening.
  if (node.resolved && node.type !== 'start') {
    ctx.save();
    ctx.strokeStyle = PALETTE.redDark;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(x + 6, y + 6);
    ctx.lineTo(x + MARKER_PX - 6, y + MARKER_PX - 6);
    ctx.moveTo(x + MARKER_PX - 6, y + 6);
    ctx.lineTo(x + 6, y + MARKER_PX - 6);
    ctx.stroke();
    ctx.restore();
  }

  const label = MARKER_LABELS[node.type];
  // Unknown stops come in runs of five or more and their label is the longest
  // on the sheet, so they crowd exactly the way the duels do.
  const crowded = node.type === 'enemy' || node.type === 'start' || node.type === 'unknown';
  if (!label || (crowded && zoom < DUEL_LABEL_ZOOM)) return;
  drawLabel(ctx, label, sx, sy + 6, node.resolved ? 0.5 : 1);
}

/** A label on a dark plaque, in the game's own pixel font. */
function drawLabel(ctx, text, cx, top, alpha) {
  const scale = 2;
  const w = measureText(text, 1) * scale;
  const h = GLYPH_H * scale;
  ctx.save();
  ctx.globalAlpha = alpha * 0.72;
  ctx.fillStyle = PALETTE.shadow;
  ctx.fillRect(Math.round(cx - w / 2) - 4, Math.round(top) - 3, w + 8, h + 6);
  ctx.globalAlpha = alpha;
  drawTextCentered(ctx, text, cx, top, { scale, color: PALETTE.bone, spacing: 1 });
  ctx.restore();
}

/**
 * The blue circle: a halo that breathes, a ring, the disc, and a white core.
 *
 * Four rings rather than one dot because the map is a busy picture and the one
 * thing that must never be hunted for is where you are standing.
 */
function drawPlayer(ctx, view, model, travelled, time) {
  const p = playerPoint(model.nodes, travelled);
  const sx = view.x + p.x * view.zoom;
  const sy = view.y + p.y * view.zoom;
  const pulse = 0.5 + 0.5 * Math.sin(time / 700);

  ctx.save();
  ctx.globalAlpha = 0.14 + pulse * 0.12;
  ctx.fillStyle = PALETTE.blueLight;
  ctx.beginPath();
  ctx.arc(sx, sy, 16 + pulse * 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 1;
  ctx.fillStyle = PALETTE.blueDark;
  ctx.beginPath();
  ctx.arc(sx, sy, 11, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = PALETTE.blue;
  ctx.beginPath();
  ctx.arc(sx, sy, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = PALETTE.blueLight;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(sx, sy, 8, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = PALETTE.white;
  ctx.beginPath();
  ctx.arc(sx - 1, sy - 1, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  drawLabel(ctx, 'You', sx, sy + 16, 1);
}

/**
 * Open the map for the run in progress.
 *
 * The saddlebag can be opened from four places, and "Open" on the Map has to
 * mean the same thing in all of them. A screen that is standing STILL on the
 * road — the shop, the inn — has no walk to hold, so this is everything it
 * needs. The exploration screen wires `openTrailMap` up itself because it also
 * has to pause and resume around the panel, and the duel does not offer the
 * Map at all: you are being shot at.
 *
 * @returns {{close: () => void}|null}
 */
export function openTrailMapForRun() {
  const panel = openTrailMap({ engine: getEngine() });
  if (!panel) toast('The road ahead is blank', 'bad');
  return panel;
}

/** One entry of the legend: the marker itself, at half size, and its name. */
function legendChip(sprite, label) {
  const img = el('img.pixel', {
    src: sprite.toDataURL('image/png'),
    alt: '',
    'aria-hidden': 'true',
    width: '20',
    height: '20',
    draggable: 'false',
  });
  return el('span.chip.map-legend-chip', {}, [img, label]);
}
