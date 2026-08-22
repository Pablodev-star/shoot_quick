/**
 * SHOOT! — The travel band.
 *
 * Where am I, how many lives do I have, how hungry am I, how much gold. One
 * strip, in the same place, on every screen inside a run.
 *
 * It used to be two: a status bar and, on the road, a second full-width panel
 * underneath it holding the hunger meter and a row of weather chips. Together
 * they took a fifth of the screen before the game had drawn anything. The
 * hunger gauge now lives here — it is a survival stat like lives and gold, and
 * it belongs with them — and the weather chips are gone, because the sky
 * already shows the weather.
 *
 * FOUR GROUPS, NOT NINE THINGS IN A ROW
 * ---------------------------------------------------------------------------
 * The band used to be a flat list of children with hairline rules dropped
 * between some of them and an invisible spacer holding the right-hand end
 * apart. At a middling width that list wrapped wherever it happened to run out
 * of room, the rules ended up leading nothing, and the hunger meter — the only
 * elastic item — was thrown onto a line of its own where it drew a bar the
 * width of the screen.
 *
 * It is four groups now — where you are, how you are doing, what you have, and
 * what you can press — and each one wraps as a unit. The band measures itself
 * rather than the window (see the container queries in styles/game.css), so the
 * same strip laid over a phone and inside a 420px shop column collapses the
 * same way and at the same point.
 *
 * It subscribes to the event bus itself, so screens just mount it and forget.
 */

import { el, clearNode } from '../core/dom.js';
import { t, tPlural } from '../core/i18n.js';
import { EVENTS, on } from '../core/events.js';
import { getState, expProgress, getBoon } from '../game/player.js';
import { getWorld, FINAL_WORLD } from '../game/worlds.js';
import { HUNGER_MAX } from '../game/progression.js';
import { drainMultiplier } from '../explore/hunger.js';
import { livesRow, updateLivesRow, gauge, goldChip, uiIcon, icon } from './widgets.js';

/**
 * @param {object} opts
 * @param {boolean} [opts.hunger] include the hunger gauge (the road does; a
 *   shop counter does not — you cannot starve while browsing)
 * @param {HTMLElement[]} [opts.actions] trailing buttons
 * @returns {HTMLElement} with a `dispose()` method to drop its subscriptions
 */
export function trailBand(opts = {}) {
  const player = getState();
  const world = getWorld(player.world);

  const lives = livesRow(player.lives, player.maxLives, { bonus: player.bonusLives });
  const gold = goldChip(player.gold);
  const worldLabel = el('span.world', { text: world.name });

  /**
   * The level chip carries its own progress along its bottom edge. The number
   * alone only ever moves once every several fights, so between those moments
   * it said nothing about how close the next one was — and the exp total was
   * already being computed here for the tooltip nobody hovers on a phone.
   */
  const levelValue = el('span', { text: t('Lv {n}', { n: player.level }) });
  const levelChip = el('span.chip.chip--level', {}, [levelValue]);
  /**
   * A level-up is the slowest reward in the game — three of them every two
   * worlds — and it used to happen entirely inside a toast that was already
   * competing with the gold one. The chip performs it instead: it goes GOLD,
   * flares, and settles back into its ordinary self. The exp track underneath
   * empties and starts again in the same movement, which is the part that says
   * what actually happened.
   */
  const flare = () => {
    levelChip.classList.remove('is-levelling');
    void levelChip.offsetWidth;
    levelChip.classList.add('is-levelling');
  };
  const syncLevel = (level) => {
    const p = expProgress();
    levelValue.textContent = t('Lv {n}', { n: level });
    levelChip.style.setProperty('--exp', `${Math.round(p.ratio * 100)}%`);
    levelChip.dataset.tip = `${p.exp} / ${p.next} exp to level ${level + 1}`;
  };

  /**
   * What the last meal is still worth, counted in fights.
   *
   * A boon is the one thing a player can be carrying that has no icon in the
   * bag — the feast that granted it was eaten — so without this the effect is
   * invisible until a duel opens with two rounds already loaded and nobody can
   * remember why. It is a countdown, and it is next to the gold because that is
   * where the things you spent gold on live.
   */
  const boonChip = el('span.chip.chip--legendary', { hidden: true });
  const syncBoon = () => {
    const boon = getBoon();
    boonChip.hidden = !boon;
    if (!boon) return;
    clearNode(boonChip);
    boonChip.append(icon('feast', 1), el('span', { text: `${boon.duels}` }));
    /**
     * Written out as two whole sentences rather than assembled from a stem and
     * a plural, because Spanish does not agree the way English does — see the
     * note on `tPlural` in src/core/i18n.js.
     */
    boonChip.dataset.tip = tPlural(
      boon.duels,
      '{label} — the next duel starts with {bullets} rounds loaded',
      '{label} — the next {count} duels start with {bullets} rounds loaded',
      { label: t(boon.label), bullets: boon.bullets },
    );
  };
  syncBoon();

  const hunger = opts.hunger
    ? gauge({
        label: 'Hunger',
        iconName: 'hunger',
        ratio: player.hunger / HUNGER_MAX,
        value: `${Math.round(player.hunger)}%`,
        tip: 'Eat before it runs out — starving costs you a life at a time',
      })
    : null;

  /**
   * The wrapper is not decoration: a container query can only style things
   * *inside* the element it measures, never that element itself, and the band
   * has to change its own layout at the narrow end. So the wrapper is what
   * gets measured and the strip inside it is what reshapes.
   */
  const node = el('div.trailband-wrap', {}, [
    el('div.trailband', {}, [
      el('div.trailband-place', {}, [uiIcon('signpost', 1), worldLabel]),
      lives,
      hunger ? hunger.node : null,
      el('div.trailband-stats', {}, [levelChip, boonChip, gold]),
      opts.actions?.length ? el('div.trailband-actions', {}, opts.actions) : null,
    ]),
  ]);

  const unsubs = [
    on(EVENTS.LIVES_CHANGED, ({ lives: l, maxLives, bonus }) => updateLivesRow(lives, l, maxLives, bonus)),
    // Gold is not bound here: `goldChip` registers itself as a purse and
    // src/ui/gold-fly.js drives every one of them, so money coming in flies
    // across the screen and lands on this pill instead of appearing in it.
    on(EVENTS.EXP_CHANGED, ({ level }) => syncLevel(level)),
    on(EVENTS.LEVEL_UP, ({ level }) => {
      syncLevel(level);
      flare();
    }),
    on(EVENTS.WORLD_CHANGED, ({ world: id }) => {
      worldLabel.textContent = t(getWorld(id).name);
      worldLabel.dataset.tip = t('World {n} of {total}', { n: id, total: FINAL_WORLD });
    }),
    on(EVENTS.BOON_CHANGED, syncBoon),
  ];

  if (hunger) {
    /**
     * Two things eat your rations faster than walking does: the horse, which
     * covers more ground per hour, and harsh weather — a sandstorm half again
     * as fast, snow and ashfall not far behind. The gauge says so rather than
     * leaving the player to notice that the bar is emptying while the sky
     * happens to be orange: a badge carrying the actual combined multiplier,
     * and a track that looks scoured whenever the sky is the reason.
     *
     * It reads the number out of the hunger system rather than deciding for
     * itself what counts, so a new drain is visible here the day it is added.
     */
    const syncDrain = () => {
      const { total, horse, weatherLabel, canteen } = drainMultiplier();
      const faster = [
        horse && t('the horse'),
        weatherLabel && t('the {weather}', { weather: t(weatherLabel).toLowerCase() }),
      ].filter(Boolean);
      // No badge without something to name in it: a multiplier the player
      // cannot attribute is worse than no multiplier.
      if (Math.abs(total - 1) <= 0.001 || (!faster.length && !canteen)) {
        hunger.setRate(null);
        return;
      }
      const burning = total > 1;
      const subject = burning ? faster.join(t(' and ')) : t('the canteen');
      // The other half of the sum, when there is one. A player wearing both a
      // canteen and a sandstorm is owed the reason the number is still 1.0.
      const aside = burning
        ? (canteen ? t(', even with the canteen') : '')
        : (faster.length ? t(', despite {reasons}', { reasons: faster.join(t(' and ')) }) : '');
      /**
       * Four whole sentences rather than a stem, a verb and a tail glued
       * together. English only needs the verb to agree; Spanish moves the words
       * as well, and half a sentence cannot be translated.
       */
      const line = burning
        ? (faster.length > 1
            ? '{subject} are burning your rations faster{aside}'
            : '{subject} is burning your rations faster{aside}')
        : '{subject} is stretching your rations{aside}';
      hunger.setRate({
        text: `×${trimNumber(total)}`,
        tip: t(line, { subject: capitalise(subject), aside }),
        // Only the sky scours the track. The horse is a rate, not a texture,
        // and the canteen is the one badge that is not a warning at all.
        state: burning ? (weatherLabel ? 'is-harsh' : null) : 'is-eased',
      });
    };
    syncDrain();

    unsubs.push(
      on(EVENTS.HUNGER_CHANGED, ({ hunger: h }) =>
        hunger.set(h / HUNGER_MAX, `${Math.round(h)}%`),
      ),
      on(EVENTS.WEATHER_CHANGED, syncDrain),
      on(EVENTS.HORSE_ACQUIRED, syncDrain),
      // The canteen is bought, sold and (never) eaten like anything else in
      // the bag, so the bag is what says the rate has changed.
      on(EVENTS.INVENTORY_CHANGED, syncDrain),
    );
  }

  syncLevel(player.level);
  worldLabel.dataset.tip = t('World {n} of {total}', { n: player.world, total: FINAL_WORLD });

  node.dispose = () => {
    unsubs.forEach((fn) => fn());
    gold.dispose?.();
  };
  return node;
}

/** `1.15` rather than `1.1`, and `0.7` rather than `0.70`. */
function trimNumber(n) {
  return String(Math.round(n * 100) / 100);
}

/** First letter up, for a sentence that starts with a phrase from a list. */
function capitalise(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
