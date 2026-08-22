/**
 * SHOOT! — The admin's map.
 *
 * The trail map the player carries (src/ui/map-panel.js) is drawn country with
 * not a single number on it, on purpose: what is coming is shape, never a
 * readout. This is the opposite document, and it exists because the two
 * questions a tester has are the two questions that map is built to refuse:
 *
 *   WHAT is actually out there — including every stop still face down, what
 *   the world is still holding, and what each one is worth
 *   WHY — for everything that can still go either way, the exact probability,
 *   the arithmetic behind it, and the numbers off the run that the arithmetic
 *   was fed
 *
 * That last part is the whole point. "Shop 41%" is a fact you cannot do
 * anything with; "shop 41% because the purse is at 0.74 of three beds and the
 * appetite for a counter is 0.4 + purse×2 = 1.88, times two counters still in
 * the hand, times a spacing dimmer of 0.67" is a fact you can file a bug
 * against. Every figure on this page is read live from the system that owns
 * it — the road's own planner, the world's own tables, the sky's own transition
 * matrix — so this page cannot drift out of step with the game the way a
 * hand-written design document does.
 */

import { el } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { section, readout, probBar } from './widgets.js';
import { getState, getInventory } from '../game/player.js';
import { getWorld } from '../game/worlds.js';
import { BIOMES, getBiome } from '../game/biomes.js';
import {
  explainReveal,
  effectiveDistance,
  ENCOUNTER_LABELS,
  REVEAL_AHEAD,
  SERVICE_GAP,
  SERVICE_ADJACENT_GAP,
  OPENING_FIGHTS,
  tailorWorldFor,
} from '../explore/encounters.js';
import { getWeatherState, WEATHER } from '../explore/weather.js';
import { getTimeState } from '../explore/daynight.js';
import { drainMultiplier } from '../explore/hunger.js';
import {
  HUNGER_MAX,
  HUNGER_DRAIN_PER_SEC,
  WALK_SPEED,
  HORSE_SPEED_MUL,
  HORSE_TIME_MUL,
  GUN_MAX_LEVEL,
  gunUpgradeCost,
  innBasicPrice,
  innPremiumPrice,
  innBasicHeal,
  enemyGunDamage,
  enemyGunDamageAt,
  ENEMY_DAMAGE_RAMP_AT,
  ENEMY_DAMAGE_RAMP_CHANCE,
  starvationIntervalMs,
  goldForEnemy,
  expForEnemy,
} from '../game/progression.js';
import { BASE_SLOTS, BASE_DISCOUNT_CHANCE, DISCOUNT_RATE, STOCK_ODDS } from '../shops/shop.js';
import { SPECIAL_TIMING, getAbility, getSpecial } from '../game/world-abilities.js';
import { ABILITY_CHANCE_PER_ROUND } from '../duel/duel-engine.js';
import { ARCHETYPES } from '../art/sprites-enemies.js';

const pct = (n) => `${(n * 100).toFixed(1)}%`;
const num = (n, places = 2) => (Number.isFinite(n) ? Number(n).toFixed(places).replace(/\.?0+$/, '') : '∞');

/** Normalise a weight table to probabilities. */
function odds(table) {
  const total = Object.values(table).reduce((sum, w) => sum + Number(w), 0) || 1;
  return Object.fromEntries(Object.entries(table).map(([k, w]) => [k, Number(w) / total]));
}

/**
 * The whole document.
 * @param {object} ctx the panel context — `{ engine }`
 */
export function renderAdminMap(ctx) {
  const engine = ctx.engine;
  const segment = engine?.getSegment();
  const player = getState();
  const world = getWorld(player.world);

  return el('div.admin-map', {}, [
    whereWeAre(ctx, segment, world, player),
    theRoad(segment, player),
    theNextCard(engine, segment),
    theNextFight(world, player, segment, engine),
    theSky(world),
    theCounters(world, player),
    theClocks(player),
  ]);
}

// ---------------------------------------------------------------------------
// Where we are
// ---------------------------------------------------------------------------

function whereWeAre(ctx, segment, world, player) {
  const biome = getBiome(world.biome);
  return section('Standing', [
    readout([
      ['World', `${world.id} · ${world.name}`],
      ['Biome', biome.label],
      ['Run seed', String(player.seed)],
      ['Segment seed', String(segment?.seed ?? '—')],
      ['Travelled', t('{n} px', { n: Math.round(ctx.engine?.getTravelled() ?? 0) })],
      ['Encounter', t('{index} of {total}', { index: player.encounterIndex, total: segment ? segment.events.length : '?' })],
      ['Duels this world', String(world.encounters.duels)],
      // Which world this run hid the clothing shop in. There is one in a whole
      // run and it is chosen off the seed, so a tester chasing it would
      // otherwise be reduced to walking seven worlds and hoping.
      ['Clothier world', String(tailorWorldFor(player.seed))],
      ['Mounted', player.hasHorse ? 'yes' : 'no'],
    ]),
  ], segment ? null : 'No segment loaded — the road has nothing on it yet.');
}

// ---------------------------------------------------------------------------
// The road itself
// ---------------------------------------------------------------------------

/**
 * Every stop, face up or not.
 *
 * The player's map draws five and blanks the rest; this one lists all of them
 * and says which are still undecided — a face-down stop is not a secret here,
 * it is a stop whose KIND has not been drawn yet, and saying so is more useful
 * than pretending the road already knows.
 */
function theRoad(segment, player) {
  if (!segment) return null;
  const mounted = player.hasHorse;
  const nextIndex = segment.events.findIndex((e) => !e.resolved);

  const rows = segment.events.map((event) => {
    const state = event.resolved
      ? 'cleared'
      : event.index === nextIndex
        ? 'next'
        : event.hidden
          ? 'face down'
          : 'ahead';
    return el(`div.admin-stop.is-${state.replace(' ', '-')}`, {}, [
      el('span.admin-stop-index', { text: String(event.index) }),
      el('span.admin-stop-kind', {
        text: event.hidden ? '?' : ENCOUNTER_LABELS[event.type] || event.type,
      }),
      el('span.admin-stop-dist', {
        text: `${Math.round(effectiveDistance(event, mounted, HORSE_TIME_MUL))} px`,
      }),
      el('span.admin-stop-progress', { text: `${Math.round((event.progress ?? 0) * 100)}%` }),
      el('span.admin-stop-state', { text: state }),
    ]);
  });

  const hand = segment.hand || [];
  const counted = hand.reduce((acc, kind) => ({ ...acc, [kind]: (acc[kind] || 0) + 1 }), {});

  return section('The road', [
    el('div.admin-stops', {}, rows),
    readout([
      ['Still in the hand', hand.length ? Object.entries(counted).map(([k, n]) => `${n}× ${ENCOUNTER_LABELS[k] || k}`).join(' · ') : 'nothing — every card is dealt'],
      ['Face up window', `${REVEAL_AHEAD} stops`],
      ['Spacing', `${SERVICE_ADJACENT_GAP} fight minimum between buildings, ${SERVICE_GAP} wanted`],
      ['Opening rule', `first ${OPENING_FIGHTS} stops are fights while the hand has one`],
    ]),
  ], 'The whole segment, including what the player cannot see. A stop marked "face down" has no kind yet — it is decided when the horizon reaches it.');
}

// ---------------------------------------------------------------------------
// The next card, and the arithmetic behind it
// ---------------------------------------------------------------------------

function theNextCard(engine, segment) {
  if (!segment) return null;
  const reading = engine.getReading();
  const plan = explainReveal(segment, reading);
  if (!plan) {
    return section('The next card', [
      el('p.admin-hint', { text: 'Nothing is face down. Every stop on this road has been decided.' }),
    ]);
  }

  const bars = Object.entries(plan.chances)
    .sort((a, b) => b[1] - a[1])
    .map(([kind, p]) => {
      const held = plan.hand.filter((k) => k === kind).length;
      const appetite = plan.appetites[kind] ?? 0;
      const dim = kind === 'enemy' ? 1 : plan.flags.spacing;
      const detail = plan.forced
        ? `forced${plan.flags.admin === kind ? ' by the panel' : plan.flags.opening ? ' — a world opens with fights' : ' — the last bed is held for the boss'}`
        : `appetite ${num(appetite)} × ${held} in hand × spacing ${num(dim)} = weight ${num(plan.weights[kind] ?? 0)}`;
      return probBar(ENCOUNTER_LABELS[kind] || kind, p, detail);
    });

  const state = plan.reading;
  return section('The next card', [
    el('div.admin-probs', {}, bars),
    el('div.divider', { text: 'what those odds are read off' }),
    readout([
      ['health', t('{value} — lives ÷ max lives', { value: num(state.health) })],
      ['belly', t('{value} — rations ÷ full gauge', { value: num(state.belly) })],
      ['purse', t('{value} — gold ÷ three premium beds here', { value: num(state.purse) })],
      ['stocked', state.stocked ? 'yes — something edible in the bag' : 'no — nothing to eat'],
      ['canAffordRung', state.canAffordRung ? 'yes' : 'no'],
      ['lastCall', plan.flags.lastCall ? `yes — ${plan.hand.length} cards left` : 'no'],
      ['since a building', t('{n} stops', { n: plan.flags.since })],
      ['spacing dimmer', num(plan.flags.spacing)],
      ['fights in reserve', plan.flags.canFight ? 'yes' : 'no — the rest of the road alternates'],
      ['beds in hand', String(plan.flags.bedsInHand)],
      ['must be a fight', plan.flags.mustFight ? 'yes — the last stop was a building' : 'no'],
      ['legal here', plan.allowed.map((k) => ENCOUNTER_LABELS[k] || k).join(', ')],
    ]),
  ], 'The road picks the kind of the next face-down stop from how the run is going. This is that decision, before it is taken.');
}

// ---------------------------------------------------------------------------
// The next fight
// ---------------------------------------------------------------------------

/**
 * What a rider out here is rolled from.
 *
 * Everything is the world's own table, printed as probabilities rather than as
 * weights — a `lives` table of `{6:30, 7:40, 8:25, 9:5}` is not readable as
 * odds at a glance, and "how often does the bayou actually send a nine" is a
 * balance question somebody asks about once a week.
 */
function theNextFight(world, player, segment, engine) {
  const profile = world.enemy;
  const nextEvent = engine?.nextEvent?.();
  const progress = nextEvent?.progress ?? 0;
  const ramped = progress >= ENEMY_DAMAGE_RAMP_AT;
  const livesOdds = odds(profile.lives);
  const rosterShare = 1 / profile.roster.length;

  const abilityRows = profile.abilities.map((id) => {
    const ability = getAbility(id);
    return el('div.admin-kv', {}, [
      el('span.k', { text: ability.label }),
      el('span.v', { text: ability.tip }),
    ]);
  });

  const special = getSpecial(profile.special);

  return section('The next rider', [
    el('div.admin-probs', {}, Object.entries(livesOdds).map(([lives, p]) =>
      probBar(`${lives} ${Number(lives) === 1 ? 'life' : 'lives'}`, p, t('worth {gold} gold · {exp} exp', { gold: goldForEnemy({ worldId: world.id, lives: Number(lives) }), exp: expForEnemy({ worldId: world.id, lives: Number(lives) }) })))),
    readout([
      ['Carrying a trick', pct(profile.abilityChance)],
      ['…and a second one', world.id >= 4 ? pct(profile.abilityChance * 0.5) : 'never before the bayou'],
      ['Reaches for it', `${pct(ABILITY_CHANCE_PER_ROUND)} a round`],
      ['Carrying the landmark', pct(profile.specialChance || 0)],
      ['Landmark erupts', `${pct(SPECIAL_TIMING.earlyChance)} a round for ${SPECIAL_TIMING.earlyRounds} rounds, then ${pct(SPECIAL_TIMING.lateChance)}`],
      ['Reads your move', pct(profile.accuracy)],
      ['Bullet', t('{n} lives', { n: num(enemyGunDamageAt(world.id, progress, false)) })],
      [
        'Heavier bullet',
        progress >= ENEMY_DAMAGE_RAMP_AT
          ? t('{pct} for {n} lives', { pct: pct(ENEMY_DAMAGE_RAMP_CHANCE), n: num(enemyGunDamageAt(world.id, progress, true)) })
          : `not until ${Math.round(ENEMY_DAMAGE_RAMP_AT * 100)}% along (this stop is ${Math.round(progress * 100)}%)`,
      ],
      ['Roster', profile.roster.map((id) => `${ARCHETYPES[id]?.names?.[0] || id} ${pct(rosterShare)}`).join(' · ')],
    ]),
    el('div.divider', { text: t(ramped ? 'the kit this world carries · past the ramp' : 'the kit this world carries') }),
    el('div.admin-readout', {}, abilityRows),
    special ? readout([['Landmark', `${special.label} — ${special.tip}`]]) : null,
    el('div.divider', { text: 'the boss at the end of it' }),
    readout([
      ['Name', world.boss.name],
      ['Lives', String(world.boss.phases ? world.boss.phases.map((p) => p.lives).join(' + ') : world.boss.lives)],
      ['Reads your move', pct(world.boss.accuracy)],
      ['Bullet', t('{n} lives', { n: num(enemyGunDamage(world.id)) })],
      ['Tricks', (world.boss.abilities || []).map((id) => getAbility(id).label).join(', ') || 'none'],
      ['Landmark', world.boss.special ? getSpecial(world.boss.special).label : 'none'],
      ['Pays', t('{gold} gold · {exp} exp', { gold: goldForEnemy({ worldId: world.id, lives: world.boss.lives, isBoss: true }), exp: expForEnemy({ worldId: world.id, lives: world.boss.lives, isBoss: true }) })],
    ]),
  ], 'Rolled fresh for every duel from this world\'s profile. The percentages are the world\'s own weight tables, normalised.');
}

// ---------------------------------------------------------------------------
// The sky
// ---------------------------------------------------------------------------

/**
 * Weather is a Markov chain per biome (src/game/biomes.js), so what a tester
 * actually wants is the row of the matrix they are standing on: where this sky
 * can go next and how likely each one is. The rest of the table is printed
 * underneath, because "why did it never snow" is usually answered by a row
 * three lines further down.
 */
function theSky(world) {
  const sky = getWeatherState();
  const biome = BIOMES[world.biome] || BIOMES.desert;
  const from = biome.weather[sky.id] || biome.weather.clear || { clear: 1 };
  const next = odds(from);

  const rows = Object.entries(biome.weather).map(([id, table]) =>
    el('div.admin-kv', {}, [
      el('span.k', { text: WEATHER[id]?.label || id }),
      el('span.v', {
        text: Object.entries(odds(table))
          .map(([to, p]) => `${WEATHER[to]?.label || to} ${pct(p)}`)
          .join(' · '),
      }),
    ]));

  return section('The sky', [
    readout([
      ['Now', `${sky.label} (${sky.id})`],
      ['On screen', sky.shownId],
      ['Intensity', num(sky.intensity)],
      ['Visibility', num(sky.visibility)],
      ['Hunger', `×${num(sky.hungerMul)}`],
      ['Duel effect', Object.keys(sky.duel || {}).length ? JSON.stringify(sky.duel) : 'none'],
      ['Lasts', `${WEATHER[sky.id]?.minMs / 1000}–${WEATHER[sky.id]?.maxMs / 1000} s`],
    ]),
    el('div.divider', { text: 'where it can go from here' }),
    el('div.admin-probs', {}, Object.entries(next).map(([id, p]) =>
      probBar(WEATHER[id]?.label || id, p, WEATHER[id]?.hungerMul ? `hunger ×${WEATHER[id].hungerMul}` : ''))),
    el('div.divider', { text: t('every sky the {biome} has', { biome: t(biome.label).toLowerCase() }) }),
    el('div.admin-readout', {}, rows),
  ]);
}

// ---------------------------------------------------------------------------
// The counters
// ---------------------------------------------------------------------------

function theCounters(world, player) {
  const perks = player.shopPerks || {};
  const rarity = odds(world.rarity);
  const stock = Object.entries(STOCK_ODDS).map(([tier, table]) =>
    el('div.admin-kv', {}, [
      el('span.k', { text: tier }),
      el('span.v', {
        text: Object.entries(odds(table)).map(([n, p]) => `${n}× ${pct(p)}`).join(' · '),
      }),
    ]));

  return section('The counters', [
    el('div.admin-probs', {}, Object.entries(rarity).map(([tier, p]) =>
      probBar(tier, p, `the tier each slot rolls on`))),
    readout([
      ['Slots', `${BASE_SLOTS} + ${Math.floor(perks.extraSlots || 0)} bought`],
      ['Slot zero', 'always something that heals'],
      ['Discount', `${pct(Math.min(0.85, BASE_DISCOUNT_CHANCE + (perks.discountBonus || 0)))} a slot, at ${pct(DISCOUNT_RATE)} off`],
      ['Price here', `base × 2 × 1.42^${world.id - 1} × ${world.priceMul}`],
      ['Bed', t('{cheap} for {lives} lives · {dear} for the lot', { cheap: innBasicPrice(world.id), lives: num(innBasicHeal(world.id, player.maxLives)), dear: innPremiumPrice(world.id) })],
      [
        'Next rung',
        player.gunLevel >= GUN_MAX_LEVEL
          ? 'the gun is a Nova — nothing left to buy'
          : t('{gold} gold', { gold: gunUpgradeCost(player.gunLevel) }),
      ],
    ]),
    el('div.divider', { text: 'how many of a thing lands on the shelf' }),
    el('div.admin-readout', {}, stock),
  ]);
}

// ---------------------------------------------------------------------------
// The clocks
// ---------------------------------------------------------------------------

function theClocks(player) {
  const drain = drainMultiplier();
  const perSec = HUNGER_DRAIN_PER_SEC * drain.total;
  const time = getTimeState();
  const speed = WALK_SPEED * (player.hasHorse ? HORSE_SPEED_MUL : 1);
  const food = getInventory().filter((e) => e.item.food);

  return section('The clocks', [
    readout([
      ['Hunger', `${num(player.hunger, 1)} / ${HUNGER_MAX}`],
      ['Draining', t('{n} a second (×{mul})', { n: num(perSec), mul: num(drain.total) })],
      ['…horse', drain.horse ? 'yes' : 'no'],
      ['…canteen', drain.canteen ? 'yes' : 'no'],
      ['…weather', `×${num(drain.weather)}`],
      ['…panel', `×${num(drain.admin ?? 1)}`],
      ['Empty in', perSec > 0 ? `${Math.round(player.hunger / perSec)} s of walking` : 'never'],
      ['Then', t('half a life every {n} s', { n: Math.round(starvationIntervalMs(player.maxLives) / 1000) })],
      ['Carrying', food.length ? food.map((e) => `${e.item.name} ×${e.qty}`).join(' · ') : 'nothing edible'],
      ['Walking', t('{n} px a second', { n: num(speed, 1) })],
      ['Hour', t(time.isNight ? '{phase} · night, −0.1 to their read' : '{phase}', { phase: t(time.phase) })],
    ]),
  ]);
}
