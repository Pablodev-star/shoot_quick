/**
 * SHOOT! — The wardrobe.
 *
 * What every garment is CALLED, what it is worth saying about it, and which
 * line of the ledger has to be crossed off before it can be worn. The art
 * itself is in `src/art/sprites-wardrobe.js`; this file is the catalogue, the
 * lock, and the drawer the outfit is kept in — exactly the split the forge
 * ladder uses (`src/game/gun-tiers.js` is data, the press is in the art).
 *
 * WHERE THE LOCK COMES FROM
 * ---------------------------------------------------------------------------
 * Two places, and a garment belongs to exactly one of them.
 *
 * EARNED. A garment does not name its achievement — the achievement names its
 * reward (`reward: { kind: 'clothing', slot, id }` in
 * src/game/achievements.js) and this file reads the list backwards. One
 * direction, one source of truth: retune an achievement, move a reward, drop a
 * line entirely, and the wardrobe follows without anybody remembering it exists.
 *
 * BOUGHT. Everything marked `source: 'shop'` hangs on no achievement at all and
 * is sold over one counter in the game: the clothing shop, which turns up once
 * in a whole run, in a world the seed picks (see src/shops/tailor.js). Those are
 * the pieces at the END of every drawer, and they are the reason the drawer has
 * two halves: what the road gave you, and what you paid for. A bought garment is
 * written onto the PROFILE the moment it is paid for, so it is yours for good —
 * not for the run, which would make a shop that appears once a run a shop that
 * sells you nothing.
 *
 * WHAT AN OUTFIT IS
 * ---------------------------------------------------------------------------
 * Five ids on the profile, next to the name — device-side, outside the save
 * slots, through the same storage driver as everything else. It survives a run
 * dying, because a hat earned by beating the boss of the Basin is not something
 * to lose to a bad duel in the Flats.
 *
 * The fifth is the HORSE's, and it is worn by the horse rather than by the man:
 * a harness comes whole (see the note in src/art/sprites-wardrobe.js) and one of
 * them is deliberately nothing at all, for a player who likes the animal bare.
 *
 * The equipped outfit is validated on every read. A profile that arrives from
 * somewhere else claiming a Starcrown, with the ledger saying otherwise, walks
 * out in the hat it started in.
 */

import { getProfile, updateProfile } from '../core/settings.js';
import { t } from '../core/i18n.js';
import { setPlayerParts, composeFighter, composeRider, horseSprites } from '../art/sprites-character.js';
import {
  DEFAULT_OUTFIT,
  HARNESS,
  OUTFIT_SLOTS,
  hasPiece,
  normalizeOutfit,
  outfitKey,
  outfitParts,
} from '../art/sprites-wardrobe.js';
import { ACHIEVEMENTS, isUnlocked, track } from './achievements.js';

export { DEFAULT_OUTFIT, OUTFIT_SLOTS };

/** What the tabs are called, and what a slot is for. */
export const SLOT_LABELS = {
  hat: { name: 'Hat', plural: 'Hats' },
  shirt: { name: 'Shirt', plural: 'Shirts' },
  pants: { name: 'Trousers', plural: 'Trousers' },
  boots: { name: 'Boots', plural: 'Boots' },
  horse: { name: 'Harness', plural: 'Horse' },
};

/**
 * Every garment, by slot, in the order the wardrobe lists it — the default
 * first, then the earned ones roughly in the order the road hands them over,
 * and last of all the ones that are only ever bought.
 *
 * `name` is what it is called. `blurb` is one line about what it is, written to
 * be read on the card next to the picture, never restating the picture.
 * `source: 'shop'` marks a garment no achievement will ever hand over, and
 * `price` is what it costs in the Dust Flats — the same base the item catalogue
 * quotes, run through the same curve, so a shirt in the Galaxy costs what
 * everything else in the Galaxy costs (see `itemPrice`).
 * `set` names the outfit a piece belongs to: those are sold as one thing and
 * never separately, so the piece carries no price of its own.
 */
export const WARDROBE = {
  hat: [
    { id: 'trail', name: 'Trail Hat', blurb: 'Sun-bleached felt with a working brim. It came with the road.' },
    { id: 'bandana', name: 'Road Agent', blurb: 'The same hat, and a kerchief up over the mouth. Nobody sees you draw.' },
    { id: 'sombrero', name: 'Prairie Sombrero', blurb: 'A brim wider than the man. The eyes stay in its shade all day.' },
    { id: 'fur', name: 'Whitecrown Ushanka', blurb: 'Pass fur, flaps down. Up there the wind is the thing that kills you.' },
    { id: 'sheriff', name: "Sheriff's Stetson", blurb: 'Pale felt, tall crown, a brass band. Somebody has to keep order.' },
    { id: 'tophat', name: "Gambler's Stovepipe", blurb: 'Silk, and a brim that has never been rained on.' },
    { id: 'horns', name: 'Basin Helm', blurb: 'Iron off the Brimstone floor, with the horns still on it.' },
    { id: 'shroud', name: 'Hollow Shroud', blurb: 'Linen off somebody who was not using it. It smells of turned earth and it always will.' },
    { id: 'starcrown', name: 'Starcrown', blurb: 'A circlet of void iron, and a ring of light that does not touch it.' },
    { id: 'reaver', name: "Reaver's Hood", blurb: 'A peak of black cloth, ragged at the jaw, and a slit of fire where the eyes go.' },
    { id: 'bowler', name: 'Derby Bowler', blurb: 'Town hat. Out here it is a joke, and it knows it.', source: 'shop', price: 70 },
    { id: 'cavalry', name: 'Cavalry Campaign', blurb: 'Crossed sabres in brass, off a regiment that is not coming back.', source: 'shop', price: 90 },
    { id: 'nomad', name: 'Trader\'s Wrap', blurb: 'Cloth over the crown, and the tail of it left long down one side.', source: 'shop', price: 80 },
    { id: 'mourning', name: 'Crepe Topper', blurb: 'Black silk under black crepe. Somebody has to be dignified about it.', source: 'shop', set: 'mourning' },
    { id: 'rail', name: 'Company Cap', blurb: 'Peaked, badged, and worn by men who own the track under you.', source: 'shop', set: 'rail' },
  ],

  shirt: [
    { id: 'serape', name: 'Red Serape', blurb: 'Wool, one cream stripe, and every mile of the first world in it.' },
    { id: 'sheriffVest', name: 'Town Waistcoat', blurb: 'A clean shirt and a star over the heart. It means what it says.' },
    { id: 'duster', name: 'Oilskin Duster', blurb: 'Worn open, and long enough that the tails swing on the stride.' },
    { id: 'parka', name: 'Pass Parka', blurb: 'Quilted, with fur at the throat and again at the hem.' },
    { id: 'gambler', name: "Gambler's Black", blurb: 'Boiled shirt, black waistcoat, and a watch you never check.' },
    { id: 'ember', name: 'Cinder Coat', blurb: 'Char that never finished burning. The seams are still lit.' },
    { id: 'bones', name: 'Boneyard Shirt', blurb: 'Six of them are in the ground. This is what the seventh wears.' },
    { id: 'voidrobe', name: 'Horizon Cloth', blurb: 'Cut past the last horizon, with the sky still caught in the weave.' },
    { id: 'reaver', name: "Reaver's Coat", blurb: 'Black to the throat, one seam of fire down the front, and a hem that never went out.' },
    { id: 'poncho', name: 'Mule-Train Poncho', blurb: 'Banded wool, pulled over the head. It has smelled of mules for years.', source: 'shop', price: 95 },
    { id: 'brocade', name: 'Cardsharp\'s Brocade', blurb: 'Gold thread on plum, over sleeves nobody paid for.', source: 'shop', price: 120 },
    { id: 'mourning', name: 'Undertaker\'s Frock', blurb: 'Buttoned to the throat. It is the only coat he owns and it fits.', source: 'shop', set: 'mourning' },
    { id: 'rail', name: 'Company Coat', blurb: 'Two rows of brass down the front of the bluest blue in the territory.', source: 'shop', set: 'rail' },
  ],

  pants: [
    { id: 'trail', name: 'Trail Trousers', blurb: 'Working canvas. Nothing to say about them, which is the idea.' },
    { id: 'chaps', name: 'Fringed Chaps', blurb: 'Leather over the jeans, cut long, fringed down the outside.' },
    { id: 'stripe', name: "Banker's Stripes", blurb: 'A gold seam up each leg, for a man who is carrying it.' },
    { id: 'quilted', name: 'Pass Quilting', blurb: 'Lined with pelt and turned out at the sides. Warm, and it shows.' },
    { id: 'iron', name: 'Riveted Greaves', blurb: 'Plate over the thighs. Heavy, and it looks it.' },
    { id: 'ash', name: 'Scorched Leggings', blurb: 'Basin char with the cracks still glowing through them.' },
    { id: 'star', name: 'Starfall Trousers', blurb: 'Cloth with a sky in it. The stars move when you do.' },
    { id: 'reaver', name: "Reaver's Greaves", blurb: 'Black leather, a red seam up the thigh, and coals banked at the shin.' },
    { id: 'denim', name: 'Rivet Denim', blurb: 'Indigo, and a copper rivet at every seam that ever gave out.', source: 'shop', price: 75 },
    { id: 'hide', name: 'Buffalo Hide', blurb: 'Hair left on the outside. Heavy, warm, and nothing gets through it.', source: 'shop', price: 90 },
    { id: 'mourning', name: 'Sunday Blacks', blurb: 'Pressed, and one satin line down the outside of each leg.', source: 'shop', set: 'mourning' },
    { id: 'rail', name: 'Surveyor\'s Canvas', blurb: 'Company canvas, striped the same yellow as the engines.', source: 'shop', set: 'rail' },
  ],

  boots: [
    { id: 'trail', name: 'Trail Boots', blurb: 'The pair you walked in on. They have held up.' },
    { id: 'spurs', name: 'Rowel Spurs', blurb: 'Riding boots, and a wheel of brass behind each heel.' },
    { id: 'waders', name: 'Bayou Waders', blurb: 'Up past the knee, because down there everything is.' },
    { id: 'snow', name: 'Pass Boots', blurb: 'Tall, with the fleece turned down over the top of them.' },
    { id: 'ember', name: 'Emberwelt Boots', blurb: 'The melt never stopped running out of the welt.' },
    { id: 'gilded', name: 'Gilt Boots', blurb: 'Gold from the toe to the top. Loud, and meant to be.' },
    { id: 'star', name: 'Starfall Boots', blurb: 'They leave a little light wherever they land.' },
    { id: 'reaver', name: "Reaver's Boots", blurb: 'Past the calf in black, and the welt has not stopped glowing since.' },
    { id: 'mule', name: 'Muleskinner Boots', blurb: 'Laced to the knee and re-soled twice. They will see you out.', source: 'shop', price: 70 },
    { id: 'hobnail', name: 'Hobnail Boots', blurb: 'Iron in the sole. You can hear the man coming before the horse.', source: 'shop', price: 85 },
    { id: 'mourning', name: 'Patent Blacks', blurb: 'Polished until the road shows up in them.', source: 'shop', set: 'mourning' },
    { id: 'rail', name: 'Steel-Toed Boots', blurb: 'Made for standing on sleepers while something heavy goes past.', source: 'shop', set: 'rail' },
  ],

  /**
   * THE FIFTH DRAWER, AND THE ONE NOBODY WEARS
   * -------------------------------------------------------------------------
   * Tack. It is listed last because it is the odd one out — it hangs on the
   * horse, it only exists once you have bought one, and it comes as a whole rig
   * rather than as parts. `none` is first and it is a real answer: the animal
   * in its own saddle, which is what the game looked like before any of this.
   */
  horse: [
    { id: 'trail', name: 'Trail Tack', blurb: 'Plain leather and a brass bit. It came with the animal.' },
    { id: 'none', name: 'No Tack', blurb: 'Nothing but the saddle. Some horses are better left alone.' },
    { id: 'drover', name: 'Drover\'s Rig', blurb: 'Bags for the long stretches, and a roll behind the cantle.' },
    { id: 'brass', name: 'Brass Show Rig', blurb: 'Oiled black leather under more brass than any horse needs.' },
    { id: 'iron', name: 'Basin Barding', blurb: 'A plate over the shoulder, off the same floor the helm came from.' },
    { id: 'star', name: 'Starfall Tack', blurb: 'The fittings are not reflecting anything. There is nothing to reflect.' },
    { id: 'reaver', name: "Reaver's Barding", blurb: 'Every strap it can carry, in black, with red iron on the shoulder and a plume to match the hem.' },
    { id: 'silver', name: 'Silverwork Tack', blurb: 'Border saddlery. Conchos from the browband to the girth.', source: 'shop', price: 130 },
    { id: 'parade', name: 'Parade Rig', blurb: 'Scarlet webbing and a feather that stands straight up.', source: 'shop', price: 145 },
    { id: 'packer', name: 'Packer\'s Rig', blurb: 'Everything you own, and the horse is the one carrying it.', source: 'shop', price: 115 },
  ],
};

/**
 * THE COMPLETE OUTFITS
 * ---------------------------------------------------------------------------
 * Four pieces cut to go together, sold as one thing and never separately. They
 * exist because the shop-only half of the wardrobe is a shelf rather than a
 * ladder: nothing out there is stronger than anything else, so the only way to
 * make a purchase feel like an event is to sell a LOOK — walk out of the tailor
 * dressed as an undertaker, all four slots at once, for the price of about
 * three garments.
 *
 * The pieces are ordinary wardrobe entries carrying `set:` and no price of
 * their own; this is the only thing that hands them over.
 */
export const WARDROBE_SETS = [
  {
    id: 'mourning',
    name: "Undertaker's Sunday",
    blurb: 'Crepe, black frock, pressed blacks and patent boots. Somebody has to be dignified about all this.',
    price: 260,
    pieces: { hat: 'mourning', shirt: 'mourning', pants: 'mourning', boots: 'mourning' },
  },
  {
    id: 'rail',
    name: 'Rail Baron',
    blurb: 'Company blue from the cap to the toecaps. The men who own the track dress like they own it.',
    price: 290,
    pieces: { hat: 'rail', shirt: 'rail', pants: 'rail', boots: 'rail' },
  },
];

const SET_BY_ID = new Map(WARDROBE_SETS.map((s) => [s.id, s]));

const BY_ID = new Map();
for (const slot of OUTFIT_SLOTS) {
  for (const item of WARDROBE[slot]) {
    item.slot = slot;
    BY_ID.set(`${slot}:${item.id}`, item);
  }
}

/**
 * Every reward the ledger hands out, read off the achievements themselves.
 * Built once, lazily, because the two files load in either order.
 * @type {Map<string, object>|null}
 */
let requirements = null;

/**
 * ONE LINE, ONE GARMENT — EXCEPT ONCE
 * ---------------------------------------------------------------------------
 * Thirty achievements hand over a single piece and say so in the shape the
 * reward is written in: `{ kind: 'clothing', slot, id }`. Exactly one hands
 * over five, and it is the one at the end of the hard road — a hat, a coat,
 * trousers, boots and the horse's barding, all at once, because the Ember
 * Reaver is a LOOK rather than a garment and handing it over in pieces would
 * make the last four of them arrive with nothing to celebrate.
 *
 * Rather than a second reward kind, the same kind takes a `pieces` array and
 * everything below normalises the two into one list. A reward that names one
 * garment and a reward that names five then read identically to the wardrobe,
 * to the achievements screen and to the lock — and adding a second complete
 * outfit later is a line of data rather than a branch.
 */
function rewardPieces(reward) {
  if (!reward || reward.kind !== 'clothing') return [];
  if (Array.isArray(reward.pieces)) return reward.pieces;
  return [{ slot: reward.slot, id: reward.id }];
}

function requirementIndex() {
  if (requirements) return requirements;
  requirements = new Map();
  for (const def of ACHIEVEMENTS) {
    for (const piece of rewardPieces(def.reward)) {
      const item = BY_ID.get(`${piece.slot}:${piece.id}`);
      if (!item) {
        console.warn(`[wardrobe] "${def.id}" rewards a garment that does not exist`);
        continue;
      }
      requirements.set(`${piece.slot}:${piece.id}`, def);
    }
  }
  return requirements;
}

/** The achievement a garment is locked behind, or null if it is free. */
export function requirementFor(slot, id) {
  return requirementIndex().get(`${slot}:${id}`) || null;
}

/** Every garment an achievement hands over, in the order it names them. */
export function rewardsOf(achievement) {
  return rewardPieces(achievement?.reward)
    .map((piece) => BY_ID.get(`${piece.slot}:${piece.id}`))
    .filter(Boolean);
}

/** The first garment an achievement hands over, or null. */
export function rewardOf(achievement) {
  return rewardsOf(achievement)[0] || null;
}

// ---------------------------------------------------------------------------
// What is bought
// ---------------------------------------------------------------------------

/**
 * The receipts. One flat list of `slot:id` on the profile, next to the outfit
 * and outside the save slots — a garment paid for in a run that later died is
 * still a garment you paid for.
 */
function receipts() {
  const list = getProfile().clothing;
  return new Set(Array.isArray(list) ? list : []);
}

export function isBought(slot, id) {
  return receipts().has(`${slot}:${id}`);
}

/**
 * Write a purchase down. Takes the whole basket at once, because a complete
 * outfit is four garments and a half-written set is the one state this must
 * never leave behind.
 *
 * @param {Array<{slot: string, id: string}>} pieces
 */
export async function grantClothing(pieces) {
  const owned = receipts();
  for (const { slot, id } of pieces) {
    if (hasPiece(slot, id)) owned.add(`${slot}:${id}`);
  }
  await updateProfile({ clothing: [...owned] });
  return [...owned];
}

/** The set a garment belongs to, or null. */
export function setOf(slot, id) {
  const item = BY_ID.get(`${slot}:${id}`);
  return item?.set ? SET_BY_ID.get(item.set) || null : null;
}

export function getSet(id) {
  return SET_BY_ID.get(id) || null;
}

/** Every piece a complete outfit hands over. */
export function setPieces(set) {
  return Object.entries(set.pieces).map(([slot, id]) => ({ slot, id }));
}

export function isSetOwned(set) {
  return setPieces(set).every(({ slot, id }) => isOwned(slot, id));
}

export function isOwned(slot, id) {
  if (!hasPiece(slot, id)) return false;
  const item = BY_ID.get(`${slot}:${id}`);
  if (item?.source === 'shop') return isBought(slot, id);
  const req = requirementFor(slot, id);
  return !req || isUnlocked(req.id);
}

export function findItem(slot, id) {
  return BY_ID.get(`${slot}:${id}`) || null;
}

/**
 * Why a garment is not in the drawer yet, in the two words a card has room for
 * and the sentence underneath it.
 *
 * Both halves of the wardrobe answer the same question here, which is the whole
 * point of the shape: a card does not have to know whether the thing it is
 * drawing is earned or bought, only what to print on a locked one.
 */
export function lockFor(slot, id) {
  const item = BY_ID.get(`${slot}:${id}`);
  if (!item) return null;
  if (item.set) {
    const set = SET_BY_ID.get(item.set);
    return {
      kind: 'set',
      name: set ? set.name : 'A complete outfit',
      description: t('Sold as part of {set}, at a clothing shop.', {
        set: t(set ? set.name : 'a complete outfit'),
      }),
    };
  }
  if (item.source === 'shop') {
    return {
      kind: 'shop',
      name: 'Clothing shop',
      description: 'Sold over the counter at a clothing shop, if the road puts one in front of you.',
    };
  }
  const req = requirementFor(slot, id);
  return req ? { kind: 'achievement', name: req.name, description: req.description } : null;
}

/**
 * The wardrobe as the screen draws it: every slot, every garment, whether it
 * is owned, whether it is on, and what it is waiting for if it is not.
 */
export function getWardrobe(outfit = getOutfit()) {
  const slots = OUTFIT_SLOTS.map((slot) => {
    const items = WARDROBE[slot].map((item) => ({
      ...item,
      requirement: requirementFor(slot, item.id),
      lock: lockFor(slot, item.id),
      owned: isOwned(slot, item.id),
      equipped: outfit[slot] === item.id,
    }));
    return {
      slot,
      label: SLOT_LABELS[slot],
      items,
      ownedCount: items.filter((i) => i.owned).length,
    };
  });
  const owned = slots.reduce((sum, s) => sum + s.ownedCount, 0);
  const total = slots.reduce((sum, s) => sum + s.items.length, 0);
  return { slots, owned, total };
}

/**
 * Everything a clothing shop could ever have on its rail, as offers: the
 * shop-only garments that are sold on their own, and the complete outfits.
 *
 * Nothing earned is in here and nothing already owned is either — a counter
 * that offers a man the hat he is wearing is a counter with two of its three
 * slots wasted. See src/shops/tailor.js for what one visit actually rolls.
 */
export function clothingOffers({ includeOwned = false } = {}) {
  const out = [];
  for (const slot of OUTFIT_SLOTS) {
    for (const item of WARDROBE[slot]) {
      if (item.source !== 'shop' || item.set) continue;
      if (!includeOwned && isOwned(slot, item.id)) continue;
      out.push({
        kind: 'piece',
        id: `${slot}:${item.id}`,
        slot,
        pieceId: item.id,
        name: item.name,
        blurb: item.blurb,
        basePrice: item.price,
        label: SLOT_LABELS[slot].name,
        pieces: [{ slot, id: item.id }],
      });
    }
  }
  for (const set of WARDROBE_SETS) {
    if (!includeOwned && isSetOwned(set)) continue;
    out.push({
      kind: 'set',
      id: `set:${set.id}`,
      slot: 'hat',
      pieceId: set.pieces.hat,
      name: set.name,
      blurb: set.blurb,
      basePrice: set.price,
      label: 'Complete outfit',
      pieces: setPieces(set),
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// What is on
// ---------------------------------------------------------------------------

/**
 * WHAT THE ADMIN PANEL IS WEARING
 * ---------------------------------------------------------------------------
 * The one legitimate way past the lock above, and it is deliberately the
 * narrowest possible hole: an outfit held in memory, never written to the
 * profile, cleared when the run is left. A tester changing into the Starcrown
 * mid-crossing to check how it draws in the snow is not the same act as owning
 * it — the ledger is untouched, `saveOutfit` still refuses to write anything
 * unearned, and the next boot is back in whatever was actually unlocked.
 *
 * It is checked inside `getOutfit` rather than by having the panel call
 * `applyOutfit` directly, because the rig is re-dressed from `getOutfit` in
 * several places (the wardrobe screen's mannequin, a fresh boot); an override
 * that only reached the sprite cache would be quietly undone by any of them.
 */
let override = null;

/**
 * Wear anything, owned or not, for as long as this session lasts.
 * @param {object|null} outfit four garment ids, or null to hand it back
 */
export function setOutfitOverride(outfit) {
  override = outfit ? normalizeOutfit(outfit) : null;
  applyOutfit();
  return override;
}

/** What the panel has forced on, or null. */
export function getOutfitOverride() {
  return override;
}

/**
 * The equipped outfit, with anything unknown or unearned replaced by the
 * default for that slot. Every read goes through here — a garment cannot be
 * worn out of a save file that was edited, or out of a ledger that was reset.
 */
export function getOutfit() {
  if (override) return { ...override };
  const stored = normalizeOutfit(getProfile().outfit || {});
  const out = {};
  for (const slot of OUTFIT_SLOTS) {
    out[slot] = isOwned(slot, stored[slot]) ? stored[slot] : DEFAULT_OUTFIT[slot];
  }
  return out;
}

/**
 * WHAT IS ACTUALLY ON, HELD RATHER THAN RECOMPUTED
 * ---------------------------------------------------------------------------
 * `getOutfit` is not free: it clones the profile, and then validates all five
 * slots against the ledger and the receipts, each of which clones the profile
 * again. That is exactly the right amount of work for a screen that asks once,
 * and exactly the wrong amount for the Ember Reaver's fire, which asks on every
 * frame of three different renderers — about thirty small allocations a frame,
 * for an answer that changes when somebody presses Save.
 *
 * So the worn outfit is cached, and `applyOutfit` is the invalidation point.
 * That works because it is genuinely the only funnel: boot dresses the rig
 * through it, Save goes through it, and the Admin Panel's override goes through
 * it. Anything that ever changes what the man is wearing without calling it
 * would be a bug in its own right — the sprite cache would be stale too.
 */
let wornOutfit = null;

/** The equipped outfit, cached. Callers must not mutate what comes back. */
function worn() {
  if (!wornOutfit) wornOutfit = getOutfit();
  return wornOutfit;
}

/** Dress the rig. Everything that draws the player picks this up on its next frame. */
export function applyOutfit(outfit = getOutfit()) {
  wornOutfit = outfit;
  setPlayerParts(outfitParts(outfit));
  return outfit;
}

/**
 * Save an outfit and put it on. Returns what was actually saved, which is not
 * always what was asked for — see `getOutfit`.
 */
export async function saveOutfit(outfit) {
  const worn = {};
  for (const slot of OUTFIT_SLOTS) {
    worn[slot] = isOwned(slot, outfit[slot]) ? outfit[slot] : DEFAULT_OUTFIT[slot];
  }
  await updateProfile({ outfit: worn });
  applyOutfit(worn);
  track('outfitSaved', { dressedUp: isDressedUp(worn) });
  return worn;
}

/** True if this outfit is anything other than what everybody starts in. */
export function isDressedUp(outfit) {
  return OUTFIT_SLOTS.some((slot) => outfit[slot] !== DEFAULT_OUTFIT[slot]);
}

// ---------------------------------------------------------------------------
// The one outfit that is on fire
// ---------------------------------------------------------------------------

/**
 * WHAT BURNS, AND HOW MUCH OF IT
 * ---------------------------------------------------------------------------
 * The Ember Reaver is the only thing in the wardrobe with live particles on it
 * (`createEmberAura` in src/art/ember-aura.js), and this is the one place that
 * decides how much. Four screens ask — the road, the duel, the mannequin and
 * the menu backdrop — and none of them knows the id of a garment.
 *
 * IT SCALES WITH HOW MUCH OF THE SET IS ON, WHICH IS THE WHOLE DESIGN
 * ---------------------------------------------------------------------------
 * A boolean would have been simpler and it would have made the four pieces
 * interchangeable: put on the hood, get the fire, wear whatever you like below
 * it. Scaling means the coat alone smoulders, three pieces burn properly and
 * the full set is the thing the cut-scene promised — so a player who has just
 * finished the hard road has a reason to wear all of it, and a player who likes
 * one piece can still take exactly one piece of the fire with them.
 *
 * @param {object} [outfit]
 * @returns {number} 0 to 1
 */
const EMBER_PIECE = 'reaver';
const EMBER_SLOTS = ['hat', 'shirt', 'pants', 'boots'];

export function emberIntensity(outfit = worn()) {
  const count = EMBER_SLOTS.filter((slot) => outfit[slot] === EMBER_PIECE).length;
  /**
   * A floor of a fifth on the first piece rather than a straight quarter, so
   * one garment is unmistakably alight instead of being a scatter of four
   * particles nobody notices. The top of the range is what the full set is
   * worth, and nothing gets there without all four.
   */
  return count === 0 ? 0 : 0.2 + (count / EMBER_SLOTS.length) * 0.8;
}

/**
 * The horse's own fire, which is all or nothing: the barding is one piece of
 * tack and there is no such thing as wearing a quarter of a bridle.
 */
export function horseEmberIntensity(outfit = worn()) {
  return outfit.horse === EMBER_PIECE ? 1 : 0;
}

// ---------------------------------------------------------------------------
// Trying things on
// ---------------------------------------------------------------------------

/**
 * A full animation set for an outfit that is NOT the one being worn — what the
 * mannequin on the wardrobe screen is breathing in while the player decides.
 *
 * Kept off the rig's own cache on purpose: nothing is committed until Save, and
 * the road behind the screen must not change clothes on a hover. Bounded, so a
 * long session of trying things on cannot grow without limit.
 */
const previews = new Map();
const PREVIEW_LIMIT = 24;

export function previewSprites(outfit) {
  const key = outfitKey(outfit);
  const hit = previews.get(key);
  if (hit) return hit;
  const set = composeFighter(outfitParts(outfit));
  previews.set(key, set);
  if (previews.size > PREVIEW_LIMIT) previews.delete(previews.keys().next().value);
  return set;
}

/**
 * The same thing in the saddle: the horse in the outfit's harness, with the
 * rider dressed in the rest of it.
 *
 * The wardrobe screen shows this instead of the man on foot while the Horse
 * drawer is open, for the reason every other drawer shows a man: you cannot
 * choose tack off a list of names, and a bridle drawn on nothing is four brown
 * pixels. The horse is baked once per RIG rather than once per outfit — a
 * change of hat is no reason to build a horse — so the two halves are cached
 * separately and only the rider is keyed by the whole outfit.
 */
export function previewMount(outfit) {
  const parts = outfitParts(outfit);
  const key = `ride:${outfitKey(outfit)}`;
  let rider = previews.get(key);
  if (!rider) {
    rider = composeRider(parts);
    previews.set(key, rider);
    if (previews.size > PREVIEW_LIMIT) previews.delete(previews.keys().next().value);
  }
  return { horse: horseSprites(parts.harness), rider };
}

/** How many garments exist in total. */
export const TOTAL_GARMENTS = OUTFIT_SLOTS.reduce((sum, slot) => sum + WARDROBE[slot].length, 0);
