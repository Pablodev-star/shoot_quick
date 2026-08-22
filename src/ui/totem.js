/**
 * SHOOT! — The Dusk Totem breaking.
 *
 * The one scene in the game that plays INSTEAD of a game over, and the only
 * screen in it that is not a screen: no router, no panel, no saloon-door wipe.
 * It is a black rectangle nailed over the top of whatever you were doing, and
 * it is deliberately the plainest thing in the product, because everything it
 * has to say it says with one object in an empty frame.
 *
 * THE BEATS, AND WHY EACH ONE IS THE LENGTH IT IS
 * ---------------------------------------------------------------------------
 *   0ms      BLACK. Instantly, with no fade of any kind. You died — the frame
 *            does not get to ease you into it, and a tween here would read as
 *            a screen transition rather than as the lights going out.
 *   0-3000   Nothing. Three full seconds of it, which is a very long time on a
 *            screen with nothing on it, and that is the entire point: this is
 *            the pause where a run has ended, and the player is allowed to sit
 *            in it and start being sorry before anything argues.
 *   3000     The totem arrives, and THIS one is tweened — up out of the dark,
 *            over-shooting its size and settling, with its ember coming up
 *            behind it. It floats from here on: it is not standing anywhere.
 *   4200     One word at the bottom. TAP.
 *   tap 1    It grows, and it splits. A ring goes out, sparks come out of the
 *            split, chips of stone fall off it, and it takes a low hit.
 *   tap 2    The split opens. Same again, harder, and the stone starts to
 *            tremble on its own between taps.
 *   tap 3    The last one it survives: the fissure runs the whole carving with
 *            a white core, light comes out of it in beams, and it shakes like
 *            something holding pressure it cannot hold.
 *   tap 4    It breaks. The picture comes apart into shards that carry their
 *            own share of the cracks with them, the frame goes white, and the
 *            black lifts off whatever was underneath it all along.
 *
 * FOUR TAPS, NOT THREE, AND THE WORD NEVER CHANGES
 * ---------------------------------------------------------------------------
 * The prompt used to count down at the player — TAP, then AGAIN, then ONE MORE
 * — which told them exactly how much was left and turned the last hit into an
 * errand. It says TAP every time now, and the totem is the only thing that
 * reports progress: bigger, brighter, more broken, shaking harder. The player
 * finds out it was the last one by it being the last one.
 *
 * WHAT IT DOES NOT DO
 * ---------------------------------------------------------------------------
 * It does not touch the player, the run, the duel or the save. It resolves a
 * promise when the totem is in pieces and the caller decides what being alive
 * means where they are standing — `breakTotem()` on the road (src/game/run.js),
 * a life count the duel engine already restored in a fight
 * (src/duel/duel-screen.js). A cut-scene that also mutates the run is a
 * cut-scene that can only ever be played from one place.
 */

import { el } from '../core/dom.js';
import { play } from '../core/audio.js';
import { crisp } from '../art/pixel.js';
import { PALETTE } from '../art/palette.js';
import { getSettings } from '../core/settings.js';
import { t } from '../core/i18n.js';
import {
  TOTEM_W,
  TOTEM_H,
  CRACK_STAGES,
  composeTotem,
  shatterPieces,
  crackVents,
  chipFlakes,
} from '../art/sprites-totem.js';

/** The dark before anything happens. */
const DARK_MS = 3000;
/** The rise, and the beat after it before the prompt is offered. */
const RISE_MS = 900;
const PROMPT_MS = 1200;
/** How long the shards fly before the black lifts. */
const BREAK_MS = 2000;

/** How many taps it takes: one per crack overlay, then the one that breaks it. */
const TAPS_TO_BREAK = CRACK_STAGES + 1;

/**
 * How big the totem is at each stage, as a fraction of the frame's height.
 *
 * It starts smaller than it used to and ends larger, because there is one more
 * step in the sequence now and the growth is most of what the player reads as
 * progress. The gaps are even: every tap is worth the same amount of totem.
 */
const HEIGHT_STEPS = [0.38, 0.49, 0.59, 0.70];

/**
 * The word at the bottom, and it is the same word every time — see the note at
 * the top of the file. The final line replaces it only once there is nothing
 * left to tap.
 */
const PROMPT = 'TAP';

/**
 * Play the break.
 *
 * @param {object} [opts]
 * @param {string} [opts.title] the line printed once it is in pieces
 * @returns {Promise<void>} resolves after the last shard and the black lifting
 */
export function playTotemRevival(opts = {}) {
  return new Promise((resolve) => {
    const canvas = el('canvas.totem-canvas');
    const prompt = el('div.totem-prompt', { text: t(PROMPT), 'aria-live': 'polite' });
    const veil = el('div.totem-veil', {
      role: 'dialog',
      'aria-label': t('The dusk totem'),
    }, [canvas, prompt]);
    (document.getElementById('app') || document.body).append(veil);

    const ctx = canvas.getContext('2d');
    const view = { w: 0, h: 0, dpr: 1 };
    const shake = getSettings().screenShake;

    /**
     * `taps` is the state machine and there is nothing else to it: 0 through 3
     * are the whole totem and its three cracks, 4 is the break. `art` is
     * re-composed on each tap rather than layered every frame, so the shards can
     * be cut out of one finished picture.
     */
    const st = {
      t: 0,
      /** Real milliseconds since the black went up. See `frame`. */
      wall: 0,
      taps: 0,
      art: composeTotem(0),
      /** Eased towards the step above; the overshoot is what makes it land. */
      size: 0,
      sizeTo: HEIGHT_STEPS[0],
      /** A scale punch on the frame of a tap, decaying back to 1. */
      punch: 0,
      shakeMs: 0,
      flash: 0,
      breakAt: -1,
      pieces: null,
      /** Expanding rings, one per tap. */
      rings: [],
      /** Sparks thrown out of the fissure, and chips of stone falling off it. */
      sparks: [],
      flakes: [],
      motes: makeMotes(),
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

    // --- input -------------------------------------------------------------

    /** True once the totem is up and the prompt has been offered. */
    const ready = () =>
      st.wall >= DARK_MS + RISE_MS + PROMPT_MS && st.taps < TAPS_TO_BREAK && !st.done;

    function tap() {
      if (!ready()) return;
      st.taps += 1;
      const level = Math.min(CRACK_STAGES, st.taps);
      st.art = composeTotem(level);
      st.shakeMs = 220 + st.taps * 130;
      st.punch = 0.1 + st.taps * 0.035;
      st.rings.push({ r: 0, life: 0, ttl: 560 + st.taps * 90 });

      if (st.taps < TAPS_TO_BREAK) {
        st.sizeTo = HEIGHT_STEPS[st.taps];
        /**
         * The word takes the hit but never changes. Restarting the animation
         * needs the class off, a reflow, and the class back on — otherwise the
         * second tap looks like it missed.
         */
        prompt.classList.remove('is-struck');
        void prompt.offsetWidth;
        prompt.classList.add('is-struck');
        // Everything that leaves the stone comes out of a hole that is really
        // in it: see `crackVents` in src/art/sprites-totem.js.
        st.sparks.push(...makeSparks(level, 14 + st.taps * 8));
        st.flakes.push(...chipFlakes(level, 8 + st.taps * 4));
        st.flash = Math.min(0.5, 0.14 + st.taps * 0.08);
        play('hit');
        if (st.taps >= CRACK_STAGES) play('rumble');
        return;
      }

      // The break.
      st.breakAt = st.wall;
      st.flash = 1;
      st.pieces = shatterPieces(4, 7, Math.random);
      st.sparks.push(...makeSparks(CRACK_STAGES, 90));
      prompt.textContent = t(opts.title || 'IT BREAKS INSTEAD OF YOU');
      prompt.classList.add('is-final');
      play('toll');
      play('levelUp');
    }

    const onKey = (e) => {
      if (e.key === 'Escape') return; // there is no skipping this one
      e.preventDefault();
      tap();
    };
    veil.addEventListener('pointerdown', tap);
    window.addEventListener('keydown', onKey);

    // --- the loop ----------------------------------------------------------

    let raf = 0;
    let last = performance.now();
    const startedAt = last;

    function frame(now) {
      const dt = Math.min(64, Math.max(0, now - last));
      last = now;
      /**
       * TWO CLOCKS, AND THE DIFFERENCE BETWEEN THEM IS A BUG THAT SHIPPED
       * -------------------------------------------------------------------
       * `st.t` is animation time: a clamped dt, because a frame that took a
       * quarter of a second must not teleport the shards across the screen.
       * `st.wall` is real time since the lights went out, and it is what every
       * BEAT of the scene is measured against — the dark, the rise, the prompt
       * and whether a tap counts yet.
       *
       * They used to be the same clock, and on a slow frame rate the clamp
       * meant the scene ran in slow motion against the player's own thumb:
       * measured on the road, where the parallax and the weather are still
       * being drawn underneath, the totem accepted its first tap around ten
       * seconds after it appeared instead of five. The player taps, nothing
       * happens, and the one screen in the game that exists to say "you are
       * still alive" reads as a freeze.
       */
      st.t += dt;
      st.wall = now - startedAt;

      step(dt);
      draw();

      if (st.done) {
        cleanup();
        return;
      }
      raf = requestAnimationFrame(frame);
    }

    function step(dt) {
      // The size chases its target rather than snapping to it, which is what
      // makes a tap feel like it landed on something with weight in it.
      st.size += (st.sizeTo - st.size) * Math.min(1, dt / 90);
      if (st.punch > 0) st.punch = Math.max(0, st.punch - dt / 220);
      if (st.shakeMs > 0) st.shakeMs = Math.max(0, st.shakeMs - dt);
      if (st.flash > 0) st.flash = Math.max(0, st.flash - dt / 260);

      for (const m of st.motes) {
        m.a += m.speed * dt;
        m.life += dt;
      }

      // Rings, sparks and chips all die the same way: age past their span and
      // get filtered out, so nothing here needs a timer of its own.
      for (const ring of st.rings) ring.life += dt;
      st.rings = st.rings.filter((ring) => ring.life < ring.ttl);

      for (const s of st.sparks) {
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.vy += 0.00004 * dt;
        s.life += dt;
      }
      st.sparks = st.sparks.filter((s) => s.life < s.ttl);

      for (const f of st.flakes) {
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        f.vy += 0.00009 * dt; // heavier than a spark: it is a piece of the totem
        f.life += dt;
      }
      st.flakes = st.flakes.filter((f) => f.life < f.ttl);

      if (st.pieces) {
        for (const p of st.pieces) {
          p.x = (p.x || 0) + p.vx * dt;
          p.y = (p.y || 0) + p.vy * dt;
          p.vy += 0.00006 * dt; // gravity, in source pixels per ms²
          p.rot += p.vr * dt;
        }
        // The veil fades with the shards rather than after them: the last
        // thing on screen should be the game coming back, not an empty frame.
        const since = st.wall - st.breakAt;
        if (since > BREAK_MS * 0.5) {
          veil.style.opacity = String(Math.max(0, 1 - (since - BREAK_MS * 0.5) / (BREAK_MS * 0.5)));
        }
        if (since >= BREAK_MS) st.done = true;
      }
    }

    function draw() {
      ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
      ctx.clearRect(0, 0, view.w, view.h);
      crisp(ctx);

      const appear = clamp01((st.wall - DARK_MS) / RISE_MS);
      if (appear <= 0) return;

      const cx = view.w / 2;
      const cy = view.h * 0.46;

      // The whole picture shakes, which is cheaper and reads better than
      // shaking the totem inside a still frame.
      let ox = 0;
      let oy = 0;
      if (shake) {
        /**
         * TWO SHAKES, AND ONLY ONE OF THEM IS A HIT
         * -----------------------------------------------------------------
         * `shakeMs` is the blow: big, and gone in a fifth of a second. The
         * tremble underneath it is the totem's own, it never stops once the
         * stone is cracked, and it gets worse with every split — which is how
         * the frame says "this thing is about to go" without a word of type.
         */
        const hit = st.shakeMs > 0 ? st.shakeMs / 8 : 0;
        const tremble = st.pieces ? 0 : st.taps * 0.5;
        const k = hit + tremble;
        if (k > 0) {
          ox = (Math.random() * 2 - 1) * k;
          oy = (Math.random() * 2 - 1) * k;
        }
      }

      // Height in CSS pixels, quantised to whole source pixels so the carving
      // never lands on a fractional scale and turns to mush.
      const rise = easeOutBack(appear);
      const targetH = view.h * st.size * (0.55 + 0.45 * rise) * (1 + st.punch);
      const scale = Math.max(1, Math.round(targetH / TOTEM_H));
      const w = TOTEM_W * scale;
      const h = TOTEM_H * scale;
      const bob = Math.sin(st.t / 620) * scale * 0.9;
      const x = Math.round(cx - w / 2 + ox);
      const y = Math.round(cy - h / 2 + bob + (1 - rise) * view.h * 0.12 + oy);

      ctx.globalAlpha = appear;
      drawGlow(cx + ox, cy + bob + oy, h, appear);
      drawRings(cx + ox, cy + bob + oy, h, appear);
      drawMotes(cx + ox, cy + bob + oy, h, appear);
      if (!st.pieces && st.taps >= CRACK_STAGES) drawBeams(x, y, scale, appear);

      if (st.pieces) drawShards(x, y, scale);
      else ctx.drawImage(st.art, x, y, w, h);

      drawFlakes(x, y, scale, appear);
      drawSparks(x, y, scale, appear);

      ctx.globalAlpha = 1;
      if (st.flash > 0) {
        ctx.fillStyle = PALETTE.white;
        ctx.globalAlpha = Math.min(1, st.flash) * 0.92;
        ctx.fillRect(0, 0, view.w, view.h);
        ctx.globalAlpha = 1;
      }
    }

    /** The ember behind it, brighter with every crack. */
    function drawGlow(cx, cy, h, alpha) {
      const heat = 0.55 + st.taps * 0.26 + Math.sin(st.t / 380) * 0.06;
      const r = h * (0.85 + st.taps * 0.13);
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, hexA(PALETTE.emberGlow, 0.62 * heat * alpha));
      grad.addColorStop(0.35, hexA(PALETTE.magma, 0.3 * heat * alpha));
      grad.addColorStop(1, hexA(PALETTE.cosmic, 0));
      ctx.fillStyle = grad;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    }

    /**
     * The blow going out through the air.
     *
     * A tap needs somewhere to go that is not the totem, or the only thing that
     * reports the hit is the shake — and a shake with nothing in it reads as a
     * dropped frame. The ring is one thin ellipse, wider than it is tall
     * because the scene is looking at the totem side-on, and it is gone before
     * the player has finished registering it.
     */
    function drawRings(cx, cy, h, alpha) {
      for (const ring of st.rings) {
        const p = ring.life / ring.ttl;
        const r = h * (0.24 + p * 0.95);
        ctx.strokeStyle = hexA(PALETTE.emberGlow, (1 - p) * 0.5 * alpha);
        ctx.lineWidth = Math.max(1, h * 0.012 * (1 - p));
        ctx.beginPath();
        ctx.ellipse(cx, cy, r, r * 0.42, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    /** Dust turning around it, so the dark is not empty while it floats. */
    function drawMotes(cx, cy, h, alpha) {
      ctx.fillStyle = PALETTE.emberGlow;
      for (const m of st.motes) {
        const r = h * m.radius;
        const px = cx + Math.cos(m.a) * r;
        const py = cy + Math.sin(m.a) * r * 0.55 + Math.sin(st.t / 900 + m.a) * h * 0.03;
        const size = Math.max(1, Math.round(h * 0.012 * m.size));
        ctx.globalAlpha = alpha * (0.25 + 0.45 * (0.5 + 0.5 * Math.sin(m.life / 320)));
        ctx.fillRect(Math.round(px), Math.round(py), size, size);
      }
      ctx.globalAlpha = alpha;
    }

    /**
     * Light leaving the fissure sideways, once the crack goes all the way down.
     *
     * Only on the last stage before the break, and only from the hottest vents:
     * a beam out of every hole would fog the carving, and the point of the
     * final stage is that the stone can no longer contain what is inside it.
     */
    function drawBeams(x, y, scale, alpha) {
      const vents = crackVents(CRACK_STAGES).filter((v) => v.hot);
      const pulse = 0.55 + 0.45 * Math.sin(st.t / 210);
      for (let i = 0; i < vents.length; i += 3) {
        const v = vents[i];
        const px = x + (v.x + 0.5) * scale;
        const py = y + (v.y + 0.5) * scale;
        const len = scale * (2.2 + 2.6 * pulse);
        const grad = ctx.createLinearGradient(px - len, py, px + len, py);
        grad.addColorStop(0, hexA(PALETTE.emberGlow, 0));
        grad.addColorStop(0.5, hexA(PALETTE.white, 0.4 * pulse * alpha));
        grad.addColorStop(1, hexA(PALETTE.emberGlow, 0));
        ctx.fillStyle = grad;
        ctx.fillRect(px - len, py - scale * 0.4, len * 2, Math.max(1, scale * 0.8));
      }
    }

    /** Sparks out of the split, drawn as streaks so they read as fast. */
    function drawSparks(x, y, scale, alpha) {
      for (const s of st.sparks) {
        const p = s.life / s.ttl;
        const px = x + s.x * scale;
        const py = y + s.y * scale;
        const size = Math.max(1, Math.round(scale * 0.55 * (1 - p)));
        ctx.fillStyle = p < 0.35 ? PALETTE.white : s.hot ? PALETTE.emberGlow : PALETTE.magma;
        ctx.globalAlpha = alpha * (1 - p);
        // A short tail along the direction of travel, so the eye reads speed.
        ctx.fillRect(
          Math.round(px - s.vx * scale * 26),
          Math.round(py - s.vy * scale * 26),
          size,
          size,
        );
        ctx.fillRect(Math.round(px), Math.round(py), size, size);
      }
      ctx.globalAlpha = alpha;
    }

    /** Chips of stone knocked loose, falling out of frame. */
    function drawFlakes(x, y, scale, alpha) {
      for (const f of st.flakes) {
        const p = f.life / f.ttl;
        ctx.fillStyle = f.hot ? PALETTE.magma : PALETTE.voidRockLight;
        ctx.globalAlpha = alpha * (1 - p * p);
        const size = Math.max(1, Math.round(scale * f.size * 0.7));
        ctx.fillRect(Math.round(x + f.x * scale), Math.round(y + f.y * scale), size, size);
      }
      ctx.globalAlpha = alpha;
    }

    /** The carving, in pieces, each one still carrying its bit of the crack. */
    function drawShards(x, y, scale) {
      for (const p of st.pieces) {
        const dx = x + (p.sx + (p.x || 0)) * scale;
        const dy = y + (p.sy + (p.y || 0)) * scale;
        const w = p.sw * scale;
        const h = p.sh * scale;
        ctx.save();
        ctx.translate(Math.round(dx + w / 2), Math.round(dy + h / 2));
        ctx.rotate(p.rot);
        ctx.drawImage(st.art, p.sx, p.sy, p.sw, p.sh, -w / 2, -h / 2, w, h);
        ctx.restore();
      }
    }

    // --- prompt / teardown -------------------------------------------------

    const promptTimer = setTimeout(() => {
      prompt.classList.add('is-shown');
    }, DARK_MS + RISE_MS + PROMPT_MS);

    /**
     * The dark is not silent, it is quiet: two beats of a heart under an empty
     * frame, and then the thing coming up out of it.
     */
    const cues = [
      setTimeout(() => play('heartbeat'), 900),
      setTimeout(() => play('heartbeat'), 1900),
      setTimeout(() => play('rumble'), DARK_MS - 320),
      setTimeout(() => play('toll'), DARK_MS + 120),
    ];

    function cleanup() {
      cancelAnimationFrame(raf);
      clearTimeout(promptTimer);
      cues.forEach(clearTimeout);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', onKey);
      veil.removeEventListener('pointerdown', tap);
      veil.remove();
      resolve();
    }

    raf = requestAnimationFrame(frame);
  });
}

// ---------------------------------------------------------------------------

function makeMotes() {
  const out = [];
  for (let i = 0; i < 22; i++) {
    out.push({
      a: Math.random() * Math.PI * 2,
      radius: 0.34 + Math.random() * 0.42,
      speed: (0.00018 + Math.random() * 0.0004) * (Math.random() < 0.5 ? -1 : 1),
      size: 0.6 + Math.random() * 1.2,
      life: Math.random() * 2000,
    });
  }
  return out;
}

/**
 * Sparks thrown out of the fissure that is actually showing.
 *
 * They start at a vent — a lit cell of the crack overlay, in source pixels —
 * and leave roughly perpendicular to the stone, which means the left-hand
 * branches spit left and the spine spits forward. Random directions from the
 * middle of the totem looked like a firework going off behind it.
 */
function makeSparks(level, count) {
  const vents = crackVents(level);
  if (!vents.length) return [];
  const out = [];
  for (let i = 0; i < count; i++) {
    const v = vents[Math.floor(Math.random() * vents.length)];
    const away = v.x < TOTEM_W / 2 ? -1 : 1;
    const speed = 0.012 + Math.random() * 0.03;
    const spread = (Math.random() * 2 - 1) * 0.6;
    out.push({
      x: v.x,
      y: v.y,
      vx: away * speed * (0.6 + Math.random() * 0.7),
      vy: -speed * 0.55 + spread * speed,
      hot: v.hot,
      life: 0,
      ttl: 380 + Math.random() * 460,
    });
  }
  return out;
}

const clamp01 = (n) => Math.max(0, Math.min(1, n));

/** Overshoot and settle — the totem arrives, it does not slide into place. */
function easeOutBack(n) {
  const c = 1.7;
  const p = n - 1;
  return 1 + (c + 1) * p * p * p + c * p * p;
}

/** `#rrggbb` plus an alpha, for the gradient stops. */
function hexA(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
