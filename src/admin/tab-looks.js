/**
 * SHOOT! — Admin Panel · Looks.
 *
 * Every garment in the game, locked or not, worn on the spot in the middle of a
 * run — which is the one thing the wardrobe screen will never do, for a good
 * reason: a hat is a reward, and a reward you can help yourself to is not one.
 *
 * WHAT THIS IS AND IS NOT ALLOWED TO DO
 * ---------------------------------------------------------------------------
 * It sets a session override (`setOutfitOverride` in src/game/wardrobe.js) and
 * nothing else. The ledger is not touched, the profile is not written, and the
 * moment the run is left or reloaded the player is back in whatever they have
 * actually earned. So a tester can walk the Basin in the Starcrown to see how
 * the light catches it, and nobody has been given anything.
 *
 * There are thirty garments and they are drawn ON the rig at composition time,
 * which is the whole reason this tab exists as pictures rather than as four
 * dropdowns: the bug is always "the trousers do not find the legs in the
 * gallop", and you cannot see that in a list of names.
 */

import { el } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { crisp, drawSprite, makeCanvas } from '../art/pixel.js';
import { RIDER_OFFSET } from '../art/sprites-character.js';
import { OUTFIT_SLOTS, DEFAULT_OUTFIT } from '../art/sprites-wardrobe.js';
import {
  WARDROBE,
  SLOT_LABELS,
  getOutfit,
  getOutfitOverride,
  setOutfitOverride,
  isOwned,
  lockFor,
  previewMount,
  previewSprites,
} from '../game/wardrobe.js';
import { note } from './overrides.js';
import { section, buttons, action, grid, readout } from './widgets.js';

/** Which drawer is open. Kept between renders. */
let openSlot = 'hat';

export const LooksTab = {
  id: 'looks',
  label: 'Looks',

  render(ctx) {
    const worn = getOutfit();
    const forced = getOutfitOverride();

    const wear = (slot, id) => {
      setOutfitOverride({ ...worn, [slot]: id });
      note(t('wearing {slot}:{id}', { slot, id }));
      ctx.refresh();
    };

    const drawers = OUTFIT_SLOTS.map((slot) =>
      el('button.tab', {
        role: 'tab',
        'aria-selected': String(slot === openSlot),
        onclick: () => {
          openSlot = slot;
          ctx.refresh();
        },
        text: SLOT_LABELS[slot].plural,
      }));

    const cards = WARDROBE[openSlot].map((item) => {
      const on = worn[openSlot] === item.id;
      const owned = isOwned(openSlot, item.id);
      const lock = lockFor(openSlot, item.id);
      return el(`button.admin-card.admin-card--garment${on ? '.is-held' : ''}`, {
        onclick: () => wear(openSlot, item.id),
        'aria-pressed': String(on),
      }, [
        figure({ ...worn, [openSlot]: item.id }, openSlot === 'horse' ? 2 : 3, openSlot === 'horse'),
        el('div.admin-card-body', {}, [
          el('div.admin-card-name', { text: item.name }),
          el('div.admin-card-meta', {
            text: owned
              ? (item.source === 'shop' ? 'bought' : 'earned')
              : `locked · ${lock ? lock.name : 'nothing grants it'}`,
          }),
          el('div.admin-card-desc', { text: item.blurb }),
        ]),
      ]);
    });

    return el('div.admin-tab', {}, [
      section('Wearing', [
        el('div.admin-outfit', {}, [
          figure(worn, openSlot === 'horse' ? 3 : 4, openSlot === 'horse'),
          readout(OUTFIT_SLOTS.map((slot) => {
            const item = WARDROBE[slot].find((g) => g.id === worn[slot]);
            return [
              SLOT_LABELS[slot].name,
              t(isOwned(slot, worn[slot]) ? '{name}' : '{name} · borrowed', { name: t(item ? item.name : worn[slot]) }),
            ];
          })),
        ]),
        buttons([
          action('Back to what is earned', () => {
            setOutfitOverride(null);
            note('outfit handed back');
            ctx.refresh();
          }, { variant: forced ? 'btn--danger' : '', disabled: !forced }),
          action('Everything the road gives', () => {
            const dressed = {};
            for (const slot of OUTFIT_SLOTS) {
              const list = WARDROBE[slot];
              dressed[slot] = list[list.length - 1].id;
            }
            setOutfitOverride(dressed);
            ctx.refresh();
          }, { tip: 'The last garment in every drawer' }),
          action('Dress at random', () => {
            const dressed = {};
            for (const slot of OUTFIT_SLOTS) {
              const list = WARDROBE[slot];
              dressed[slot] = list[Math.floor(Math.random() * list.length)].id;
            }
            setOutfitOverride(dressed);
            ctx.refresh();
          }),
          action('Back to the trail set', () => {
            setOutfitOverride({ ...DEFAULT_OUTFIT });
            ctx.refresh();
          }),
        ]),
      ], forced
        ? 'Borrowed for this session only. Nothing is written to the profile and the ledger has not moved.'
        : 'Nothing borrowed — this is what the ledger says you own.'),

      section('The drawers', [
        el('div.tabs', { role: 'tablist' }, drawers),
        grid(cards, 'admin-grid--garments'),
      ]),
    ]);
  },
};

/**
 * The gunslinger in a given outfit, as one still frame.
 *
 * A canvas rather than an `<img>`: thirty of these are drawn every time a
 * drawer is opened and `toDataURL` on each would be a visible stall. It is the
 * same trick the wardrobe screen uses, and the same baked preview set, so what
 * is on this card is exactly what walks out onto the road.
 */
function figure(outfit, scale = 3, mounted = false) {
  if (mounted) return mount(outfit, scale);
  const set = previewSprites(outfit);
  const sprite = set.idle[0];
  const { canvas, ctx } = makeCanvas(sprite.width * scale, sprite.height * scale);
  crisp(ctx);
  drawSprite(ctx, sprite, 0, 0, scale);
  canvas.className = 'pixel admin-figure';
  canvas.style.width = `${canvas.width}px`;
  canvas.style.height = `${canvas.height}px`;
  return canvas;
}

/**
 * The same still, in the saddle — what the Horse drawer shows, because a
 * harness on a man is nothing at all. Rider included: the bug being looked for
 * is always "the tack goes through the rider's leg", and it cannot be seen on
 * an empty horse.
 */
function mount(outfit, scale = 2) {
  const { horse, rider } = previewMount(outfit);
  const sprite = horse.idle[0];
  // The rider sits four rows ABOVE the horse's own top edge (RIDER_OFFSET is
  // negative), so the canvas is grown by that much and everything is dropped
  // into it — otherwise the man is beheaded by the top of his own picture.
  const lift = -Math.min(0, RIDER_OFFSET.y);
  const { canvas, ctx } = makeCanvas(sprite.width * scale, (sprite.height + lift) * scale);
  crisp(ctx);
  drawSprite(ctx, sprite, 0, lift * scale, scale);
  drawSprite(ctx, rider.ride[0], RIDER_OFFSET.x * scale, (RIDER_OFFSET.y + lift) * scale, scale);
  canvas.className = 'pixel admin-figure';
  canvas.style.width = `${canvas.width}px`;
  canvas.style.height = `${canvas.height}px`;
  return canvas;
}
