/**
 * SHOOT! — Inn logic (Block 4).
 *
 * A bed is the cheapest life on the road, and both of them are on the counter
 * at once so the choice is always the same one: patch up, or sleep it off and
 * walk out with nothing left to spend.
 *
 *   Basic Bed    heals innBasicHeal(world, maxLives) — a bit under half of you
 *   Premium Bed  heals everything
 *   Both prices follow the same exponential curve as shop items, and both are
 *   eligible for the same random 50% discount (boosted by shop perks).
 *
 * Inns used to be generated as an inseparable pair with a shop, and this note
 * used to say so. They have been rolled independently since — see the header
 * of src/explore/encounters.js — so a stretch can hold two beds and one store,
 * or a store, three fights and another store with nowhere to sleep in between.
 */

import { makeRng } from '../core/rng.js';
import { t, tPlural } from '../core/i18n.js';
import {
  innBasicHeal,
  innBasicPrice,
  innPremiumHeal,
  innPremiumPrice,
} from '../game/progression.js';
import { getState } from '../game/player.js';
import { tuning } from '../game/difficulty.js';
import { BASE_DISCOUNT_CHANCE, DISCOUNT_RATE } from './shop.js';

/**
 * Build the two offers for one inn visit.
 * @param {number} worldId
 * @param {number} seed
 */
export function generateOffers(worldId, seed) {
  const rng = makeRng(seed >>> 0);
  const perks = getState().shopPerks || {};
  const discountChance = Math.min(
    0.85,
    (BASE_DISCOUNT_CHANCE + (perks.discountBonus || 0)) * tuning().discountChanceMul,
  );

  const build = (id, name, desc, fullPrice, heal) => {
    const discounted = rng.chance(discountChance);
    return {
      id,
      name,
      desc,
      heal,
      fullPrice,
      discounted,
      price: discounted
        ? Math.max(1, Math.round((fullPrice * (1 - DISCOUNT_RATE)) / 5) * 5)
        : fullPrice,
    };
  };

  const basicHeal = innBasicHeal(worldId, getState().maxLives);
  /**
   * The good bed, which is not always the whole bar any more — see
   * `innPremiumHeal`. The card has to say what it actually does: a room that
   * promises "every life" and hands back three quarters of one is the kind of
   * lie a player finds out about with a boss in front of them.
   */
  const premiumHeal = innPremiumHeal(getState().maxLives);
  const premiumDesc = premiumHeal === Infinity
    ? t('A real room, a real bath, a real breakfast. Restores every life.')
    : tPlural(
        premiumHeal,
        'A real room, a real bath, a real breakfast. Restores 1 life — out here nobody sleeps the whole night.',
        'A real room, a real bath, a real breakfast. Restores {count} lives — out here nobody sleeps the whole night.',
      );

  return [
    build(
      'basic',
      'Basic Bed',
      tPlural(
        basicHeal,
        'A straw mattress and a thin blanket. Restores 1 life.',
        'A straw mattress and a thin blanket. Restores {count} lives.',
      ),
      innBasicPrice(worldId),
      basicHeal,
    ),
    build(
      'premium',
      'Premium Bed',
      premiumDesc,
      innPremiumPrice(worldId),
      premiumHeal,
    ),
  ];
}

export function innSeed(worldId, encounterIndex, runSeed) {
  return (runSeed ^ (worldId * 15485863) ^ (encounterIndex * 2654435761)) >>> 0;
}
