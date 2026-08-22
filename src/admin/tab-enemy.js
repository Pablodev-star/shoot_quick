/**
 * SHOOT! — Admin Panel · Enemy.
 *
 * Two things that are easy to confuse and are not the same: what the next rider
 * IS, and how the rider PLAYS.
 *
 * The top half replaces fields on the enemy after the world has rolled it —
 * lives, bullet, tricks, landmark, the sprite it wears. The bottom half swaps
 * the head behind it: the ordinary opponent tuned by its three numbers, or one
 * of five fixed policies that exist because you cannot test a rule against an
 * opponent that is busy having opinions. A punchbag that only reloads is how
 * you look at a poison tick landing six times; a scripted loop is how you
 * reproduce the round that went wrong.
 *
 * Both halves are this run only, and both apply to the NEXT fight — a duel
 * already in progress built its enemy and its agent when it opened.
 */

import { el } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { getState } from '../game/player.js';
import { getWorld } from '../game/worlds.js';
import { generateEnemy } from '../game/enemies.js';
import { ABILITIES, SPECIALS, getAbility, getSpecial } from '../game/world-abilities.js';
import { ARCHETYPES } from '../art/sprites-enemies.js';
import { MOVES } from '../duel/duel-engine.js';
import { OVERRIDES, setOverride } from './overrides.js';
import {
  section,
  row,
  numberField,
  textField,
  selectField,
  sliderField,
  buttons,
  action,
  readout,
} from './widgets.js';

const MODES = [
  { value: 'normal', label: 'normal — the game\'s opponent' },
  { value: 'dummy', label: 'dummy — reloads forever' },
  { value: 'aggressive', label: 'aggressive — fires the moment it can' },
  { value: 'defensive', label: 'defensive — shields whenever allowed' },
  { value: 'oracle', label: 'oracle — always counters its read' },
  { value: 'random', label: 'random — a flat third each way' },
];

const MOVE_LIST = [MOVES.RELOAD, MOVES.SHIELD, MOVES.SHOOT];

export const EnemyTab = {
  id: 'enemy',
  label: 'Enemy',

  render(ctx) {
    const player = getState();
    const world = getWorld(player.world);
    const o = OVERRIDES.enemy;
    const ai = OVERRIDES.ai;

    /** A toggle chip per ability, on the whole catalogue rather than this world's. */
    const abilityChips = Object.keys(ABILITIES).map((id) => {
      const ability = getAbility(id);
      const on = (o.abilities || []).includes(id);
      return el(`button.admin-chip-toggle${on ? '.is-on' : ''}`, {
        onclick: () => {
          const list = new Set(o.abilities || []);
          if (on) list.delete(id);
          else list.add(id);
          setOverride('enemy.abilities', list.size ? [...list] : []);
          ctx.refresh();
        },
        'data-tip': ability.tip,
        title: ability.tip,
      }, [`${ability.label}${ability.world ? ` · W${ability.world}` : ''}`]);
    });

    const scriptChips = MOVE_LIST.map((move) =>
      action(`+ ${move}`, () => {
        setOverride('ai.script', [...(ai.script || []), move]);
        ctx.refresh();
      }));

    return el('div.admin-tab', {}, [
      section('The next rider', [
        row('Lives', numberField({
          value: o.lives,
          min: 0.5,
          step: 0.5,
          nullable: true,
          placeholder: 'rolled',
          onChange: (n) => {
            setOverride('enemy.lives', n);
            ctx.refresh();
          },
        }), t('this world rolls {list}', { list: Object.keys(world.enemy.lives).join('/') })),
        row('Reads your move', numberField({
          value: o.accuracy,
          min: 0,
          max: 1,
          step: 0.05,
          nullable: true,
          placeholder: String(world.enemy.accuracy),
          onChange: (n) => {
            setOverride('enemy.accuracy', n);
            ctx.refresh();
          },
        }), 'Feeds the read cap, and the weather still subtracts from it'),
        row('Bullet', numberField({
          value: o.gunDamage,
          min: 0,
          step: 0.5,
          nullable: true,
          placeholder: 'rolled',
          onChange: (n) => {
            setOverride('enemy.gunDamage', n);
            ctx.refresh();
          },
        }), 'Lives per hit'),
        row('Reaches for a trick', sliderField({
          value: o.abilityChanceMul,
          min: 0,
          max: 8,
          step: 0.5,
          format: (n) => `×${n}`,
          onChange: (n) => {
            setOverride('enemy.abilityChanceMul', n);
            ctx.refresh();
          },
        }), 'On top of the engine\'s 14% a round'),
        row('Wears', selectField({
          value: o.archetype,
          options: [
            { value: null, label: '— whatever the roster rolls' },
            ...Object.keys(ARCHETYPES).map((id) => ({ value: id, label: `${id} — ${ARCHETYPES[id].names[0]}` })),
          ],
          onChange: (id) => {
            setOverride('enemy.archetype', id);
            ctx.refresh();
          },
          width: '260px',
        }), 'Every archetype in the game, including the six bosses'),
        row('Called', textField({
          value: o.name || '',
          placeholder: 'rolled from the archetype',
          onChange: (text) => {
            setOverride('enemy.name', text.trim() || null);
            ctx.refresh();
          },
        })),
        row('Landmark', selectField({
          value: o.special === undefined ? '__roll' : o.special,
          options: [
            { value: '__roll', label: '— rolled by the world' },
            { value: null, label: 'none' },
            ...Object.keys(SPECIALS).map((id) => ({ value: id, label: getSpecial(id).label })),
          ],
          onChange: (id) => {
            setOverride('enemy.special', id === '__roll' ? undefined : id);
            ctx.refresh();
          },
          width: '220px',
        }), 'The thing it raises on the road behind it'),
      ]),

      section('Its hand', [
        el('div.admin-chip-row', {}, abilityChips),
        buttons([
          action('Roll it normally', () => {
            setOverride('enemy.abilities', null);
            ctx.refresh();
          }, { disabled: o.abilities === null }),
          action('Carrying nothing', () => {
            setOverride('enemy.abilities', []);
            ctx.refresh();
          }),
          action('This world\'s kit', () => {
            setOverride('enemy.abilities', [...world.enemy.abilities]);
            ctx.refresh();
          }),
        ]),
      ], o.abilities === null
        ? 'Nothing picked — the world rolls its own, at its own odds.'
        : `Forced: ${o.abilities.length ? o.abilities.map((id) => getAbility(id).label).join(', ') : 'nothing at all'}.`),

      section('Its head', [
        row('Policy', selectField({
          value: ai.mode,
          options: MODES,
          onChange: (mode) => {
            setOverride('ai.mode', mode);
            ctx.refresh();
          },
          width: '280px',
        })),
        row('Read cap', numberField({
          value: ai.readShare,
          min: 0,
          max: 1,
          step: 0.05,
          nullable: true,
          placeholder: '0.62',
          onChange: (n) => {
            setOverride('ai.readShare', n);
            ctx.refresh();
          },
        }), 'The most of its turns it may ever play off a read of you'),
        row('Shield share', numberField({
          value: ai.shieldShare,
          min: 0,
          max: 1,
          step: 0.05,
          nullable: true,
          placeholder: '0.2',
          onChange: (n) => {
            setOverride('ai.shieldShare', n);
            ctx.refresh();
          },
        }), 'Ceiling on the share of turns it spends behind a shield'),
        row('Thinks for', numberField({
          value: ai.thinkMs,
          min: 0,
          max: 3000,
          step: 20,
          nullable: true,
          placeholder: '120',
          onChange: (n) => {
            setOverride('ai.thinkMs', n);
            ctx.refresh();
          },
        }), 'Milliseconds before it answers. Zero makes a duel very fast'),
        row('Script', el('div.admin-buttons', {}, [
          ...scriptChips,
          action('clear', () => {
            setOverride('ai.script', []);
            ctx.refresh();
          }, { variant: 'btn--danger', disabled: !(ai.script || []).length }),
        ]), (ai.script || []).length
          ? `Looping: ${ai.script.join(' → ')}`
          : 'Empty — it thinks for itself. Add moves to make it play a fixed loop'),
      ]),

      section('Roll one and look at it', [
        buttons([
          action('Roll a rider for this world', () => {
            const enemy = generateEnemy(player.world, (Math.random() * 0xffffffff) >>> 0, 0.6);
            ctx.toast(
              `${enemy.name} · ${enemy.lives} lives · ${enemy.gunDamage} a shot · ${enemy.abilities.join(', ') || 'no tricks'}${enemy.special ? ` · ${enemy.special}` : ''}`,
              'info',
            );
          }, { variant: 'btn--gold' }),
          action('Fight something made up', () => ctx.go('battle')),
        ]),
        readout([
          ['World profile', `${world.name} · accuracy ${world.enemy.accuracy} · trick ${Math.round(world.enemy.abilityChance * 100)}% · landmark ${Math.round((world.enemy.specialChance || 0) * 100)}%`],
          ['Roster', world.enemy.roster.join(', ')],
          ['Kit', world.enemy.abilities.map((id) => getAbility(id).label).join(', ')],
        ]),
      ], 'The roll goes through the same generator the road uses, overrides and all — so this is a preview of what you have actually configured.'),
    ]);
  },
};
