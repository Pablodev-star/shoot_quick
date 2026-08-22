/**
 * SHOOT! — Admin Panel · Odds.
 *
 * The dials behind everything that is decided by a roll, for this run and no
 * other. Nothing here is written to the slot: leave the run and every one of
 * them is back where the designer left it (see src/admin/overrides.js).
 *
 * WHY THEY ARE MULTIPLIERS AND NOT REPLACEMENTS
 * ---------------------------------------------------------------------------
 * Almost everything on this page multiplies a number the game already worked
 * out rather than replacing it. That is the difference between a tool for
 * testing a game and a tool for playing a different one: with a thumb of ×3 on
 * the appetite for a bed, the road still weighs the hand, the spacing and how
 * hurt you are — it just wants a bed three times as much while it does it. So
 * what you are watching is the real mechanism, exaggerated until you can see
 * it, which is the only way to tell "this is rare" from "this is broken".
 *
 * The shop's rarity table is the exception, because a weight table is not a
 * scale — you cannot double "legendary" without saying what happens to the
 * other two — so it is replaced outright and the odds are printed underneath.
 */

import { el } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { getState } from '../game/player.js';
import { getWorld } from '../game/worlds.js';
import { BASE_SLOTS, BASE_DISCOUNT_CHANCE } from '../shops/shop.js';
import { OVERRIDES, setOverride, activeOverrides, resetOverrides } from './overrides.js';
import {
  section,
  row,
  numberField,
  sliderField,
  switchField,
  buttons,
  action,
  probBar,
  readout,
} from './widgets.js';

const RARITIES = ['common', 'rare', 'legendary'];

export const OddsTab = {
  id: 'odds',
  label: 'Odds',

  render(ctx) {
    const player = getState();
    const world = getWorld(player.world);
    const rarity = OVERRIDES.shop.rarity || world.rarity;
    const rarityTotal = RARITIES.reduce((sum, tier) => sum + (rarity[tier] || 0), 0) || 1;

    const appetite = (kind, label, hint) => row(label, sliderField({
      value: OVERRIDES.road.appetite[kind],
      min: 0,
      max: 6,
      step: 0.25,
      format: (n) => (n === 0 ? 'never' : `×${n}`),
      onChange: (n) => {
        setOverride(`road.appetite.${kind}`, n);
        ctx.refresh();
      },
    }), hint);

    const bent = activeOverrides();

    return el('div.admin-tab', {}, [
      section('What the road wants', [
        appetite('enemy', 'Fights', 'The appetite that is never dimmed by spacing'),
        appetite('inn', 'Beds', 'Wanted in proportion to how hurt you are'),
        appetite('shop', 'Counters', 'Wanted when there is gold, urgently when there is no food'),
        appetite('forge', 'Smithies', 'Wanted when the purse could pay for the next rung'),
        appetite('tailor', 'Clothiers', 'Only ever in one world of the run, and only when there is gold'),
        row('Ignore spacing', switchField({
          checked: OVERRIDES.road.ignoreSpacing,
          onChange: (on) => {
            setOverride('road.ignoreSpacing', on);
            ctx.refresh();
          },
        }), 'Two buildings in a row become legal'),
        buttons([
          action('See what that does', () => ctx.go('road'), {
            tip: 'The road map prints the exact odds these produce',
          }),
        ]),
      ], 'A thumb on the scale, applied to the appetite before the hand count and the spacing dimmer. Zero means the road will not deal that kind at all while anything else is legal.'),

      section('The economy', [
        row('Gold from a body', sliderField({
          value: OVERRIDES.economy.goldMul,
          min: 0,
          max: 10,
          step: 0.25,
          format: (n) => `×${n}`,
          onChange: (n) => {
            setOverride('economy.goldMul', n);
            ctx.refresh();
          },
        })),
        row('Exp from a body', sliderField({
          value: OVERRIDES.economy.expMul,
          min: 0,
          max: 10,
          step: 0.25,
          format: (n) => `×${n}`,
          onChange: (n) => {
            setOverride('economy.expMul', n);
            ctx.refresh();
          },
        })),
        row('Everything on a shelf', sliderField({
          value: OVERRIDES.economy.priceMul,
          min: 0,
          max: 5,
          step: 0.1,
          format: (n) => `×${n}`,
          onChange: (n) => {
            setOverride('economy.priceMul', n);
            ctx.refresh();
          },
        }), 'Shop prices only — a sale still pays half the item\'s base value'),
      ]),

      section('The counters', [
        ...RARITIES.map((tier) => row(t('{tier} weight', { tier }), numberField({
          value: rarity[tier] ?? 0,
          min: 0,
          onChange: (n) => {
            setOverride('shop.rarity', { ...rarity, [tier]: n });
            ctx.refresh();
          },
        }), `${(((rarity[tier] || 0) / rarityTotal) * 100).toFixed(1)}% of slots`)),
        row('Discount chance', numberField({
          value: OVERRIDES.shop.discountChance,
          min: 0,
          max: 1,
          step: 0.05,
          nullable: true,
          placeholder: String(BASE_DISCOUNT_CHANCE),
          onChange: (n) => {
            setOverride('shop.discountChance', n);
            ctx.refresh();
          },
        }), 'Empty to hand it back to the perks the run has bought'),
        row('Extra slots', numberField({
          value: OVERRIDES.shop.extraSlots,
          min: -2,
          max: 9,
          onChange: (n) => {
            setOverride('shop.extraSlots', n);
            ctx.refresh();
          },
        }), `on top of the ${BASE_SLOTS} every counter has`),
        el('div.admin-probs', {}, RARITIES.map((tier) =>
          probBar(tier, (rarity[tier] || 0) / rarityTotal, `weight ${rarity[tier] || 0} of ${rarityTotal}`))),
        buttons([
          action('Back to this world\'s table', () => {
            setOverride('shop.rarity', null);
            ctx.refresh();
          }, { disabled: !OVERRIDES.shop.rarity }),
          action('All legendary', () => {
            setOverride('shop.rarity', { common: 0, rare: 0, legendary: 100 });
            ctx.refresh();
          }),
        ]),
      ], `This world's own table is ${RARITIES.map((t) => `${t} ${world.rarity[t]}`).join(', ')}.`),

      section('What is bent right now', [
        bent.length
          ? readout(bent.map((entry) => [entry.path, t('{value}  (was {was})', { value: format(entry.value), was: format(entry.was) })]))
          : el('p.admin-hint', { text: 'Nothing. This run is the game as designed.' }),
        buttons([
          action('Put it all back', () => {
            resetOverrides();
            ctx.refresh();
          }, { variant: 'btn--danger', disabled: bent.length === 0 }),
        ]),
      ], 'Everything on this list is thrown away when the run is left or reloaded. None of it is ever written to a save.'),
    ]);
  },
};

function format(value) {
  if (value === null) return 'off';
  if (value === undefined) return 'default';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
