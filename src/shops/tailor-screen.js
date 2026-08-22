/**
 * SHOOT! — The clothing shop.
 *
 * The one counter in the game that sells nothing you can use. No lives, no
 * rounds, no hunger, no perk — a garment does exactly one thing, which is to be
 * the clothes the gunslinger is wearing in every screen of every run after this
 * one. That is the whole pitch, and the screen is built to make it, in this
 * order: the thing itself, drawn big; what it is; what it costs.
 *
 * IT IS THE STALL, BECAUSE IT IS THE SAME TRANSACTION
 * ---------------------------------------------------------------------------
 * Same frame as the general store (`stall-screen`), same three cards, same
 * discount flag hanging off the corner, same "N gold short" when it is out of
 * reach. Everything a player learned at the first counter they ever stopped at
 * is true here. What changes is the ROOM behind it — a clothier's, not a
 * trading post's (see `createInteriorScene('tailor')`) — and the goods on the
 * shelf, which are pictures of clothes instead of pictures of tins.
 *
 * WHAT A PURCHASE ACTUALLY DOES
 * ---------------------------------------------------------------------------
 * Writes to the PROFILE and not to the run: a garment bought here is in the
 * wardrobe tomorrow, and it is still there after the run it was bought in dies
 * in the Bayou. That is the only thing on this screen that behaves differently
 * from the general store, and it is the reason the shop exists at all — it
 * turns up once in a whole run (see src/explore/encounters.js) and a shop that
 * rare selling something that perishable would be a cruel joke.
 *
 * It is also the one purchase in the game that writes the SAVE as it happens,
 * for the same reason — see the note in `buy`.
 *
 * A complete outfit is four garments in one purchase and is written the same
 * way, in one call, because a half-written set is the one state the wardrobe
 * must never be left in.
 */

import { el, clearNode } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { attachButtonSounds, play, playMusic } from '../core/audio.js';
import { setRenderer } from '../core/scene.js';
import { getState, spendGold, canAfford } from '../game/player.js';
import { generateRail, tailorSeed, DISCOUNT_RATE } from './tailor.js';
import { finishEncounter, save as saveRun } from '../game/run.js';
import { openInventory } from '../ui/inventory-panel.js';
import { openTrailMapForRun } from '../ui/map-panel.js';
import { icon } from '../ui/widgets.js';
import { trailBand } from '../ui/statusbar.js';
import { EVENTS, on } from '../core/events.js';
import { toast } from '../ui/toast.js';
import { track as trackAchievement } from '../game/achievements.js';
import { grantClothing, SLOT_LABELS } from '../game/wardrobe.js';
import { pieceThumb } from '../art/sprites-wardrobe.js';
import { makeCanvas, crisp } from '../art/pixel.js';
import { createInteriorScene } from './interior-scene.js';

export const TailorScreen = {
  id: 'tailor',

  mount(root, params = {}) {
    const player = getState();
    const seed = tailorSeed(player.world, params.encounter?.index ?? 0, player.seed);
    const rail = generateRail(player.world, seed);

    playMusic('themeMenu');
    setRenderer(createInteriorScene('tailor'));

    const band = trailBand();
    const grid = el('div.shop-grid.stagger');

    async function buy(entry, card) {
      if (entry.bought) return;
      if (!canAfford(entry.price)) {
        play('error');
        toast(t('{gold} gold short', { gold: entry.price - getState().gold }), 'bad');
        card.classList.remove('shake');
        void card.offsetWidth;
        card.classList.add('shake');
        return;
      }
      /**
       * THE GOLD AND THE GARMENT ARE WRITTEN DOWN TOGETHER
       * ---------------------------------------------------------------------
       * Everywhere else in the game a purchase is two halves of the same
       * in-memory state — gold out, item in — and both reach the disk together
       * at the next `finishEncounter`. Reload before that and you lose both,
       * which is fair.
       *
       * Not here. The garment goes to the PROFILE the instant it is bought
       * (that is the whole point of it: it outlives the run), while the gold
       * only exists in the run until the slot is next written. A player who
       * bought a coat and reloaded before leaving the shop would come back to
       * the coat, the gold, and an unresolved tailor on the road — and since
       * the rail never offers what you already own, they could walk in again
       * and take the next thing for nothing.
       *
       * So the debit is flushed to the slot BEFORE the receipt is written. The
       * two stores cannot be made atomic — one is the save file and the other
       * is the device — but in this order the only window left is between two
       * awaited writes, which is not something a player can aim at, and it
       * fails towards the game rather than towards the exploit.
       */
      spendGold(entry.price);
      await saveRun();
      await grantClothing(entry.offer.pieces);
      entry.bought = true;
      trackAchievement('clothingBought', { id: entry.offer.id });
      play('coin');
      toast(t('{name} — yours for good', { name: t(entry.offer.name) }), 'gold');
      renderRail();
    }

    function renderRail() {
      clearNode(grid);
      if (!rail.length) {
        grid.append(el('p.shop-desc.center', {
          text: 'The rail is bare. You already own everything this trade sells.',
        }));
        return;
      }
      rail.forEach((entry) => {
        const { offer } = entry;
        const affordable = canAfford(entry.price);
        const card = el(
          'div.shop-card.clothes-card',
          {
            class: [
              offer.kind === 'set' ? 'rarity-legendary' : 'rarity-rare',
              entry.bought ? 'is-sold' : '',
              !affordable && !entry.bought ? 'is-poor' : '',
            ].filter(Boolean).join(' '),
          },
          [
            entry.discounted && !entry.bought
              ? el('span.discount-flag', { text: `-${Math.round(DISCOUNT_RATE * 100)}%` })
              : null,

            el('div.clothes-art', {}, [garmentArt(offer)]),

            el('div.shop-name', { text: offer.name }),
            el('span.chip.clothes-slot', { text: offer.label }),
            el('p.shop-desc', { text: offer.blurb }),

            el('div.card-foot', {}, [
              el('div.shop-price', {}, [
                icon('coin', 1),
                entry.discounted ? el('span.old-price', { text: String(entry.fullPrice) }) : null,
                el('span', { text: String(entry.price) }),
              ]),

              entry.bought
                ? el('button.btn.btn--sm', { disabled: true }, ['Bought'])
                : el('button.btn.btn--sm.btn--gold', {
                    onclick: () => buy(entry, card),
                    'aria-label': t('Buy {name} for {gold} gold', { name: t(offer.name), gold: entry.price }),
                  }, ['Buy']),
            ]),
          ],
        );
        grid.append(card);
      });
      attachButtonSounds(grid);
    }

    renderRail();

    const screen = el('div.screen.venue-screen.stall-screen.tailor-screen', {}, [
      band,
      el('div.screen-body', {}, [
        el('div.stall', {}, [
          el('div.stall-awning'),
          el('h1.stall-sign', {}, [
            el('span.stall-sign-text', { text: 'Dry Goods' }),
          ]),
          el('div.stall-shelf', {}, [
            grid,
            // The one thing this counter has to say that the general store does
            // not, said once, under the goods rather than over them.
            el('p.field-hint.center.clothes-note', {
              text: 'Whatever you buy here is yours for good — it is waiting in the wardrobe, whatever happens to this run.',
            }),
          ]),
          el('div.stall-counter'),
        ]),
      ]),
      el('div.screen-footer', {}, [
        el('button.btn.btn--ghost', {
          onclick: () => openInventory({
            context: 'shop',
            onUse: (id, result) => {
              if (result.effect === 'map') openTrailMapForRun();
            },
          }),
        }, [icon('shopTag', 1.1), 'Saddlebag']),
        el('button.btn.btn--primary', { onclick: () => finishEncounter() }, ['Back to the road']),
      ]),
    ]);

    root.append(screen);
    attachButtonSounds(screen);

    // Sell something out of the saddlebag at the door and the coat you could
    // not afford a moment ago is buyable, exactly as at the general store.
    const unsubGold = on(EVENTS.GOLD_CHANGED, renderRail);

    return () => {
      unsubGold();
      band.dispose();
    };
  },
};

/**
 * The goods, drawn.
 *
 * A garment is shown the way the wardrobe shows it — the piece worn on the rig,
 * cropped to the part that is actually for sale — because a name and a price is
 * not enough to decide on a hat. A complete outfit is shown as its hat and then
 * named as a set: four crops side by side at this size is four smudges.
 *
 * Canvases rather than `pixelImg`, for the same reason the wardrobe screen uses
 * them: this re-renders on every gold change.
 */
function garmentArt(offer) {
  const scale = offer.slot === 'horse' ? 3 : 5;
  const sprite = pieceThumb(offer.slot, offer.pieceId);
  const { canvas, ctx } = makeCanvas(sprite.width * scale, sprite.height * scale);
  crisp(ctx);
  ctx.drawImage(sprite, 0, 0, canvas.width, canvas.height);
  canvas.className = 'pixel';
  canvas.style.width = `${canvas.width}px`;
  canvas.style.height = `${canvas.height}px`;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute(
    'aria-label',
    offer.kind === 'set' ? `${offer.name}, a complete outfit` : `${offer.name}, ${SLOT_LABELS[offer.slot].name}`,
  );
  return canvas;
}
