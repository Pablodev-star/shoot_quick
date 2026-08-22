/**
 * SHOOT! — Admin Panel · Gear.
 *
 * The whole catalogue, including the thirty abilities that only exist as
 * shop stock in one world each, with a give/take on every line. It is the
 * fastest answer to most of the questions this game raises: what the diadem
 * does to a bayou rider, whether the totem's break animation still lines up,
 * how the bag behaves at four hundred carrots.
 *
 * STACK LIMITS ARE STILL LIMITS
 * ---------------------------------------------------------------------------
 * Giving goes through `addItem`, which clamps to the item's own stack. That is
 * deliberate: the bag's rules are part of what is being tested, and a panel
 * that could smuggle nine vests into a saddlebag would be testing a state the
 * game cannot produce. The one thing bypassed here is *money* — everything is
 * free, because paying for it was never the point.
 */

import { el } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { framedIconURL } from '../art/sprites-items.js';
import { ITEM_LIST, getItem } from '../game/items.js';
import {
  getState,
  addItem,
  removeItem,
  countOf,
  equipAbility,
  unequipAbility,
  announce,
} from '../game/player.js';
import { sellPrice, itemPrice } from '../game/progression.js';
import { note } from './overrides.js';
import { section, row, buttons, action, grid, searchField, selectField, readout } from './widgets.js';

/** What the filter row offers. `match` is run over the catalogue entry. */
const FILTERS = [
  { id: 'all', label: 'Everything', match: () => true },
  { id: 'held', label: 'In the bag', match: (item) => countOf(item.id) > 0 },
  { id: 'food', label: 'Food', match: (item) => !!item.food },
  { id: 'heal', label: 'Healing', match: (item) => !!item.heal || !!item.healFraction || !!item.bonusLives },
  { id: 'ability', label: 'Abilities', match: (item) => !!item.ability },
  { id: 'gear', label: 'Gear', match: (item) => item.context === 'passive' || item.context === 'special' || item.context === 'utility' },
];

/** Kept between renders so a search survives a give. */
let query = '';
let filter = 'all';

export const GearTab = {
  id: 'gear',
  label: 'Gear',

  render(ctx) {
    const player = getState();
    const refresh = () => {
      announce();
      ctx.refresh();
    };

    const matches = ITEM_LIST.filter((item) => {
      const f = FILTERS.find((x) => x.id === filter) || FILTERS[0];
      if (!f.match(item)) return false;
      if (!query.trim()) return true;
      const hay = `${item.name} ${item.id} ${item.rarity} ${item.desc || ''}`.toLowerCase();
      return hay.includes(query.trim().toLowerCase());
    });

    const cards = matches.map((item) => {
      const held = countOf(item.id);
      return el(`div.admin-card${held ? '.is-held' : ''}`, {}, [
        el('img.pixel', {
          src: framedIconURL(item.icon, item.rarity, 2),
          width: '40',
          height: '40',
          alt: '',
        }),
        el('div.admin-card-body', {}, [
          el('div.admin-card-name', { text: item.name }),
          el('div.admin-card-meta', {
            text: `${item.rarity} · ${item.context || 'anytime'} · stack ${item.stack ?? 99} · ${itemPrice(item, player.world)}g`,
          }),
          el('div.admin-card-desc', { text: item.desc || '' }),
        ]),
        el('div.admin-card-actions', {}, [
          el('span.admin-card-count', { text: held ? `×${held}` : '—' }),
          action('+1', () => {
            addItem(item.id, 1);
            refresh();
          }),
          action('+10', () => {
            addItem(item.id, 10);
            refresh();
          }),
          action('−1', () => {
            removeItem(item.id, 1);
            refresh();
          }, { disabled: held === 0 }),
          action('none', () => {
            removeItem(item.id, held);
            refresh();
          }, { variant: 'btn--danger', disabled: held === 0 }),
        ]),
      ]);
    });

    /** Everything that can go in a duel slot, owned or not. */
    const abilities = ITEM_LIST.filter((item) => item.ability);
    const slotRow = (slot) => row(
      slot === 'basic' ? 'Basic slot' : 'Special slot',
      selectField({
        value: player.equipped[slot],
        options: [
          { value: null, label: '— empty' },
          ...abilities
            .filter((item) => (item.ability.kind === 'special') === (slot === 'special'))
            .map((item) => ({ value: item.id, label: `${item.name} · W${item.world}` })),
        ],
        onChange: (id) => {
          if (!id) {
            unequipAbility(slot);
            refresh();
            return;
          }
          // Equipping something the run does not own would be refused, so it is
          // handed over first. A slot filled with a thing that is not in the
          // bag is a state the game has no way to reach or to save.
          if (countOf(id) === 0) addItem(id, 1);
          const result = equipAbility(id);
          if (!result.ok) ctx.toast(result.reason, 'bad');
          note(t('equipped {id} in the {slot} slot', { id, slot }));
          refresh();
        },
        width: '280px',
      }),
      slot === 'basic' ? 'Cheap, charges fast' : 'The world landmark — one a fight',
    );

    return el('div.admin-tab', {}, [
      section('The two hands', [
        slotRow('basic'),
        slotRow('special'),
      ], 'Anything can go in a slot from here, bought or not — it is put in the bag on the way in, because a duel reads the bag to check the slot is honest.'),

      section('The catalogue', [
        el('div.admin-toolbar', {}, [
          searchField({
            value: query,
            placeholder: 'Search the catalogue',
            onChange: (text) => {
              query = text;
              ctx.refresh();
            },
          }),
          selectField({
            value: filter,
            options: FILTERS.map((f) => ({ value: f.id, label: f.label })),
            onChange: (id) => {
              filter = id;
              ctx.refresh();
            },
            width: '160px',
          }),
        ]),
        buttons([
          action('One of everything', () => {
            ITEM_LIST.forEach((item) => addItem(item.id, 1));
            note('one of every item given');
            refresh();
          }, { tip: 'The whole catalogue, one apiece' }),
          action('Empty the bag', () => {
            [...player.inventory].forEach((entry) => removeItem(entry.id, entry.qty));
            note('bag emptied');
            refresh();
          }, { variant: 'btn--danger' }),
          action('A week of food', () => {
            addItem('stew', 5);
            addItem('apple', 5);
            addItem('carrot', 5);
            refresh();
          }),
          action('A field hospital', () => {
            addItem('bandage', 5);
            addItem('medkit', 3);
            addItem('potion', 2);
            refresh();
          }),
        ]),
        grid(cards, 'admin-grid--items'),
      ], `${matches.length} of ${ITEM_LIST.length} shown`),

      section('What is in there now', [
        readout(
          player.inventory.length
            ? player.inventory.map((entry) => {
                const item = getItem(entry.id);
                return [
                  item ? item.name : entry.id,
                  t('×{qty} · sells for {gold}g', {
                    qty: entry.qty,
                    gold: item ? sellPrice(item, player.world) : 0,
                  }),
                ];
              })
            : [['Bag', 'empty']],
        ),
      ]),
    ]);
  },
};
