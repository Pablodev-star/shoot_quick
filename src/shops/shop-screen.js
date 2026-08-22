/**
 * SHOOT! — Shop screen.
 *
 * Three questions answered per card without reading: what is it (icon + the
 * rarity colour on the card's top edge), can I afford it (price colour + button
 * state), is it a bargain (the tag hanging off the corner). Anything you cannot
 * buy says why on the button itself.
 *
 * THE SHOP IS A STALL
 * ---------------------------------------------------------------------------
 * The goods used to sit in a rectangle in the middle of the screen, which is
 * what a list looks like. They now sit in a built thing: a striped canvas
 * awning with a scalloped valance, the store's sign hanging off it on two
 * ropes, two posts holding the whole lot up, and a plank counter under the
 * goods with the room's own crates and barrels stacked behind it
 * (`interior-scene.js`). Nothing was added to the *information* on the screen —
 * the stall is the frame the same three cards were always in, drawn.
 *
 * Removed in the rebuild: the subtitle ("the shopkeeper lays out 3 things worth
 * having" — a sentence that carried no information), the COMMON chip on every
 * card, and the panel that wrapped the grid of cards inside another frame.
 */

import { el, clearNode } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { attachButtonSounds, play, playMusic } from '../core/audio.js';
import { setRenderer } from '../core/scene.js';
import { framedIconURL } from '../art/sprites-items.js';
import { getState, addItem, spendGold, canAfford, canHold } from '../game/player.js';
import { generateStock, shopSeed, DISCOUNT_RATE } from './shop.js';
import { finishEncounter } from '../game/run.js';
import { openInventory } from '../ui/inventory-panel.js';
import { openTrailMapForRun } from '../ui/map-panel.js';
import { icon, rarityChip } from '../ui/widgets.js';
import { itemEffectNote } from '../game/progression.js';
import { trailBand } from '../ui/statusbar.js';
import { EVENTS, on } from '../core/events.js';
import { toast } from '../ui/toast.js';
import { track as trackAchievement } from '../game/achievements.js';
import { createInteriorScene } from './interior-scene.js';

export const ShopScreen = {
  id: 'shop',

  mount(root, params = {}) {
    const player = getState();
    const seed = shopSeed(player.world, params.encounter?.index ?? 0, player.seed);
    const stock = generateStock(player.world, seed);

    playMusic('themeMenu');
    setRenderer(createInteriorScene('shop'));

    const band = trailBand();
    const grid = el('div.shop-grid.stagger');

    function buy(entry, card) {
      if (entry.soldOut) return;
      if (!canHold(entry.item.id)) {
        play('error');
        toast(t('You cannot carry another {name}', { name: t(entry.item.name) }), 'bad');
        return;
      }
      if (!canAfford(entry.price)) {
        play('error');
        toast(t('{gold} gold short', { gold: entry.price - getState().gold }), 'bad');
        card.classList.remove('shake');
        void card.offsetWidth;
        card.classList.add('shake');
        return;
      }
      spendGold(entry.price);
      addItem(entry.item.id, 1);
      getState().stats.itemsBought += 1;
      trackAchievement('itemBought', { id: entry.item.id, rarity: entry.item.rarity });
      entry.units -= 1;
      play('coin');
      toast(t('Bought {name}', { name: t(entry.item.name) }), 'gold');
      renderStock();
    }

    function renderStock() {
      clearNode(grid);
      stock.forEach((entry) => {
        const affordable = canAfford(entry.price);
        const room = canHold(entry.item.id);
        const blocked = entry.soldOut || !room;

        const card = el(
          'div.shop-card',
          {
            class: [
              `rarity-${entry.item.rarity}`,
              blocked ? 'is-sold' : '',
              !affordable && !blocked ? 'is-poor' : '',
            ].filter(Boolean).join(' '),
          },
          [
            entry.discounted && !blocked
              ? el('span.discount-flag', { text: `-${Math.round(DISCOUNT_RATE * 100)}%` })
              : null,

            // 20px art at 3x = a 60px canvas shown at 60px: an exact multiple,
            // the only way pixel art stays crisp.
            el('img.pixel.shop-icon', {
              src: framedIconURL(entry.item.icon, entry.item.rarity, 3),
              width: '60',
              height: '60',
              alt: '',
            }),

            el('div.shop-name', { text: entry.item.name }),
            rarityChip(entry.item.rarity),
            // How many are left, and only when there was ever more than one:
            // a counter with four bandages on it should say so, and a vest
            // does not need to announce that it is the only vest.
            entry.stocked > 1
              ? el('div.shop-units', {
                  class: blocked ? 'is-out' : '',
                  text: blocked ? 'Sold out' : t('{n} left', { n: entry.units }),
                })
              : null,
            el('p.shop-desc', { text: entry.item.desc }),
            // What this road actually pays for it, when that is not what the
            // line above says. Null on the ordinary road — see `itemEffectNote`.
            noteFor(entry.item),

            el('div.card-foot', {}, [
              el('div.shop-price', {}, [
                icon('coin', 1),
                entry.discounted ? el('span.old-price', { text: String(entry.fullPrice) }) : null,
                el('span', { text: String(entry.price) }),
              ]),

              entry.soldOut
                ? el('button.btn.btn--sm', { disabled: true }, [entry.stocked > 1 ? 'Sold out' : 'Bought'])
                : !room
                  ? el('button.btn.btn--sm', { disabled: true }, ['Bag full'])
                  : el('button.btn.btn--sm.btn--gold', {
                      onclick: () => buy(entry, card),
                      'aria-label': t('Buy {name} for {gold} gold', { name: t(entry.item.name), gold: entry.price }),
                    }, ['Buy']),
            ]),
          ],
        );
        grid.append(card);
      });
      attachButtonSounds(grid);
    }

    renderStock();

    const screen = el('div.screen.venue-screen.stall-screen', {}, [
      band,
      el('div.screen-body', {}, [
        el('div.stall', {}, [
          el('div.stall-awning'),
          el('h1.stall-sign', {}, [
            el('span.stall-sign-text', { text: 'General Store' }),
          ]),
          el('div.stall-shelf', {}, [grid]),
          el('div.stall-counter'),
        ]),
      ]),
      el('div.screen-footer', {}, [
        el('button.btn.btn--ghost', {
          // The Map opens here too, and this is the counter it matters most at:
          // "food or a potion" is a different question when the map says the
          // next two things on the road are a duel and the boss.
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

    // The counter follows the purse: sell something out of the saddlebag while
    // standing at the stall and the thing you could not afford a moment ago is
    // buyable without leaving and coming back.
    const unsubGold = on(EVENTS.GOLD_CHANGED, renderStock);

    return () => {
      unsubGold();
      band.dispose();
    };
  },
};

/**
 * The second line under a description: what this road is actually paying for
 * the thing, when that differs from what its card has always said. Returns
 * null on the ordinary road, and `el` drops a null child, so the card is
 * unchanged for anybody who has never opened the hard one.
 */
function noteFor(item) {
  const note = itemEffectNote(item, getState().maxLives);
  return note ? el('p.shop-desc.shop-desc--mode', { text: note }) : null;
}
