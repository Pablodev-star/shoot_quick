/**
 * SHOOT! — Admin Panel · Run.
 *
 * The run's own numbers, every one of them editable. This is the tab that
 * answers "put me in the state where the bug happens": a bar at half a
 * diamond, a purse that can afford the Nova, level nine in world one, a gauge
 * about to start starving.
 *
 * Two things are deliberately NOT here. The world you are in and the stop you
 * are walking towards belong to the Road tab, because moving those two moves
 * the road as well and the road is where you want to be looking when they do.
 * And nothing on this page is written to the slot until you say so — the
 * button for that is at the bottom, next to the one that throws the run away.
 */

import { el } from '../core/dom.js';
import { t } from '../core/i18n.js';
import {
  getState,
  setLives,
  setBonusLives,
  addGold,
  addExp,
  setHunger,
  fullHeal,
  addItem,
  announce,
} from '../game/player.js';
import { save as saveRun } from '../game/run.js';
import { DIFFICULTIES, getDifficulty, setDifficulty } from '../game/difficulty.js';
import {
  HUNGER_MAX,
  GUN_MAX_LEVEL,
  STARTING_LIVES,
  LIVES_PER_LEVEL,
  expForNextLevel,
  gunDamageAt,
  gunUpgradeCost,
} from '../game/progression.js';
import { GUN_TIERS } from '../game/gun-tiers.js';
import { OVERRIDES, setOverride, note } from './overrides.js';
import { section, row, numberField, buttons, action, switchField, readout, selectField } from './widgets.js';

export const RunTab = {
  id: 'run',
  label: 'Run',

  render(ctx) {
    const player = getState();
    const refresh = () => {
      announce();
      ctx.refresh();
    };

    /** Write a field straight onto the run and tell the interface about it. */
    const poke = (key, value) => {
      player[key] = value;
      refresh();
    };

    return el('div.admin-tab', {}, [
      section('Lives', [
        row('Lives', numberField({
          value: player.lives,
          step: 0.5,
          min: 0,
          onChange: (n) => {
            setLives(n);
            refresh();
          },
        }), 'Half diamonds are legal — the grid draws them'),
        row('Maximum', numberField({
          value: player.maxLives,
          step: 0.5,
          min: 0.5,
          onChange: (n) => poke('maxLives', n),
        }), `${STARTING_LIVES} at level 1, +${LIVES_PER_LEVEL} a level`),
        row('Gold lives', numberField({
          value: player.bonusLives,
          step: 0.5,
          min: 0,
          onChange: (n) => {
            setBonusLives(n);
            refresh();
          },
        }), 'Spent before the red ones, never healed'),
        row('Invulnerable', switchField({
          checked: OVERRIDES.player.invulnerable,
          onChange: (on) => {
            setOverride('player.invulnerable', on);
            ctx.refresh();
          },
        }), 'The road cannot take a life — starvation included. A duel still can'),
        buttons([
          action('Full heal', () => {
            fullHeal();
            refresh();
          }),
          action('Down to half a life', () => {
            setLives(0.5);
            refresh();
          }),
          action('Kill the run', () => {
            setLives(0);
            refresh();
          }, { variant: 'btn--danger', tip: 'Fires GAME_OVER — or the totem, if one is in the bag' }),
        ]),
      ]),

      section('Purse and level', [
        row('Gold', numberField({
          value: player.gold,
          min: 0,
          step: 10,
          onChange: (n) => {
            addGold(n - player.gold);
            refresh();
          },
        })),
        row('Everything is free', switchField({
          checked: OVERRIDES.player.freeGold,
          onChange: (on) => {
            setOverride('player.freeGold', on);
            ctx.refresh();
          },
        }), 'Counters, beds and the forge stop charging. The number above stops moving'),
        row('Level', numberField({
          value: player.level,
          min: 1,
          onChange: (n) => {
            const level = Math.max(1, Math.round(n));
            player.level = level;
            player.maxLives = STARTING_LIVES + (level - 1) * LIVES_PER_LEVEL;
            player.exp = 0;
            setLives(Math.min(player.lives, player.maxLives));
            refresh();
          },
        }), 'Rebuilds the bar from the level, the way a save does'),
        row('Exp', numberField({
          value: player.exp,
          min: 0,
          step: 10,
          onChange: (n) => poke('exp', n),
        }), t('{exp} for the next one', { exp: expForNextLevel(player.level) })),
        buttons([
          action('+100 gold', () => {
            addGold(100);
            refresh();
          }),
          action('+1000 gold', () => {
            addGold(1000);
            refresh();
          }),
          action('Level up', () => {
            addExp(expForNextLevel(player.level) - player.exp);
            refresh();
          }),
        ]),
      ]),

      section('The gun', [
        row('Rung', selectField({
          value: player.gunLevel,
          options: GUN_TIERS.map((tier, i) => ({
            value: i,
            label: t('{rung} · {gun} — {lives} lives', { rung: i, gun: t(tier.name), lives: gunDamageAt(i) }),
          })),
          onChange: (level) => poke('gunLevel', level),
          width: '260px',
        }), player.gunLevel >= GUN_MAX_LEVEL
          ? 'Maxed'
          : `next rung costs ${gunUpgradeCost(player.gunLevel)}`),
        row('Damage override', numberField({
          value: OVERRIDES.player.gunDamage,
          step: 0.5,
          min: 0,
          nullable: true,
          placeholder: 'off',
          onChange: (n) => {
            setOverride('player.gunDamage', n);
            ctx.refresh();
          },
        }), 'Replaces the ladder outright. Empty the box to hand it back'),
      ]),

      section('Hunger', [
        row('Rations', numberField({
          value: Math.round(player.hunger),
          min: 0,
          max: HUNGER_MAX,
          onChange: (n) => {
            setHunger(n);
            refresh();
          },
        }), `out of ${HUNGER_MAX}`),
        row('Freeze the gauge', switchField({
          checked: OVERRIDES.walk.freezeHunger,
          onChange: (on) => {
            setOverride('walk.freezeHunger', on);
            ctx.refresh();
          },
        }), 'Stops the drain and the starvation clock with it'),
        row('Drain', numberField({
          value: OVERRIDES.walk.hungerMul,
          step: 0.25,
          min: 0,
          onChange: (n) => {
            setOverride('walk.hungerMul', n);
            ctx.refresh();
          },
        }), 'Multiplier on top of the horse, the canteen and the sky'),
        buttons([
          action('Fill', () => {
            setHunger(HUNGER_MAX);
            refresh();
          }),
          action('Empty', () => {
            setHunger(0);
            refresh();
          }, { tip: 'Starts the starvation clock on the next step' }),
        ]),
      ]),

      section('Carried', [
        row('On a horse', switchField({
          checked: player.hasHorse,
          onChange: (on) => poke('hasHorse', on),
        }), 'Faster, hungrier, and the road gets shorter'),
        buttons([
          action('Give a vest', () => {
            addItem('vest', 1);
            refresh();
          }),
          action('Give a totem', () => {
            addItem('duskTotem', 1);
            refresh();
          }),
          action('Give a map', () => {
            addItem('map', 1);
            refresh();
          }),
          action('Give a canteen', () => {
            addItem('canteen', 1);
            refresh();
          }),
          action('Everything else…', () => ctx.go('gear')),
        ]),
      ]),

      /**
       * WHICH ROAD THIS RUN IS ON, AND THE ONE PLACE IT CAN BE CHANGED
       * ---------------------------------------------------------------------
       * A slot picks its difficulty once, when it is created, and the game
       * offers no way to change it afterwards — that is the whole point of it
       * being on the save (see the note at the bottom of
       * src/game/difficulty.js). Which makes testing the hard road otherwise a
       * matter of playing to the end of the game to unlock it and then playing
       * six worlds to reach the interesting part of it.
       *
       * So the panel can move it, live, mid-run. It behaves exactly like every
       * other override in here: it takes effect on the next thing that reads a
       * price or rolls a rider, and it is NOT written to the slot unless the
       * tester presses the button below — so a road bent for one fight is put
       * back by the next load, and a road that is meant to stick can be made
       * to.
       */
      section('The road', [
        row('Difficulty', selectField({
          value: getDifficulty(),
          options: DIFFICULTIES.map((d) => ({ value: d.id, label: d.name })),
          onChange: (id) => {
            setDifficulty(id);
            note(t('difficulty set to {id}', { id }));
            refresh();
          },
        }), 'Live. Prices, riders and beds all follow on the next read'),
      ], 'A slot chooses this once and the game never offers it again. Here it is a dial — write the save below to make it stick.'),

      section('The slot', [
        readout([
          ['Slot', String(ctx.slot)],
          ['Run seed', String(player.seed)],
          ['Road', DIFFICULTIES.find((d) => d.id === getDifficulty()).name],
          ['Distance walked', t('{n} px', { n: Math.round(player.distance) })],
          ['Duels', t('{won} won · {lost} lost', { won: player.stats.duelsWon, lost: player.stats.duelsLost })],
        ]),
        buttons([
          action('Write the save now', async () => {
            await saveRun();
            note('save written from the panel');
            ctx.toast(t('Slot {slot} written', { slot: ctx.slot }), 'good');
          }, { variant: 'btn--gold' }),
        ]),
      ], 'The run is written after every encounter anyway. This is for when you have just changed six numbers and want them on the disk before the next thing goes wrong.'),
    ]);
  },
};
