/**
 * SHOOT! — Duel screen.
 *
 * The presentation of a duel: three big buttons, both fighters' lives and
 * bullets, the round-by-round animation, and the battle overview that closes
 * the fight (the feature the third version was best remembered for).
 *
 * Readability rules:
 *  - Both fighters are drawn the same way: name, lives, and a six-chamber
 *    cylinder. An empty gun is six dark holes — the old screen printed the
 *    words "no bullets" under each fighter on every round of every duel.
 *  - Each button carries its cost as pips, not as a sentence. "+1 bullet · you
 *    are open" under Reload was the rulebook reprinted on every turn; the rules
 *    belong in How to Play, and the button belongs to the player who already
 *    knows them.
 *  - One callout line states the situation, and it sits directly above the
 *    controls so it never covers the duellists.
 *  - The enemy's abilities are shown up front, so nothing is a surprise twice —
 *    as icons, not as words. Poison, dynamite, bullet steal and mind control
 *    are things the player should recognise on sight, and the row of names they
 *    used to be was the only part of the screen asking to be read twice. The
 *    names are still on the tooltip and on `aria-label`.
 *  - What is currently *happening* to a fighter is separate from what they can
 *    do: live effects sit in their own row and count down.
 *
 * All rules live in duel-engine.js. This file never decides an outcome.
 */

import { el, clearNode, wait } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { attachButtonSounds, play, playMusic } from '../core/audio.js';
import { setRenderer } from '../core/scene.js';
import { EVENTS, on } from '../core/events.js';
import {
  getState,
  setLives,
  setBonusLives,
  hasVest,
  hasTotem,
  breakTotem,
  isImmuneToEffects,
  countOf,
  getEquippedAbilities,
  getBoon,
  gunDamage,
} from '../game/player.js';
import { totemReviveLives } from '../game/progression.js';
import { gunTier, enemyGunLook } from '../game/gun-tiers.js';
import { playTotemRevival } from '../ui/totem.js';
import { getWorld, FINAL_WORLD } from '../game/worlds.js';
import { generateEnemy, generateBoss, nextBossPhase, enemySeedFor } from '../game/enemies.js';
import { getAbility, getSpecial, specialDamage } from '../game/world-abilities.js';
import { createDuel, MOVES } from './duel-engine.js';
import { createLocalAgent, createAiAgent } from './duel-ai.js';
import { createDuelScene, FALL_MS } from './duel-scene.js';
import { playBossIntro } from './boss-intro.js';
import { getPortrait } from '../art/sprites-portraits.js';
import { CHARACTER_TIMING, getRevolverSprites } from '../art/sprites-character.js';
import { getWeatherState } from '../explore/weather.js';
import { getTimeState } from '../explore/daynight.js';
import { resolveDuel } from '../game/run.js';
import { go } from '../core/router.js';
import { track as trackAchievement } from '../game/achievements.js';
import { openInventory } from '../ui/inventory-panel.js';
import {
  livesRow,
  updateLivesRow,
  cylinder,
  updateCylinder,
  icon,
  uiIcon,
  iconButton,
  statTile,
} from '../ui/widgets.js';
import { MAX_BULLETS } from './duel-engine.js';
import { getSettings } from '../core/settings.js';
import { toast } from '../ui/toast.js';
import { openHowToPlay } from '../ui/help.js';
import { PALETTE } from '../art/palette.js';

/**
 * How long the screen waits on each beat of a round, in milliseconds.
 *
 * DRAW_MS covers the four-frame draw in src/art/sprites-character.js, so the
 * guns are levelled before either of them fires; BULLET_MS covers the tracer's
 * flight, so a life is only lost once the round has actually arrived.
 */
const DRAW_MS = 4 * CHARACTER_TIMING.aim;
const BULLET_MS = 260;

/**
 * What the saddlebag will hand you in the middle of a fight: something to patch
 * yourself up with, and something to eat.
 *
 * The Traveller's Feast is deliberately NOT on the list even though it is food.
 * What it is bought for is the three duels AFTER it, so spending one here would
 * look, from inside the fight, like a legendary that did nothing — the rounds
 * it loads are loaded when a duel starts, and this one already has.
 */
const DUEL_ITEMS = ['bandage', 'medkit', 'potion', 'carrot', 'apple', 'stew'];

/** Combine weather and night into the modifier set the engine understands. */
function buildModifiers() {
  const weather = getWeatherState();
  const time = getTimeState();
  const mods = { ...(weather.duel || {}) };
  if (time.isNight) {
    mods.enemyAccuracyPenalty = (mods.enemyAccuracyPenalty || 0) + 0.1;
    mods.night = true;
  }
  mods.weatherLabel = weather.label;
  mods.weatherId = weather.id;
  return mods;
}

export const DuelScreen = {
  id: 'duel',

  mount(root, params = {}) {
    const player = getState();
    /**
     * THE FIGHT BELONGS TO THE SEGMENT THAT SPAWNED IT
     * -----------------------------------------------------------------------
     * Not to `player.world`. The encounter carries the world its segment was
     * generated for (see src/explore/walk-engine.js), and that is the one
     * authority here: if anything ever moves the player on while a duel is
     * being routed, the fight that opens is still the one the road offered.
     * The boss used to be a world ahead for exactly that reason.
     */
    const worldId = params.encounter?.worldId ?? player.world;
    const world = getWorld(worldId);
    const isBoss = !!params.isBoss;
    const modifiers = buildModifiers();

    /**
     * A FIGHT THAT DID NOT HAPPEN
     * -----------------------------------------------------------------------
     * The Admin Panel can start a duel against anything it likes (see
     * src/admin/tab-battle.js), and a made-up fight must not be able to touch
     * the run: no gold, no exp, no lives written back, no death, no encounter
     * advanced. `sandbox` is that promise, and it is kept in exactly two places
     * — `endDuel` does not sync the bar back onto the player, and the overview
     * walks back to the road instead of calling `resolveDuel`.
     *
     * The fight itself is completely real. It is the same engine, the same
     * agent, the same scene and the same enemy shape; only its consequences are
     * dropped. A sandbox that simulated the duel differently would be a sandbox
     * that could not be used to reproduce anything.
     */
    const sandbox = !!params.sandbox;

    let enemy = params.customEnemy ? params.customEnemy : isBoss
      ? generateBoss(worldId)
      : generateEnemy(
          worldId,
          /**
           * The same seed the ROAD rolled him from — see `enemySeedFor`. The
           * player has just spent six seconds walking towards a particular man
           * standing at the end of the stretch, and this is the line that makes
           * him the man they arrive at.
           */
          enemySeedFor(params.encounter?.index ?? 0),
          // How deep into the world this fight is. Past halfway, riders start
          // carrying the next rung of the ladder — and the gun to show it.
          params.encounter?.progress ?? 0,
        );

    playMusic(worldId === FINAL_WORLD ? 'themeGalaxy' : 'themeDuel');

    const scene = createDuelScene({
      worldId,
      biome: world.biome,
      tint: world.tint,
      seed: player.seed,
      enemySprites: enemy.sprites,
      enemyScale: enemy.scale || 1,
      shakeEnabled: getSettings().screenShake,
      /**
       * Which gun the player walks in with. Bought at forges and kept for the
       * whole run, so the fight is the one place the money is visible: the
       * shape in the hand, the colour of the flash and everything the barrel
       * throws all come off this one number.
       */
      playerGun: gunTier(player.gunLevel),
      /**
       * …and what the man across the road brought. Picked off his bullet, so
       * the player can read the threat before the first draw instead of after
       * the first hit.
       */
      enemyGun: enemyGunLook(enemy.gunDamage),
    });

    const localAgent = createLocalAgent();
    let aiAgent = createAiAgent(enemy, modifiers, { thinkMs: 120 });

    /**
     * What the last meal left on you, if anything.
     *
     * The only thing outside this fight that reaches into how it STARTS — a
     * Traveller's Feast puts rounds in the cylinder before the first draw, so
     * the opening turn does not have to be spent reloading in the open. It is
     * read once, here, and spent by `resolveDuel` when the fight is over.
     */
    const boon = getBoon();

    /**
     * What is in the two hands walking in. Read once here rather than inline,
     * because the ledger wants to know how many of them there are — going into
     * a fight with both slots filled is a thing worth having done.
     */
    const equippedAbilities = getEquippedAbilities();
    trackAchievement('abilitiesEquipped', { count: equippedAbilities.length });

    const duel = createDuel({
      player: {
        name: 'You',
        lives: player.lives,
        maxLives: player.maxLives,
        /** The gold diamonds a Potion left on the bar. They ride into the fight. */
        bonus: player.bonusLives,
        bullets: Math.min(MAX_BULLETS, boon?.bullets || 0),
        hasVest: hasVest(),
        hasTotem: hasTotem(),
        totemLives: totemReviveLives(player.maxLives),
        immune: isImmuneToEffects(),
        /**
         * Whatever is in the two ability slots, resolved down to its numbers.
         * Empty for a player who has not bought any, which is most of world 1
         * and every run that spends its gold on bandages instead.
         */
        abilities: equippedAbilities,
        gunDamage: gunDamage(),
      },
      enemy,
      playerAgent: localAgent,
      enemyAgent: aiAgent,
      modifiers,
      onEvent: handleEngineEvent,
    });

    const roundLog = [];
    /** Set the first time anything gets through to the player. */
    let tookDamage = false;
    /** How many abilities were spent in here — read by the ledger at the end. */
    let abilitiesCast = 0;
    let vestConsumed = false;
    /**
     * Set the moment the engine refuses a killing blow because of the totem,
     * and cleared by `runTotem` once the scene has been played. It is a flag
     * rather than an immediate call because the engine resolves a whole round
     * before the screen animates any of it: the shot that killed you has to
     * actually arrive before the lights go out.
     */
    let totemPending = false;
    let totemPlaying = false;
    /** The in-flight scene, so both entry points wait on one of them. */
    let totemScene = null;
    let finished = false;
    /** True once the fight proper has started — see `onFrame`. */
    let clockRunning = false;
    /** True while the player's one-shot landmark is still on the road. */
    let playerHazardUp = false;

    // --- fighter cards -----------------------------------------------------
    const playerLives = livesRow(player.lives, player.maxLives, {
      large: true,
      bonus: player.bonusLives,
    });
    const enemyLives = livesRow(enemy.lives, enemy.maxLives, { large: true });
    const playerCylinder = cylinder(0, MAX_BULLETS);
    const enemyCylinder = cylinder(enemy.bullets || 0, MAX_BULLETS);
    // The tooltip is the archetype's own one-line description of itself, so
    // hovering a name says what you are looking at rather than repeating it.
    const enemyName = el('div.fighter-name', { text: enemy.name, 'data-tip': enemy.look || null });
    const enemyAbilities = el('div.effect-row');
    // What is currently working on each fighter, as opposed to what they can
    // do. Rebuilt every round from the engine's own state.
    const playerStatus = el('div.effect-row');
    const enemyStatus = el('div.effect-row');
    const playerCard = el('div.fighter-card', {}, [
      el('div.fighter-name', { text: 'You' }),
      playerLives,
      playerCylinder,
      playerStatus,
    ]);
    /**
     * WHAT HE IS HOLDING, WRITTEN DOWN
     * -----------------------------------------------------------------------
     * The gun is already in his hand on the road — the scene draws the exact
     * silhouette his bullet buys (ENEMY_GUNS in src/game/gun-tiers.js) — and
     * that is the reading the fight is meant to be won on. This is the same
     * fact in the one form a sprite cannot carry: the NUMBER. A player who has
     * not yet learned to tell a longbarrel from a sixgun at sixteen pixels can
     * read "1.5 a shot" off the card and count how many of them their bar has
     * left, which is the whole decision every round of this game is.
     *
     * It is on the enemy's card only. The player's own bullet is on the forge
     * screen, on the Shoot button's tooltip and in the help panel already, and
     * a fourth copy of it here would be the interface repeating itself.
     */
    const enemyGunChip = gunChip(enemy.gunDamage);
    const enemyCard = el('div.fighter-card.is-enemy', {}, [
      enemyName,
      enemyLives,
      enemyGunChip,
      enemyCylinder,
      enemyAbilities,
      enemyStatus,
    ]);

    /**
     * The enemy's abilities, as pictures.
     *
     * They used to be a row of words under the fighter — "Bullet Steal",
     * "Mind Control" — which is the same information the icon carries, in the
     * one form that has to be read rather than recognised, on a screen where
     * the player is already reading a callout and three buttons. Every one of
     * these has had an icon since src/art/sprites-items.js grew the last two.
     * The name is still there for anyone who hovers or is using a reader.
     */
    function renderAbilities() {
      clearNode(enemyAbilities);
      (enemy.abilities || []).forEach((a) => enemyAbilities.append(effectBadge(a)));
      if (isImmuneToEffects() && (enemy.abilities || []).length) {
        enemyAbilities.append(
          effectBadge('immune', { label: 'Blocked by diadem', tone: 'is-blocked' }),
        );
      }
      /**
       * The special sits on the card from the first round, like everything
       * else: a volcano is not a twist, it is a thing this one can do, and
       * the player is owed the chance to fight faster because of it. Once it
       * has been spent the badge stays and goes red — it is not a warning any
       * more, it is the weather.
       */
      const spec = duel.getSpecialSpec();
      if (spec) {
        const raised = !!duel.getHazard();
        const cost = specialDamage(spec);
        enemyAbilities.append(
          effectBadge(spec.id, {
            label: spec.label,
            iconName: spec.icon,
            tone: raised ? 'is-special is-raised' : 'is-special',
            // The tip is the deal in one line: what it costs and how often.
            // `getAbility` knows nothing about specials, so it is spelled here.
          }),
        );
        const badge = enemyAbilities.lastElementChild;
        // "Three lives an eruption" is the wrong promise for a charge special:
        // the whole threat is that they arrive together, and a player reading
        // the card is deciding whether they can afford to trade rounds with it.
        const rate =
          spec.pattern === 'charge'
            ? `${cost} ${cost === 1 ? 'life' : 'lives'} in one shot`
            : `${cost} ${cost === 1 ? 'life' : 'lives'} an eruption`;
        const tip = `${spec.label} — ${spec.tip}. ${rate}`;
        badge.dataset.tip = tip;
        badge.setAttribute('aria-label', tip);
      }
    }

    /**
     * Live status on a fighter: what is currently working on them, as opposed
     * to what they can do. Every one of the eight counters the engine keeps has
     * a badge here with the number still to run, because a rule the player
     * cannot see the clock for is a rule they can only learn by losing to it —
     * "frozen, 1 left" is the difference between a wasted turn and a planned
     * one. The colour on the fighter out on the road says the same thing at a
     * glance; this says it exactly.
     */
    const STATUS_BADGES = [
      ['frozen', 'iceFall', 'Frozen — they do nothing at all', 'is-bad'],
      ['venom', 'poison', 'Poisoned — a life every round', 'is-active'],
      ['jam', 'lassoPull', 'Jammed — cannot shoot', 'is-bad'],
      ['panic', 'hornetSting', 'Panicked — their shield stops nothing', 'is-bad'],
      ['blind', 'sandBlind', 'Blinded — shots go wide', 'is-bad'],
      ['mark', 'swampRot', 'Marked — every shot that lands costs one more', 'is-bad'],
      ['doubleTap', 'hellWhisper', 'Loaded — shots cost them one more', 'is-good'],
      ['reflect', 'starRot', 'Mirrored — the next shot goes back', 'is-good'],
    ];

    function renderStatus(row, side) {
      clearNode(row);
      const st = side.status || {};
      for (const [key, iconName, label, tone] of STATUS_BADGES) {
        const left = st[key] || 0;
        if (left <= 0) continue;
        row.append(
          effectBadge(key, { label: t('{label} — {left} left', { label: t(label), left }), iconName, tone, count: left }),
        );
      }
      if (side.hasVest) {
        row.append(effectBadge('vest', { label: 'Vest — stops one hit a duel', tone: 'is-good' }));
      }
      // It stays on the card until it is spent, and it disappears the moment
      // it is: the badge going is how the player learns the totem was used on
      // the round that black screen came up.
      if (side.hasTotem) {
        row.append(
          effectBadge('duskTotem', {
            label: 'Dusk Totem — when the last life goes, it breaks instead of you',
            tone: 'is-good',
          }),
        );
      }
      if (side.immune) {
        row.append(effectBadge('immune', { label: 'Diadem — effects cannot touch you', tone: 'is-good' }));
      }
    }

    /**
     * The colour a fighter wears on the road while something is on them.
     *
     * One tint at a time and the worst one wins: a man who is frozen AND
     * poisoned is drawn as frozen, because that is the one costing him his
     * turn. Anything with no colour of its own leaves the sprite alone.
     */
    const STATUS_TINTS = [
      ['frozen', { color: PALETTE.iceLight, alpha: 0.55 }],
      ['venom', { color: PALETTE.poison, alpha: 0.4 }],
      ['mark', { color: PALETTE.redLight, alpha: 0.32 }],
      ['panic', { color: PALETTE.gold, alpha: 0.28 }],
      ['doubleTap', { color: PALETTE.magma, alpha: 0.3 }],
      ['reflect', { color: PALETTE.astralLight, alpha: 0.35 }],
    ];

    function syncStatusTints() {
      const s = duel.getSides();
      for (const id of ['player', 'enemy']) {
        const st = s[id].status || {};
        const found = STATUS_TINTS.find(([key]) => (st[key] || 0) > 0);
        scene.setStatusTint(id, found ? found[1] : null);
        // A vest is a thing you are wearing, so the sprite wears it. The scene
        // is told what the engine currently holds rather than being toggled at
        // the moment of purchase: one source of truth, and it survives a fight
        // that starts with the vest already gone.
        if (!vestBreaking) scene.setVest(id, !!s[id].hasVest);
      }
    }

    /**
     * The vest leaves the body when the blow LANDS, not when the engine works
     * the round out.
     *
     * The engine resolves a whole round in one go and the screen then plays it
     * out over a second and a half, so throwing the vest on the road inside the
     * event handler would have it falling before the gun had even come up. The
     * break is parked here instead and flushed by `syncBars`, which every path
     * that can hurt anybody — a bullet, a hazard strike, an ability, a venom
     * tick — calls once the damage has actually arrived on screen.
     */
    let vestBreaking = null;
    function flushVestBreak() {
      if (!vestBreaking) return;
      const side = vestBreaking;
      vestBreaking = null;
      scene.breakVest(side);
      scene.fx.banner = 'VEST HOLDS!';
      scene.fx.bannerTimer = 900;
      play('hit');
    }

    // --- centre ------------------------------------------------------------
    const roundPill = el('div.round-pill', { text: 'Round 1' });
    const callout = el('div.duel-callout.is-waiting', { role: 'status', 'aria-live': 'polite' }, [
      el('span', { text: 'Choose your move' }),
    ]);

    const atmosChips = [
      modifiers.weatherLabel && modifiers.weatherId !== 'clear'
        ? el('span.chip.chip--danger', {
            text: modifiers.weatherLabel,
            'data-tip': modifiers.misfireChance
              ? 'Wet powder — shots sometimes misfire'
              : 'Poor visibility — they read you less well',
          })
        : null,
      modifiers.night
        ? el('span.chip.chip--danger', { text: 'Night', 'data-tip': 'They aim worse in the dark' })
        : null,
      isBoss ? el('span.chip.chip--legendary', { text: 'Boss' }) : null,
    ].filter(Boolean);

    /**
     * The hazard clock, once one is up.
     *
     * A special runs on real time, and a rule the player cannot see the clock
     * for is a rule they can only learn by dying to it. So the countdown is on
     * screen: twelve seconds to the next eruption is information you are meant
     * to be spending — finish the fight, or shield and wait it out.
     */
    const hazardChip = el('span.chip.chip--danger.chip--hazard', { hidden: true });
    let hazardChipKey = '';

    // --- controls ----------------------------------------------------------
    const buttons = {};
    const MOVE_SFX = { [MOVES.RELOAD]: 'reload', [MOVES.SHIELD]: 'shield', [MOVES.SHOOT]: 'shot' };

    /**
     * One move plate: icon, name, keyboard hint, and a cost strip.
     *
     * The cost strip is a picture of the transaction — a round gained, a round
     * spent, or nothing — rather than a line of prose. `tip` carries the full
     * explanation for anyone who hovers, and `aria-label` carries it for anyone
     * who cannot see the plate at all.
     */
    function moveButton(move, { label, iconName, key, cls, cost, tip }) {
      // `data-sfx` lets attachButtonSounds play the move's own cue instead of
      // the generic click, so pressing Shoot sounds like a revolver.
      const costNode = el('span.duel-cost', {}, cost());
      const btn = el(`button.btn.duel-btn.${cls}`, {
        onclick: () => submit(move),
        dataset: { sfx: MOVE_SFX[move] },
        'data-tip': tip,
        'aria-label': `${t(label)}. ${t(tip)}`,
      }, [
        uiIcon(iconName, 1.3),
        el('span.duel-btn-label', {}, [label, el('span.kbd', { text: key })]),
        costNode,
      ]);
      buttons[move] = btn;
      btn.costNode = costNode;
      btn.renderCost = () => {
        clearNode(costNode);
        cost().forEach((child) => child && costNode.append(child));
      };
      return btn;
    }

    const pip = (spent = false) => el('span.pip', { class: spent ? 'is-spent' : '' });

    const controls = el('div.duel-controls', {}, [
      moveButton(MOVES.RELOAD, {
        label: 'Reload',
        iconName: 'chamber',
        key: '1',
        cls: 'duel-btn--reload',
        cost: () => [el('span', { text: '+' }), pip()],
        tip: 'Load one round. You are open to a shot this turn.',
      }),
      moveButton(MOVES.SHIELD, {
        label: 'Shield',
        iconName: 'shieldPlate',
        key: '2',
        cls: 'duel-btn--shield',
        cost: () => [el('span', { text: 'Safe' })],
        tip: 'Nothing gets through. You gain nothing either.',
      }),
      moveButton(MOVES.SHOOT, {
        label: 'Shoot',
        iconName: 'revolver',
        key: '3',
        cls: 'duel-btn--shoot',
        cost: () => {
          const player = duel.getSides().player;
          if ((player.status?.jam || 0) > 0) return [el('span', { text: 'Jammed' })];
          const dry = player.bullets <= 0;
          return dry ? [el('span', { text: 'Empty' })] : [el('span', { text: '−' }), pip(true)];
        },
        tip: 'Spend one round. Hits a rival who reloaded or shot.',
      }),
    ]);

    /**
     * THE ABILITY BAR
     * -----------------------------------------------------------------------
     * Up to two plates above the moves: what you are carrying, how close it is
     * to being worth pressing, and nothing else. They are deliberately NOT a
     * fourth and fifth move button — they sit on their own row, they are half
     * the height, and pressing one does not end your turn. An ability is
     * something you do *as well as* reloading, shielding or shooting, and the
     * layout has to say so before the tooltip does.
     *
     * The charge is drawn as pips rather than a bar for the same reason the
     * cylinder is drawn as chambers: the number is small, and a player should
     * be able to count "one more round" without reading a percentage.
     */
    const abilityBar = el('div.duel-abilities');
    const abilityPlates = new Map();

    function buildAbilityBar() {
      clearNode(abilityBar);
      abilityPlates.clear();
      const slots = duel.getAbilityState();
      abilityBar.hidden = slots.length === 0;
      slots.forEach((slot, index) => {
        const pips = el('span.charge-row');
        const key = index === 0 ? 'Q' : 'E';
        const plate = el('button.btn.ability-plate', {
          onclick: () => castAbility(slot.itemId),
          'data-tip': `${t(slot.spec.label)} — ${t(slot.spec.desc)}`,
          'aria-label': `${t(slot.spec.label)}. ${t(slot.spec.desc)}`,
        }, [
          icon(slot.spec.icon, 1.2),
          el('span.ability-name', {}, [slot.spec.label, el('span.kbd', { text: key })]),
          pips,
        ]);
        plate.pips = pips;
        abilityPlates.set(slot.itemId, plate);
        abilityBar.append(plate);
      });
      syncAbilityBar();
    }

    function syncAbilityBar() {
      for (const slot of duel.getAbilityState()) {
        const plate = abilityPlates.get(slot.itemId);
        if (!plate) continue;
        clearNode(plate.pips);
        for (let i = 0; i < slot.cost; i++) {
          plate.pips.append(el('span.charge-pip', { class: i < slot.charge ? 'is-lit' : '' }));
        }
        plate.classList.toggle('is-ready', slot.ready);
        plate.classList.toggle('is-spent', slot.spent);
        plate.disabled = !slot.ready || finished;
        if (slot.spent) plate.dataset.tip = t('{label} — spent for this duel', { label: t(slot.spec.label) });
      }
    }

    const itemButton = el('button.btn.btn--sm.btn--ghost', {
      onclick: () => openBag(),
      'data-tip': 'Eat something, or patch yourself up',
    }, [icon('shopTag', 1.1), 'Saddlebag', el('span.kbd', { text: 'I' })]);

    const helpButton = iconButton('question', {
      onClick: () => openHowToPlay(),
      label: 'How to play',
    });

    const screen = el('div.screen.duel-screen', {}, [
      el('div.duel-top', {}, [
        playerCard,
        el('div.duel-center', {}, [roundPill, ...atmosChips, hazardChip]),
        enemyCard,
      ]),
      // The bag and the guide sit on the callout line rather than on a row of
      // their own: a duel on a short screen was pushing them off the bottom.
      el('div.duel-bottom', {}, [
        el('div.duel-extras', {}, [helpButton, callout, itemButton]),
        abilityBar,
        controls,
      ]),
    ]);

    root.append(screen);
    attachButtonSounds(screen);
    renderAbilities();
    buildAbilityBar();
    syncBars();

    /**
     * Tell the scene where the interface stops.
     *
     * Only an oversized fighter cares, and only because his head would
     * otherwise be behind his own life bar. It is measured rather than
     * guessed: the card is as tall as the enemy's name and abilities make it,
     * and the Stranger's second phase has a two-line name and four icons.
     */
    function syncHud() {
      scene.setHudBox(enemyCard.getBoundingClientRect());
    }
    requestAnimationFrame(syncHud);
    window.addEventListener('resize', syncHud);

    // --- state sync --------------------------------------------------------
    function syncBars() {
      const sides = duel.getSides();
      updateLivesRow(playerLives, sides.player.lives, sides.player.maxLives, sides.player.bonus);
      updateLivesRow(enemyLives, sides.enemy.lives, sides.enemy.maxLives, sides.enemy.bonus);
      updateCylinder(playerCylinder, sides.player.bullets);
      updateCylinder(enemyCylinder, sides.enemy.bullets);
      renderStatus(playerStatus, sides.player);
      renderStatus(enemyStatus, sides.enemy);
      syncStatusTints();
      roundPill.textContent = `Round ${Math.max(1, duel.getRound() + (localAgent.isWaiting() ? 1 : 0))}`;

      // Shoot swaps its cost strip for "Empty" when the cylinder is out, so a
      // disabled button still says why it is disabled.
      buttons[MOVES.SHOOT].renderCost();
      syncAbilityBar();
      flushVestBreak();
    }

    function setControlsEnabled(enabled) {
      const player = duel.getSides().player;
      const jammed = (player.status?.jam || 0) > 0;
      for (const [move, btn] of Object.entries(buttons)) {
        // A jammed gun is disabled rather than allowed to waste the turn: the
        // player can see the badge counting down and the button agreeing with
        // it, which is the whole point of showing the status at all.
        btn.disabled = !enabled || (move === MOVES.SHOOT && (player.bullets <= 0 || jammed));
      }
      itemButton.disabled = !enabled || !hasDuelItems();
      controls.classList.toggle('is-waiting', !enabled);
    }

    function hasDuelItems() {
      return DUEL_ITEMS.some((id) => countOf(id) > 0);
    }

    function setCallout(text, tone = '') {
      clearNode(callout);
      callout.className = `duel-callout ${tone}`.trim();
      callout.append(el('span', { text }));
    }

    function submit(move, fromKeyboard = false) {
      if (!localAgent.isWaiting() || totemPlaying) return;
      if (fromKeyboard) play(MOVE_SFX[move]);
      setControlsEnabled(false);
      setCallout('Both of you draw…', 'is-waiting');
      localAgent.submit(move);
    }

    /**
     * Spend a charged ability.
     *
     * It is a free action: the controls stay live and the round the player was
     * in the middle of choosing is still theirs to choose. Everything after the
     * engine call is presentation — the same themed animation the enemy's
     * version plays, aimed the other way for once.
     */
    /** Q and E map to the first and second plate, whatever is in them. */
    function castFromKey(index) {
      const slot = duel.getAbilityState()[index];
      if (slot && !finished) castAbility(slot.itemId);
    }

    function castAbility(itemId) {
      const result = duel.useAbility(itemId);
      if (!result.ok) {
        play('error');
        if (result.reason) toast(result.reason, 'bad');
        return;
      }
      abilitiesCast += 1;
      trackAchievement('abilityCast', {});
      const spec = result.spec;
      if (spec.kind === 'special') {
        announcePlayerSpecial(spec);
      } else {
        // A self-buff plays over the fighter that cast it, which for a player
        // cast is the player. Everything else lands on the rival.
        scene.castAbilityFx(spec.fx, spec.fx?.self ? 'player' : 'enemy');
        scene.fx.banner = spec.banner || spec.label;
        scene.fx.bannerTimer = 900;
        // Nothing has hit anybody yet when a blast is cast — the stick is still
        // in the air. Its noise belongs to the detonation, a round later.
        if (spec.effect !== 'blast') play(spec.effect === 'pierce' ? 'hit' : 'shield');
        flashEffect(enemyStatus, spec.id);
        enemyCard.classList.remove('is-hit');
        void enemyCard.offsetWidth;
        enemyCard.classList.add('is-hit');
      }
      syncBars();
      syncAbilityBar();
    }

    /**
     * The player calls one down.
     *
     * Shorter than the enemy's entrance, and on purpose: the enemy's is a
     * surprise that has to be established, and this one is a thing the player
     * spent five rounds waiting to press. They do not need it explained to
     * them — they need it to land.
     */
    function announcePlayerSpecial(spec) {
      scene.setHazard(spec, 'player');
      scene.fx.banner = spec.banner || spec.label;
      scene.fx.bannerTimer = 1500;
      scene.fx.shake = 700;
      scene.fx.rays = 0.7;
      playerHazardUp = true;
      play(spec.sfx || 'toll');
      setCallout(t('You call down the {trick}', { trick: t(spec.label).toLowerCase() }), 'is-good');
    }

    /**
     * CLOSING THE BAG IS PART OF ENDING THE FIGHT
     * -----------------------------------------------------------------------
     * The saddlebag is a free action and the duel can end while it is open —
     * a thrown stick of dynamite finishes the enemy, or a rock out of an
     * erupting mountain finishes you. The inventory spends the item BEFORE it
     * calls back here (see `doUse` in src/ui/inventory-panel.js), so anything
     * used in the seconds between the last life going and the overview coming
     * up is gone for nothing. It gets shut the moment the fight is decided,
     * and the callback refuses anything already in flight.
     */
    let bag = null;

    function closeBag() {
      bag?.close();
      bag = null;
    }

    function openBag() {
      if (finished || duel.isOver()) return;
      bag = openInventory({
        onClose: () => { bag = null; },
        context: 'duel',
        canUse: (id) => DUEL_ITEMS.includes(id),
        useOpts: () => ({
          lives: duel.getSides().player.lives,
          maxLives: duel.getSides().player.maxLives,
        }),
        onUse: (id, result) => {
          if (finished || duel.isOver()) return;
          if (result.effect === 'heal') {
            const sides = duel.getSides();
            sides.player.lives = Math.min(sides.player.maxLives, sides.player.lives + result.amount);
            syncBars();
            trackAchievement('bandageInDuel', { id });
          }
          /**
           * A Potion drunk mid-fight. It goes on the ENGINE's count rather than
           * on the run's, exactly like a bandage does, and `endDuel` writes
           * whatever survived the fight back onto the player — otherwise three
           * gold lives bought in the middle of a round would be paid for twice
           * and spent once.
           */
          if (result.effect === 'bonus') {
            duel.getSides().player.bonus += result.amount;
            syncBars();
          }
        },
      });
    }

    const onKey = (e) => {
      // Nothing about the fight is reachable while the totem is on screen —
      // including the shortcuts, which is the half of "the controls are dead"
      // that disabling three buttons does not cover.
      if (totemPlaying) return;
      if (e.key === '1') submit(MOVES.RELOAD, true);
      if (e.key === '2') submit(MOVES.SHIELD, true);
      if (e.key === '3') submit(MOVES.SHOOT, true);
      if ((e.key === 'i' || e.key === 'I') && !itemButton.disabled) openBag();
      // Q and E, because 1-3 are the moves and an ability is not one.
      if (e.key === 'q' || e.key === 'Q') castFromKey(0);
      if (e.key === 'e' || e.key === 'E') castFromKey(1);
    };
    window.addEventListener('keydown', onKey);

    /**
     * Anything used out of the bag mid-fight shows on the fighter: green for a
     * bandage, orange with the food's own icon for a meal. It is driven by the
     * bag's event rather than by `onUse` below, so it covers every path into
     * the saddlebag and not just this screen's.
     */
    const unsubItemUsed = on(EVENTS.ITEM_USED, ({ effect, icon: iconName }) => {
      if (!finished) scene.vitalPop('player', effect, iconName);
    });

    // --- engine events -----------------------------------------------------
    function handleEngineEvent(event) {
      /**
       * Was the player touched at all in this fight?
       *
       * Asked of the engine rather than of the life bar, because the bar is not
       * a record of damage: a bandage in the middle of a fight, or a totem
       * putting lives back, can leave a player who was shot twice ending on
       * more than they started with. "Untouched" has to mean untouched.
       */
      if (event.type === 'damage' && event.side === 'player') tookDamage = true;

      if (event.type === 'vest' && !vestConsumed) {
        // Once per duel, and the vest stays in the bag: what is spent is the
        // fight's charge, not the item. `vestConsumed` is the guard that keeps
        // one fight to one blow — the engine has already cleared its own flag,
        // this only stops a second animation if two things land at once.
        vestConsumed = true;
        // Whatever it stopped — a round, a rock off a volcano, a stick of
        // dynamite — the vest stopped one thing and is off you for the rest of
        // this fight. The words and the fall both wait for the blow to land:
        // see `flushVestBreak`.
        vestBreaking = event.side || 'player';
        toast('Your vest took the hit — you patch it up on the road', 'good');
      }
      // An ability going off lights its own icon rather than printing its name
      // over the fight: the picture is already on screen, and the player has
      // been looking at it since the round started.
      //
      // What it also does now is HAPPEN on the road. A themed trick carries a
      // motion and three colours (src/game/world-abilities.js) and the scene
      // plays it over the fighter it landed on, so a hornet sting and an ember
      // bite are told apart by watching rather than by reading the tooltip.
      /**
       * ONLY THE ENEMY'S CASTS ARE ANNOUNCED FROM HERE
       * ---------------------------------------------------------------------
       * `applyAbility` in the engine is shared by both sides, so it logs this
       * for the player's casts too — and `castAbility` below has already
       * played the particles, the banner and the cue for those. Without the
       * gate a player cast fired everything twice, flashed the OPPONENT's
       * badge whenever both of them happened to carry the same ability, and
       * animated a self-buff over the wrong fighter.
       */
      if (event.type === 'ability' && event.side === 'enemy') {
        flashEffect(enemyAbilities, event.ability);
        const ability = getAbility(event.ability);
        // It plays over whoever it LANDED on, which is not always the rival:
        // a mirror and a loaded whisper settle on the fighter that cast them.
        scene.castAbilityFx(ability.fx, event.target || 'player');
        if (ability.banner) {
          scene.fx.banner = ability.banner;
          scene.fx.bannerTimer = 900;
        }
        // …except a blast, which has not hit anything yet: the stick is in the
        // air and its noise is the explosion, which happens a round later.
        if (ability.effect !== 'blast') play(ability.effect === 'pierce' ? 'hit' : 'shield');
      }
      /**
       * THE STICK GOING OFF.
       *
       * The dynamite is the only ability whose outcome is not decided when it
       * is cast — a shield raised in the round it was thrown eats it — so it is
       * the only one that reports back. What is on screen at this point is a
       * stick lying at somebody's boots with the fuse burning (see `fuse` in
       * src/game/world-abilities.js); this is where it is told how it went.
       *
       * The delay is the draw. The engine resolves the whole round before the
       * screen animates any of it, so detonating on the spot would blow the
       * stick up while both of them still had their guns in leather — it goes
       * off on the beat the shot does. The scene owns the fireball, the shake
       * and the noise; if there is no fuse burning (a duel loaded mid-blast,
       * a cast that never got drawn) nothing happens and nothing breaks.
       */
      if (event.type === 'blast') {
        const stopped = !!event.stopped;
        const side = event.side;
        setTimeout(() => {
          if (finished) return;
          if (!scene.detonateCharge(side, { stopped })) {
            scene.fx.shake = stopped ? 200 : 520;
            play(stopped ? 'shield' : 'hit');
          }
          toast(
            stopped
              ? (side === 'player' ? 'Your shield ate the blast' : 'They got a shield up in time')
              : (side === 'player' ? 'The blast went straight through' : 'The blast lands'),
            side === 'player' ? (stopped ? 'good' : 'bad') : (stopped ? 'bad' : 'good'),
          );
        }, DRAW_MS);
      }
      if (event.type === 'totem' && event.side === 'player') totemPending = true;
      if (event.type === 'reflect') toast('Mirrored — it went back at them', 'good');
      if (event.type === 'hazard-warn') handleHazardWarn(event);
      if (event.type === 'hazard-erupt') handleHazardErupt(event);
      if (event.type === 'hazard-strike') handleHazardStrike(event);
      if (event.type === 'ability-blocked') {
        flashEffect(enemyStatus, 'immune');
        toast('The diadem blocked it', 'good');
      }
      if (event.type === 'phase') {
        // Not a banner and a flash any more: a crash zoom onto whatever just
        // stood up, speed lines, a shockwave and the frame coming apart. The
        // camera returns on its own a beat later — see the phase branch in
        // `loop`, which is what puts it back.
        scene.fx.banner = 'PHASE TWO';
        scene.fx.bannerTimer = 1400;
        scene.fx.whiteout = 500;
        scene.fx.shake = 900;
        scene.fx.rays = 1;
        scene.fx.ring = 0;
        scene.fx.slam = 180;
        play('toll');
      }
    }

    // --- the world special -------------------------------------------------

    /**
     * The enemy calls it up.
     *
     * This is the one beat in an ordinary duel that stops the fight to look at
     * something, and it earns it: what arrives is going to be there until
     * somebody wins, and the player has to see where it is standing before it
     * starts throwing. A push onto the caster, the frame coming apart, and
     * then out to the wide shot with a mountain in it that was not there when
     * the round started.
     */
    async function announceSpecial(spec) {
      scene.setHazard(spec);
      scene.fx.banner = spec.banner;
      scene.fx.bannerTimer = 1700;
      scene.fx.shake = 900;
      scene.fx.rays = 0.85;
      scene.fx.slam = 150;
      play(spec.sfx || 'toll');
      setCallout(t('{name} calls up the {trick}', { name: t(enemy.name), trick: t(spec.label).toLowerCase() }), 'is-bad');
      renderAbilities();
      hazardChip.hidden = false;

      scene.lookAt({ side: 'enemy', x: 8, y: 5, fill: 12, ms: 340 });
      await wait(820);
      if (finished) return;
      scene.lookAt({ ms: 700 });
      await wait(900);
    }

    /** The hazard an event belongs to, whichever side raised it. */
    function hazardOf(event) {
      return duel.getHazards().find((h) => h.owner === (event.owner || 'enemy')) || null;
    }

    /** The sky turning. Nothing has been thrown yet — that is the point. */
    function handleHazardWarn(event) {
      const entry = hazardOf(event);
      if (!entry) return;
      // Only the enemy's gets the warning card. The player's was pressed by
      // the player a second ago; telling them it is coming is telling them
      // something they did.
      if (entry.owner === 'enemy') {
        scene.fx.banner = entry.spec.warnBanner || 'IT IS WAKING';
        scene.fx.bannerTimer = 1400;
      }
      scene.fx.shake = Math.max(scene.fx.shake, 260);
      play(entry.spec.sfx || 'rumble');
    }

    /**
     * The window opening.
     *
     * For five of the six that means rock is already in the air, and it gets
     * the whole noise. For a `charge` special it means the opposite — nothing
     * is coming for another five seconds — so it gets a quieter, longer beat
     * and a line that says what the quiet is for. Selling a wind-up as an
     * eruption would teach the player to brace at exactly the wrong moment.
     */
    function handleHazardErupt(event) {
      const entry = hazardOf(event);
      if (!entry) return;
      if (event.charging) {
        scene.fx.shake = Math.max(scene.fx.shake, 320);
        if (entry.owner === 'enemy') {
          scene.fx.banner = entry.spec.chargeBanner || 'IT IS GATHERING';
          scene.fx.bannerTimer = 1500;
          setCallout(t('The {trick} is winding up', { trick: t(entry.spec.label).toLowerCase() }), 'is-bad');
        }
        play('rumble');
        return;
      }
      scene.fx.shake = 700;
      scene.fx.rays = 0.5;
      play(entry.spec.sfx || 'rumble');
    }

    /**
     * One strike landing. The engine has already taken the life — this throws
     * the thing that took it, and the scene hangs the impact and the shake off
     * where it lands rather than off this call.
     *
     * A `mega` strike is the whole eruption arriving at once out of a charge
     * special, and it is the biggest single thing that happens in an ordinary
     * duel: it gets the beam, the name and a noise nothing else here makes.
     */
    function handleHazardStrike(event) {
      const owner = event.owner || 'enemy';
      const side = event.side || 'player';
      const spec = hazardOf(event)?.spec;
      scene.hazardStrike(side, owner, { mega: event.mega });
      const card = side === 'player' ? playerCard : enemyCard;
      card.classList.remove('is-hit');
      void card.offsetWidth;
      card.classList.add('is-hit');
      if (event.mega) {
        scene.fx.banner = spec?.megaBanner || 'DIRECT HIT!';
        scene.fx.bannerTimer = 1500;
        play('thunder');
        play('hit');
        const took = `${event.damage} ${event.damage === 1 ? 'life' : 'lives'}`;
        setCallout(
          side === 'player'
            ? `The ${spec?.label.toLowerCase() || 'rift'} fires — ${took} at once`
            : `Your ${spec?.label.toLowerCase() || 'rift'} fires — ${took} at once`,
          side === 'player' ? 'is-bad' : 'is-good',
        );
      } else {
        play('hit');
      }
      if (event.steal && side === 'player') {
        toast('The blast knocked a round out of your gun', 'bad');
      }
      syncBars();
    }

    /**
     * THE TOTEM, IN THE MIDDLE OF A FIGHT
     * -----------------------------------------------------------------------
     * The engine has already put the lives back (see `damage` in
     * src/duel/duel-engine.js) — what is left to do here is the part that is
     * worth watching, and then taking the totem out of the bag.
     *
     * The hazard clock is stopped for the duration and the buttons go dead:
     * the scene takes as long as the player takes to press it three times, and
     * a volcano counting down behind a black screen would be a rock landing on
     * somebody who could not see it coming. The fight is exactly where it was
     * when the black lifts, except that you are standing up in it.
     */
    function runTotem() {
      // Already up: hand back the SAME promise. The scene can be started from
      // two places — the end of the round that killed you, and the frame loop
      // when a hazard did it mid-animation — and if the second one wins the
      // race, the round loop has to wait on the scene that is already playing
      // rather than deciding there is nothing to wait for and carrying on
      // behind a black screen.
      if (totemScene) return totemScene;
      if (!totemPending || finished) return null;
      totemPending = false;
      totemPlaying = true;
      totemScene = playTotem();
      return totemScene;
    }

    async function playTotem() {
      const wasRunning = clockRunning;
      /**
       * When the scene starts from the frame loop, the engine is still parked
       * on an unresolved move — so whatever the controls were doing before has
       * to be exactly what they are doing after, or the fight has no way to
       * carry on.
       */
      const wasEnabled = !controls.classList.contains('is-waiting');
      clockRunning = false;
      closeBag();
      setControlsEnabled(false);
      scene.impact('player');
      scene.setPose('player', 'hit');

      await playTotemRevival();

      // The item leaves the bag now rather than when the engine spent it, so a
      // fight abandoned mid-scene cannot eat a legendary for nothing. A sandbox
      // fight plays the whole scene and keeps the totem: nothing that happens
      // in a made-up duel is allowed to cost the run a legendary.
      if (!sandbox) breakTotem();
      totemPlaying = false;
      if (finished) return;
      scene.setPose('player', 'idle');
      scene.fx.banner = 'YOU ARE UP';
      scene.fx.bannerTimer = 1200;
      setCallout('The totem is gone. You are not', 'is-good');
      syncBars();
      clockRunning = wasRunning;
      if (wasEnabled) setControlsEnabled(true);
    }

    /**
     * The real-time half of the fight, driven off the canvas frame loop.
     *
     * Everything else in this screen happens because somebody pressed
     * something. This does not: it runs while the player is reading the
     * buttons, while the saddlebag is open, and while nothing at all is
     * happening, which is the whole reason a special is worth having.
     */
    function onFrame(dt) {
      if (finished || !clockRunning) return;
      duel.tick(dt);
      // A rock off an erupting mountain can be the thing that kills you, and it
      // lands here rather than inside a round — so the scene has to be able to
      // start from here too. `runTotem` guards itself; the loop calling it a
      // moment later is a no-op.
      if (totemPending) runTotem();
      for (const entry of duel.getHazards()) {
        scene.setHazardState(entry.owner, entry.clock.getState());
        if (entry.owner === 'enemy') updateHazardChip(entry.clock);
      }
      // The player's is one eruption and gone; the engine drops it from its
      // list the moment it goes quiet, and the scene has to let go too or the
      // landmark stands there for the rest of the fight doing nothing.
      if (playerHazardUp && !duel.getHazards().some((h) => h.owner === 'player')) {
        playerHazardUp = false;
        scene.clearHazard('player');
      }
      /**
       * A rock can kill you while the engine is still waiting for a move. The
       * agent is holding an unresolved promise in that case, so hand it one —
       * the engine sees the duel is already over and comes back with a
       * terminal resolution instead of stalling on a dead player.
       */
      if (duel.isOver()) {
        closeBag();
        if (localAgent.isWaiting()) {
          setControlsEnabled(false);
          localAgent.submit(MOVES.SHIELD);
        }
      }
    }

    /**
     * The countdown over the fight.
     *
     * Dormant it reads seconds, because seconds is the thing worth hurrying
     * for. A charge special reads a PERCENTAGE instead once it starts winding
     * up: what the player needs from a rift is not "it is erupting" — it is
     * erupting for five seconds and nothing has happened yet — but how much of
     * that five seconds is left before three lives arrive in one piece.
     */
    function updateHazardChip(hz) {
      const phase = hz.getPhase();
      const label = hz.spec.label;
      const charge = hz.getState().charge ?? -1;
      const pct = charge >= 0 ? Math.min(100, Math.round(charge * 100)) : -1;
      /**
       * A charge special that has let go is in neither state the other five
       * have: the window is still open but the shot has been taken. It reads
       * FIRED for that half second, because "erupting" would be describing
       * something about to happen that already has.
       */
      const spent = pct < 0 && phase === 'active' && hz.getPattern() === 'charge';
      const key =
        phase === 'dormant'
          ? `d${hz.secondsToNext()}`
          : pct >= 0
            ? `c${Math.round(pct / 4)}`
            : spent
              ? 'fired'
              : phase;
      if (key === hazardChipKey) return;
      hazardChipKey = key;
      hazardChip.hidden = false;
      hazardChip.textContent =
        phase === 'dormant'
          ? `${label} · ${hz.secondsToNext()}s`
          : pct >= 0
            ? `${label} · CHARGING ${pct}%`
            : spent
              ? `${label} · FIRED`
              : phase === 'warning'
                ? `${label} · NOW`
                : `${label} · ERUPTING`;
      hazardChip.classList.toggle('is-erupting', phase !== 'dormant');
      const cost = specialDamage(hz.spec);
      hazardChip.dataset.tip = `${hz.spec.tip}. ${
        hz.getPattern() === 'charge' ? `${cost} lives in one shot` : `${cost} lives an eruption`
      }`;
    }

    /**
     * The round, played out.
     *
     * The beats are deliberately uneven. Both fighters go for their guns at the
     * same time — that is the draw, and it is the same length every round so
     * the player learns it. Then the shot: a flash, a tracer crossing the road,
     * and only after it lands does anyone lose a life. Lives used to drop on
     * the same frame the gun came out, which meant the bullet was a decoration
     * arriving after the fact.
     */
    async function animate(res) {
      /**
       * A RELOAD LOOKS LIKE A RELOAD NOW
       * -----------------------------------------------------------------------
       * Both of these used to play `aim`, which meant the round where a man
       * loaded his gun and the round where he pointed it at you were the same
       * four frames. In a game that is entirely about reading the other one,
       * that was the single worst thing on the screen.
       *
       * They still START the same — the reload's first two frames ARE the
       * draw's, because both moves begin with a man reaching for his gun (see
       * RELOAD_SEQUENCE in src/art/sprites-character.js) — and then the gun
       * goes up to be loaded instead of forward to be fired. The tell arrives
       * about two hundred milliseconds in, which is late enough to be a duel
       * and early enough to be a warning.
       *
       * A frozen fighter and one that spent its turn casting both just stand
       * there — the ice on the sprite and the particles say which is which.
       */
      const poseFor = (move) => {
        if (move === MOVES.SHIELD) return 'shield';
        if (move === MOVES.RELOAD) return 'reload';
        if (move === MOVES.SHOOT) return 'aim';
        return 'idle';
      };

      scene.setPose('player', poseFor(res.playerMove));
      scene.setPose('enemy', poseFor(res.enemyMove));
      /**
       * The rival's cylinder, out loud. The player's own reload already
       * sounded under their finger when they pressed the plate (`data-sfx` on
       * the move button), and the man across the road has never made a noise
       * doing it — which meant the one move you most want to hear him make was
       * the only silent thing in the fight.
       */
      if (res.enemyMove === MOVES.RELOAD) play('reload');

      if (res.playerMove) setCallout(t('{mine} vs {theirs}', { mine: t(moveWord(res.playerMove)), theirs: t(moveWord(res.enemyMove)) }));
      // Long enough for the four-frame draw to finish: the guns are up before
      // either of them can go off.
      await wait(DRAW_MS);

      if (res.playerFires || res.enemyFires) {
        if (res.playerFires) scene.fire('player');
        if (res.enemyFires) scene.fire('enemy');
        play('shot');
        // A single shot rocks the frame; a simultaneous trade rocks it harder.
        scene.fx.shake = res.playerFires && res.enemyFires ? 220 : 140;
        await wait(BULLET_MS);
      }
      if (res.playerDry || res.enemyDry) play('emptyGun');
      if (res.playerMisfired || res.enemyMisfired) toast('Wet powder — misfire!', 'bad');

      if (res.hits.player) {
        scene.impact('player');
        scene.setPose('player', 'hit');
        scene.fx.shake = 340;
        playerCard.classList.remove('is-hit');
        void playerCard.offsetWidth;
        playerCard.classList.add('is-hit');
        play('hit');
      }
      if (res.hits.enemy) {
        scene.impact('enemy');
        scene.setPose('enemy', 'hit');
        scene.fx.shake = 260;
        enemyCard.classList.remove('is-hit');
        void enemyCard.offsetWidth;
        enemyCard.classList.add('is-hit');
        play('hit');
      }

      syncBars();
      const [text, tone] = describe(res);
      setCallout(text, tone);
      await wait(res.hits.player || res.hits.enemy ? 640 : 400);
      scene.setPose('player', 'idle');
      scene.setPose('enemy', 'idle');
    }

    function moveWord(move) {
      if (move === MOVES.SHOOT) return 'Shoot';
      if (move === MOVES.SHIELD) return 'Shield';
      if (move === MOVES.RELOAD) return 'Reload';
      if (move === MOVES.ABILITY) return 'Ability';
      if (move === MOVES.FROZEN) return 'Frozen';
      return '—';
    }

    /**
     * One line for what just happened, most specific first.
     *
     * The order matters more than it used to: a round can now end with nobody
     * having fired because one of them was standing under two feet of ice, and
     * "Nothing doing" is the wrong thing to print at somebody who just lost a
     * turn to it.
     *
     * @returns {[string, string]} message and tone class
     */
    function describe(res) {
      if (res.terminatedBy === 'item') return ['That finished it', 'is-good'];
      if (res.terminatedBy === 'ability') return ['Caught by their trick!', 'is-bad'];
      if (res.terminatedBy === 'hazard') return ['The ground took you', 'is-bad'];
      if (res.hits.player && res.hits.enemy) return ['You both go down a life', 'is-bad'];
      if (res.bounced?.enemy) return ['Your mirror sent it back!', 'is-good'];
      if (res.bounced?.player) return ['Their mirror sent it back at you', 'is-bad'];
      if (res.hits.enemy) return ['You hit them!', 'is-good'];
      if (res.hits.player) return ['They hit you!', 'is-bad'];
      if (res.playerFrozen) return ['You are frozen solid', 'is-bad'];
      if (res.enemyFrozen) return ['They cannot move', 'is-good'];
      if (res.playerJammed) return ['Your gun will not fire', 'is-bad'];
      if (res.enemyJammed) return ['Their gun will not fire', 'is-good'];
      if (res.playerWide) return ['You could not see — wide', 'is-bad'];
      if (res.enemyWide) return ['They shot wide', 'is-good'];
      if (res.abilityBy === 'enemy') return ['They spent their turn on that', 'is-good'];
      if (res.abilityBy === 'player') return ['They scrambled for their belt', 'is-good'];
      if (res.playerDry) return ['Your gun is empty', 'is-bad'];
      if (res.playerMove === MOVES.SHOOT && res.enemyMove === MOVES.SHIELD) return ['Blocked — bullet wasted', ''];
      if (res.enemyMove === MOVES.SHOOT && res.playerMove === MOVES.SHIELD) return ['You blocked it', 'is-good'];
      if (res.playerMove === MOVES.RELOAD && res.enemyMove === MOVES.RELOAD) return ['You both reload', ''];
      return ['Nothing doing', ''];
    }

    // --- main loop ---------------------------------------------------------
    async function loop() {
      while (!finished) {
        // Nothing else in a round may start while the totem is on screen —
        // including the next round's "choose your move".
        if (totemPending || totemPlaying) await runTotem();
        if (finished) return;
        if (duel.isOver()) {
          await endDuel(duel.getResult());
          return;
        }

        // Between rounds is where the enemy can spend its special: raising a
        // volcano is two seconds of camera, and there is nowhere inside a
        // round to put them that does not interrupt a draw.
        const cast = duel.maybeCastSpecial();
        if (cast) {
          setControlsEnabled(false);
          await announceSpecial(cast);
          if (finished) return;
        }

        setControlsEnabled(true);
        setCallout('Choose your move', 'is-waiting');
        const res = await duel.playRound();
        if (finished) return;
        if (!res) {
          if (duel.isOver()) await endDuel(duel.getResult());
          return;
        }

        if (res.playerMove) {
          roundLog.push(res);
          if (aiAgent.observe) aiAgent.observe(res.playerMove);
        }
        await animate(res);
        // The bullet has arrived and the life it took is off the bar. THAT is
        // the moment the lights go out — see `runTotem`. `totemPlaying` is in
        // the condition because the frame loop may have started the scene
        // while this round was still being animated.
        if (totemPending || totemPlaying) await runTotem();
        if (finished) return;

        if (duel.isOver()) {
          const result = duel.getResult();
          if (result.winner === 'player' && enemy.isBoss) {
            const next = nextBossPhase(enemy);
            if (next) {
              enemy = next;
              // The new agent has to go into the engine, not just this closure.
              aiAgent = createAiAgent(enemy, modifiers, { thinkMs: 120 });
              duel.setEnemy(next, aiAgent);
              // …and the new art — and the new size — into the scene.
              scene.setEnemySprites(next.sprites);
              scene.setEnemyScale(next.scale || 1);
              // The fire he was carrying doubles. This is the moment the fight
              // gets serious and it has to look like it before the player has
              // taken a single round of the new phase.
              scene.setAura(next.aura || 0);
              enemyName.textContent = next.name;
              if (next.look) enemyName.dataset.tip = next.look;
              else delete enemyName.dataset.tip;
              renderAbilities();
              syncBars();
              // The card just changed height (a longer name, more icons), and
              // the new phase is bigger — both inputs to how tall he is drawn.
              requestAnimationFrame(syncHud);
              setCallout('They are not finished…', 'is-bad');
              // A held shot of the thing that just changed, then back out to
              // the fight. Two seconds, because the player has just won a
              // phase and is owed a look at what they have to do again.
              scene.lookAt({ side: 'enemy', x: 8, y: 5.5, fill: 11, ms: 420 });
              await wait(1400);
              scene.lookAt({ ms: 620 });
              await wait(700);
              continue;
            }
          }
          await endDuel(result);
          return;
        }
      }
    }

    async function endDuel(result) {
      finished = true;
      // The mountain stops caring the moment the fight is over. It is still
      // drawn — it is part of the road now — but it does not tick.
      clockRunning = false;
      closeBag();
      setControlsEnabled(false);
      syncAbilityBar();
      const won = result.winner === 'player';

      /**
       * SOMEBODY GOES DOWN BEFORE ANYBODY IS TOLD ANYTHING
       * ---------------------------------------------------------------------
       * The loser falls, and the screen waits for it. This used to be a banner
       * over a man still breathing in his idle loop: the bar hit zero, YOU WIN
       * went up, and the overview slid over the top of a fighter who was
       * visibly fine. The one thing a duel is about had no picture of itself.
       *
       * The fall is five frames off the rig (see FALL_FRAME_MS in
       * src/art/sprites-character.js), composed from that fighter's own head,
       * torso and legs — so the Sexton goes down as the Sexton and a wraith
       * goes down in its rags, without a line of art for either. The last frame
       * is a body flat on the road, and it HOLDS: it is still lying there under
       * the overview, and it is still lying there on the road afterwards (see
       * `fallenFoe` in src/game/run.js).
       */
      scene.setPose(won ? 'enemy' : 'player', 'fall');
      play(won ? 'win' : 'lose');
      scene.fx.banner = won ? 'YOU WIN' : 'YOU LOSE';
      scene.fx.bannerTimer = 1600;

      const sides = duel.getSides();
      // A sandbox fight is not written back at all — and it MUST not be, not
      // merely as a courtesy: `setLives(0)` is what fires GAME_OVER, so a
      // tester losing a made-up duel would erase the slot they were testing in.
      if (!sandbox) {
        setLives(sides.player.lives);
        // Whatever is left of the gold, and nothing is ever added back here:
        // the engine spends them, the run remembers what survived.
        setBonusLives(sides.player.bonus);
      }
      setCallout(won ? 'You win the duel' : 'You are down', won ? 'is-good' : 'is-bad');

      /**
       * The ledger hears about the fight HERE, not from `resolveDuel`.
       *
       * This is the only place that holds the whole shape of it at once — the
       * bar it started on, the bar it ended on, and the engine's round log —
       * and it is the moment the player is still watching the duel. Waiting
       * for the overview to be dismissed would put the notice a minute late,
       * over a screen that has nothing to do with what earned it.
       */
      // The ledger is not told about a fight that did not happen either. An
      // achievement earned in a sandbox is an achievement that was not earned.
      if (!sandbox) trackAchievement('duelEnded', {
        won,
        isBoss,
        worldId,
        rounds: roundLog.length,
        /**
         * THREE NUMBERS, NOT TWO, AND NONE OF THEM IS THE OVERVIEW'S
         * -------------------------------------------------------------------
         * The table below counts what a player wants to read after a fight.
         * The ledger has to count what actually left the barrel, and the
         * engine's round log says it in a way that is easy to get wrong twice:
         *
         *   `playerFires` is already `fired && !wide` — a shot thrown off by a
         *   blind is not in it at all, so a round that went wide would have
         *   quietly disappeared from a marksmanship record rather than ruining
         *   it. `playerWide` is the half that was missing.
         *
         *   `hits.enemy` is "the rival was hurt this round" by ANYTHING — a
         *   stick of dynamite landing, a round coming back off a mirror — and
         *   pairing it with `playerFires` is not enough to fix that, because a
         *   shot stopped by a shield in the same turn as your dynamite lands
         *   satisfies both halves. `shotHits.player` is the engine's answer to
         *   the only question this is asking: did YOUR bullet arrive.
         */
        shotsFired: roundLog.filter((r) => r.playerFires || r.playerWide).length,
        shotsWide: roundLog.filter((r) => r.playerWide).length,
        shotsLanded: roundLog.filter((r) => r.shotHits.player).length,
        livesLeft: sides.player.lives,
        tookDamage,
        abilitiesCast,
      });

      /**
       * Long enough for the whole fall plus a beat of the body lying still.
       * The old wait was 720ms of nothing; this is the same pause with
       * something in it.
       */
      await wait(FALL_MS + 260);
      showOverview(won, sides);
    }

    /**
     * The way out of a fight that was never on the road. It goes straight back
     * to the walk rather than through `finishEncounter`, because there is no
     * encounter to finish — the run controller never heard about this duel.
     */
    function goToRoad() {
      go('explore', { resume: true });
    }

    /** Battle overview: the round-by-round table from version 3. */
    function showOverview(won, sides) {
      const rows = roundLog.map((r) =>
        el('tr', {}, [
          el('td', { text: String(r.round) }),
          el('td', { class: `mv mv--${r.playerMove}`, text: labelFor(r.playerMove, r.playerDry) }),
          el('td', { class: `mv mv--${r.enemyMove}`, text: labelFor(r.enemyMove, r.enemyDry) }),
          el('td', { text: outcomeFor(r) }),
        ]),
      );

      const shotsFired = roundLog.filter((r) => r.playerFires).length;
      const hits = roundLog.filter((r) => r.hits.enemy).length;
      const accuracy = shotsFired ? Math.round((hits / shotsFired) * 100) : 0;

      const overlay = el('div.modal-backdrop', {}, [
        el('div.panel.modal.overview', { role: 'dialog', 'aria-label': 'Battle overview' }, [
          el('div', { class: `result-banner ${won ? 'is-win' : 'is-loss'}` }, [
            el('div.headline', { text: won ? 'Duel won' : 'Duel lost' }),
            el('div.muted', {
              text: t(sandbox ? '{name} · {rounds} rounds · sandbox' : '{name} · {rounds} rounds', { name: t(enemy.name), rounds: roundLog.length }),
            }),
          ]),
          el('div.stat-grid', {}, [
            statTile('Shots fired', shotsFired),
            statTile('Hits', hits),
            statTile('Accuracy', `${accuracy}%`),
            statTile('Lives left', sides.player.lives),
          ]),
          el('div.divider', { text: 'Round by round' }),
          el('div.overview-table-wrap', {}, [
            el('table.overview-table', {}, [
              el('thead', {}, [
                el('tr', {}, [
                  el('th', { text: '#' }),
                  el('th', { text: 'You' }),
                  el('th', { text: enemy.name }),
                  el('th', { text: 'Result' }),
                ]),
              ]),
              el('tbody', {}, rows),
            ]),
          ]),
          el('div.modal-footer', { style: { justifyContent: 'center' } }, [
            el('button.btn.btn--primary', {
              onclick: () => {
                overlay.remove();
                // A sandbox fight rejoins the road exactly where it left it:
                // the encounter counter is untouched, so the stop the player
                // was actually walking towards is still in front of them.
                if (sandbox) goToRoad();
                else resolveDuel({ won, enemy, isBoss, worldId });
              },
            }, [sandbox || won ? 'Back to the road' : 'Continue']),
          ]),
        ]),
      ]);
      document.getElementById('app').append(overlay);
      attachButtonSounds(overlay);
      overlay.querySelector('.btn--primary')?.focus();
    }

    function labelFor(move, dry) {
      if (!move) return '—';
      if (move === MOVES.FROZEN) return 'Frozen';
      if (move === MOVES.ABILITY) return 'Ability';
      if (move === MOVES.SHOOT) return dry ? 'Shoot (empty)' : 'Shoot';
      return move === MOVES.SHIELD ? 'Shield' : 'Reload';
    }

    function outcomeFor(r) {
      if (r.hits.player && r.hits.enemy) return 'Trade';
      if (r.bounced?.enemy || r.bounced?.player) return 'Mirrored';
      if (r.hits.enemy) return 'You hit';
      if (r.hits.player) return 'You were hit';
      if (r.playerFrozen || r.enemyFrozen) return 'Frozen';
      if (r.playerJammed || r.enemyJammed) return 'Jammed';
      if (r.playerWide || r.enemyWide) return 'Wide';
      if (r.playerMisfired || r.enemyMisfired) return 'Misfire';
      return '—';
    }

    /**
     * THE FIGHT DOES NOT START UNTIL THE ENTRANCE IS OVER
     * -----------------------------------------------------------------------
     * A boss with an `intro` gets a cut-scene (src/duel/boss-intro.js), and it
     * owns the canvas while it runs: the duel scene is not installed and the
     * round loop has not started, so there is nothing behind it to desync.
     * Everyone else — every ordinary duel, every other boss — takes the branch
     * that has always existed and is on the road one frame after mounting.
     *
     * The controls are disabled for the duration rather than hidden, because
     * the screen underneath is the screen the player is about to use and it
     * should already be there when the bars pull off.
     */
    /**
     * THE FIGHT IS ON SCREEN THE WHOLE TIME
     * -----------------------------------------------------------------------
     * The scene is installed before the entrance runs, not after it. The
     * cut-scene is not a different picture — it is this one, filmed: the
     * director moves the scene's own camera and both fighters are standing on
     * the road under every shot of it (src/duel/boss-intro.js).
     *
     * What is hidden is the interface, and only the interface. The round loop
     * has not started, so nothing behind the camera can desync; the controls
     * are disabled rather than removed, so the screen the player is about to
     * use is already there when the bars pull off.
     */
    /**
     * The duel is installed as the renderer WRAPPED, not bare.
     *
     * A world special runs on a clock, and a clock needs a heartbeat. The
     * canvas frame loop is the only one this screen has — and it is the right
     * one, because it is already the thing that stops when the tab does. The
     * wrapper is the whole of it: draw the scene, then give the engine the
     * same `dt` the scene just moved on.
     */
    setRenderer({
      update(dt, t) {
        scene.update(dt, t);
        onFrame(dt);
      },
      render(ctx, view, t) {
        scene.render(ctx, view, t);
      },
    });
    scene.setAura(enemy.aura || 0);

    let intro = null;
    (async () => {
      if (enemy.intro?.lines?.length) {
        setControlsEnabled(false);
        screen.classList.add('is-cinematic');
        intro = playBossIntro({
          scene,
          enemy,
          intro: enemy.intro,
          enemyPortrait: getPortrait(enemy.portrait),
          playerPortrait: getPortrait('gunslinger'),
        });
        await intro.promise;
        intro = null;
        screen.classList.remove('is-cinematic');
      }
      if (finished) return;
      // A cylinder that starts with rounds in it is the first thing a player
      // will notice and the last thing they will be able to explain, so the
      // meal that put them there says so on the way in.
      if (boon?.bullets) {
        toast(t('{label} — {bullets} rounds already loaded', { label: t(boon.label), bullets: boon.bullets }), 'good', 'reload');
      }
      // The hazard clock starts with the fight, not with the screen: a
      // cut-scene is not time the volcano gets to count.
      clockRunning = true;
      loop();
    })();

    return () => {
      finished = true;
      closeBag();
      intro?.skip();
      localAgent.cancel();
      unsubItemUsed();
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', syncHud);
    };
  },
};

/**
 * The two effects that are not abilities: the things the PLAYER is carrying.
 * Everything else — every themed trick, every world special — names its own
 * icon in src/game/world-abilities.js, so adding one never touches this file.
 */
const EFFECT_ICONS = {
  vest: 'vest',
  immune: 'diadem',
  duskTotem: 'duskTotem',
};

/** Kick the animation on one badge in a row, if that effect is showing. */
function flashEffect(row, effect) {
  const badge = row?.querySelector(`[data-effect="${effect}"]`);
  if (!badge) return;
  badge.classList.remove('is-firing');
  void badge.offsetWidth; // restart the animation
  badge.classList.add('is-firing');
}

/**
 * The rival's gun, as a chip: the revolver he is actually carrying and what one
 * of its rounds costs, in lives.
 *
 * The picture is the BAKED SPRITE rather than an interface icon — the same
 * canvas the scene draws in his hand, at the same finish and the same
 * silhouette — so the chip and the man across the road can never disagree
 * about what he brought. It is levelled rather than raised because that is the
 * pose the gun spends a fight in.
 */
function gunChip(damage) {
  const look = enemyGunLook(damage);
  const art = getRevolverSprites(look.finish, look.shape).level.sprite;
  const cost = Number(damage) || 0;
  const tip = `${look.name} — ${cost} ${cost === 1 ? 'life' : 'lives'} a shot`;
  return el('span.chip.chip--gun', { 'data-tip': tip, 'aria-label': tip }, [
    el('img.pixel.gun-chip-art', {
      src: art.toDataURL(),
      alt: '',
      'aria-hidden': 'true',
      draggable: 'false',
      // Sized off the sprite's own width so a longbarrel is drawn longer than
      // a sixgun instead of every gun being squeezed into one box.
      style: { height: '16px', width: `${Math.round((art.width / art.height) * 16)}px` },
    }),
    el('span', { text: t('{cost} a shot', { cost }) }),
  ]);
}

/**
 * One effect, as a framed pixel icon. The word it replaces is still carried by
 * `data-tip` and `aria-label`, so hovering explains it and a screen reader
 * reads it out — the icon replaces the *printed* label, not the information.
 */
function effectBadge(effect, { label, tone = '', count, iconName } = {}) {
  const ability = getAbility(effect);
  const name = label || ability.label || effect;
  const tip = ability.tip ? `${name} — ${ability.tip}` : name;
  return el('span.effect-badge', {
    class: tone,
    dataset: { effect },
    'data-tip': tip,
    role: 'img',
    'aria-label': tip,
  }, [
    icon(iconName || EFFECT_ICONS[effect] || ability.icon || 'skull', 1.15),
    count != null ? el('span.effect-count', { text: String(count) }) : null,
  ]);
}
