/**
 * SHOOT! — Admin Panel · Lab.
 *
 * The tools that do not belong to any one system: batch rolls, deliberate
 * breakage, the raw state, the ledger, and the record of what this session has
 * already meddled with.
 *
 * ROLLING A THOUSAND OF SOMETHING IS THE ONLY HONEST WAY TO READ A PROBABILITY
 * ---------------------------------------------------------------------------
 * The Road tab prints what the odds ARE; this one measures what they DO. Those
 * are different questions and the second one has caught more bugs than the
 * first: a weight table can be right while the thing reading it rounds, clamps
 * or picks the first key twice. Every roller in here calls the real generator
 * — the same `generateEnemy`, `generateSegment` and `generateStock` the game
 * runs on — so what comes back is the game's own behaviour and not a model of
 * it. That is the same principle `tools/sim.mjs` is built on, brought inside
 * the browser where the art and the interface are.
 *
 * NOTHING IN HERE IS UNDOABLE BY ITSELF. The batch rollers are pure; the
 * breakage is not, and it says so.
 */

import { el } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { EVENTS, emit } from '../core/events.js';
import { read, write, keys as storageKeys } from '../core/storage.js';
import { getState, serialize as serializePlayer, restore as restorePlayer, announce } from '../game/player.js';
import { getWorld, WORLDS } from '../game/worlds.js';
import { generateEnemy } from '../game/enemies.js';
import { generateSegment, revealNext, roadReading } from '../explore/encounters.js';
import { generateStock, shopSeed } from '../shops/shop.js';
import { ACHIEVEMENTS, getAchievementState, unlock } from '../game/achievements.js';
import { SLOT_COUNT } from '../game/save.js';
import { innPremiumPrice, gunUpgradeCost, GUN_MAX_LEVEL, HUNGER_MAX } from '../game/progression.js';
import { getItem } from '../game/items.js';
import { allSlotAccess, MAX_ATTEMPTS } from './access.js';
import { AUDIT, note, resetOverrides } from './overrides.js';
import { section, buttons, action, dump, readout, numberField, row } from './widgets.js';

/** How many of a thing a batch rolls. Kept between renders. */
let sampleSize = 1000;
/** The last batch's report, so it survives the re-render that follows it. */
let report = '';

export const LabTab = {
  id: 'lab',
  label: 'Lab',

  render(ctx) {
    const player = getState();
    const world = getWorld(player.world);

    const show = (text) => {
      report = text;
      ctx.refresh();
    };

    // --- the doors, read asynchronously into a placeholder ------------------
    const doors = el('div.admin-readout', {}, [el('span.admin-hint', { text: 'reading…' })]);
    allSlotAccess(SLOT_COUNT).then((list) => {
      doors.replaceChildren(
        ...list.map((entry) => el('div.admin-kv', {}, [
          el('span.k', { text: t('Slot {slot}', { slot: entry.slot }) }),
          el('span.v', {
            text: entry.unlocked
              ? `open since ${new Date(entry.at).toLocaleString()}`
              : entry.locked
                ? 'closed for good'
                : `${entry.left} of ${MAX_ATTEMPTS} tries left`,
          }),
        ])),
      );
    });

    const ledger = getAchievementState();

    return el('div.admin-tab', {}, [
      section('Roll a lot of something', [
        row('Sample', numberField({
          value: sampleSize,
          min: 10,
          max: 100000,
          step: 100,
          onChange: (n) => {
            sampleSize = Math.max(10, Math.round(n));
          },
        }), 'How many to roll. Ten thousand is still instant'),
        buttons([
          action('Riders in this world', () => show(rollRiders(player.world, sampleSize))),
          action('Riders in every world', () => show(WORLDS.map((w) => rollRiders(w.id, Math.min(sampleSize, 2000))).join('\n\n'))),
          action('Roads in this world', () => show(rollRoads(player.world, Math.min(sampleSize, 2000), player))),
          action('Counters in this world', () => show(rollShops(player.world, Math.min(sampleSize, 2000)))),
        ]),
        report ? dump(report) : el('p.admin-hint', { text: 'Nothing rolled yet.' }),
      ], 'Every one of these calls the real generator with the overrides you have set, so a batch is a measurement of the game as it is configured right now.'),

      section('Break something on purpose', [
        buttons([
          action('Fire the totem scene', () => {
            ctx.close();
            setTimeout(() => emit(EVENTS.TOTEM_TRIGGERED, { reason: 'admin' }), 40);
          }, { tip: 'Plays the revival even with no totem in the bag' }),
          action('End the run', () => {
            ctx.close();
            setTimeout(() => emit(EVENTS.GAME_OVER, { reason: 'admin' }), 40);
          }, { variant: 'btn--danger', tip: 'Erases the slot, exactly like dying does' }),
          action('Clear the segment', () => {
            ctx.close();
            setTimeout(() => emit(EVENTS.SEGMENT_CLEARED, { worldId: player.world }), 40);
          }, { tip: 'The safety net that moves you on when the road runs out' }),
          action('Announce the weather', () => emit(EVENTS.WEATHER_CHANGED, {
            id: 'admin', label: 'Test', blurb: 'A sky that does not exist', tone: 'info',
          })),
          action('Ten toasts', () => {
            for (let i = 0; i < 10; i++) ctx.toast(`Toast ${i + 1}`, i % 2 ? 'good' : 'bad');
          }, { tip: 'For looking at the stack' }),
          action('Repaint the interface', () => {
            announce();
            ctx.toast('Every HUD event re-fired', 'good');
          }),
        ]),
      ], 'These emit the real events. The run will do whatever it ordinarily does when it hears them — including ending.'),

      section('The ledger', [
        readout([
          ['Unlocked', t('{done} of {total} ({percent}%)', { done: ledger.unlockedCount, total: ledger.total, percent: ledger.percent })],
        ]),
        buttons([
          action('Unlock everything', () => {
            ACHIEVEMENTS.forEach((def) => unlock(def.id));
            note('every achievement unlocked');
            ctx.refresh();
          }, { tip: 'Including every garment they pay out in' }),
          action('Wipe it', async () => {
            await write('achievements', { version: 2, unlocked: {}, progress: {} });
            note('achievement ledger wiped');
            ctx.toast('Wiped. Reload the page to see it', 'bad');
          }, { variant: 'btn--danger', tip: 'Takes a reload — the ledger is read once at boot' }),
        ]),
      ], 'This one IS permanent. The ledger lives on the device, not in the run.'),

      section('The doors', [
        doors,
      ], `Three tries per slot, ever. A slot that has been opened stays open; a slot that has spent its three never opens again. Nothing in this panel hands out a try — that is the point of them.`),

      section('The raw state', [
        buttons([
          action('The run', () => show(JSON.stringify(serializePlayer(), null, 2))),
          action('The road', () => show(JSON.stringify(ctx.engine?.getSegment() ?? {}, null, 2))),
          action('The reading', () => show(JSON.stringify(ctx.engine?.getReading() ?? reading(player, world), null, 2))),
          action('Everything on the device', async () => {
            const list = await storageKeys();
            const out = {};
            for (const key of list) out[key] = await read(key);
            show(JSON.stringify(out, null, 2));
          }, { tip: 'Every key the game has written, saves included' }),
          action('Copy what is shown', async () => {
            try {
              await navigator.clipboard.writeText(report);
              ctx.toast('Copied', 'good');
            } catch {
              ctx.toast('The browser would not allow it', 'bad');
            }
          }, { disabled: !report }),
        ]),
        el('div.divider', { text: 'paste a run back in' }),
        pasteBox(ctx),
      ], 'The paste box replaces the live run with whatever JSON you give it — the same call a save file goes through on load, with none of the checks a save gets.'),

      section('What this session has done', [
        AUDIT.length
          ? dump(AUDIT.map((entry) => {
              // A `{ was }` detail arrives unworded from src/admin/overrides.js.
              const detail = entry.detail?.was
                ? t('was {before}', { before: entry.detail.was })
                : entry.detail;
              const at = new Date(entry.at).toLocaleTimeString();
              return `${at}  ${t(entry.what)}${detail ? `  (${detail})` : ''}`;
            }).join('\n'))
          : el('p.admin-hint', { text: 'Nothing yet.' }),
        buttons([
          action('Put every override back', () => {
            resetOverrides();
            ctx.refresh();
          }, { variant: 'btn--danger' }),
        ]),
      ], 'Half an hour into a session this is the only reliable answer to "why is this run behaving like that".'),
    ]);
  },
};

// ---------------------------------------------------------------------------
// The rollers
// ---------------------------------------------------------------------------

function tally(list) {
  return list.reduce((acc, key) => ({ ...acc, [key]: (acc[key] || 0) + 1 }), {});
}

function asShare(counts, total) {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([key, n]) => `    ${String(key).padEnd(16)} ${String(n).padStart(6)}  ${((n / total) * 100).toFixed(2)}%`)
    .join('\n');
}

/** Roll riders and count what actually came out. */
function rollRiders(worldId, count) {
  const world = getWorld(worldId);
  const lives = [];
  const abilities = [];
  let withTrick = 0;
  let withSpecial = 0;
  let damage = 0;
  for (let i = 0; i < count; i++) {
    const enemy = generateEnemy(worldId, (Math.random() * 0xffffffff) >>> 0, Math.random());
    lives.push(enemy.lives);
    damage += enemy.gunDamage;
    if (enemy.abilities.length) withTrick += 1;
    if (enemy.special) withSpecial += 1;
    enemy.abilities.forEach((id) => abilities.push(id));
  }
  return [
    t('W{id} {world} — {count} riders', { id: worldId, world: t(world.name), count }),
    '  lives',
    asShare(tally(lives), count),
    `  carrying a trick   ${((withTrick / count) * 100).toFixed(2)}%  (table says ${(world.enemy.abilityChance * 100).toFixed(0)}%${worldId >= 4 ? ' + a second roll' : ''})`,
    `  carrying the landmark ${((withSpecial / count) * 100).toFixed(2)}%  (table says ${((world.enemy.specialChance || 0) * 100).toFixed(0)}%)`,
    t('  mean bullet        {n} lives', { n: (damage / count).toFixed(3) }),
    abilities.length ? '  which tricks\n' + asShare(tally(abilities), abilities.length) : '  no tricks rolled',
  ].join('\n');
}

/**
 * Deal whole roads and count what the reveal actually produces.
 *
 * The reading is taken from the live run and held still for the batch, so what
 * this measures is "what would this world deal to a player in the state I am in
 * right now" — which is the question the adaptive road makes worth asking.
 */
function rollRoads(worldId, count, player) {
  const world = getWorld(worldId);
  const state = reading(player, world);
  const kinds = [];
  const firsts = [];
  let adjacentBuildings = 0;
  let stops = 0;
  for (let i = 0; i < count; i++) {
    const segment = generateSegment(worldId, (Math.random() * 0xffffffff) >>> 0);
    let guard = segment.events.length + 4;
    while (segment.events.some((e) => e.hidden) && guard-- > 0) revealNext(segment, state);
    const types = segment.events.map((e) => e.type);
    types.forEach((type) => kinds.push(type));
    firsts.push(types[0]);
    stops += types.length;
    for (let k = 1; k < types.length; k++) {
      const a = types[k - 1];
      const b = types[k];
      const building = (t) => t && t !== 'enemy' && t !== 'boss';
      if (building(a) && building(b)) adjacentBuildings += 1;
    }
  }
  return [
    t('W{id} {world} — {count} roads dealt against the run as it stands', { id: worldId, world: t(world.name), count }),
    t('  reading: health {health} · belly {belly} · purse {purse} · food {food} · rung {rung}', { health: state.health.toFixed(2), belly: state.belly.toFixed(2), purse: state.purse.toFixed(2), food: state.stocked, rung: state.canAffordRung }),
    '  what the stops came out as',
    asShare(tally(kinds), stops),
    '  the first stop of the world',
    asShare(tally(firsts), count),
    t('  two buildings in a row: {n} across {count} roads (the floor says it cannot happen while a fight is in reserve)', { n: adjacentBuildings, count }),
  ].join('\n');
}

/** Roll shop visits and count what landed on the shelf. */
function rollShops(worldId, count) {
  const world = getWorld(worldId);
  const items = [];
  const rarities = [];
  let discounted = 0;
  let slots = 0;
  for (let i = 0; i < count; i++) {
    const stock = generateStock(worldId, shopSeed(worldId, i, (Math.random() * 0xffffffff) >>> 0));
    for (const entry of stock) {
      items.push(entry.item.name);
      rarities.push(entry.item.rarity);
      slots += 1;
      if (entry.discounted) discounted += 1;
    }
  }
  return [
    t('W{id} {world} — {count} visits, {slots} slots', { id: worldId, world: t(world.name), count, slots }),
    '  rarity of what was on the shelf',
    asShare(tally(rarities), slots),
    t('  discounted: {pct}%', { pct: ((discounted / slots) * 100).toFixed(2) }),
    '  the ten commonest things to find',
    asShare(
      Object.fromEntries(Object.entries(tally(items)).sort((a, b) => b[1] - a[1]).slice(0, 10)),
      slots,
    ),
  ].join('\n');
}

/** The road's reading, rebuilt from a player state. */
function reading(player, world) {
  return roadReading({
    lives: player.lives,
    maxLives: player.maxLives,
    hunger: player.hunger,
    hungerMax: HUNGER_MAX,
    gold: player.gold,
    bedPrice: innPremiumPrice(world.id),
    gunCost: player.gunLevel >= GUN_MAX_LEVEL ? Infinity : gunUpgradeCost(player.gunLevel),
    hasFood: (player.inventory || []).some((slot) => getItem(slot.id)?.food),
  });
}

// ---------------------------------------------------------------------------
// The paste box
// ---------------------------------------------------------------------------

/**
 * Replace the run with a pasted state.
 *
 * It goes through `restore`, which is the same door a save file comes in by —
 * so the life bar is still rebuilt from the level and the missing fields still
 * get their defaults. What it does not get is a valid save's provenance, which
 * is exactly why this is in the Lab and not on the Run tab.
 */
function pasteBox(ctx) {
  const area = el('textarea.input.admin-paste', {
    rows: '6',
    spellcheck: 'false',
    placeholder: 'Paste a serialised run here',
  });
  return el('div.col', { style: { gap: 'var(--sp-2)' } }, [
    area,
    el('div.admin-buttons', {}, [
      action('Fill it with the live run', () => {
        area.value = JSON.stringify(serializePlayer(), null, 2);
      }),
      action('Make it the run', () => {
        try {
          const data = JSON.parse(area.value);
          restorePlayer(data);
          note('run replaced from a paste');
          ctx.toast('The run is whatever you just pasted', 'gold');
          ctx.refresh();
        } catch (err) {
          ctx.toast(t('That is not a run: {message}', { message: err.message }), 'bad');
        }
      }, { variant: 'btn--danger' }),
    ]),
  ]);
}
