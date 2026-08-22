/**
 * SHOOT! — Run controller (Block 5b).
 *
 * The spine of the game loop. It owns the walk engine (which must survive the
 * screens coming and going), routes every encounter to its screen, applies the
 * rewards when an encounter ends, moves the player between worlds and writes
 * the save.
 *
 *   menu → slots → world intro → walk → encounter → walk → … → boss
 *        → next world (lives refilled) → … → Galaxy → 2-phase boss → victory
 *
 * Screens never talk to each other; they call into here.
 */

import { EVENTS, emit, on } from '../core/events.js';
import { t } from '../core/i18n.js';
import { go, resetStack } from '../core/router.js';
import { createWalkEngine } from '../explore/walk-engine.js';
import * as daynight from '../explore/daynight.js';
import * as weather from '../explore/weather.js';
import * as hunger from '../explore/hunger.js';
import * as scene from '../core/scene.js';
import {
  getState,
  newRun,
  restore as restorePlayer,
  serialize as serializePlayer,
  setWorld,
  advanceEncounter,
  fullHeal,
  addGold,
  addExp,
  breakTotem,
  spendBoonDuel,
} from './player.js';
import { getWorld, FINAL_WORLD } from './worlds.js';
import { writeSlot, deleteSlot } from './save.js';
import { goldForEnemy, expForEnemy } from './progression.js';
import { toast } from '../ui/toast.js';
import { playTotemRevival } from '../ui/totem.js';
import { bumpStat } from '../core/settings.js';
import { track as trackAchievement } from './achievements.js';
import { resetOverrides } from '../admin/overrides.js';
import { setOutfitOverride } from './wardrobe.js';
import {
  DEFAULT_DIFFICULTY,
  getDifficulty,
  setDifficulty,
  unlockHardMode,
} from './difficulty.js';
import { playHardModeUnlock } from '../ui/hard-mode-cutscene.js';

const run = {
  engine: null,
  slot: 1,
  /** Set while a duel is in progress so its result can be attributed. */
  pendingEnemy: null,
  started: false,
  /**
   * True from the moment a fight is routed to until it has been resolved. The
   * road can be left for the menu; a fight cannot. See `quitToMenu`.
   */
  inBattle: false,
  /**
   * Set once the run has died for good and its slot has been erased. Nothing
   * writes a save after this — see `save`.
   */
  dead: false,
};

export function getEngine() {
  return run.engine;
}

export function getSlot() {
  return run.slot;
}

// ---------------------------------------------------------------------------
// Starting / loading
// ---------------------------------------------------------------------------

/**
 * ANYTHING THE ADMIN PANEL BENT BELONGS TO THE RUN IT WAS BENT IN
 * ---------------------------------------------------------------------------
 * Overrides and the borrowed outfit are held in memory and never written to a
 * slot (see src/admin/overrides.js), so the only thing needed to keep a tester's
 * session from leaking into the next one is to put them back at both doors into
 * a run. It is called even when nothing was changed, because a reset that is
 * conditional is a reset somebody has to remember to check.
 */
function clearAdminState() {
  resetOverrides();
  setOutfitOverride(null);
}

/**
 * @param {number} slot
 * @param {object} [opts]
 * @param {'normal'|'hard'} [opts.difficulty] which road this slot walks. Picked
 *   once, here, and written into the save from the first frame — see the note
 *   at the bottom of src/game/difficulty.js.
 */
export async function startNewRun(slot, opts = {}) {
  run.slot = slot;
  run.dead = false;
  run.inBattle = false;
  clearAdminState();
  /**
   * BEFORE `newRun`, AND THAT ORDER IS LOAD-BEARING
   * -------------------------------------------------------------------------
   * The opening purse is a difficulty knob (`startingGold`), and a blank state
   * built before the road is set is a hard run that starts with the ordinary
   * road's gold in its pocket.
   */
  setDifficulty(opts.difficulty || DEFAULT_DIFFICULTY);
  newRun();
  daynight.reset(0.32);
  weather.force('clear');
  hunger.reset();
  run.engine = createWalkEngine();
  run.started = true;
  trackAchievement('runStarted', { slot, difficulty: getDifficulty() });
  resetStack();
  await beginWorld(1, { intro: true });
}

export async function loadRun(slot, data) {
  run.slot = slot;
  run.dead = false;
  run.inBattle = false;
  clearAdminState();
  // The road the slot was created on, before anything reads a price off it.
  setDifficulty(data.difficulty || DEFAULT_DIFFICULTY);
  restorePlayer(data.player);
  /**
   * Before a single step is taken. The ledger measures the road in
   * differences, and a save resumed a world deep would otherwise have its
   * whole journey counted again on the first frame of the walk — every time it
   * was loaded. It goes here rather than after the `completed` branch because
   * a finished run is still a run being picked up.
   */
  trackAchievement('runResumed', { distance: getState().distance });

  // A finished run has no road left to walk — every encounter of the Galaxy is
  // resolved. Continuing it replays the ending instead of stranding the player
  // on an empty segment.
  if (data.completed) {
    run.started = false;
    resetStack();
    // The ending card says which road was walked, and a finished slot is the
    // one place that answer has to come off the FILE rather than off the mode
    // — this run ended weeks ago and the game has been back to the menu since.
    await go('victory', { difficulty: data.difficulty });
    return;
  }

  daynight.restore(data.daynight);
  // The biome first: it decides which weathers are legal, and `restore` drops
  // any that this one cannot have.
  weather.setBiome(getWorld(getState().world).biome);
  weather.restore(data.weather);
  hunger.reset();
  run.engine = createWalkEngine();
  run.engine.loadSegment(getState().world, data.segmentSeed ?? getState().seed, {
    travelled: data.travelled ?? 0,
    cameraX: data.travelled ?? 0,
    encounterIndex: getState().encounterIndex,
    /**
     * Which kind each stop on this road turned out to be. The seed rebuilds
     * what the world was holding; the order it was dealt in was decided by how
     * the run was going, so it can only come back off the save. A file written
     * before the road adapted has none, and everything past the horizon is
     * simply dealt fresh — see `applyReveals`.
     */
    types: data.segmentTypes,
  });
  run.started = true;
  resetStack();
  await go('explore');
}

/** Enter a world: fresh segment, refilled lives, intro card. */
export async function beginWorld(worldId, opts = {}) {
  setWorld(worldId);
  fullHeal();
  const world = getWorld(worldId);
  const seed = (getState().seed + worldId * 7919) >>> 0;
  run.engine.loadSegment(worldId, seed);
  // Each world hands the weather its biome's table, then opens clear: the
  // first thing a player sees of a new place should be the place itself, not
  // whatever squall the last one happened to end on.
  weather.setBiome(world.biome);
  weather.force('clear');
  await save();
  if (opts.intro !== false) await go('worldIntro', { worldId, name: world.name, subtitle: world.subtitle });
  else await go('explore');
}

// ---------------------------------------------------------------------------
// Encounters
// ---------------------------------------------------------------------------

on(EVENTS.ENCOUNTER_REACHED, async (event) => {
  if (!run.started) return;
  if (event.type === 'shop') await go('shop', { encounter: event });
  else if (event.type === 'inn') await go('inn', { encounter: event });
  else if (event.type === 'forge') await go('forge', { encounter: event });
  else if (event.type === 'tailor') await go('tailor', { encounter: event });
  else {
    // A fight is the one place the run cannot be walked out of. The flag goes
    // up before the screen so the road's Menu button is already refusing by
    // the time the duel is on it.
    run.inBattle = true;
    await go('duel', { encounter: event, ...(event.type === 'boss' ? { isBoss: true } : {}) });
  }
});

on(EVENTS.GAME_OVER, async () => {
  if (!run.started) return;
  await die(getState().world);
});

/**
 * THE ROAD'S DEATH, REFUSED
 * ---------------------------------------------------------------------------
 * `loseLife` fires this instead of GAME_OVER when there is a Dusk Totem in the
 * bag (see src/game/player.js), and the only two deaths the road has are
 * starvation and a starvation tick that arrives while the gauge is still empty
 * — so this is very nearly always somebody who ran out of food between shops.
 *
 * The walk is stopped SYNCHRONOUSLY, before the first `await`: the emit is
 * dispatched from inside the walk loop's own frame, and a pause that waited for
 * the scene to finish would let the next starvation tick land behind a black
 * screen and end the run anyway. `breakTotem` gives back the lives AND the
 * gauge, which is what makes the rescue worth anything out here.
 */
on(EVENTS.TOTEM_TRIGGERED, async () => {
  if (!run.started) return;
  run.engine?.pause();
  /**
   * And the road stops being DRAWN, not just walked.
   *
   * The totem plays over a black veil, so everything underneath it is work
   * nobody can see — five layers of parallax, the weather and the traveller,
   * every frame, competing with the one animation the player is being asked to
   * tap on. The scene reads real time now rather than counting frames (see the
   * two clocks in src/ui/totem.js), so a slow frame rate no longer stretches
   * it; this is the other half of the same fix, and it is what makes the taps
   * land the moment they are offered.
   */
  scene.stop();
  await playTotemRevival();
  scene.start();
  breakTotem();
  toast('The totem broke instead of you', 'gold');
  await save();
  run.engine?.resume();
});

/**
 * Safety net. A segment normally ends with the boss duel, which routes the
 * world transition itself — but if the walker ever runs off the end of a
 * segment (a restored save, a hand-edited slot), move on rather than walking an
 * empty road forever.
 */
on(EVENTS.SEGMENT_CLEARED, async ({ worldId }) => {
  if (!run.started) return;
  if (worldId >= FINAL_WORLD) await finishGame();
  else await beginWorld(worldId + 1);
});

/**
 * THE END OF THE GAME, IN ONE PLACE
 * ---------------------------------------------------------------------------
 * There are two ways to reach it — the Stranger going down, and the safety net
 * above catching a walker who ran off the end of the last segment — and they
 * used to do the same five things in two copies. They do not any more, because
 * the fifth thing is new and easy to forget: the road you just finished may
 * have just unlocked the other one.
 *
 * THE ORDER MATTERS AND IT IS NOT THE OBVIOUS ONE
 * ---------------------------------------------------------------------------
 * The slot is written FIRST, before anything can be watched or awarded, because
 * a player who closes the tab during a cut-scene has still finished the game.
 * Then the ledger, so an unlock notice can land while the announcement plays.
 * Then the announcement itself, which is awaited — the victory card is the
 * curtain call and it does not go up over the top of the thing it follows.
 */
async function finishGame() {
  run.started = false;
  // Flagged as finished so the slot picker offers the ending rather than
  // dropping the player onto a segment with nothing left in it.
  await save({ completed: true });
  const difficulty = getDifficulty();
  emit(EVENTS.GAME_COMPLETED, { difficulty });

  /**
   * Beating the game is what opens the hard road, and the announcement plays
   * exactly once — `unlockHardMode` returns false every time after the first,
   * so a second and third clear go straight to the victory card. A run that was
   * ALREADY on the hard road cannot be the one that unlocks it, but it is
   * allowed to be the first clear a device has ever had (a slot started before
   * the lock existed, a profile that was reset), so this asks rather than
   * assuming.
   */
  const firstTime = await unlockHardMode();
  if (firstTime) await playHardModeUnlock();

  leaveRoad();
  await go('victory', { difficulty });
}

/**
 * Called by shop/inn/duel screens when the player is done with the encounter.
 * Advances the counter, saves and puts the player back on the road.
 */
export async function finishEncounter() {
  advanceEncounter();
  await save();
  await go('explore', { resume: true });
}

/**
 * Duel resolution — rewards, stats and the boss/world transition.
 *
 * `worldId` comes from the encounter that opened the fight rather than from the
 * player's current world, for the same reason the duel screen builds its enemy
 * that way: the segment that offered the fight is what the fight is worth.
 *
 * The achievement ledger is NOT told about the duel here. It is told the
 * moment the last shot lands (`endDuel` in src/duel/duel-screen.js), which is
 * both where the shape of the fight is known and where the player is still
 * looking at the fight — this runs when they dismiss the overview, which can
 * be a minute later.
 */
export async function resolveDuel({ won, enemy, isBoss, worldId: from }) {
  const worldId = from ?? getState().world;
  // However it went, it went: the fight is behind us and the menu is open
  // again before any of the branches below can route away from here.
  run.inBattle = false;
  // A boon is counted in fights, and this is the end of one however it went.
  spendBoonDuel();
  if (won) {
    /**
     * The purse is paid on what this rider would have carried on the ordinary
     * road, not on the bar that was actually in front of you — see `scaleLives`
     * in src/game/enemies.js. A kill is measured in riders, so paying out on the
     * bent total would have the hard road funding its own difficulty.
     */
    const paidOn = enemy.baseLives ?? enemy.maxLives;
    const gold = goldForEnemy({ worldId, lives: paidOn, isBoss });
    const exp = expForEnemy({ worldId, lives: paidOn, isBoss });
    addGold(gold);
    addExp(exp);
    getState().stats.duelsWon += 1;
    bumpStat('duelsWon');
    bumpStat('goldEarned', gold);
    toast(t('+{gold} gold · +{exp} exp', { gold, exp }), 'gold', 'coin');

    if (isBoss) {
      bumpStat('worldsCleared');
      advanceEncounter();
      if (worldId >= FINAL_WORLD) await finishGame();
      else await beginWorld(worldId + 1);
      return;
    }
  } else {
    getState().stats.duelsLost += 1;
    bumpStat('duelsLost');
    // Losing a duel means zero lives, and zero lives is the end of the run and
    // of the slot holding it. See `die`.
    await die(worldId);
    return;
  }
  await finishEncounter();
}

/**
 * THE RUN IS OVER AND SO IS THE SLOT
 * ---------------------------------------------------------------------------
 * There are exactly two ways to die out here — losing a duel, and a starvation
 * tick with no Dusk Totem in the bag — and both of them come through this.
 *
 * The slot is ERASED. It used to be kept: a loss deliberately skipped the save
 * so the file still held the state from before the fight, and "Continue" put
 * the player back on the road with the lives they had walked in with. That is
 * a game with no losing condition in it. Every duel in the last four worlds is
 * survivable by walking into it, dying, and walking into it again, and the
 * vest, the totem and the inn — three whole systems whose only job is to buy
 * you one more mistake — are worth nothing next to a free retry.
 *
 * So death is final and the file goes with it. The bargain the road offers is
 * the other half of it, and it is why LEAVING is still safe: quit from the
 * menu and the run is written exactly as it stands (`quitToMenu`), and it will
 * be there tomorrow. What you cannot do is leave a fight — the Menu button is
 * gone from the duel and `quitToMenu` refuses while `inBattle` is up — so the
 * choice of whether to risk the slot is made on the road, before the shooting,
 * which is where a choice belongs.
 */
async function die(worldId) {
  run.started = false;
  run.inBattle = false;
  run.dead = true;
  run.engine?.pause();
  const difficulty = getDifficulty();
  await deleteSlot(run.slot);
  leaveRoad();
  await go('gameOver', { world: worldId ?? getState().world, slot: run.slot, difficulty });
}

/**
 * Put the road back to the ordinary one on the way out of a run.
 *
 * Every door out of a run comes through here, for exactly the reason the Admin
 * Panel's overrides are cleared at every door IN (see `clearAdminState`): the
 * mode is module state, the wardrobe screen and the clothing shop both quote
 * prices, and a menu that is quietly charging hard-mode rates because the last
 * run happened to be one is a bug nobody would ever think to look for.
 */
function leaveRoad() {
  setDifficulty(DEFAULT_DIFFICULTY);
}

// ---------------------------------------------------------------------------
// Saving
// ---------------------------------------------------------------------------

/**
 * Write the current run to its slot.
 * @param {object} [extra] merged into the payload — `{ completed: true }` marks
 *   a finished run so it is never resumed as a road state.
 */
export async function save(extra = {}) {
  // A dead run has no slot left to write to, and re-creating one from the
  // state still sitting in memory would undo the erase.
  if (run.dead) return;
  if (!run.started && getState().lives <= 0) return;
  const engineState = run.engine ? run.engine.serialize() : {};
  await writeSlot(run.slot, {
    player: serializePlayer(),
    daynight: daynight.serialize(),
    weather: weather.serialize(),
    travelled: engineState.travelled ?? 0,
    segmentSeed: engineState.seed,
    segmentTypes: engineState.types ?? [],
    /**
     * Written on every save rather than only on the first, so a slot that was
     * somehow created without one still picks the right road up on the next
     * load. The game itself never moves it between the two doors into a run —
     * the only thing that can is the Admin Panel, and a tester who bends the
     * road and then writes the save has said what they meant.
     */
    difficulty: getDifficulty(),
    savedAt: Date.now(),
    ...extra,
  });
  emit(EVENTS.SAVE_WRITTEN, { slot: run.slot });
}

/**
 * Leave the run and go back to the menu, with everything written to the slot
 * first. This is the safe exit, and the only one — the road can be left at any
 * step of it, but a fight cannot: with the slot now on the table (see `die`),
 * quitting out of a duel that is going badly would be the free retry by
 * another door. The duel screen offers no way here; this refuses anyway,
 * because a rule worth having is worth being unable to route around.
 *
 * @returns {Promise<boolean>} false when the run stayed where it was
 */
export async function quitToMenu() {
  if (run.inBattle) {
    toast('You cannot walk out of a fight', 'bad');
    return false;
  }
  await save();
  run.started = false;
  if (run.engine) run.engine.pause();
  leaveRoad();
  resetStack();
  await go('title');
  return true;
}
