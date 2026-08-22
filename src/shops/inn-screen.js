/**
 * SHOOT! — Inn screen.
 *
 * Two offers, side by side. The only thing that matters — how many lives you
 * get back — is stated in the same red diamonds used everywhere else in the
 * game, so it can be compared against the lives you are missing without doing
 * arithmetic.
 *
 * THE TWO BEDS ARE TWO BEDS
 * ---------------------------------------------------------------------------
 * Both offers used to show the same 16 x 16 `bed` icon at 3x, so the screen
 * asked you to choose between two identical pictures and read the difference
 * out of the price. Each offer now stands in a little room of its own with its
 * own bed drawn in it (`src/art/sprites-venue.js`): a plank cot with a straw
 * sack and an army blanket, or a panelled frame with brass on the posts, two
 * pillows and a quilt. The prices agree with the pictures rather than being
 * the only thing that distinguishes them.
 *
 * The old version buried this: a bare row of diamonds floated at the top of a
 * panel with no label, the offers were wide rows with the price stranded on the
 * far right, and the whole thing sat inside a panel inside a panel.
 */

import { el, clearNode } from '../core/dom.js';
import { t, tPlural } from '../core/i18n.js';
import { attachButtonSounds, play, playMusic } from '../core/audio.js';
import { setRenderer } from '../core/scene.js';
import { bedURL, venueSize } from '../art/sprites-venue.js';
import { getState, spendGold, canAfford, heal, fullHeal } from '../game/player.js';
import { generateOffers, innSeed } from './inn.js';
import { DISCOUNT_RATE } from './shop.js';
import { finishEncounter } from '../game/run.js';
import { openInventory } from '../ui/inventory-panel.js';
import { openTrailMapForRun } from '../ui/map-panel.js';
import { livesRow, updateLivesRow, icon } from '../ui/widgets.js';
import { trailBand } from '../ui/statusbar.js';
import { toast } from '../ui/toast.js';
import { track as trackAchievement } from '../game/achievements.js';
import { createInteriorScene } from './interior-scene.js';
import { EVENTS, on } from '../core/events.js';

export const InnScreen = {
  id: 'inn',

  mount(root, params = {}) {
    const player = getState();
    const offers = generateOffers(
      player.world,
      innSeed(player.world, params.encounter?.index ?? 0, player.seed),
    );
    const rested = new Set();

    playMusic('themeMenu');
    setRenderer(createInteriorScene('inn'));

    const band = trailBand();
    const lives = livesRow(player.lives, player.maxLives, { large: true, bonus: player.bonusLives });
    const livesNote = el('span.muted', { text: livesText() });
    const bedGrid = el('div.bed-grid.stagger');

    // 40 x 24 source pixels at 5x — an exact multiple, which is the only way
    // pixel art stays pixel art in an <img>.
    const BED_SCALE = 5;
    const bedPx = venueSize('bedStraw');

    const unsub = on(EVENTS.LIVES_CHANGED, ({ lives: l, maxLives, bonus }) => {
      updateLivesRow(lives, l, maxLives, bonus);
      livesNote.textContent = livesText();
    });
    // …and the beds follow the purse, the same way the stall and the forge do:
    // sell something from the saddlebag and the good bed goes affordable while
    // you are standing in front of it.
    const unsubGold = on(EVENTS.GOLD_CHANGED, renderBeds);

    function livesText() {
      const s = getState();
      const missing = s.maxLives - s.lives;
      if (missing === 0) return t('Full health');
      return tPlural(missing, '1 life down', '{count} lives down');
    }

    function rest(offer) {
      const state = getState();
      if (rested.has(offer.id)) return;
      if (state.lives >= state.maxLives) {
        play('error');
        toast('You are already well rested', 'bad');
        return;
      }
      if (!canAfford(offer.price)) {
        play('error');
        toast(t('{gold} gold short', { gold: offer.price - state.gold }), 'bad');
        return;
      }
      spendGold(offer.price);
      const healed = offer.heal === Infinity ? fullHeal() : heal(offer.heal);
      rested.add(offer.id);
      trackAchievement('bedTaken', { id: offer.id, healed });
      play('coin');
      toast(`Slept well — ${healed} ${healed === 1 ? 'life' : 'lives'} back`, 'good');
      renderBeds();
    }

    function renderBeds() {
      clearNode(bedGrid);
      const state = getState();
      const full = state.lives >= state.maxLives;

      offers.forEach((offer) => {
        const used = rested.has(offer.id);
        const gain = offer.heal === Infinity
          ? state.maxLives - state.lives
          : Math.min(offer.heal, state.maxLives - state.lives);

        bedGrid.append(
          el('div.bed-card', {
            class: `${used ? 'is-used' : ''} ${offer.id === 'premium' ? 'is-premium' : ''}`.trim(),
          }, [
            offer.discounted && !used
              ? el('span.discount-flag', { text: `-${Math.round(DISCOUNT_RATE * 100)}%` })
              : null,

            // The room, with its bed standing on the floor of it.
            el('div.bed-scene', {}, [
              el('img.pixel.bed-art', {
                src: bedURL(offer.id, BED_SCALE),
                width: String(bedPx.w * BED_SCALE),
                height: String(bedPx.h * BED_SCALE),
                alt: '',
              }),
            ]),

            el('div.bed-name', { text: offer.name }),
            el('p.shop-desc', { text: offer.desc }),

            // What you get, drawn rather than described — and shown only when
            // there is something to get. When you are at full lives the button
            // already says so; saying it here too, and again beside the life
            // row above, was the same sentence three times on one screen.
            full || used ? null : el('div.bed-gain', {}, [
              el('span', { text: 'Restores' }),
              livesRow(gain, gain, { small: true }),
            ]),

            el('div.card-foot', {}, [
              el('div.shop-price', {}, [
                icon('coin', 1),
                offer.discounted ? el('span.old-price', { text: String(offer.fullPrice) }) : null,
                el('span', { text: String(offer.price) }),
              ]),

              used
                ? el('button.btn.btn--sm', { disabled: true }, ['Slept here'])
                : full
                  ? el('button.btn.btn--sm', { disabled: true }, ['Lives full'])
                  : el('button.btn.btn--sm.btn--gold', {
                      onclick: () => rest(offer),
                      'aria-label': t('{name} for {gold} gold', { name: t(offer.name), gold: offer.price }),
                    }, ['Sleep']),
            ]),
          ]),
        );
      });
      attachButtonSounds(bedGrid);
    }

    renderBeds();

    const screen = el('div.screen.venue-screen.inn-screen', {}, [
      band,
      el('div.screen-body', {}, [
        el('h1.hanging-sign', {}, [el('span.hanging-sign-text', { text: 'Inn' })]),
        el('div.panel.panel--braced.venue-board', {}, [
          el('div.inn-state', {}, [lives, livesNote]),
          bedGrid,
        ]),
      ]),
      el('div.screen-footer', {}, [
        el('button.btn.btn--ghost', {
          onclick: () => openInventory({
            context: 'walk',
            onClose: renderBeds,
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

    return () => {
      unsub();
      unsubGold();
      band.dispose();
    };
  },
};
