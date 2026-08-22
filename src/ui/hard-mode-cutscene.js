/**
 * SHOOT! — "THE ROAD IS NOT FINISHED WITH YOU".
 *
 * The second cut-scene in the game, and the only one that plays after a fight
 * rather than before it. The Stranger has gone down, the galaxy is still
 * burning behind the screen, and before the victory card goes up the frame cuts
 * to black and tells the player what beating the game has just opened.
 *
 * IT IS THE BOSS ENTRANCE, PLAYED BACKWARDS
 * ---------------------------------------------------------------------------
 * `src/duel/boss-intro.js` is a director pointed at a live duel: it cuts to
 * black, letterboxes, holds on a face, and ends by slamming a name card up and
 * pulling out into the fight. This is the same grammar with nothing to point a
 * camera at — the fight is over — so it borrows the two beats that carry the
 * genre on their own and builds the rest out of type:
 *
 *   1. THE CUT. Black, instantly, and the bars close over it. Not a fade. The
 *      loudest thing a frame can do and it costs one fill.
 *   2. THE LINES. Three of them, one at a time, each held long enough to be
 *      read twice. They are written as the road talking about itself rather
 *      than as a menu explaining a feature — nobody has ever been moved by
 *      "difficulty setting unlocked".
 *   3. THE SLAM. The card lands: HARD, and under it what it is. Speed lines
 *      converge on it, the frame kicks, the bell tolls, and the embers that
 *      have been building the whole time go up all at once.
 *   4. THE PROMISE. The four lines of what actually changes, and the one line
 *      about what is waiting at the end of it, which is the reason to walk it.
 *
 * EVERY PIXEL OF IT IS THE SAME PIXEL AS EVERYTHING ELSE
 * ---------------------------------------------------------------------------
 * The embers are the outfit's embers: `createEmberAura` from
 * src/art/ember-aura.js, the emitter that will be burning on the shoulders of
 * the thing this scene is announcing. That is deliberate — the player meets the
 * effect here, ten minutes before they can wear it, and the recognition is the
 * whole point of putting the same emitter in both places rather than drawing
 * two fires that look similar.
 *
 * WHAT IT DOES NOT DO
 * ---------------------------------------------------------------------------
 * Nothing. Exactly like the totem (src/ui/totem.js), it is a black rectangle
 * nailed over whatever was underneath and a promise that resolves when it is
 * over. The unlock is already written by the time this is called — see
 * `finishGame` in src/game/run.js — so a player who closes the tab halfway
 * through still has the road.
 */

import { el } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { play } from '../core/audio.js';
import { crisp } from '../art/pixel.js';
import { PALETTE } from '../art/palette.js';
import { getSettings } from '../core/settings.js';
import { createEmberAura } from '../art/ember-aura.js';
import { difficultyInfo } from '../game/difficulty.js';

/**
 * THE BEAT SHEET, IN REAL MILLISECONDS FROM THE CUT
 * ---------------------------------------------------------------------------
 * Written as absolute marks rather than as durations because that is how it is
 * read back: every question anybody asks of this file is "what is on screen at
 * four seconds", and a list of durations answers it with arithmetic.
 *
 * The whole thing runs about seventeen seconds if nobody touches it, which is
 * long for a cut-scene and right for this one — it is the last thing between
 * the player and the end of a game they have been losing runs to for weeks, and
 * it is skippable from the first frame.
 */
const BEATS = {
  /** Black, bars closing. */
  cut: 0,
  /** The three lines, one at a time. */
  lines: [1400, 4600, 7800],
  /** The card: HARD. */
  slam: 11000,
  /** What changes, and what is waiting. */
  terms: 13200,
  /** The prompt, and the earliest the scene will end on its own. */
  prompt: 15000,
  end: 19000,
};

/**
 * The three lines before the card.
 *
 * The first says the journey was real. The second says it was not the whole of
 * it. The third is the invitation, and it is the only one with a second person
 * in it — everything before it is about the road, and the turn to "you" is what
 * makes the card that follows an offer rather than an announcement.
 */
const LINES = [
  'Seven worlds. Every one of them behind you.',
  'The Stranger laid that road out easy, and you still nearly died on it.',
  'There is another one under it. Nobody has walked that one.',
];

/** How long a line takes to type itself in, per character. */
const TYPE_MS = 26;

/**
 * Play the announcement.
 *
 * @returns {Promise<void>} resolves when the frame has lifted. Never rejects —
 *   a cut-scene that can fail is a cut-scene that can strand the player between
 *   the last boss and the victory card.
 */
export function playHardModeUnlock() {
  return new Promise((resolve) => {
    const hard = difficultyInfo('hard');

    const canvas = el('canvas.cutscene-canvas');
    const lineNode = el('div.cutscene-line', { 'aria-live': 'polite' });
    const cardTitle = el('div.cutscene-card-title', { text: 'HARD' });
    const cardSub = el('div.cutscene-card-sub', { text: 'THE ROAD, WITH NOTHING ON YOUR SIDE' });
    const card = el('div.cutscene-card', {}, [cardTitle, cardSub]);
    const terms = el('ul.cutscene-terms', {}, hard.changes.map((line) => el('li', { text: line })));
    /**
     * The reason to walk it. It is a separate node from the list above because
     * it is the opposite kind of sentence — everything in that list is a cost,
     * and a card of nothing but costs is a card nobody accepts.
     */
    const prize = el('div.cutscene-prize', {
      text: 'Finish it and the Ember Reaver is yours — the coat, the tack, and the fire on both.',
    });
    const prompt = el('div.cutscene-prompt', { text: 'Click to ride on' });

    const veil = el('div.cutscene-veil', {
      role: 'dialog',
      'aria-label': 'Hard mode unlocked',
    }, [
      canvas,
      el('div.cutscene-bar.is-top'),
      el('div.cutscene-bar.is-bottom'),
      el('div.cutscene-stage', {}, [lineNode, card, terms, prize]),
      prompt,
    ]);
    (document.getElementById('app') || document.body).append(veil);

    const ctx = canvas.getContext('2d');
    const view = { w: 0, h: 0, dpr: 1 };
    const shakeEnabled = getSettings().screenShake;

    /**
     * The fire that is being announced, running from the first frame at a
     * fraction of its strength and opened all the way up on the slam. It is
     * anchored to the middle of the frame rather than to a figure, because
     * there is no figure — this is the one place the emitter is asked to burn
     * around a rectangle of empty air, which it does perfectly well.
     */
    const embers = createEmberAura({ intensity: 0.35 });

    const st = {
      wall: 0,
      lineIndex: -1,
      /** How much of the current line has been typed. */
      typed: 0,
      shakeMs: 0,
      flash: 0,
      /** 0 → 1 as the bars close, and the rays' strength after the slam. */
      bars: 0,
      rays: 0,
      slammed: false,
      done: false,
    };

    function resize() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const rect = veil.getBoundingClientRect();
      view.w = Math.max(1, Math.round(rect.width));
      view.h = Math.max(1, Math.round(rect.height));
      view.dpr = dpr;
      canvas.width = Math.round(view.w * dpr);
      canvas.height = Math.round(view.h * dpr);
      crisp(ctx);
    }
    resize();
    window.addEventListener('resize', resize);

    // --- input ---------------------------------------------------------------

    /**
     * SKIPPABLE FROM THE FIRST FRAME, AND IT IS NOT A COMPROMISE
     * -------------------------------------------------------------------------
     * The boss entrance is skippable with Escape for the same reason: a player
     * on their fourth clear does not need to be told about hard mode a fourth
     * time, and a cut-scene that holds somebody hostage is a cut-scene they
     * come to resent on the run where they were about to be told something.
     * The first click ends it. There is no two-stage "press again".
     */
    function dismiss() {
      if (st.done) return;
      st.done = true;
      veil.classList.add('is-leaving');
      setTimeout(cleanup, 320);
    }

    const onKey = (e) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        dismiss();
      }
    };
    veil.addEventListener('pointerdown', dismiss);
    window.addEventListener('keydown', onKey);

    // --- the beats -----------------------------------------------------------

    function showLine(index) {
      if (index === st.lineIndex) return;
      st.lineIndex = index;
      st.typed = 0;
      lineNode.classList.add('is-shown');
      play('heartbeat');
    }

    function slam() {
      if (st.slammed) return;
      st.slammed = true;
      st.rays = 1;
      st.flash = 1;
      st.shakeMs = 900;
      lineNode.classList.remove('is-shown');
      card.classList.add('is-shown');
      embers.setIntensity(1);
      embers.burst(70);
      play('thunder');
      play('toll');
    }

    function step(dt) {
      const t = st.wall;

      // The bars close over the first half second and stay closed.
      st.bars = Math.min(1, t / 460);

      if (!st.slammed) {
        let showing = -1;
        for (let i = 0; i < LINES.length; i++) if (t >= BEATS.lines[i]) showing = i;
        if (showing >= 0) showLine(showing);
        if (st.lineIndex >= 0) {
          // Translated before it is sliced — see the note in src/ui/dialogue.js.
          const text = t(LINES[st.lineIndex]);
          const chars = Math.min(text.length, Math.floor((t - BEATS.lines[st.lineIndex]) / TYPE_MS));
          if (chars !== st.typed) {
            st.typed = chars;
            lineNode.textContent = text.slice(0, chars);
            // One tick every other character, so a line reads as somebody
            // speaking rather than as a fax machine. Same rule as the speech
            // box — see the note on the `type` cue in src/core/audio.js.
            if (chars % 2 === 0 && chars < text.length) play('type');
          }
        }
      }

      if (t >= BEATS.slam) slam();
      if (t >= BEATS.terms) {
        terms.classList.add('is-shown');
        prize.classList.add('is-shown');
      }
      if (t >= BEATS.prompt) prompt.classList.add('is-shown');
      if (t >= BEATS.end) dismiss();

      if (st.shakeMs > 0) st.shakeMs = Math.max(0, st.shakeMs - dt);
      if (st.flash > 0) st.flash = Math.max(0, st.flash - dt / 300);
      if (st.rays > 0) st.rays = Math.max(0, st.rays - dt / 1400);

      /**
       * The rectangle the fire clings to. There is no figure in this scene, so
       * it is the block of type in the middle of the frame — the card burns
       * the way the coat will, which is the whole reason this is the outfit's
       * own emitter rather than a second one that looks similar.
       */
      const w = Math.min(view.w * 0.8, 720);
      const h = view.h * 0.56;
      embers.update(dt, {
        x: (view.w - w) / 2,
        y: (view.h - h) / 2,
        w,
        h,
        unit: Math.max(2, Math.round(view.h / 200)),
      });
    }

    function draw() {
      ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
      ctx.clearRect(0, 0, view.w, view.h);
      crisp(ctx);

      let ox = 0;
      let oy = 0;
      if (shakeEnabled && st.shakeMs > 0) {
        const k = st.shakeMs / 90;
        ox = (Math.random() * 2 - 1) * k;
        oy = (Math.random() * 2 - 1) * k;
      }
      ctx.save();
      ctx.translate(ox, oy);

      /**
       * The heat behind the card. It is there from the first frame at almost
       * nothing and comes up with the slam, so the black the scene opens on is
       * not flat — a truly empty frame reads as a loading screen, and this one
       * is meant to read as a fire somebody is standing near.
       */
      const heat = 0.18 + st.rays * 0.5 + (st.slammed ? 0.22 : 0);
      const r = Math.max(view.w, view.h) * 0.7;
      const grad = ctx.createRadialGradient(view.w / 2, view.h / 2, 0, view.w / 2, view.h / 2, r);
      grad.addColorStop(0, hexA(PALETTE.redDeep, 0.55 * heat));
      grad.addColorStop(0.45, hexA(PALETTE.redDark, 0.22 * heat));
      grad.addColorStop(1, hexA(PALETTE.ink, 0));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, view.w, view.h);

      if (st.rays > 0) drawRays();
      embers.draw(ctx, 'back');
      embers.draw(ctx, 'front');

      ctx.restore();

      if (st.flash > 0) {
        ctx.fillStyle = PALETTE.redLight;
        ctx.globalAlpha = Math.min(1, st.flash) * 0.5;
        ctx.fillRect(0, 0, view.w, view.h);
        ctx.globalAlpha = 1;
      }
    }

    /**
     * Speed lines converging on the middle of the frame — the boss entrance's
     * `fx.rays`, in red, and drawn as whole rectangles so they sit on the same
     * grid as everything else in the game rather than being the one smooth
     * thing on a screen full of squares.
     */
    function drawRays() {
      const cx = view.w / 2;
      const cy = view.h / 2;
      const count = 44;
      ctx.fillStyle = PALETTE.red;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + st.wall / 4000;
        const inner = Math.min(view.w, view.h) * (0.3 + 0.14 * ((i * 7) % 5) / 5);
        const outer = Math.max(view.w, view.h) * 0.75;
        const step = Math.max(3, Math.round(view.h / 90));
        ctx.globalAlpha = st.rays * 0.28;
        for (let d = inner; d < outer; d += step * 2) {
          ctx.fillRect(
            Math.round(cx + Math.cos(a) * d),
            Math.round(cy + Math.sin(a) * d),
            step,
            step,
          );
        }
      }
      ctx.globalAlpha = 1;
    }

    // --- the loop ------------------------------------------------------------

    let raf = 0;
    let last = performance.now();
    const startedAt = last;

    function frame(now) {
      const dt = Math.min(64, Math.max(0, now - last));
      last = now;
      /**
       * Two clocks, for the reason spelled out in src/ui/totem.js: `dt` is
       * clamped so a dropped frame does not teleport the embers, and `wall` is
       * real time, because every beat above is a promise about how long the
       * player waits and a clamped clock breaks it on a slow machine.
       */
      st.wall = now - startedAt;
      step(dt);
      draw();
      veil.style.setProperty('--bars', String(st.bars));
      if (!st.done) raf = requestAnimationFrame(frame);
    }

    function cleanup() {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', onKey);
      veil.removeEventListener('pointerdown', dismiss);
      veil.remove();
      resolve();
    }

    play('rumble');
    raf = requestAnimationFrame(frame);
  });
}

/** `#rrggbb` plus an alpha, for the gradient stops. */
function hexA(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
