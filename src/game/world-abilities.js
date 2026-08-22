/**
 * SHOOT! — World abilities.
 *
 * Every trick anybody can pull in a duel, and the one landmark each world can
 * put on the road behind it.
 *
 * AN ABILITY IS A MECHANIC, NOT A COAT OF PAINT
 * ---------------------------------------------------------------------------
 * The first version of this file had four effects — steal a round, poison,
 * dynamite, scramble a move — and eighteen names over the top of them. Every
 * world had a poison called something else, in a different colour, costing the
 * same life at the same moment. That is a reskin, and a reskin is exactly as
 * interesting as its tooltip: once a player has read "swamp rot: a life three
 * rounds later" they have read every ability in the game and there is nothing
 * left to learn on the road.
 *
 * So there are FOURTEEN mechanics now, and each one does something the others
 * cannot:
 *
 *   steal    takes rounds out of their cylinder; `take` of them into yours
 *   empty    takes ALL of them
 *   swap     trades cylinders — yours for theirs, whatever is in each
 *   blast    damage now, and A SHIELD STOPS IT (the dynamite)
 *   pierce   damage now, straight through a shield
 *   venom    1 damage EVERY round for `turns` rounds (the poison)
 *   drain    a life off them and onto you
 *   freeze   they lose their next `turns` turns entirely — they stand there
 *            (one turn: it deletes a turn AND hands one over, so it is worth
 *            double what it says and two of them ended fights on their own)
 *   jam      they cannot shoot for `turns` rounds
 *   panic    their shield does not protect for `turns` rounds
 *   blind    their next `turns` shots miss
 *   mark     everything that hits them costs one extra for `turns` rounds
 *   doubleTap your next `turns` shots cost them one extra
 *   reflect  the next shot that hits you goes back at whoever fired it
 *
 * Four of those are damage and ten are not, which is the point: an ability is
 * usually a thing done to the *shape of the fight* rather than to the life bar,
 * and two of them (freeze, mind you) hand the other side turns to use as they
 * like. See src/duel/duel-engine.js — every one is a counter on a side, and the
 * round resolution reads them.
 *
 * THERE ARE NO BANDS ANY MORE
 * ---------------------------------------------------------------------------
 * The old file tuned each effect three times, once per pair of worlds, because
 * the same effect turned up in five of them. Each ability belongs to exactly
 * one world now, so its numbers are written once, on the ability, and the
 * "it gets better as you go" curve is simply that the later worlds' entries are
 * stronger. One place to read a number, one place to change it.
 *
 * USING ONE COSTS THE ENEMY ITS TURN
 * ---------------------------------------------------------------------------
 * The rule that makes all of this survivable, and it is symmetrical in the
 * engine even though it is asymmetrical to play (see `playRound`):
 *
 *   · an enemy that casts is DOING that instead of drawing — no shot, no
 *     shield, and it is open all round
 *   · a player who casts forces the enemy to reload that round
 *   · the player is never restricted: cast and still shoot, shield, reload,
 *     or cast the other slot
 *
 * That is why the strong ones cost five or six rounds of charge. An ability is
 * not extra damage bolted onto a turn — it is a turn taken away from somebody.
 *
 * WHAT A CHARGE COSTS, AS A RULE INSTEAD OF NINETEEN OPINIONS
 * ---------------------------------------------------------------------------
 * `charge` is rounds, and a duel runs six or seven of them, so the number is
 * really an answer to "how many times a fight is this allowed to happen".
 * Three is twice a duel, five is once, seven is once and only if the fight
 * runs long. It used to be set by feel, and feel got two of them badly wrong:
 * measured against the Stranger, Meteor Strike was worth +44 points of win
 * rate and Void Mirror +41, against a design budget of thirteen to twenty.
 *
 * The rule now, and every entry below obeys it:
 *
 *   charge ≈ 3 + 1.5 × (what it takes away, in lives or in turns)
 *
 * — where a stolen round counts as a third of a turn, a freeze counts as the
 * turns it costs, and damage counts as lives. That is why Dust Snatch (one
 * round) is three and Meteor Strike (a life and a half, through a shield) is
 * five.
 *
 * AND EVERY DAMAGE FIGURE HERE IS SIZED AGAINST A THREE-TO-TEN LIFE BAR
 * ---------------------------------------------------------------------------
 * They were briefly written for a bar that ran to fourteen, and when the bar
 * went back to what it had always been the same numbers became half a run in a
 * button: a three-life blast against a three-diamond bar is the whole fight.
 * Everything that hurts was halved to match, including the three effects the
 * engine used to add a flat whole life for — a venom tick, a mark, the whisper
 * — which are `EFFECT_LIFE` in src/duel/duel-engine.js now.
 *
 * POISON AND DYNAMITE ARE WORLD ABILITIES, NOT SHOP STAPLES
 * ---------------------------------------------------------------------------
 * They used to be throwables anybody could buy anywhere, which made two of the
 * seven worlds' signatures into general stock. Poison belongs to the Blackwater
 * Bayou and dynamite to Brimstone Basin: they are sold in that world's shop and
 * nowhere else, they are carried by that world's riders and nobody else's, and
 * both were rewritten to be worth the trip — poison bites every round for three
 * rounds instead of once, and dynamite takes a life and a half at a stroke,
 * which is still the biggest single hit in the game and still the only one a
 * raised shield stops dead. Both are near the top of the charge table, and the
 * enemies that have them reach for them rarely (`weight`), because a trick that
 * lands every other round at that size is not a signature, it is a tax.
 *
 * THE PLAYER BUYS ALL OF IT
 * ---------------------------------------------------------------------------
 * Every entry here is sold, in the world it belongs to, as equipment kept for
 * the rest of the run (src/game/items.js builds the shop entries from this
 * file). What the player buys is not a copy to throw — it is a thing that
 * CHARGES: one point a round, and when it is full you spend it.
 */

import { PALETTE } from '../art/palette.js';
import { t, tPlural } from '../core/i18n.js';

/**
 * The mechanics, and what each one reads off its ability.
 *
 * `blocks` is the one thing the duel screen needs from this table that the
 * engine does not: whether a shield is any use against it, which is the first
 * question a player asks about anything pointed at them.
 */
export const EFFECTS = {
  steal: { label: 'Theft', blocks: false },
  empty: { label: 'Theft', blocks: false },
  swap: { label: 'Trade', blocks: false },
  blast: { label: 'Damage', blocks: true },
  pierce: { label: 'Damage', blocks: false },
  venom: { label: 'Damage over time', blocks: false },
  drain: { label: 'Damage', blocks: false },
  freeze: { label: 'Control', blocks: false },
  jam: { label: 'Control', blocks: false },
  panic: { label: 'Control', blocks: false },
  blind: { label: 'Control', blocks: false },
  /**
   * Gunfire only, and the description says so.
   *
   * The obvious reading of a mark is "everything that lands costs one more",
   * and that is what it used to claim — but it is only consulted where bullets
   * arrive (`landShot`), so a blast, a spout, a poison tick and a rock off the
   * mountain all ignored it. Two ways out of that: widen the rule into the
   * common damage path, or narrow the promise. The promise was narrowed,
   * because widening it would have put the mark on every venom tick as well —
   * three extra lives out of a four-round charge, on top of what it already
   * does to the shooting.
   */
  mark: { label: 'Curse', blocks: false },
  doubleTap: { label: 'Buff', blocks: false },
  reflect: { label: 'Guard', blocks: false },
};

export const EFFECT_LIST = Object.keys(EFFECTS);

/**
 * HOW AN ABILITY LOOKS WHEN IT HAPPENS
 * ---------------------------------------------------------------------------
 * `fx` is the whole performance, played by src/duel/duel-cast.js over the
 * fighter the ability landed on. It has two halves and they do different jobs.
 *
 * `props` are the OBJECTS: a stick of dynamite, a gourd of poison, a rope, a
 * rock out of nothing. They are thrown by somebody, they cross the road, and
 * they ARRIVE — which is the half the first version of this file did not have.
 * A stick of dynamite is not a burst of orange; it is a thing that lands at
 * your boots and sits there. Each prop names its art (src/art/sprites-casts.js)
 * and one of seven paths:
 *
 *   throw   out of the caster's hand in an arc, landing on the target
 *   fly     straight across the road, fast
 *   drop    down out of the sky onto them
 *   rise    up out of the ground under them
 *   hold    simply there, on them, for a while
 *   return  off the target and back to the caster — something being taken
 *   toss    off the target and onto the road — something being lost
 *
 * `motion` is the other half, and it is the old one: the particles, which are
 * the dust the object kicks up rather than the event itself. Seven behaviours —
 * streak, swarm, fall, rise, burst, spiral, sweep — and three colours.
 *
 * Two flags matter beyond that. `self` says the ability is cast BY the fighter
 * it lands on (a whisper, a mirror), so anything thrown comes off his own hand.
 * `fuse` on a prop says it STICKS where it lands and burns until the engine
 * says what happened to it — which is the dynamite, and the reason a cast can
 * outlive the round that threw it.
 *
 * `hold`, on the ability rather than on a prop, is the colour a fighter is
 * TINTED for as long as the status lasts. A freeze that is only an animation is
 * a freeze the player has forgotten about by the time it costs them a turn —
 * the ice stays on the sprite until it thaws.
 */
const fx = (motion, colors, extra = {}) => ({ motion, colors, count: 26, ...extra });

/**
 * Every ability in the game.
 *
 * Fields, beyond the obvious: `effect` is the mechanic, `amount`/`turns`/`take`
 * are its numbers, `charge` is how many rounds the player waits to spend it,
 * and `weight` is how often an enemy holding it reaches for it (1 is normal).
 *
 * EVERY CHARGE IN HERE IS DOUBLE WHAT IT WAS
 * ---------------------------------------------------------------------------
 * Six to twelve rounds against duels that run four to six. That is deliberate
 * and it is a nerf: a trick is no longer something both sides get to use in
 * every fight, it is something one of you gets to use in a LONG fight. See the
 * note over PLAYER_SPECIAL at the bottom of this file for the whole argument —
 * it applies to all twenty-three of these.
 */
export const ABILITIES = {
  // --- 1 · Dust Flats -------------------------------------------------------
  /** The wind does the stealing out here, and it takes it off your belt. */
  dustSnatch: {
    effect: 'steal',
    world: 1,
    amount: 1,
    take: 0,
    charge: 6,
    label: 'Dust Snatch',
    tip: 'A gust off the flats takes a round out of the gun',
    icon: 'dustSnatch',
    banner: 'DUST SNATCH!',
    /** A curl of grit goes for the gun, and the round it hooks out is gone. */
    fx: fx('streak', [PALETTE.sandLight, PALETTE.sand, PALETTE.sandDark], {
      count: 30,
      props: [
        {
          art: 'gust',
          path: 'fly',
          to: 'gun',
          ms: 300,
          spin: 70,
          scale: 1.3,
          faceTravel: true,
          trail: [PALETTE.sandLight],
          burst: { colors: [PALETTE.sandLight, PALETTE.sand], count: 14, speed: 0.2 },
        },
        {
          art: 'round',
          path: 'toss',
          to: 'gun',
          ms: 520,
          delay: 300,
          arc: 7,
          scale: 1.1,
          spin: 0,
          trail: [PALETTE.sandLight],
        },
      ],
    }),
  },
  /** Grit in the eyes. The gun still works; the aim does not. */
  sandBlind: {
    effect: 'blind',
    world: 1,
    turns: 1,
    charge: 6,
    label: 'Sand in the Eyes',
    tip: 'Their next shot goes wide',
    icon: 'sandBlind',
    banner: 'BLINDED!',
    /** A fistful of the flats, and it stays in their eyes after it lands. */
    fx: fx('swarm', [PALETTE.sand, PALETTE.sandLight, PALETTE.sandDeep], {
      count: 30,
      props: [
        {
          art: 'gust',
          path: 'fly',
          to: 'face',
          ms: 240,
          spin: 55,
          scale: 0.7,
          faceTravel: true,
          burst: { colors: [PALETTE.sandLight, PALETTE.sandDark], count: 14, speed: 0.2 },
        },
        {
          art: 'grit',
          path: 'hold',
          to: 'face',
          delay: 240,
          hold: 700,
          grow: true,
          scale: 0.55,
          alpha: 0.9,
        },
      ],
    }),
  },

  // --- 2 · Wildgrass Prairie ------------------------------------------------
  /** A rope on the gun arm. They can reload and they can duck; they cannot fire. */
  lassoPull: {
    effect: 'jam',
    world: 2,
    turns: 2,
    charge: 8,
    label: 'Lasso',
    tip: 'A rope on the gun arm — they cannot shoot for two rounds',
    icon: 'lassoPull',
    banner: 'ROPED!',
    /**
     * The loop leaves the hand with the rope still attached to it — `tether`
     * draws the line back to the caster for as long as the loop is out there,
     * which is the difference between a lasso and a hoop somebody threw.
     */
    fx: fx('streak', [PALETTE.boneDark, PALETTE.bone, PALETTE.woodDark], {
      count: 20,
      props: [
        {
          art: 'lasso',
          path: 'fly',
          to: 'gun',
          ms: 320,
          scale: 0.85,
          hold: 520,
          grow: true,
          tether: PALETTE.boneDark,
          burst: { colors: [PALETTE.bone, PALETTE.boneDark], count: 10, speed: 0.14 },
        },
      ],
    }),
  },
  /** Nobody keeps a shield up with their hands full of hornets. */
  hornetSwarm: {
    effect: 'panic',
    world: 2,
    turns: 2,
    charge: 8,
    label: 'Hornet Swarm',
    tip: 'Their shield stops nothing for two rounds',
    icon: 'hornetSting',
    banner: 'SWARMED!',
    /** The nest is lobbed at their feet, and then it opens. */
    fx: fx('swarm', [PALETTE.gold, PALETTE.ink, PALETTE.goldLight], {
      count: 34,
      props: [
        {
          art: 'nest',
          path: 'throw',
          to: 'front',
          ms: 430,
          arc: 10,
          scale: 0.8,
          hold: 200,
          grow: true,
          shake: 140,
          burst: { colors: [PALETTE.gold, PALETTE.goldLight, PALETTE.ink], count: 18, speed: 0.26 },
        },
        {
          art: 'swarm',
          path: 'hold',
          to: 'chest',
          delay: 470,
          hold: 720,
          grow: true,
          scale: 0.8,
          alpha: 0.85,
        },
      ],
    }),
  },

  // --- 3 · Whitecrown Pass --------------------------------------------------
  /** Snow across the whole pass. Two shots into it and neither one arrives. */
  whiteout: {
    effect: 'blind',
    world: 3,
    turns: 2,
    charge: 8,
    label: 'Whiteout',
    tip: 'Their next two shots go wide',
    icon: 'frostbite',
    banner: 'WHITEOUT!',
    /**
     * The only ability nobody throws: it is weather. `sweep` runs the whole
     * pass across the fighter at speed and leaves the snow in front of them.
     */
    fx: fx('sweep', [PALETTE.snowLight, PALETTE.iceLight, PALETTE.snowShade], {
      count: 44,
      props: [
        {
          art: 'flurry',
          path: 'hold',
          to: 'chest',
          delay: 160,
          hold: 820,
          grow: true,
          scale: 1.05,
          alpha: 0.85,
        },
      ],
    }),
  },
  /** The cylinder freezes shut and everything in it is lost. */
  coldGrip: {
    effect: 'empty',
    world: 3,
    take: 0,
    charge: 10,
    label: 'Cold Grip',
    tip: 'Their cylinder freezes solid — every round in it is gone',
    icon: 'coldGrip',
    banner: 'FROZEN SHUT!',
    /** A shard into the cylinder, and the gun is inside a block of ice. */
    fx: fx('streak', [PALETTE.iceLight, PALETTE.ice, PALETTE.snowMid], {
      count: 26,
      props: [
        {
          art: 'shard',
          path: 'fly',
          to: 'gun',
          ms: 260,
          scale: 0.8,
          faceTravel: true,
          trail: [PALETTE.iceLight],
        },
        {
          art: 'ice',
          path: 'hold',
          to: 'gun',
          delay: 250,
          hold: 620,
          grow: true,
          scale: 0.4,
          alpha: 0.8,
          burst: { colors: [PALETTE.iceLight, PALETTE.ice, PALETTE.snowLight], count: 16, speed: 0.2 },
        },
      ],
    }),
  },
  /**
   * THE ONE THAT HANDS OVER TURNS
   * -------------------------------------------------------------------------
   * Two rounds in which the other side does nothing at all: no shot, no
   * shield, no reload. Whoever cast it has two turns to do as they like with
   * an opponent standing still in front of them, which is the most any single
   * thing in this game does — hence five rounds of charge, and hence the ice
   * that stays on the sprite until it lets go, so nobody is ever surprised by
   * their own turn being skipped.
   */
  deepFreeze: {
    effect: 'freeze',
    world: 3,
    turns: 1,
    charge: 8,
    label: 'Deep Freeze',
    tip: 'They are frozen solid: two rounds in which they do nothing at all',
    icon: 'iceFall',
    banner: 'FROZEN!',
    hold: { color: PALETTE.iceLight, alpha: 0.55 },
    /**
     * The shard comes down first and the block grows up around them out of the
     * road. The ice on the sprite (`hold`, above) is what keeps it true after
     * the animation is over; this is the moment it becomes true.
     */
    fx: fx('fall', [PALETTE.iceLight, PALETTE.snowLight, PALETTE.ice], {
      count: 44,
      shake: 300,
      props: [
        {
          art: 'shard',
          path: 'drop',
          to: 'head',
          ms: 280,
          scale: 1,
          trail: [PALETTE.iceLight, PALETTE.snowLight],
        },
        {
          art: 'ice',
          path: 'hold',
          to: 'feet',
          delay: 280,
          hold: 1200,
          grow: true,
          scale: 1,
          alpha: 0.72,
          shake: 260,
          burst: {
            colors: [PALETTE.iceLight, PALETTE.snowLight, PALETTE.ice],
            count: 22,
            speed: 0.26,
            up: true,
          },
        },
      ],
    }),
  },

  // --- 4 · Blackwater Bayou -------------------------------------------------
  /**
   * POISON.
   *
   * It used to be a stick you could buy in any shop in the game for one life
   * three rounds later. It is the bayou's now, it is sold nowhere else, and it
   * bites EVERY round for three of them — so it is worth three lives if the
   * fight lasts and one if it does not, which is the most interesting thing a
   * damage effect can be. Six rounds of charge, the joint-longest in the game,
   * and the riders down here reach for it about a third as often as anything
   * else.
   */
  poison: {
    effect: 'venom',
    world: 4,
    turns: 3,
    charge: 12,
    weight: 0.35,
    label: 'Poison',
    tip: 'One life a round for three rounds. No shield stops it',
    icon: 'poison',
    banner: 'POISONED!',
    hold: { color: PALETTE.poison, alpha: 0.4 },
    /**
     * A gourd, thrown to be broken. It tumbles end over end, smashes on the
     * road at their boots, and what comes up out of it hangs around them —
     * which is the only honest picture of something that bites every round.
     */
    fx: fx('rise', [PALETTE.poison, PALETTE.poisonDark, PALETTE.greenLight], {
      count: 32,
      props: [
        {
          art: 'gourd',
          path: 'throw',
          to: 'front',
          ms: 460,
          arc: 11,
          spin: 110,
          scale: 0.8,
          burst: {
            colors: [PALETTE.poison, PALETTE.poisonDark, PALETTE.greenLight],
            count: 20,
            speed: 0.26,
          },
        },
        {
          art: 'miasma',
          path: 'hold',
          to: 'belt',
          delay: 480,
          hold: 960,
          grow: true,
          scale: 0.9,
          alpha: 0.72,
          float: 0.008,
        },
      ],
    }),
  },
  /** Something under the water takes a life, and it does not waste it. */
  mireGrasp: {
    effect: 'drain',
    world: 4,
    amount: 0.5,
    charge: 10,
    label: 'Mire Grasp',
    tip: 'Takes a life off them and gives it to you',
    icon: 'mireGrasp',
    banner: 'DRAGGED UNDER!',
    /** A hand out of the road, and the life it takes goes the other way. */
    fx: fx('rise', [PALETTE.bogLight, PALETTE.bogDark, PALETTE.algae], {
      count: 30,
      props: [
        {
          art: 'grasp',
          path: 'rise',
          to: 'feet',
          ms: 380,
          scale: 1,
          hold: 460,
          grow: true,
          shake: 160,
          burst: {
            colors: [PALETTE.bogLight, PALETTE.bog, PALETTE.algae],
            count: 16,
            speed: 0.2,
            up: true,
          },
        },
        {
          art: 'life',
          path: 'return',
          to: 'chest',
          to2: 'chest',
          ms: 420,
          delay: 440,
          scale: 0.8,
          trail: [PALETTE.redLight],
        },
      ],
    }),
  },
  /** The wisp leads a hand somewhere else — and comes back with the wrong gun. */
  willOWisp: {
    effect: 'swap',
    world: 4,
    charge: 8,
    label: "Will-o'-Wisp",
    tip: 'Trades cylinders with them, whatever is in each',
    icon: 'willOWisp',
    banner: 'SWAPPED!',
    /**
     * TWO wisps, crossing in the middle of the road: one off each fighter,
     * arriving at the other. It is the only ability where something goes both
     * ways, because it is the only one that trades rather than takes.
     */
    fx: fx('spiral', [PALETTE.algae, PALETTE.bogLight, PALETTE.white], {
      count: 26,
      props: [
        {
          art: 'wisp',
          path: 'fly',
          from: 'chest',
          to: 'chest',
          ms: 460,
          spin: 120,
          scale: 1.1,
          trail: [PALETTE.algae],
          burst: { colors: [PALETTE.white, PALETTE.algae], count: 14, speed: 0.2 },
        },
        {
          art: 'wisp',
          path: 'return',
          to: 'chest',
          to2: 'chest',
          ms: 460,
          spin: 120,
          scale: 1.1,
          trail: [PALETTE.bogLight],
          burst: { colors: [PALETTE.white, PALETTE.bogLight], count: 14, speed: 0.2 },
        },
      ],
    }),
  },
  /** Marked by the fever: everything that lands on them lands harder. */
  swampFever: {
    effect: 'mark',
    world: 4,
    turns: 3,
    charge: 8,
    label: 'Swamp Fever',
    tip: 'For three rounds, every shot that hits them costs one extra life',
    icon: 'swampRot',
    banner: 'FEVERED!',
    hold: { color: PALETTE.algae, alpha: 0.35 },
    /** The fever is a brand: it is put on them, and it stays where it is put. */
    fx: fx('swarm', [PALETTE.algae, PALETTE.bog, PALETTE.lichen], {
      count: 32,
      props: [
        {
          art: 'brand',
          path: 'fly',
          to: 'chest',
          ms: 300,
          scale: 0.75,
          hold: 760,
          grow: true,
          alpha: 0.9,
          burst: { colors: [PALETTE.algae, PALETTE.lichen], count: 12, speed: 0.16 },
        },
      ],
    }),
  },

  // --- 5 · Brimstone Basin --------------------------------------------------
  /**
   * DYNAMITE.
   *
   * Also no longer general stock. Three lives at a stroke — far and away the
   * biggest single hit in the game — and the only ability of the fourteen that
   * A SHIELD STOPS. That is the whole design: it is the hardest thing to be
   * hit by and the easiest thing to be ready for, so throwing it is a read
   * rather than a purchase. Six rounds of charge, and the basin's riders throw
   * it about a third as often as anything else they carry.
   */
  dynamite: {
    effect: 'blast',
    world: 5,
    amount: 1.5,
    charge: 10,
    weight: 0.35,
    label: 'Dynamite',
    tip: 'Three lives at once — but a raised shield stops it dead',
    icon: 'dynamite',
    banner: 'DYNAMITE!',
    /**
     * THE ONE THAT IS THROWN AND THEN WAITS.
     *
     * No particles at all on the cast — the stick IS the cast. It comes out of
     * the hand, turns over in the air, lands at their boots and burns there,
     * and the explosion does not happen until the engine has resolved the blast
     * against what they actually did with the round (`fuse`, and
     * `detonateCharge` in src/duel/duel-scene.js). That is the rule the ability
     * has always had — the biggest hit in the game and the one you get a whole
     * round to be ready for — and until now it was the one rule the animation
     * did not say out loud.
     */
    fx: fx(null, [PALETTE.goldLight, PALETTE.red, PALETTE.grey], {
      props: [
        {
          art: 'dynamite',
          path: 'throw',
          to: 'front',
          ms: 520,
          arc: 14,
          spin: 90,
          /** It lands flat: frame 1 is the stick on its side. */
          rest: 1,
          scale: 0.95,
          fuse: true,
          trail: [PALETTE.goldLight, PALETTE.white],
          burst: { colors: [PALETTE.sandLight, PALETTE.sand], count: 10, speed: 0.14 },
        },
      ],
    }),
  },
  /** The ground opens under their boots. No shield is over that. */
  magmaSpout: {
    effect: 'pierce',
    world: 5,
    amount: 1,
    charge: 8,
    label: 'Magma Spout',
    tip: 'Two lives from underneath. A shield is no use over it',
    icon: 'magmaSpout',
    banner: 'MAGMA SPOUT!',
    /** The crust goes first, and what is under the basin comes up through it. */
    fx: fx('rise', [PALETTE.emberGlow, PALETTE.magma, PALETTE.magmaDeep], {
      count: 36,
      shake: 200,
      props: [
        { art: 'fissure', path: 'hold', to: 'feet', hold: 280, grow: true, scale: 0.9 },
        {
          art: 'spout',
          path: 'hold',
          to: 'feet',
          delay: 240,
          hold: 560,
          grow: true,
          scale: 0.9,
          shake: 320,
          burst: {
            colors: [PALETTE.emberGlow, PALETTE.magma, PALETTE.magmaDeep],
            count: 24,
            speed: 0.32,
            up: true,
          },
        },
      ],
    }),
  },
  /** Their rounds come out glowing, and one of them is yours now. */
  cinderSnatch: {
    effect: 'steal',
    world: 5,
    amount: 2,
    take: 1,
    charge: 8,
    label: 'Cinder Snatch',
    tip: 'Takes two rounds out of their gun and loads one into yours',
    icon: 'cinderSnatch',
    banner: 'CINDER SNATCH!',
    /** Two rounds out of their cylinder, and one of them arrives in yours. */
    fx: fx('streak', [PALETTE.emberGlow, PALETTE.magma, PALETTE.magmaDeep], {
      count: 28,
      props: [
        {
          art: 'gust',
          path: 'fly',
          to: 'gun',
          ms: 280,
          spin: 55,
          scale: 1.2,
          faceTravel: true,
          trail: [PALETTE.magma, PALETTE.emberGlow],
          burst: { colors: [PALETTE.emberGlow, PALETTE.magma], count: 14, speed: 0.22 },
        },
        {
          art: 'round',
          path: 'return',
          to: 'gun',
          to2: 'gun',
          ms: 460,
          delay: 300,
          count: 2,
          stagger: 130,
          scale: 1.1,
          trail: [PALETTE.emberGlow],
        },
      ],
    }),
  },
  /** Something tells you where to put the next two, and it is right. */
  hellWhisper: {
    effect: 'doubleTap',
    world: 5,
    turns: 2,
    /**
     * Five rather than four. Two shots at double is two extra lives on a road
     * where the average rider has two and a half of them, and at four rounds
     * it landed in nearly every duel — measured, it was worth twenty points of
     * win rate on its own, which is more than the volcano.
     */
    charge: 10,
    label: 'Hell Whisper',
    tip: 'Your next two shots cost them an extra life each',
    icon: 'hellWhisper',
    banner: 'WHISPERED TO!',
    hold: { color: PALETTE.magma, alpha: 0.3, self: true },
    /**
     * `self`, because nothing crosses the road: the thing doing the whispering
     * turns up at the caster's own shoulder and leans in.
     */
    fx: fx('spiral', [PALETTE.magma, PALETTE.charDark, PALETTE.sulfurLight], {
      count: 28,
      self: true,
      props: [
        {
          art: 'shade',
          path: 'hold',
          to: 'head',
          hold: 900,
          grow: true,
          scale: 0.8,
          float: 0.004,
          alpha: 0.95,
        },
      ],
    }),
  },

  // --- 6 · Gallows Hollow ---------------------------------------------------
  /**
   * THE WORLD THAT TAKES THINGS AWAY
   * -------------------------------------------------------------------------
   * Four tricks, and only one of them is damage. That is the Hollow's whole
   * hand: the basin hits you with a stick of dynamite and the Hollow takes the
   * gun out of your hand, takes the shield off your arm, and makes everything
   * that lands on you afterwards cost more. It is the only world whose kit is
   * built around the SHAPE of your turn rather than around your life bar, which
   * is what a place that is trying to frighten you should do.
   *
   * Each of the four is the strongest version of a mechanic that already
   * exists a world or two back — a longer jam than the prairie's rope, a bigger
   * drain than the bayou's hand, a longer mark than the fever, a longer panic
   * than the hornets. That is the upgrade path this file has always had
   * (see `abilityPoolForWorld` in src/game/items.js): the only way to a better
   * version of an effect is to reach the world that sells one.
   */
  /** Something under the road has hold of the gun arm, and it is not letting go. */
  gravesGrip: {
    effect: 'jam',
    world: 6,
    turns: 3,
    charge: 9,
    label: "Grave's Grip",
    tip: 'A hand out of the ground on the gun arm — they cannot shoot for three rounds',
    icon: 'gravesGrip',
    banner: 'HELD!',
    hold: { color: PALETTE.gloamDark, alpha: 0.45 },
    /**
     * It comes UP, and it stays up. The bayou's grasp drags somebody under and
     * lets go; this one closes on the wrist and is still there three rounds
     * later, which is why the sprite is held for most of a second and why the
     * fighter is tinted for as long as the jam lasts.
     */
    fx: fx('rise', [PALETTE.gloamDark, PALETTE.pallMid, PALETTE.gloamDeep], {
      count: 28,
      shake: 180,
      props: [
        {
          art: 'boneHand',
          path: 'rise',
          to: 'gun',
          ms: 300,
          scale: 0.9,
          hold: 820,
          grow: true,
          shake: 200,
          burst: {
            colors: [PALETTE.gloamDark, PALETTE.pallMid, PALETTE.gloam],
            count: 16,
            speed: 0.2,
            up: true,
          },
        },
      ],
    }),
  },
  /**
   * The only thing in the Hollow that costs a life, and it does not so much
   * take one as MOVE one. Twice the bayou's hand, which is the whole reason to
   * carry the later one.
   */
  marrowDrain: {
    effect: 'drain',
    world: 6,
    amount: 1,
    charge: 10,
    label: 'Marrow Drain',
    tip: 'Takes a life out of them and puts it in you',
    icon: 'marrowDrain',
    banner: 'DRAINED!',
    /**
     * A thread of red leaving them and arriving in you, and a bone cup on the
     * road underneath it — the object says where the life is going, which is
     * the half of a drain that a particle burst has never been able to say.
     */
    fx: fx('spiral', [PALETTE.pall, PALETTE.corpseLight, PALETTE.gloam], {
      count: 30,
      props: [
        {
          art: 'ossuary',
          path: 'throw',
          to: 'front',
          ms: 420,
          arc: 9,
          spin: 60,
          scale: 0.85,
          hold: 420,
          burst: { colors: [PALETTE.corpseLight, PALETTE.pall], count: 14, speed: 0.2 },
        },
        {
          art: 'life',
          path: 'return',
          to: 'chest',
          to2: 'chest',
          ms: 460,
          delay: 420,
          scale: 0.9,
          trail: [PALETTE.corpseLight],
        },
      ],
    }),
  },
  /** Somebody has written your name down. Everything finds you after that. */
  deathMark: {
    effect: 'mark',
    world: 6,
    turns: 4,
    charge: 8,
    label: 'Death Mark',
    tip: 'For four rounds, every shot that hits them costs one extra life',
    icon: 'deathMark',
    banner: 'MARKED!',
    hold: { color: PALETTE.corpseDeep, alpha: 0.38 },
    /**
     * A grave marker, driven into the road in front of them, with their name
     * on it. It is `hold` rather than a burst on purpose: a mark is a thing
     * that STAYS, and the prop standing at their boots for the rest of the
     * animation is the only honest picture of four rounds of it.
     */
    fx: fx('fall', [PALETTE.corpseLight, PALETTE.pall, PALETTE.gravewood], {
      count: 26,
      shake: 160,
      props: [
        {
          art: 'marker',
          path: 'drop',
          to: 'feet',
          ms: 300,
          scale: 1,
          hold: 900,
          shake: 200,
          trail: [PALETTE.pall],
          burst: { colors: [PALETTE.pall, PALETTE.gloam], count: 16, speed: 0.24, up: true },
        },
      ],
    }),
  },
  /**
   * Fear, as a mechanic. A shield is a decision made with a steady hand, and
   * nobody out here has one for the next three rounds.
   */
  coldSweat: {
    effect: 'panic',
    world: 6,
    turns: 3,
    charge: 8,
    label: 'Cold Sweat',
    tip: 'Their shield stops nothing for three rounds',
    icon: 'coldSweat',
    banner: 'TERRIFIED!',
    hold: { color: PALETTE.pall, alpha: 0.3 },
    /**
     * Nothing is thrown. The air in front of them simply goes cold and stays
     * that way — this is the Hollow's answer to the pass's whiteout, and like
     * that one it is weather rather than an object, because a thing you could
     * see coming would be a thing you could raise a shield against.
     */
    fx: fx('sweep', [PALETTE.pall, PALETTE.corpseLight, PALETTE.gloam], {
      count: 38,
      props: [
        {
          art: 'dread',
          path: 'hold',
          to: 'chest',
          delay: 140,
          hold: 900,
          grow: true,
          scale: 1.05,
          alpha: 0.8,
          float: 0.006,
        },
      ],
    }),
  },

  // --- 7 · Galaxy -----------------------------------------------------------
  /** Everything in the cylinder leaves it, and two of them arrive in yours. */
  gravityPull: {
    effect: 'empty',
    world: 7,
    /**
     * THREE, AND A ROUND OFF THE CHARGE
     * -------------------------------------------------------------------------
     * Every entry in this block moved up a rung when the Hollow was put in
     * front of the Galaxy. The reason is the same one written over the Galaxy's
     * enemy block in src/game/worlds.js: the player reaching the last world now
     * arrives with a world more of everything, so a last world left exactly as
     * it was would be a last world that got easier. A full cylinder plus three
     * in yours is what an emptying should be worth at the end of the road.
     */
    take: 3,
    charge: 11,
    label: 'Gravity Pull',
    tip: 'Empties their gun and three of the rounds end up in yours',
    icon: 'gravityPull',
    banner: 'PULLED!',
    /** A hole opens on their chest, the cylinder empties into it, and three of
     * the rounds come out the other side in your hand. */
    fx: fx('swarm', [PALETTE.astralLight, PALETTE.astral, PALETTE.purple], {
      count: 34,
      props: [
        {
          art: 'well',
          path: 'fly',
          to: 'chest',
          ms: 300,
          spin: 90,
          scale: 0.9,
          hold: 700,
          burst: { colors: [PALETTE.astralLight, PALETTE.purple], count: 18, speed: 0.24 },
        },
        {
          art: 'round',
          path: 'return',
          to: 'chest',
          to2: 'gun',
          ms: 460,
          delay: 430,
          count: 3,
          stagger: 130,
          scale: 1.1,
          trail: [PALETTE.astralLight],
        },
      ],
    }),
  },
  /** The next thing fired at you arrives at the man who fired it. */
  voidMirror: {
    effect: 'reflect',
    world: 7,
    /**
     * THE ONE THAT MOVED IN TEMPO RATHER THAN IN SIZE
     * -------------------------------------------------------------------------
     * Two mirrors instead of one was tried and it is the same mistake as a
     * two-round freeze: a reflect does not scale, it INVERTS — the second one
     * turns a fight the player is winning into a fight they cannot shoot in.
     * Measured, the Stranger's win rate against an expert went from 85% to 56%
     * with this and the boss's other numbers moved together, and a last fight
     * that is a coin toss is not a climax.
     *
     * So the rung it went up is the clock: it charges a round sooner, which is
     * the same thing every ability in this block gets and the only thing this
     * one can safely take.
     */
    turns: 1,
    charge: 9,
    label: 'Void Mirror',
    tip: 'The next shot that would hit you goes back at them instead',
    icon: 'starRot',
    banner: 'MIRRORED!',
    hold: { color: PALETTE.astralLight, alpha: 0.35, self: true },
    /**
     * Also `self`: the mirror assembles out of loose shards in front of the
     * caster and locks, which is the whole promise of the ability drawn once.
     */
    fx: fx('burst', [PALETTE.astralLight, PALETTE.astral, PALETTE.white], {
      count: 26,
      self: true,
      props: [
        {
          art: 'mirror',
          path: 'hold',
          to: 'gun',
          hold: 900,
          grow: true,
          scale: 0.9,
          alpha: 0.92,
        },
      ],
    }),
  },
  /** A rock out of nothing at all. Three lives, and no shield is over it. */
  meteorStrike: {
    effect: 'pierce',
    world: 7,
    amount: 2,
    charge: 10,
    label: 'Meteor Strike',
    tip: 'Four lives out of the sky. A shield is no use under it',
    icon: 'meteorStrike',
    banner: 'METEOR!',
    /** One rock, out of the top of the frame, straight through them. */
    fx: fx('fall', [PALETTE.astralLight, PALETTE.purple, PALETTE.white], {
      count: 40,
      props: [
        {
          art: 'meteor',
          path: 'drop',
          to: 'chest',
          ms: 440,
          spin: 70,
          scale: 1.1,
          shake: 420,
          sfx: 'thunder',
          trail: [PALETTE.astralLight, PALETTE.purple, PALETTE.white],
          burst: {
            colors: [PALETTE.white, PALETTE.astralLight, PALETTE.purple],
            count: 34,
            speed: 0.42,
          },
        },
      ],
    }),
  },
  /** The space between a thought and a hand comes apart for two rounds. */
  mindRift: {
    effect: 'freeze',
    world: 7,
    /**
     * The one thing in this block that did NOT get bigger, and the exception is
     * the point. A freeze hands its caster the other side's turns, so two of
     * them is not "a rung stronger", it is a fight that ends without the loser
     * taking a turn — the note over `deepFreeze` is the whole argument. What
     * moved instead is the clock: it charges a round faster, so it is likelier
     * to land at all in a fight this long.
     */
    turns: 1,
    charge: 7,
    label: 'Mind Rift',
    tip: 'Two rounds in which they can do nothing at all',
    icon: 'mindRift',
    banner: 'RIFTED!',
    hold: { color: PALETTE.purple, alpha: 0.5 },
    /** The tear opens over their head, and everything winds into it. */
    fx: fx('spiral', [PALETTE.purple, PALETTE.astralLight, PALETTE.cosmic], {
      count: 36,
      shake: 300,
      props: [
        {
          art: 'tear',
          path: 'hold',
          to: 'head',
          hold: 980,
          grow: true,
          scale: 0.9,
          burst: { colors: [PALETTE.purple, PALETTE.astralLight], count: 18, speed: 0.2 },
        },
      ],
    }),
  },
};

/**
 * The seven specials, one per world.
 *
 * Every one of them is the same machine with different weather: a landmark
 * drawn behind the road, a dormant stretch, a warning, and a window in which it
 * spends `strikes * damage` lives on whoever it was raised against.
 *
 *   cycleMs      quiet time between the end of one eruption and the next warning
 *   firstCycleMs the FIRST quiet, from the moment the landmark is raised. A
 *                third of the others, and it has to be: the landmark goes up
 *                around round two and a duel is over in twenty to thirty
 *                seconds, so a first quiet of a full cycle meant the volcano
 *                erupted in 0% of measured boss fights and the rift in 0%. See
 *                the long note in src/duel/duel-hazard.js
 *   warnMs    the sky changing, before anything is thrown
 *   activeMs  the window the eruption happens inside
 *   strikes   how many blows the pattern has to spend
 *   damage    lives per blow — so a volcano costs `strikes * damage` a cycle.
 *             It is on the half-life grid like everything else that hurts, and
 *             the early two use half-weight blows deliberately: an eruption
 *             should cost about a fifth of the player's bar in EVERY world,
 *             and the bar is five diamonds in the flats and fourteen in the
 *             Galaxy. A flat two lives is a fifth of the Stranger's road and
 *             two fifths of Big Jed's
 *   pattern   HOW it spends them. See src/duel/duel-hazard.js
 *
 * THE PATTERN IS WHAT MAKES THEM SIX THINGS AND NOT ONE
 * ---------------------------------------------------------------------------
 * They all used to erupt identically — `strikes` evenly spread, `damage` each —
 * so the volcano, the hornet tree and a tear in the sky were the same
 * metronome in three colours, and a player who had survived one had survived
 * all of them. The numbers are almost unchanged; the RHYTHM is not:
 *
 *   twister    an even, unjittered beat — a wall crossing the road
 *   hornets    one flurry at the front of the window, then the buzzing
 *   cornice    the whole slab at once, inside a third of a second
 *   blackdamp  slow and even, still arriving when you think it is over
 *   volcano    rock thrown out across the window, one at a time
 *   rift       nothing, nothing, nothing — and then all of it in ONE shot
 *
 * The last one is the interesting one, and it is why patterns exist at all. See
 * the note on the rift at the bottom of this table.
 *
 * The two extras — `steal` (rounds knocked out of the cylinder) and `poisons` —
 * are what keep the totals from being the same three lives in seven colours.
 *
 * The volcano is the reference implementation and the numbers it was specified
 * with: twenty seconds quiet, then rocks, and three lives across the eruption.
 */
export const SPECIALS = {
  /** 1 · a twister standing off the flats, which strips the road when it comes. */
  duststorm: {
    id: 'duststorm',
    world: 1,
    label: 'Dust Devil',
    icon: 'duststorm',
    tip: 'Raises a twister for the rest of the duel. It sweeps the road every 22 seconds',
    banner: 'DUST DEVIL!',
    art: 'duststorm',
    /** The word the fight shouts when the sky turns and it comes in. */
    warnBanner: 'IT IS COMING',
    /** What it throws, and in what colours. See `stepHazard` in duel-scene.js. */
    motif: 'mote',
    debris: [PALETTE.sandLight, PALETTE.sand, PALETTE.sandDark],
    sky: { color: '#c2914d', alpha: 0.42 },
    /** A wall crossing the road: dead even, so you can hear the next one due. */
    pattern: 'sweep',
    cycleMs: 18000,
    firstCycleMs: 7500,
    warnMs: 2200,
    activeMs: 6000,
    strikes: 1,
    damage: 0.5,
    /** It does not only hit you: it empties the gun you were about to use. */
    steal: 1,
    sfx: 'wind',
  },

  /** 2 · the nest in the dead cottonwood. Everything in it comes out at once. */
  hornetTree: {
    id: 'hornetTree',
    world: 2,
    label: 'Hornet Tree',
    icon: 'hornetTree',
    tip: 'Wakes a hornet tree for the rest of the duel. The swarm comes out every 20 seconds',
    banner: 'HORNET TREE!',
    warnBanner: 'THE NEST IS AWAKE',
    art: 'hornetTree',
    motif: 'hornet',
    debris: [PALETTE.gold, PALETTE.ink, PALETTE.goldLight],
    sky: { color: '#d9c34b', alpha: 0.36 },
    /** Everything out of the nest at once, and then a long minute of buzzing. */
    pattern: 'swarm',
    cycleMs: 17000,
    firstCycleMs: 7000,
    warnMs: 2000,
    activeMs: 6500,
    strikes: 1,
    damage: 0.5,
    /** What is left in you after the swarm has gone. */
    poisons: true,
    sfx: 'wind',
  },

  /** 3 · the cornice over the pass. It comes off, and it comes off again. */
  cornice: {
    id: 'cornice',
    world: 3,
    label: 'Hanging Cornice',
    icon: 'cornice',
    tip: 'Cuts a cornice loose above the pass. It breaks every 22 seconds',
    banner: 'CORNICE!',
    warnBanner: 'THE SNOW IS MOVING',
    art: 'cornice',
    motif: 'flake',
    debris: [PALETTE.snowLight, PALETTE.snow, PALETTE.snowShade],
    sky: { color: '#9cb4d2', alpha: 0.5 },
    /**
     * A slab does not come off a mountain in instalments. The whole eruption
     * lands inside a third of a second, early — the rest of the window is the
     * snow still coming down after it, which is a better picture of an
     * avalanche than two evenly spaced taps ever was.
     */
    pattern: 'volley',
    cycleMs: 18000,
    firstCycleMs: 8000,
    warnMs: 2400,
    activeMs: 5500,
    strikes: 2,
    damage: 0.5,
    sfx: 'rumble',
  },

  /** 4 · the drowned cypress, and what the bog keeps under it. */
  blackdamp: {
    id: 'blackdamp',
    world: 4,
    label: 'Blackdamp',
    icon: 'blackdamp',
    tip: 'Opens a gas vent for the rest of the duel. The bog breathes out every 20 seconds',
    banner: 'BLACKDAMP!',
    warnBanner: 'THE WATER IS BUBBLING',
    art: 'blackdamp',
    motif: 'gas',
    debris: [PALETTE.algae, PALETTE.lichen, PALETTE.bogLight],
    sky: { color: '#4e8a3a', alpha: 0.44 },
    /** Gas does not hit, it accumulates: still arriving when you think it is over. */
    pattern: 'lingering',
    cycleMs: 17000,
    firstCycleMs: 7000,
    warnMs: 2200,
    activeMs: 7000,
    strikes: 2,
    damage: 0.5,
    poisons: true,
    sfx: 'wind',
  },

  /**
   * 5 · THE VOLCANO.
   *
   * The one every other special was generalised out of. It stands on the
   * horizon from the moment it is called and does nothing at all; every twenty
   * seconds the sky goes red, the cone lights, and it throws rock across the
   * road — three of which find you, for a life each — and then it goes quiet
   * and starts counting again. What it leaves behind stays: the lava that came
   * down with the rock is still on the road at the end of the fight.
   */
  volcano: {
    id: 'volcano',
    world: 5,
    label: 'Volcano',
    icon: 'volcano',
    tip: 'Raises a volcano behind the road. It erupts every 20 seconds for the rest of the duel',
    banner: 'VOLCANO!',
    /**
     * The others name the thing that is about to move — the nest, the snow,
     * the water. This one used to name the weather instead, and "THE SKY IS
     * RED" was both the odd one out and a line about a colour the player can
     * already see: the whole frame goes red two seconds before it says so.
     */
    warnBanner: 'THE MOUNTAIN IS WAKING',
    art: 'volcano',
    motif: 'rock',
    debris: [PALETTE.char, PALETTE.magma, PALETTE.emberGlow],
    sky: { color: '#c2451c', alpha: 0.52 },
    /** The reference rhythm: rock thrown out over the window, one at a time. */
    pattern: 'barrage',
    cycleMs: 18000,
    firstCycleMs: 7500,
    warnMs: 2400,
    activeMs: 8000,
    strikes: 2,
    damage: 0.5,
    /** Rock that lands stays lit on the road. See `drawHazardGround`. */
    lava: true,
    sfx: 'rumble',
  },


  /**
   * 6 · THE GALLOWS — the one that is a COUNTDOWN rather than weather.
   *
   * A frame of grey timber on the rise behind the road with a bell hung off
   * the crossbeam, and it is the only landmark in the game that makes a noise
   * before it does anything. It tolls, and then it tolls again a little
   * sooner, and again sooner than that, and by the time the beats are on top
   * of one another the eruption is over — which is the `toll` pattern in
   * src/duel/duel-hazard.js and the reason that pattern exists.
   *
   * Every other special in this table is something that HAPPENS to the road:
   * a wall of sand crosses it, a slab comes off the mountain, the ground opens.
   * This one is a clock being run down at you, and the difference is entirely
   * in the rhythm — the arithmetic (three half-lives an eruption) is the same
   * as the volcano's and a shade under the rift's.
   *
   * It leaves the same thing behind that the bayou does, for a different
   * reason: what comes out from under a gallows is not gas, it is grave air,
   * and it stays in you after the bell has stopped.
   */
  gallows: {
    id: 'gallows',
    world: 6,
    label: 'The Gallows',
    icon: 'gallows',
    tip: 'Raises the gallows behind the road. The bell tolls every 20 seconds, faster each beat',
    banner: 'THE GALLOWS!',
    /** Not the sky, and not the ground. The one warning that is a SOUND. */
    warnBanner: 'THE BELL IS SWINGING',
    art: 'gallows',
    motif: 'bone',
    debris: [PALETTE.pall, PALETTE.gravewoodLight, PALETTE.gloamDark],
    /**
     * The only sky in the table that takes light OUT rather than putting a
     * colour in. Half opacity of the world's own deepest tone, so an eruption
     * out here looks like the afternoon being switched off — which is what the
     * Hollow's weather does anyway, arriving all at once.
     */
    sky: { color: '#242822', alpha: 0.5 },
    pattern: 'toll',
    cycleMs: 18000,
    firstCycleMs: 7500,
    warnMs: 2400,
    activeMs: 6000,
    strikes: 3,
    damage: 0.5,
    poisons: true,
    sfx: 'toll',
  },

  /**
   * 7 · THE RIFT — the one that does not throw anything.
   *
   * Every other special is weather: it goes off, it scatters its cost across a
   * window, and being hit by it is a thing that happens to you two or three
   * times while you are trying to duel. The galaxy's is a WEAPON. The tear
   * opens, and then it spends five whole seconds visibly drawing the road into
   * itself — the light bends towards it, the core fills, the horizon goes
   * violet — and at the end of that it fires ONCE, straight down the road, for
   * everything the eruption was worth in a single shot.
   *
   * The arithmetic is deliberately unchanged: three lives an eruption, exactly
   * as before. What changed is that they arrive together, which turns a
   * background nuisance into a countdown you have to fight around — kill him
   * before it lands, or take three at once. And then it goes quiet and starts
   * charging again, like anything else on this road.
   *
   * It also still takes a round with it, because a gun with nothing in it is
   * the worst possible thing to be holding when the next one starts filling.
   */
  rift: {
    id: 'rift',
    world: 7,
    label: 'The Rift',
    icon: 'rift',
    tip: 'Tears the sky open for the rest of the duel. Every 20 seconds it charges, then fires once for everything at once',
    banner: 'THE RIFT!',
    warnBanner: 'IT IS OPENING',
    /** Said when the wind-up starts, so nobody mistakes the quiet for safety. */
    chargeBanner: 'IT IS DRAWING BREATH',
    /** And said on the frame the beam arrives. */
    megaBanner: 'ANNIHILATION!',
    art: 'rift',
    motif: 'shard',
    debris: [PALETTE.astralLight, PALETTE.astral, PALETTE.purple],
    sky: { color: '#4c2f80', alpha: 0.55 },
    pattern: 'charge',
    /**
     * A window that is all wind-up: from the sky turning to the beam landing is
     * a hair over six seconds, which is long enough to be a real decision —
     * press the fight, or spend the round shielding something a shield cannot
     * stop.
     *
     * A second off the quiet and a fourth strike on the shot, both for the
     * reason written over the Galaxy's abilities: the last world is a rung
     * further along every ladder now that it is the seventh stop rather than
     * the sixth. Two whole lives arriving at once is still under a fifth of the
     * bar the player brings out here, which is where every special in this
     * table is priced.
     */
    cycleMs: 18000,
    firstCycleMs: 8500,
    warnMs: 2600,
    activeMs: 4600,
    strikes: 4,
    damage: 0.5,
    steal: 1,
    sfx: 'rumble',
  },
};

/**
 * WHEN THE ENEMY SPENDS IT
 * ---------------------------------------------------------------------------
 * A special is worth the whole duel if it is out early and almost nothing if
 * it is out on the last round, and an opponent that understood that would open
 * with it every single time — which would make it furniture rather than a
 * surprise. So it is a roll, weighted hard towards the opening: about four
 * fights in five see it inside the first five rounds, and the rest of the time
 * it lands whenever it lands.
 */
export const SPECIAL_TIMING = {
  /** Rounds counted as "the start of the fight". */
  earlyRounds: 5,
  /** Chance per round during those. */
  earlyChance: 0.3,
  /** Chance per round afterwards. */
  lateChance: 0.07,
};

/**
 * Look an ability up by id. Never null: an unknown id comes back inert rather
 * than undefined, which is what keeps a half-finished theme from taking the
 * duel down with it.
 */
export function getAbility(id) {
  const entry = ABILITIES[id];
  if (entry) return { id, ...entry };
  return { id, effect: null, label: id, tip: '', icon: id, banner: null, fx: null };
}

/** What an ability id actually does to the duel. */
export function effectOf(id) {
  return getAbility(id).effect;
}

/** True when a raised shield is any use against this ability. Only blast is. */
export function isBlockable(id) {
  const effect = effectOf(id);
  return !!(effect && EFFECTS[effect]?.blocks);
}

/** Look a special up by id. Null when there is none. */
export function getSpecial(id) {
  return id ? SPECIALS[id] || null : null;
}

/** Every special's total cost per eruption, for tooltips and the fight card. */
export function specialDamage(spec) {
  return spec ? spec.strikes * spec.damage : 0;
}

// ---------------------------------------------------------------------------
// The player's half
// ---------------------------------------------------------------------------

/**
 * WHAT AN ABILITY IS WORTH, AND WHAT IT COSTS
 * ---------------------------------------------------------------------------
 * The numbers on each entry above were set against the four figures that
 * actually constrain them, measured off src/game/worlds.js and
 * src/game/progression.js:
 *
 *   world | avg enemy lives | boss lives | gold a world pays | rare / legendary
 *      1  |      1.2        |     3      |       287         |   130 /   260
 *      3  |      1.7        |     4      |     1,010         |   355 /   710
 *      5  |      2.4        |     6      |     2,628         | 1,005 / 2,010
 *      6  |      3.2        |    5+7     |     1,715         | 1,800 / 3,600
 *
 * Four rules came out of that, and every number follows them.
 *
 * 1. AN ABILITY IS A THIRD OF A WORLD'S WAGES. A basic is a rare and a special
 *    is a legendary, so the existing price curve already puts one at roughly a
 *    third of what a world pays out and the other at most of it. Nothing new
 *    was invented for pricing: the curve that sells a vest sells these.
 *
 * 2. IT IS RATIONED BY TIME, NOT BY STOCK. A duel runs six or seven rounds, so
 *    a three-round charge is two uses, a four is one or two, and a six is one —
 *    late, and only if the fight lasts. That is the whole balance mechanism.
 *
 * 3. THE COST IS THE SIZE OF WHAT IT TAKES AWAY. Not damage — turns. Anything
 *    that hands its caster free turns (freeze, and the empty that leaves a gun
 *    with nothing in it) costs five. Poison and dynamite cost six, the longest
 *    in the game, because three lives is most of any enemy in the first four
 *    worlds. The cheap ones at three are the ones that only bend a round:
 *    a stolen bullet, a shot sent wide.
 *
 * 4. IT IS SUPPOSED TO DECIDE BOSSES, NOT DRIFTERS. A one-life drifter dies to
 *    anything and always did. The figure watched while tuning is what a full
 *    charge is worth against a BOSS: about a third of Big Jed, about two thirds
 *    of Old Scratch by the time the basin's kit is affordable. A boss is still
 *    a fight you can lose with a volcano in your pocket.
 *
 * WHY THE NUMBERS ARE ON THE ABILITY AND NOT IN A BAND TABLE
 * ---------------------------------------------------------------------------
 * They used to be tuned three times over, once per pair of worlds, because the
 * same four effects turned up in all of them. Each ability is its own mechanic
 * now
 * and belongs to exactly one world, so "it gets better as you go" is simply
 * that the later entries are stronger — Dust Snatch takes one round, Gravity
 * Pull takes the whole cylinder. One number, in one place, on the thing it
 * describes.
 */

/** Shop base prices. The world curve in progression.js does the rest. */
export const ABILITY_PRICE = { basic: 150, special: 300 };

/**
 * The player's version of one ability: exactly the entry above, plus the
 * sentence the shop prints under it. Player and enemy fire the same numbers —
 * the asymmetry is in the turn rule (see the header), not in the tuning.
 *
 * @param {string} id an ABILITIES key
 */
export function playerAbility(id) {
  const ability = getAbility(id);
  if (!ability.effect || !ability.world) return null;
  return { ...ability, kind: 'basic', desc: describeAbility(ability) };
}

/**
 * The one-line description, written from the numbers so it can never drift.
 *
 * EVERY BRANCH RETURNS A WHOLE SENTENCE
 * ---------------------------------------------------------------------------
 * This used to build its lines out of parts — a stem, a `lives()` helper that
 * bolted an `s` on, and a shared ` Charges in N rounds.` tail glued to the end
 * of all of them. English tolerates that; Spanish does not, because it moves
 * the words as well as agreeing with them, and half a sentence has no
 * translation at all. So each case names the finished sentence it prints, in
 * both the singular and the plural where the numbers can be one, and the
 * charge tail is part of the sentence rather than a suffix.
 *
 * The numbers still come from the ability, so the description still cannot
 * drift from what the ability does — that was always the point of this
 * function, and it survives intact.
 */
export function describeAbility(a) {
  const charge = a.charge;
  const line = (one, many, n, params = {}) =>
    tPlural(n, one, many, { charge, ...params });

  switch (a.effect) {
    case 'steal':
      return a.take
        ? line(
            'Takes 1 round out of their gun and loads {take} into yours. Charges in {charge} rounds.',
            'Takes {count} rounds out of their gun and loads {take} into yours. Charges in {charge} rounds.',
            a.amount,
            { take: a.take },
          )
        : line(
            'Takes 1 round out of their gun. Charges in {charge} rounds.',
            'Takes {count} rounds out of their gun. Charges in {charge} rounds.',
            a.amount,
          );
    case 'empty':
      return a.take
        ? t('Empties their cylinder, and {take} of them end up in yours. Charges in {charge} rounds.', { take: a.take, charge })
        : t('Empties their cylinder. Charges in {charge} rounds.', { charge });
    case 'swap':
      return t('Trades cylinders with them, whatever is in each. Charges in {charge} rounds.', { charge });
    case 'blast':
      return line(
        '1 life at once — but a raised shield stops it dead. Charges in {charge} rounds.',
        '{count} lives at once — but a raised shield stops it dead. Charges in {charge} rounds.',
        a.amount,
      );
    case 'pierce':
      return line(
        '1 life, straight through any shield. Charges in {charge} rounds.',
        '{count} lives, straight through any shield. Charges in {charge} rounds.',
        a.amount,
      );
    case 'venom':
      return line(
        'One life a round for 1 round. No shield stops it. Charges in {charge} rounds.',
        'One life a round for {count} rounds. No shield stops it. Charges in {charge} rounds.',
        a.turns,
      );
    case 'drain':
      return line(
        'Takes 1 life off them and gives it to you. Charges in {charge} rounds.',
        'Takes {count} lives off them and gives them to you. Charges in {charge} rounds.',
        a.amount,
      );
    case 'freeze':
      return line(
        'They do nothing at all for 1 round — the turn is yours. Charges in {charge} rounds.',
        'They do nothing at all for {count} rounds — the turns are yours. Charges in {charge} rounds.',
        a.turns,
      );
    case 'jam':
      return line(
        'They cannot shoot for 1 round. Charges in {charge} rounds.',
        'They cannot shoot for {count} rounds. Charges in {charge} rounds.',
        a.turns,
      );
    case 'panic':
      return line(
        'Their shield stops nothing for 1 round. Charges in {charge} rounds.',
        'Their shield stops nothing for {count} rounds. Charges in {charge} rounds.',
        a.turns,
      );
    case 'blind':
      return line(
        'Their next shot goes wide. Charges in {charge} rounds.',
        'Their next {count} shots go wide. Charges in {charge} rounds.',
        a.turns,
      );
    case 'mark':
      return line(
        'For 1 round, every shot that hits them costs one extra life. Charges in {charge} rounds.',
        'For {count} rounds, every shot that hits them costs one extra life. Charges in {charge} rounds.',
        a.turns,
      );
    case 'doubleTap':
      return line(
        'Your next shot costs them an extra life. Charges in {charge} rounds.',
        'Your next {count} shots cost them an extra life each. Charges in {charge} rounds.',
        a.turns,
      );
    case 'reflect':
      return t('The next shot that would hit you goes back at them instead. Charges in {charge} rounds.', { charge });
    default:
      return t('Charges in {charge} rounds.', { charge });
  }
}

/**
 * The player's special: the same landmark the enemy raises, aimed the other way
 * and lasting exactly one eruption.
 *
 * It does NOT stay. The enemy's is permanent because an enemy cannot choose a
 * moment and has to be given one that repeats; the player picks the moment, and
 * a permanent hazard on top of that would end fights before they started. What
 * a full charge buys is one eruption on the rival — `strikes` rocks, a life
 * each, over a couple of seconds.
 *
 *   worlds 1-2  12 rounds → 2 lives
 *   worlds 3-4  10 rounds → 3 lives
 *   worlds 5-6  10 rounds → 4 lives
 *   world  7    10 rounds → 5 lives
 *
 * TEN ROUNDS IS LONGER THAN A DUEL, AND THAT IS THE POINT
 * ---------------------------------------------------------------------------
 * Every charge cost in this file was DOUBLED, including these. A rider fight
 * runs four to six rounds, so a full charge no longer arrives in one: what an
 * ability is for now is the fight that goes long, which is the boss — the one
 * fight in a world where a landmark going off is the difference and the one
 * fight the player picked their loadout for.
 *
 * The reason is the complaint that abilities were the only thing in the game
 * doing real damage. They were: at five or six rounds a trick landed in most
 * duels, on top of a gun, and the whole fight was two people waiting for their
 * icons to light up. The gun is the fight; a trick is what you save.
 */
export const PLAYER_SPECIAL = [
  { charge: 12, strikes: 2 },
  { charge: 10, strikes: 3 },
  { charge: 10, strikes: 4 },
  /**
   * The fourth band exists for exactly one landmark: the rift, in the seventh
   * world. The player's copy of a special has always been worth a shade more
   * the further down the road it is sold, and the last one on the road should
   * be the largest thing anybody can put in a saddlebag — five lives in a
   * single shot, at legendary prices, in a world where the boss carries twenty.
   */
  { charge: 10, strikes: 5 },
];

const specialBand = (worldId) =>
  (worldId <= 2 ? 0 : worldId <= 4 ? 1 : worldId <= 6 ? 2 : 3);

/** The player's version of one world special. */
export function playerSpecial(id) {
  const spec = getSpecial(id);
  if (!spec) return null;
  const row = PLAYER_SPECIAL[specialBand(spec.world || 1)];
  return {
    ...spec,
    kind: 'special',
    charge: row.charge,
    strikes: row.strikes,
    damage: 1,
    steal: 0,
    poisons: false,
    /**
     * One eruption and it is gone. The warning is short because the player
     * already knows it is coming — they pressed it.
     */
    oneShot: true,
    warnMs: 900,
    activeMs: 2600,
    cycleMs: 0,
    /**
     * A charge special reads differently on a card, because it IS different:
     * four lives spread over an eruption is a bad few seconds, and four lives
     * in one shot is a rival who was on three.
     */
    desc:
      spec.pattern === 'charge'
        ? t('Winds up on your rival and fires once: {strikes} lives in a single shot. Charges in {charge} rounds.', { strikes: row.strikes, charge: row.charge })
        : t('Calls it down on your rival: {strikes} lives over one eruption. Charges in {charge} rounds.', { strikes: row.strikes, charge: row.charge }),
  };
}

/** Every themed ability a given world's shop can sell. */
export function abilitiesForWorld(worldId) {
  return Object.keys(ABILITIES).filter((id) => ABILITIES[id].world === worldId);
}

/**
 * How often an enemy holding a mixed hand reaches for each of them.
 *
 * Uniform until poison and dynamite arrived at three lives apiece. Those two
 * carry `weight: 0.35`, so a bayou rider with poison and three other tricks
 * plays poison about one time in ten rather than one in four — which is what
 * makes it the thing you remember about the bayou instead of the thing you
 * dread every round.
 */
export function pickWeighted(ids, roll) {
  const weights = ids.map((id) => getAbility(id).weight ?? 1);
  const total = weights.reduce((a, b) => a + b, 0);
  let t = roll * total;
  for (let i = 0; i < ids.length; i++) {
    t -= weights[i];
    if (t <= 0) return ids[i];
  }
  return ids[ids.length - 1];
}