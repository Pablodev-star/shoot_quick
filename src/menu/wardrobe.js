/**
 * SHOOT! — The wardrobe screen.
 *
 * Reached by tapping the avatar on the profile — the pencil in the corner of
 * the plate is the invitation. Clothes on the left, the man wearing them on the
 * right, and nothing is committed until Save.
 *
 * THE MANNEQUIN IS THE POINT
 * ---------------------------------------------------------------------------
 * Every other way of showing an outfit is a list of four nouns. So the right
 * half of the screen is the gunslinger himself, breathing on the spot in the
 * idle loop the game uses everywhere else, wearing what is currently selected —
 * not what is currently SAVED. Pick a hat and it is on his head before your
 * finger is off the card, which is the whole reason to draw him at all.
 *
 * NOTHING IS COMMITTED UNTIL SAVE
 * ---------------------------------------------------------------------------
 * The preview is composed off to one side (`previewSprites`) and never touches
 * the rig's own cache, so the man at the end of the road behind this screen
 * keeps wearing the saved outfit while you try things on in front of him. Save
 * writes the profile, dresses the rig, and the backdrop changes on the next
 * frame — along with the profile portrait, the road, the saddle and the duel.
 *
 * LOCKED IS DRAWN, NOT HIDDEN
 * ---------------------------------------------------------------------------
 * Same rule as the achievements screen it borrows from: every garment in the
 * game is on this screen from the first minute, a locked one greyed to a flat
 * mannequin with the line it is waiting for printed underneath. You cannot go
 * and earn something you have never been shown — and now that half the drawer
 * is bought rather than earned, you cannot go and BUY something you have never
 * been shown either, so a locked card says which of the two it is waiting for.
 *
 * THE LAST DRAWER SHOWS A HORSE
 * ---------------------------------------------------------------------------
 * Tack is worn by the animal, so the mannequin is swapped for the animal while
 * that drawer is open: same plate, same idle loop, the rider up in whatever
 * else is being tried on. A harness cannot be judged on a man, and a bridle
 * drawn on nothing is four brown pixels.
 */

import { el, clearNode } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { back } from '../core/router.js';
import { attachButtonSounds, play } from '../core/audio.js';
import { startMenuScene } from './menu-scene.js';
import { backButton, uiIcon } from '../ui/widgets.js';
import { toast } from '../ui/toast.js';
import { getProfile } from '../core/settings.js';
import {
  CHARACTER_TIMING,
  HORSE_TIMING,
  HORSE_FRAME_LIFT,
  RIDER_OFFSET,
} from '../art/sprites-character.js';
import { pieceThumb, lockedThumb } from '../art/sprites-wardrobe.js';
import { makeCanvas, drawSprite, frameAt, crisp } from '../art/pixel.js';
import { createEmberAura } from '../art/ember-aura.js';
import {
  OUTFIT_SLOTS,
  emberIntensity,
  getOutfit,
  getWardrobe,
  horseEmberIntensity,
  previewMount,
  previewSprites,
  saveOutfit,
} from '../game/wardrobe.js';

/** Source pixels per drawn pixel on the mannequin, and the room around him. */
const STAGE = { scale: 7, w: 26, h: 30 };

/**
 * The horse needs a wider stage and a smaller pixel: it is 32 source pixels
 * across against the man's 16, and drawn at the mannequin's own scale it would
 * be standing half outside the plate.
 */
const MOUNT_STAGE = { scale: 5, w: 38, h: 34 };

export const WardrobeScreen = {
  id: 'wardrobe',

  mount(root) {
    startMenuScene();

    const saved = getOutfit();
    /** What is being tried on. Only Save moves it onto the player. */
    const pending = { ...saved };
    let slot = 'hat';

    // --- the mannequin -----------------------------------------------------
    // One canvas, sized to hold whichever of the two is bigger: the man on his
    // own at seven pixels a pixel, or the horse and rider at five. Swapping the
    // canvas when the drawer changes would restart the animation and resize the
    // plate under it; swapping what is drawn on it does not.
    const stageW = Math.max(STAGE.w * STAGE.scale, MOUNT_STAGE.w * MOUNT_STAGE.scale);
    const stageH = Math.max(STAGE.h * STAGE.scale, MOUNT_STAGE.h * MOUNT_STAGE.scale);
    const stage = makeCanvas(stageW, stageH);
    stage.canvas.className = 'pixel wardrobe-figure';
    stage.canvas.style.width = `${stageW}px`;
    stage.canvas.style.height = `${stageH}px`;
    stage.canvas.setAttribute('role', 'img');
    stage.canvas.setAttribute('aria-label', t('Your gunslinger'));
    crisp(stage.ctx);

    let raf = 0;
    let elapsed = 0;
    let last = performance.now();

    /**
     * The mannequin's fire.
     *
     * It burns on the PENDING outfit rather than the saved one, which is the
     * whole reason the mannequin exists: pick the Reaver's coat and it is
     * alight before your finger is off the card, and take it off again and the
     * fire goes out. Two emitters, because the horse drawer swaps the man for
     * the animal and the barding burns whether or not the rider is in the set.
     */
    const embers = createEmberAura({ intensity: 0 });
    const horseEmbers = createEmberAura({ intensity: 0 });

    function frame(now) {
      const dt = Math.min(64, Math.max(0, now - last));
      elapsed += dt;
      last = now;
      if (slot === 'horse') drawMount(stage, pending, elapsed, dt, embers, horseEmbers);
      else drawFigure(stage, pending, elapsed, dt, embers);
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    // --- the picker --------------------------------------------------------
    const tabRow = el('div.wardrobe-tabs', { role: 'tablist' });
    const grid = el('div.wardrobe-grid', { role: 'listbox', 'aria-label': 'Garments' });
    const wornList = el('dl.wardrobe-worn');
    const saveBtn = el('button.btn.btn--gold.btn--lg', { onclick: () => commit() }, ['Save']);
    const undoBtn = el('button.btn.btn--sm.btn--ghost', { onclick: () => undo() }, ['Undo']);

    function dirty() {
      return OUTFIT_SLOTS.some((s) => pending[s] !== saved[s]);
    }

    function renderTabs() {
      const { slots } = getWardrobe(pending);
      clearNode(tabRow);
      for (const entry of slots) {
        tabRow.append(el('button.btn.btn--sm.wardrobe-tab', {
          class: entry.slot === slot ? 'is-active' : '',
          role: 'tab',
          'aria-selected': entry.slot === slot ? 'true' : 'false',
          onclick: () => {
            if (slot === entry.slot) return;
            slot = entry.slot;
            stage.canvas.setAttribute(
              'aria-label',
              t(slot === 'horse' ? 'Your horse' : 'Your gunslinger'),
            );
            renderTabs();
            renderGrid();
          },
        }, [
          el('span', { text: entry.label.plural }),
          el('span.wardrobe-tab-count', { text: `${entry.ownedCount}/${entry.items.length}` }),
        ]));
      }
      // Re-rendered controls are new nodes, so they have to be given their
      // hover and click cues again — `attachButtonSounds` is idempotent.
      attachButtonSounds(tabRow);
    }

    function renderGrid() {
      const { slots } = getWardrobe(pending);
      const entry = slots.find((s) => s.slot === slot);
      clearNode(grid);
      for (const item of entry.items) {
        grid.append(card(item, () => choose(item)));
      }
      attachButtonSounds(grid);
    }

    /**
     * Try something on. A locked card is not silently inert — it says what it
     * is waiting for, which is the only thing it is on the screen to do.
     * (The refusal noise comes off the card's own `data-sfx`.)
     */
    function choose(item) {
      if (!item.owned) {
        toast(t('Locked — {reason}', { reason: t(item.lock ? item.lock.description : 'not yours yet') }), 'bad');
        return;
      }
      if (pending[item.slot] === item.id) return;
      pending[item.slot] = item.id;
      renderGrid();
      renderWorn();
    }

    function renderWorn() {
      const { slots } = getWardrobe(pending);
      clearNode(wornList);
      for (const entry of slots) {
        const item = entry.items.find((i) => i.equipped);
        wornList.append(el('div.wardrobe-worn-row', {
          class: pending[entry.slot] !== saved[entry.slot] ? 'is-changed' : '',
        }, [
          el('dt', { text: entry.label.name }),
          el('dd', { text: item ? item.name : '—' }),
        ]));
      }
      saveBtn.disabled = !dirty();
      undoBtn.hidden = !dirty();
    }

    function undo() {
      Object.assign(pending, saved);
      renderGrid();
      renderWorn();
    }

    async function commit() {
      if (!dirty()) return;
      const worn = await saveOutfit(pending);
      Object.assign(pending, worn);
      Object.assign(saved, worn);
      play('coin');
      toast('Outfit saved', 'good');
      renderGrid();
      renderWorn();
    }

    const { owned, total } = getWardrobe(pending);

    const screen = el('div.screen.wardrobe-screen', {}, [
      el('div.screen-header', {}, [
        backButton(() => back('profile')),
        el('h1.screen-title', { text: 'Wardrobe' }),
        el('span.chip.chip--gold', { text: `${owned}/${total}` }),
      ]),

      el('div.screen-body', {}, [
        el('div.wardrobe-layout', {}, [
          el('div.wardrobe-picker', {}, [
            tabRow,
            grid,
            el('p.field-hint', {
              text: 'Most of this is earned, and the rest is sold at a clothing shop. Every locked piece says which.',
            }),
          ]),

          el('div.panel.panel--braced.wardrobe-stage', {}, [
            el('div.wardrobe-name', { text: getProfile().name }),
            el('div.wardrobe-plate', {}, [stage.canvas]),
            wornList,
            el('div.wardrobe-actions', {}, [undoBtn, saveBtn]),
          ]),
        ]),
      ]),
    ]);

    renderTabs();
    renderGrid();
    renderWorn();

    root.append(screen);
    attachButtonSounds(screen);

    return () => {
      cancelAnimationFrame(raf);
    };
  },
};

/** One garment. Owned ones are a picture of the thing; locked ones a mannequin. */
function card(item, onClick) {
  const locked = !item.owned;
  const lock = item.lock;
  // The horse is drawn at half the scale of a garment crop: it is twice as wide
  // as the man and the card is the same card.
  const artScale = item.slot === 'horse' ? 2 : 4;
  return el('button.wardrobe-card', {
    class: `${item.equipped ? 'is-equipped' : ''} ${locked ? 'is-locked' : ''}`.trim(),
    role: 'option',
    'aria-selected': item.equipped ? 'true' : 'false',
    'aria-label': locked
      ? t('{name}. Locked. {reason}', { name: t(item.name), reason: t(lock ? lock.description : '') })
      : t('{name}. {blurb}', { name: t(item.name), blurb: t(item.blurb) }),
    'data-sfx': locked ? 'error' : 'click',
    onclick: onClick,
  }, [
    el('div.wardrobe-card-art', {}, [
      pixelSprite(locked ? lockedThumb(item.slot) : pieceThumb(item.slot, item.id), artScale),
      locked ? el('span.wardrobe-card-lock', {}, [uiIcon('lock', 1)]) : null,
      item.equipped ? el('span.wardrobe-card-tick', {}, [uiIcon('check', 0.9)]) : null,
    ]),
    el('div.wardrobe-card-text', {}, [
      el('span.wardrobe-card-name', { text: item.name }),
      locked
        ? el('span.wardrobe-card-req', { text: lock ? lock.name : 'Locked' })
        : el('span.wardrobe-card-blurb', { text: item.blurb }),
    ]),
  ]);
}

/**
 * A baked canvas dropped straight into the DOM at an integer scale.
 *
 * Not `pixelImg`: that re-encodes a PNG per call, and this screen draws thirty
 * of them the moment it opens.
 */
function pixelSprite(sprite, scale) {
  const { canvas, ctx } = makeCanvas(sprite.width * scale, sprite.height * scale);
  crisp(ctx);
  ctx.drawImage(sprite, 0, 0, canvas.width, canvas.height);
  canvas.className = 'pixel';
  canvas.style.width = `${canvas.width}px`;
  canvas.style.height = `${canvas.height}px`;
  return canvas;
}

/**
 * The gunslinger, idling on his mark.
 *
 * Cleared and redrawn every frame with the pending outfit's own baked set, so
 * changing a hat is not a re-render of anything — the next frame simply has a
 * different sprite in it.
 */
function drawFigure(stage, outfit, elapsed, dt, embers) {
  const { canvas, ctx } = stage;
  const s = STAGE.scale;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const set = previewSprites(outfit);
  const frames = set.idle;
  const sprite = frames[frameAt(frames, elapsed, CHARACTER_TIMING.idle)];

  /** Where the soles land. The idle bob is inside the sprite, so this is fixed. */
  const footY = canvas.height - 2 * s;
  const x = Math.round((canvas.width - sprite.width * s) / 2);
  const y = footY - sprite.height * s;

  pixelShadow(ctx, canvas.width / 2, footY - s, 7, 2, s);
  /**
   * The plate is seven device pixels to a source pixel, which is a very large
   * ember — so the fire is sized against a third of that. It is the one place
   * in the game where the figure is drawn bigger than the scene it is in, and
   * particles on the sprite's own grid would come out as red bricks.
   */
  const unit = Math.max(2, Math.round(s / 3));
  embers.setIntensity(emberIntensity(outfit));
  embers.update(dt, { x, y, w: sprite.width * s, h: sprite.height * s, unit });
  embers.draw(ctx, 'back');
  drawSprite(ctx, sprite, x, y, s);
  embers.draw(ctx, 'front');
}

/**
 * The horse, in the tack that is being tried on, with the rider up.
 *
 * It is the idle loop rather than a still for the same reason the man is: tack
 * is judged moving. The animal shifts its weight and flicks its tail, the rider
 * posts a pixel out of the saddle and back, and the straps go with them —
 * which is the whole thing worth checking before you buy a harness.
 */
function drawMount(stage, outfit, elapsed, dt, embers, horseEmbers) {
  const { canvas, ctx } = stage;
  const s = MOUNT_STAGE.scale;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const { horse, rider } = previewMount(outfit);
  const frames = horse.idle;
  const index = frameAt(frames, elapsed, HORSE_TIMING.idle);
  const sprite = frames[index];
  const lift = (HORSE_FRAME_LIFT.idle[index] ?? 0) * s;

  const hoofY = canvas.height - 2 * s;
  const x = Math.round((canvas.width - sprite.width * s) / 2);
  const y = hoofY - sprite.height * s - lift;
  const rx = x + RIDER_OFFSET.x * s;
  const ry = y + RIDER_OFFSET.y * s;

  const riderFrames = rider.ride;
  const seat = riderFrames[frameAt(riderFrames, elapsed, CHARACTER_TIMING.ride)];

  const unit = Math.max(2, Math.round(s / 2));
  horseEmbers.setIntensity(horseEmberIntensity(outfit));
  horseEmbers.update(dt, { x, y, w: sprite.width * s, h: sprite.height * s, unit });
  embers.setIntensity(emberIntensity(outfit));
  embers.update(dt, { x: rx, y: ry, w: seat.width * s, h: seat.height * s, unit });

  pixelShadow(ctx, canvas.width / 2, hoofY - s, 13, 2, s);
  horseEmbers.draw(ctx, 'back');
  embers.draw(ctx, 'back');
  drawSprite(ctx, sprite, x, y, s);
  drawSprite(ctx, seat, rx, ry, s);
  horseEmbers.draw(ctx, 'front');
  embers.draw(ctx, 'front');
}

/**
 * THE SHADOW IS MADE OF PIXELS, LIKE EVERYTHING ELSE ON THE PLATE
 * ---------------------------------------------------------------------------
 * It used to be `ctx.ellipse` — a perfect vector oval with a soft anti-aliased
 * edge, under a figure whose every edge is a hard square the size of seven
 * screen pixels. At this scale that is not a subtle mismatch: the man is
 * unmistakably drawn and the thing he is standing on is unmistakably not, and
 * once you have seen it you cannot see anything else.
 *
 * So the ellipse is RASTERISED onto the same grid the sprite is on: one row per
 * source pixel, each row as wide as the circle is at that height and rounded to
 * a whole pixel, laid out from a snapped centre. Every edge on the plate is now
 * the same size of step. Two tones, because a single flat pool reads as a hole
 * — a darker core with a lighter rim is what makes it a shadow lying on a
 * floor.
 *
 * @param {number} cx centre, in device pixels
 * @param {number} cy the row the widest part of the shadow sits on
 * @param {number} rx half-width, in SOURCE pixels
 * @param {number} ry half-height, in SOURCE pixels
 * @param {number} s device pixels per source pixel
 */
function pixelShadow(ctx, cx, cy, rx, ry, s) {
  const centre = Math.round(cx / s) * s;
  const top = Math.round(cy / s) * s;
  const band = (radiusX, radiusY, alpha) => {
    ctx.fillStyle = `rgba(12, 8, 5, ${alpha})`;
    for (let row = -radiusY; row <= radiusY; row++) {
      const t = radiusY === 0 ? 0 : row / radiusY;
      const half = Math.round(radiusX * Math.sqrt(Math.max(0, 1 - t * t)));
      if (half <= 0) continue;
      ctx.fillRect(centre - half * s, top + row * s, half * 2 * s, s);
    }
  };
  band(rx, ry, 0.38);
  band(Math.max(1, rx - 3), Math.max(1, ry - 1), 0.42);
}
