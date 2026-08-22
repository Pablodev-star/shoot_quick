/**
 * SHOOT! — Admin Panel · Road.
 *
 * Two halves. The top is the controls — where you are, what you are walking
 * into, how fast, under what sky — and everything on it takes effect on the
 * road you are standing on. The bottom is the admin's map (src/admin/map.js):
 * every stop this segment holds, what is still face down, and for the things
 * that are still undecided, the exact odds and the numbers those odds are read
 * off.
 *
 * THE TWO WAYS TO CHANGE WHAT IS COMING, AND WHY THERE ARE TWO
 * ---------------------------------------------------------------------------
 * "Next stop is a forge" and "every stop from here is a forge" are different
 * requests and the road answers them in different places. The first rewrites
 * the card that is already face up in front of you — it is the one you want
 * when you are testing the forge. The second is an override on the reveal
 * itself (src/admin/overrides.js), which only bites when the horizon turns the
 * next card over, and it can only name something the world is still holding:
 * the road will bend, but it will not deal a seventh inn out of an empty hand.
 */

import { el } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { go } from '../core/router.js';
import { getState } from '../game/player.js';
import { WORLDS, FINAL_WORLD } from '../game/worlds.js';
import { beginWorld, finishEncounter } from '../game/run.js';
import { revealToHorizon, revealNext, ENCOUNTER_LABELS } from '../explore/encounters.js';
import * as weather from '../explore/weather.js';
import * as daynight from '../explore/daynight.js';
import { WEATHER } from '../explore/weather.js';

import { OVERRIDES, setOverride, note } from './overrides.js';
import { renderAdminMap } from './map.js';
import { section, row, numberField, selectField, buttons, action, switchField, sliderField } from './widgets.js';

const STOP_KINDS = ['enemy', 'shop', 'inn', 'forge', 'tailor', 'boss'];

export const RoadTab = {
  id: 'road',
  label: 'Road',

  render(ctx) {
    const engine = ctx.engine;
    const player = getState();
    const segment = engine?.getSegment();
    const next = engine?.nextEvent?.();

    /** Do something that owns the screen, with the panel out of the way first. */
    const leaveThen = (fn) => {
      ctx.close();
      // A frame, so the panel is gone before the doors start closing.
      setTimeout(fn, 30);
    };

    return el('div.admin-tab', {}, [
      section('Where', [
        row('World', selectField({
          value: player.world,
          options: WORLDS.map((w) => ({ value: w.id, label: `${w.id} · ${w.name}` })),
          onChange: (id) => leaveThen(() => beginWorld(id, { intro: false })),
          width: '260px',
        }), 'Crossing a border the way the game does it: fresh segment, full bar, saved'),
        buttons([
          action('Redraw this world', () => leaveThen(() => beginWorld(player.world, { intro: false })), {
            tip: 'Same world, new road',
          }),
          action('Play the intro card', () => leaveThen(() => beginWorld(player.world, { intro: true }))),
          action('Skip to the next world', () => leaveThen(() => beginWorld(Math.min(FINAL_WORLD, player.world + 1), { intro: false }))),
          action('Roll the ending', () => leaveThen(() => go('victory', {})), { tip: 'The victory screen, without finishing anything' }),
        ]),
      ]),

      section('What is next', [
        row('The stop in front of you', selectField({
          value: next?.type ?? null,
          options: [
            { value: null, label: next ? `— leave it (${ENCOUNTER_LABELS[next.type] || 'face down'})` : '— nothing ahead' },
            ...STOP_KINDS.map((kind) => ({ value: kind, label: ENCOUNTER_LABELS[kind] })),
          ],
          onChange: (kind) => {
            if (!kind || !next) return;
            next.type = kind;
            next.hidden = false;
            note(t('next stop rewritten to {kind}', { kind }));
            ctx.refresh();
          },
          width: '220px',
        }), 'Rewrites the card you are actually walking towards'),
        row('Every card from here', selectField({
          value: OVERRIDES.road.forceNext,
          options: [
            { value: null, label: '— the road decides' },
            ...STOP_KINDS.filter((k) => k !== 'boss').map((kind) => ({ value: kind, label: ENCOUNTER_LABELS[kind] })),
          ],
          onChange: (kind) => {
            setOverride('road.forceNext', kind);
            ctx.refresh();
          },
          width: '220px',
        }), 'Only while the world still holds one of that kind'),
        row('Ignore spacing', switchField({
          checked: OVERRIDES.road.ignoreSpacing,
          onChange: (on) => {
            setOverride('road.ignoreSpacing', on);
            ctx.refresh();
          },
        }), 'Drops the "never two buildings in a row" floor and the gap dimmer'),
        buttons([
          action('Walk to it', () => {
            if (!engine?.jumpToNext()) {
              ctx.toast('Nothing left on this road', 'bad');
              return;
            }
            note('jumped to the next stop');
            ctx.close();
          }, { variant: 'btn--gold', tip: 'Puts you on its doorstep and closes the panel' }),
          action('Skip this stop', () => leaveThen(() => {
            if (next) next.resolved = true;
            finishEncounter();
          }), { tip: 'Marks it cleared and moves the counter on' }),
          action('Turn the whole road face up', () => {
            if (!segment) return;
            let guard = segment.events.length;
            while (segment.events.some((e) => e.hidden) && guard-- > 0) {
              revealNext(segment, engine.getReading());
            }
            note('whole segment revealed');
            ctx.refresh();
          }),
          action('Re-deal the horizon', () => {
            if (!segment) return;
            revealToHorizon(segment, engine.getReading());
            ctx.refresh();
          }),
        ]),
      ]),

      section('Pace', [
        row('Walking speed', sliderField({
          value: OVERRIDES.walk.speedMul,
          min: 0.25,
          max: 12,
          step: 0.25,
          format: (n) => `×${n}`,
          onChange: (n) => {
            setOverride('walk.speedMul', n);
            ctx.refresh();
          },
        }), 'The stops stay where they are — you just get there sooner'),
        row('Shove forward', numberField({
          value: 0,
          step: 100,
          onChange: (n) => {
            engine?.skip(n);
            note(t('shoved {n} px down the road', { n }));
            ctx.refresh();
          },
        }), 'Pixels. The encounter still fires through the ordinary path'),
      ]),

      section('Sky and hour', [
        row('Weather', selectField({
          value: weather.getWeatherState().id,
          options: Object.values(WEATHER).map((w) => ({ value: w.id, label: w.label })),
          onChange: (id) => {
            weather.force(id);
            note(t('weather forced to {id}', { id }));
            ctx.refresh();
          },
        }), 'Forced now — the biome will still roll something legal when it runs out'),
        row('Hold it', numberField({
          value: 0,
          step: 10,
          onChange: (n) => {
            weather.force(weather.getWeatherState().id, n * 1000);
            ctx.refresh();
          },
        }), 'Seconds to keep the current sky for'),
        row('Hour of the day', sliderField({
          value: daynight.getTimeState().time,
          min: 0,
          max: 0.99,
          step: 0.01,
          format: (n) => `${String(Math.floor(n * 24)).padStart(2, '0')}:${String(Math.floor((n * 24 % 1) * 60)).padStart(2, '0')}`,
          onChange: (t) => {
            daynight.setTime(t);
            ctx.refresh();
          },
        })),
        row('Stop the clock', switchField({
          checked: OVERRIDES.walk.freezeClock,
          onChange: (on) => {
            setOverride('walk.freezeClock', on);
            ctx.refresh();
          },
        }), 'The sun stays exactly where you put it'),
      ]),

      section('Walk into one now', [
        buttons([
          action('A shop', () => leaveThen(() => go('shop', { encounter: { index: player.encounterIndex, worldId: player.world } }))),
          action('An inn', () => leaveThen(() => go('inn', { encounter: { index: player.encounterIndex, worldId: player.world } }))),
          action('A forge', () => leaveThen(() => go('forge', { encounter: { index: player.encounterIndex, worldId: player.world } }))),
          action('A clothier', () => leaveThen(() => go('tailor', { encounter: { index: player.encounterIndex, worldId: player.world } })), {
            tip: 'The run only ever holds one of these — this is the only way to see a second',
          }),
          action('This world\'s boss', () => leaveThen(() => go('duel', {
            encounter: { index: player.encounterIndex, worldId: player.world, progress: 1 },
            isBoss: true,
          })), { variant: 'btn--danger', tip: 'A real boss fight — it counts' }),
        ]),
      ], 'These open the real screen against the real world. Leaving a shop puts the encounter counter on, exactly as walking into one would.'),

      el('div.divider', { text: 'the map' }),
      renderAdminMap(ctx),
    ]);
  },
};
