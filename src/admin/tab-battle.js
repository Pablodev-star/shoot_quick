/**
 * SHOOT! — Admin Panel · Battle.
 *
 * Build a fighter and go and fight it, now, from wherever you are standing.
 *
 * WHY A SANDBOX FIGHT IS A REAL FIGHT
 * ---------------------------------------------------------------------------
 * The duel this starts is the game's duel: the same engine, the same agent, the
 * same scene, the same enemy shape (`customEnemy` in src/game/enemies.js builds
 * exactly what `generateEnemy` builds, from a form instead of from a seed). The
 * only thing dropped is the CONSEQUENCE — no gold, no exp, no lives written
 * back onto the run, no death, no encounter counter moved, nothing told to the
 * achievement ledger. See `sandbox` in src/duel/duel-screen.js.
 *
 * That split is the point. A test fight that simulated the duel would be
 * testing the simulation; a test fight that counted would mean nobody could
 * afford to run one in the middle of a real crossing.
 *
 * The switch at the bottom turns the consequences back on, for when the thing
 * being tested IS the consequence — that a boss kill crosses a border, that a
 * loss erases the slot.
 */

import { el } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { go } from '../core/router.js';
import { getState } from '../game/player.js';
import { WORLDS, getWorld } from '../game/worlds.js';
import { customEnemy } from '../game/enemies.js';
import { ABILITIES, SPECIALS, getAbility, getSpecial } from '../game/world-abilities.js';
import { ARCHETYPES } from '../art/sprites-enemies.js';
import { note } from './overrides.js';
import {
  section,
  row,
  numberField,
  textField,
  selectField,
  switchField,
  buttons,
  action,
  readout,
} from './widgets.js';

/**
 * The form, kept at module scope so it survives a re-render and a trip out to
 * the fight and back. A tester almost always wants to run the same made-up
 * duel twice with one number changed.
 */
const build = {
  name: 'The Test Dummy',
  archetype: 'drifter',
  lives: 3,
  accuracy: 0.5,
  gunDamage: 0.5,
  bullets: 0,
  abilities: [],
  special: null,
  abilityChanceMul: 1,
  isBoss: false,
  worldId: null,
  sandbox: true,
};

export const BattleTab = {
  id: 'battle',
  label: 'Battle',

  render(ctx) {
    const player = getState();
    const worldId = build.worldId ?? player.world;
    const world = getWorld(worldId);

    const set = (key, value) => {
      build[key] = value;
      ctx.refresh();
    };

    const abilityChips = Object.keys(ABILITIES).map((id) => {
      const ability = getAbility(id);
      const on = build.abilities.includes(id);
      return el(`button.admin-chip-toggle${on ? '.is-on' : ''}`, {
        onclick: () => {
          const list = new Set(build.abilities);
          if (on) list.delete(id);
          else list.add(id);
          set('abilities', [...list]);
        },
        title: ability.tip,
        'data-tip': ability.tip,
      }, [ability.label]);
    });

    const start = () => {
      const enemy = customEnemy({ ...build });
      note(t(build.sandbox ? 'custom fight: {name}, {lives} lives (sandbox)' : 'custom fight: {name}, {lives} lives (for real)', { name: t(enemy.name), lives: enemy.lives }));
      ctx.close();
      setTimeout(() => {
        go('duel', {
          customEnemy: enemy,
          sandbox: build.sandbox,
          isBoss: build.isBoss,
          encounter: { index: player.encounterIndex, worldId, progress: 1 },
        });
      }, 30);
    };

    return el('div.admin-tab', {}, [
      section('The fighter', [
        row('Called', textField({
          value: build.name,
          onChange: (text) => set('name', text),
          width: '220px',
        })),
        row('Wears', selectField({
          value: build.archetype,
          options: Object.keys(ARCHETYPES).map((id) => ({
            value: id,
            label: `${id} — ${ARCHETYPES[id].names[0]}`,
          })),
          onChange: (id) => set('archetype', id),
          width: '260px',
        }), 'The six boss archetypes are in this list too'),
        row('Lives', numberField({
          value: build.lives,
          min: 0.5,
          step: 0.5,
          onChange: (n) => set('lives', n),
        })),
        row('Bullet', numberField({
          value: build.gunDamage,
          min: 0,
          step: 0.5,
          onChange: (n) => set('gunDamage', n),
        }), 'Lives it takes per hit'),
        row('Starts loaded with', numberField({
          value: build.bullets,
          min: 0,
          max: 6,
          onChange: (n) => set('bullets', n),
        }), 'Chambers already full when the fight opens'),
        row('Reads your move', numberField({
          value: build.accuracy,
          min: 0,
          max: 1,
          step: 0.05,
          onChange: (n) => set('accuracy', n),
        })),
        row('Reaches for a trick', numberField({
          value: build.abilityChanceMul,
          min: 0,
          max: 8,
          step: 0.5,
          onChange: (n) => set('abilityChanceMul', n),
        }), '×1 is the ordinary 14% a round'),
        row('Landmark', selectField({
          value: build.special,
          options: [
            { value: null, label: '— none' },
            ...Object.keys(SPECIALS).map((id) => ({ value: id, label: getSpecial(id).label })),
          ],
          onChange: (id) => set('special', id),
          width: '220px',
        })),
        row('Fights as a boss', switchField({
          checked: build.isBoss,
          onChange: (on) => set('isBoss', on),
        }), 'The boss bar, the boss music and the boss framing'),
      ]),

      section('Its hand', [
        el('div.admin-chip-row', {}, abilityChips),
        buttons([
          action('Nothing', () => set('abilities', [])),
          action('This world\'s kit', () => set('abilities', [...world.enemy.abilities])),
          action('Everything', () => set('abilities', Object.keys(ABILITIES))),
        ]),
      ], build.abilities.length
        ? build.abilities.map((id) => getAbility(id).label).join(', ')
        : 'Carrying nothing.'),

      section('Where', [
        row('World', selectField({
          value: build.worldId,
          options: [
            { value: null, label: t('— where I am standing ({world})', { world: t(world.name) }) },
            ...WORLDS.map((w) => ({ value: w.id, label: `${w.id} · ${w.name}` })),
          ],
          onChange: (id) => set('worldId', id),
          width: '260px',
        }), 'Decides the biome, the tint and the music behind the fight'),
        row('Sandbox', switchField({
          checked: build.sandbox,
          onChange: (on) => set('sandbox', on),
        }), build.sandbox
          ? 'Nothing that happens in there touches the run'
          : 'FOR REAL — it pays out, it can move you to the next world, and losing erases the slot'),
        buttons([
          action('Fight it', start, { variant: 'btn--gold' }),
        ]),
      ]),

      section('Ready-made', [
        buttons([
          action('A drifter', () => {
            Object.assign(build, {
              name: 'Drifter', archetype: 'drifter', lives: 1, gunDamage: 0.5,
              accuracy: 0.33, abilities: [], special: null, isBoss: false, bullets: 0,
            });
            ctx.refresh();
          }),
          action('A wall', () => {
            Object.assign(build, {
              name: 'The Wall', archetype: 'ironkiln', lives: 40, gunDamage: 0,
              accuracy: 0.05, abilities: [], special: null, isBoss: false, bullets: 0,
            });
            ctx.refresh();
          }, { tip: 'Forty lives and a harmless gun — for watching your own numbers' }),
          action('Everything at once', () => {
            Object.assign(build, {
              name: 'The Kitchen Sink', archetype: 'bossStrangerUnmasked', lives: 20,
              gunDamage: 1.5, accuracy: 0.8, abilities: Object.keys(ABILITIES),
              special: 'rift', isBoss: true, bullets: 6, abilityChanceMul: 6,
            });
            ctx.refresh();
          }, { tip: 'Every trick in the game, cast constantly' }),
          action('This world\'s boss', () => {
            const cfg = world.boss;
            Object.assign(build, {
              name: cfg.name,
              archetype: cfg.archetype || 'drifter',
              lives: cfg.phases ? cfg.phases[0].lives : cfg.lives,
              accuracy: cfg.accuracy,
              abilities: [...(cfg.abilities || [])],
              special: cfg.special || null,
              isBoss: true,
              bullets: 0,
            });
            ctx.refresh();
          }, { tip: 'A copy of it, without the entrance or the second phase' }),
        ]),
        readout([
          ['You walk in with', t('{lives}/{max} lives{bonus}', {
            lives: player.lives,
            max: player.maxLives,
            bonus: player.bonusLives ? ` +${player.bonusLives}` : '',
          })],
          ['Your bullet', t('{n} rungs up the ladder', { n: player.gunLevel })],
          ['In your hands', [player.equipped.basic, player.equipped.special].filter(Boolean).join(', ') || 'nothing'],
        ]),
      ]),
    ]);
  },
};
