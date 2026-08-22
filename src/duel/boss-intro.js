/**
 * SHOOT! — The boss entrance.
 *
 * The last fight in the game used to start the way the first one does: a wipe,
 * two figures on a road, "Choose your move". Everything the journey had been
 * building towards arrived with less ceremony than a shop.
 *
 * IT IS THE FIGHT, FILMED
 * ---------------------------------------------------------------------------
 * The first version of this drew the boss's portrait on a black card and panned
 * around it. That is a menu with a face in it. What a western actually does —
 * and what this does now — is point a camera at the two men who are already
 * standing on the road: the duel scene is live from the first frame, both
 * fighters are in it, the weather is running, and the sequence is nothing but
 * *shots of it*.
 *
 * So there is no second renderer here and nothing of the scene is duplicated.
 * This file is a director. It moves `scene.lookAt(...)`, sets flags in
 * `scene.fx`, and hands lines to the speech box, and every pixel it produces
 * was going to be drawn anyway.
 *
 * THE SHOT LIST
 * ---------------------------------------------------------------------------
 *   1. CUT TO BLACK, and letterbox. Not a fade — a cut. The loudest thing a
 *      scene can do, and it costs nothing.
 *   2. THE EYES, OUT OF THE DARK. The camera is already inches from his face
 *      when the black lifts, over two and a half seconds, and his fire comes
 *      up with it.
 *   3. HE TALKS, and every line is a framing: eyes, the whole of him, a low
 *      angle. The player answers and the camera cuts to the player's face,
 *      because a conversation shot from one angle is a monologue.
 *   4. THE HANDS. A beat of silence on the player's holster, with a heartbeat
 *      under it. This is the shot the whole genre is built on.
 *   5. THE SLAM. Crash zoom onto the sockets, speed lines converging, impact
 *      frames, a shockwave, the name card along the top of the frame, and the
 *      camera pulling back out to the fight — which has already started.
 *
 * Every beat is skippable, and the whole thing is data: the lines and their
 * framings live on the boss in src/game/worlds.js. Give any boss an `intro`
 * and it gets an entrance.
 */

import { wait } from '../core/dom.js';
import { play } from '../core/audio.js';
import { createSpeech } from '../ui/dialogue.js';

/**
 * The framings, in the fighter's OWN source pixels.
 *
 * `fill` is how many of them span the height of the screen, so one number
 * frames the player and the Stranger identically even though he is drawn two
 * and a half times larger. `x`/`y` are the point held in the middle.
 */
const SHOTS = {
  /**
   * Every framing is measured against the rig's own anatomy, which is worth
   * writing down because getting it wrong is invisible in the code and obvious
   * on screen: a fighter is 24 source pixels tall, the HEAD is rows 0 to 10
   * with the eyes on row 5, the TORSO is rows 11 to 17, and the gun hand hangs
   * at about row 17. Two passes at this framed the collar and the belly.
   *
   * `bias` lifts the subject clear of the speech box — see `framing`.
   */
  /**
   * `x` is 7.5, not 8: the rig is sixteen pixels wide, so its centre line falls
   * BETWEEN pixels 7 and 8. Framing on 8 put every close-up half a source pixel
   * off centre, which is nothing at all until the camera is ten times in and it
   * is sixty pixels of the screen.
   */
  /** Two eyes and nothing else. */
  eyes: { x: 7.5, y: 5, fill: 6.5, bias: 0.2 },
  /** The head, filling the frame. */
  face: { x: 7.5, y: 5, fill: 12, bias: 0.16 },
  /** Head and shoulders. */
  bust: { x: 7.5, y: 8, fill: 20, bias: 0.14 },
  /** All of him, from below — the angle you look up at something from. */
  low: { x: 7.5, y: 12, fill: 28, bias: 0.1 },
  /** The gun hand, hanging over the holster. */
  hands: { x: 12, y: 17.5, fill: 9 },
  /** No camera at all: the road, and the two of them on it. */
  wide: null,
};

/**
 * @param {object} o
 * @param {object} o.scene the live duel scene — the director's whole stage
 * @param {object} o.enemy the boss, as built by `generateBoss`
 * @param {{lines: Array}} o.intro
 * @param {HTMLCanvasElement} [o.enemyPortrait] face for the speech box
 * @param {HTMLCanvasElement} [o.playerPortrait]
 * @returns {{promise: Promise<void>, skip: () => void}}
 */
export function playBossIntro({ scene, enemy, intro, enemyPortrait, playerPortrait }) {
  const speech = createSpeech();
  const faces = { enemy: enemyPortrait || null, player: playerPortrait || null };

  let skipped = false;
  let resolveDone;
  const promise = new Promise((resolve) => {
    resolveDone = resolve;
  });

  /** `wait`, but a skip ends the sequence rather than the current beat. */
  const beat = async (ms) => {
    if (skipped) return;
    await wait(ms);
  };

  /** Point the camera at a named framing. */
  function shoot(name, side, ms = 600) {
    const shot = SHOTS[name] ?? SHOTS.face;
    if (!shot) scene.lookAt({ ms });
    else scene.lookAt({ side, ...shot, ms });
  }

  /**
   * Run a value from `a` to `b` over `ms`, calling `set` each step. Used for
   * the veil coming off and the bars going on — anything the scene draws that
   * has no clock of its own.
   */
  async function ramp(ms, from, to, set) {
    const steps = Math.max(1, Math.round(ms / 40));
    for (let i = 0; i <= steps; i++) {
      if (skipped) return;
      set(from + (to - from) * (i / steps));
      await wait(ms / steps);
    }
  }

  async function run() {
    const { fx } = scene;

    // Let the scene lay itself out: the camera frames fighters, and it cannot
    // frame them until it has drawn them once.
    await beat(60);
    if (skipped) return;

    // --- 1. cut to black ---
    fx.veil = 1;
    fx.hint = true;
    play('heartbeat');
    await beat(360);
    if (skipped) return;

    await ramp(220, 0, 0.12, (v) => {
      fx.bars = v;
    });
    play('heartbeat');

    /**
     * --- 2. the road, out of the dark ---
     *
     * The wide shot comes FIRST, and it took a rewrite to learn why. The first
     * cut of this opened on his eyes at eight times their size, and what the
     * player actually saw was a black screen with two lights on it: his face
     * is a hole in a hood, so the tightest shot in the sequence carries the
     * least information in the game.
     *
     * A western establishes. You see the place, you see the two men standing
     * in it, and only then does the camera start walking towards one of them —
     * so that when it arrives at the eyes, twenty seconds later, they are the
     * eyes of something you have already been introduced to.
     */
    scene.lookAt({ ms: 0 });
    // His fire lights as the dark lifts, so the first thing that resolves out
    // of the black is that the far figure is burning.
    scene.setAura(enemy.aura || 1);
    play('rumble');
    ramp(2600, 1, 0, (v) => {
      fx.veil = v;
    });
    await beat(1500);
    if (skipped) return;
    // Then the camera starts moving, slowly, before anybody has spoken.
    scene.lookAt({ side: 'enemy', ...SHOTS.low, ms: 2600 });
    await beat(1100);

    // --- 3. the lines ---
    for (const line of intro.lines || []) {
      if (skipped) return;
      const who = line.who === 'player' ? 'player' : 'enemy';
      shoot(line.shot || 'face', who, line.cut ? 0 : 520);
      if (line.shake) {
        fx.shake = line.shake;
        play('toll');
      }
      if (line.rumble) play('rumble');
      await speech.say({
        text: line.text,
        name: who === 'player' ? 'You' : enemy.name,
        portrait: faces[who],
        side: who,
      });
      if (skipped) return;
    }
    speech.hide();

    /**
     * --- 4. the hands ---
     *
     * One beat of silence on the player's gun hand, and one on the thing
     * across the road from it. The enemy's is his EYES rather than his hand,
     * because the Stranger carries no holster — a close-up of where his gun
     * would be is a close-up of a hem.
     */
    if (skipped) return;
    shoot('hands', 'player', 0);
    play('heartbeat');
    await beat(620);
    if (skipped) return;
    shoot('eyes', 'enemy', 0);
    play('heartbeat');
    await beat(620);

    // --- 5. the slam ---
    if (skipped) return;
    shoot('face', 'enemy', 0);
    fx.rays = 1;
    fx.shake = 900;
    play('rumble');
    scene.lookAt({ side: 'enemy', ...SHOTS.eyes, fill: 4.5, bias: 0, ms: 420 });
    await beat(420);
    if (skipped) return;

    fx.slam = 240;
    fx.ring = 0;
    fx.card = { text: enemy.name || '', sub: enemy.cardSub || null, t: 0 };
    play('thunder');
    play('toll');
    await beat(1500);

    // --- 6. out, into the fight ---
    if (skipped) return;
    scene.lookAt({ ms: 700 });
    await ramp(420, 0.12, 0, (v) => {
      fx.bars = v;
      if (fx.card) fx.card.t = Math.max(0, v / 0.12);
    });
    fx.card = null;
    fx.hint = false;
    finish();
  }

  function finish() {
    if (skipped) return;
    skipped = true;
    cleanup();
    resolveDone();
  }

  /** End it now: the player has seen enough, or the screen is going away. */
  function skip() {
    if (skipped) return;
    skipped = true;
    cleanup();
    resolveDone();
  }

  /**
   * Put the stage back exactly as it was found. This runs on the skip path as
   * well as the finish path, which is the whole reason it is one function: a
   * cut-scene abandoned halfway must not leave the fight letterboxed, in the
   * dark, and looking at somebody's eyebrow.
   */
  function cleanup() {
    window.removeEventListener('keydown', onKey);
    speech.dispose();
    const { fx } = scene;
    fx.veil = 0;
    fx.bars = 0;
    fx.hint = false;
    fx.card = null;
    fx.rays = 0;
    fx.ring = -1;
    fx.slam = 0;
    scene.resetCamera();
  }

  const onKey = (e) => {
    if (e.key === 'Escape') skip();
  };
  window.addEventListener('keydown', onKey);

  run().catch(() => skip());

  return { promise, skip };
}
