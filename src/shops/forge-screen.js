/**
 * SHOOT! — The blacksmith's counter.
 *
 * The one screen in the game where the player buys something they keep. It
 * used to be a panel with a CSS anvil at the top of it, two chips, a price and
 * a button: five lines of markup for the most expensive purchase in the game,
 * and nothing on it that showed you what you were buying. You improved a
 * number and the number went up.
 *
 * WHAT IS ON IT NOW
 * ---------------------------------------------------------------------------
 * The gun. It is drawn live, in the middle of the screen, at the tier the
 * player currently owns — the same sprite the duel puts in their hand, with the
 * same light around it, the same sparks coming off it and the same stars going
 * round it — turning slowly on a plate under the forge's hood. Buy a rung and
 * the workshop performs the upgrade (`src/shops/forge-scene.js` runs it across
 * the whole backdrop) and the gun on the plate becomes the new one halfway
 * through, in a white flash, while the ritual is still going.
 *
 * Around it: the ladder as seven notches so the player can see where they are
 * and how much is left, what the gun hits for now and what it would hit for
 * next, and the price — which by the top of the ladder is a number worth
 * looking at twice.
 *
 * THE COUNTER IS BUILT, NOT BOXED
 * ---------------------------------------------------------------------------
 * Same rule as the shop's stall and the inn's rooms: the screen is a thing in
 * the world — a hood of riveted iron over a bench of scorched plank, the shop's
 * sign hanging off it on two chains — rather than a rectangle with a heading.
 * Nothing here restates what the picture already says.
 */

import { el, clearNode, wait, setText } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { attachButtonSounds, play, playMusic } from '../core/audio.js';
import { setRenderer } from '../core/scene.js';
import { PALETTE } from '../art/palette.js';
import { getTieredRevolver } from '../art/sprites-character.js';
import { makeCanvas, drawSprite, crisp } from '../art/pixel.js';
import { getState, gunDamage, gunUpgradeCost, gunIsMaxed, upgradeGun } from '../game/player.js';
import { gunTier, GUN_TIERS } from '../game/gun-tiers.js';
import { gunDamageAt } from '../game/progression.js';
import { finishEncounter } from '../game/run.js';
import { openInventory } from '../ui/inventory-panel.js';
import { openTrailMapForRun } from '../ui/map-panel.js';
import { icon } from '../ui/widgets.js';
import { trailBand } from '../ui/statusbar.js';
import { EVENTS, on } from '../core/events.js';
import { toast } from '../ui/toast.js';
import { track as trackAchievement } from '../game/achievements.js';
import { createForgeScene } from './forge-scene.js';

/**
 * The sound each ritual makes, as cues on a clock.
 *
 * The forge scene owns the pictures and this owns the noise, for the same
 * reason the duel screen owns its own: audio is the one thing that has to keep
 * working when the canvas is off screen, and a scene that played its own cues
 * would go on hammering into an unmounted screen.
 */
const RITUAL_SOUND = {
  hammer: [[0, 'hit'], [360, 'hit'], [750, 'hit'], [1140, 'levelUp']],
  braze: [[0, 'shield'], [300, 'coin'], [1250, 'levelUp']],
  quench: [[0, 'reload'], [520, 'thunder'], [1300, 'levelUp']],
  bellows: [[0, 'wind'], [400, 'rumble'], [1150, 'thunder'], [1500, 'levelUp']],
  runes: [[0, 'toll'], [700, 'shield'], [1650, 'levelUp']],
  nova: [[0, 'toll'], [500, 'rumble'], [1850, 'thunder'], [2000, 'levelUp']],
};

/**
 * The gun plate, in source pixels, and the multiple it is shown at.
 *
 * Wide enough for the Nova's frame plus the two pixels its orbit swings out to
 * either side, and at 8x rather than the 3x the duel draws at — this is the
 * only place in the game the weapon is the subject rather than a prop in
 * somebody's hand, so it is shown at the size the art was drawn to be read at.
 */
const PLATE = { w: 24, h: 15, scale: 8 };

export const ForgeScreen = {
  id: 'forge',

  mount(root) {
    playMusic('themeMenu');
    const scene = createForgeScene();
    setRenderer(scene);

    const band = trailBand();
    /** True from the moment gold is taken until the ritual has finished. */
    let busy = false;
    const timers = [];
    /**
     * True once the router has taken this screen down.
     *
     * A ritual is nearly two seconds long and the road is one button away for
     * every one of them, so the player CAN walk out in the middle of a
     * performance — and the half of `improve` that runs after `await wait(ms)`
     * would then land on a screen that no longer exists: a toast about a gun
     * printed over the desert, and a `render` into detached nodes. Clearing the
     * timers cannot help with that one, because the wait is a promise rather
     * than a handle we hold. So the continuation checks whether it still has a
     * screen to finish on.
     *
     * The gun itself is safe either way: `upgradeGun` has already taken the
     * gold and moved the level before any of this, and the ritual is only the
     * telling of it.
     */
    let disposed = false;

    // --- the gun on the plate -----------------------------------------------
    const plate = makeCanvas(PLATE.w * PLATE.scale, PLATE.h * PLATE.scale);
    plate.canvas.className = 'pixel forge-gun-canvas';
    plate.canvas.style.width = `${PLATE.w * PLATE.scale}px`;
    plate.canvas.style.height = `${PLATE.h * PLATE.scale}px`;
    crisp(plate.ctx);

    /** What the plate is showing. Swapped mid-ritual, not on purchase. */
    let shown = gunTier(getState().gunLevel);
    /** 0 → 1 while a newly forged gun is still coming out of the white. */
    let reveal = 1;
    let raf = 0;
    let last = performance.now();
    let clock = 0;

    function frame(now) {
      const dt = Math.min(64, Math.max(0, now - last));
      last = now;
      clock += dt;
      if (reveal < 1) reveal = Math.min(1, reveal + dt / 520);
      drawPlate(plate, shown, clock, reveal);
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    // --- the readouts --------------------------------------------------------
    const tierName = el('h2.forge-tier-name');
    const tierBlurb = el('p.forge-blurb');
    const track = el('div.forge-track', { role: 'img' });
    const damageNow = el('span');
    const damageNext = el('span');
    const nextName = el('span.forge-next-name');
    const price = el('span.forge-price-value');
    const priceRow = el('div.forge-price', {}, [icon('coin', 1.2), price]);
    const buy = el('button.btn.btn--gold.btn--lg.forge-buy', { onclick: improve });
    const deal = el('div.forge-deal', {}, [priceRow, buy]);

    function render() {
      const state = getState();
      const tier = gunTier(state.gunLevel);
      const maxed = gunIsMaxed();
      const cost = gunUpgradeCost();
      const next = maxed ? null : gunTier(state.gunLevel + 1);

      setText(tierName, tier.name);
      setText(tierBlurb, tier.blurb);
      setText(damageNow, '{n} per shot', { n: gunDamage().toFixed(1) });
      if (maxed) setText(damageNext, '—');
      else setText(damageNext, '{n} per shot', { n: gunDamageAt(state.gunLevel + 1).toFixed(1) });
      setText(nextName, maxed ? '' : next.name);

      // The ladder, as one notch per rung: filled behind you, lit where you
      // are, and empty ahead — so "how much of this is left" is a picture.
      clearNode(track);
      GUN_TIERS.forEach((entry, i) => {
        track.append(el('span.forge-notch', {
          class: i < state.gunLevel ? 'is-done' : i === state.gunLevel ? 'is-here' : '',
          'data-tip': i <= state.gunLevel ? entry.name : 'Not yet forged',
        }));
      });
      track.setAttribute(
        'aria-label',
        t('Gun tier {n} of {total}', { n: state.gunLevel + 1, total: GUN_TIERS.length }),
      );

      deal.classList.toggle('is-maxed', maxed);
      if (maxed) {
        setText(price, 'Nothing left to forge');
        setText(buy, 'The Nova is finished');
        buy.disabled = true;
      } else {
        price.textContent = cost.toLocaleString();
        if (busy) setText(buy, 'Working…');
        else setText(buy, 'Forge the {gun}', { gun: t(next.name) });
        buy.disabled = busy || state.gold < cost;
      }
    }

    async function improve() {
      if (busy) return;
      const state = getState();
      if (gunIsMaxed()) return;
      const cost = gunUpgradeCost();
      if (state.gold < cost) {
        play('error');
        toast(t('{gold} gold short', { gold: cost - state.gold }), 'bad');
        deal.classList.remove('shake');
        void deal.offsetWidth;
        deal.classList.add('shake');
        return;
      }

      busy = true;
      upgradeGun();
      const tier = gunTier(getState().gunLevel);
      trackAchievement('gunUpgraded', { level: getState().gunLevel });
      render();
      play('coin');
      // The counter fades back while the workshop performs: what the player
      // paid for is happening behind the bench, not on it.
      shop.classList.add('is-working');

      // The workshop performs it, the counter waits exactly as long as the
      // performance says it takes, and the gun on the plate changes hands
      // partway through — not at the end, where it would read as a result
      // rather than as the thing that just happened.
      const ms = scene.playRitual(tier.ritual) || 900;
      for (const [at, cue] of RITUAL_SOUND[tier.ritual] || []) {
        timers.push(setTimeout(() => play(cue), at));
      }
      timers.push(setTimeout(() => {
        shown = tier;
        reveal = 0;
      }, Math.round(ms * 0.62)));

      await wait(ms);
      if (disposed) return;
      shop.classList.remove('is-working');
      busy = false;
      render();
      toast(t('{gun} — {lives} lives a shot', { gun: t(tier.name), lives: gunDamage().toFixed(1) }), 'gold');
    }

    const shop = el('div.forge-shop', {}, [
      el('div.forge-hood', { 'aria-hidden': 'true' }),
      el('h1.forge-sign', {}, [el('span.forge-sign-text', { text: 'Blacksmith' })]),
      el('div.forge-bench', {}, [
        el('div.forge-display', {}, [
          el('div.forge-plate', {}, [plate.canvas]),
          track,
        ]),
        el('div.forge-info', {}, [
          tierName,
          tierBlurb,
          el('div.forge-stats', {}, [
            el('div.forge-stat', {}, [
              el('span.k', { text: 'Now' }),
              el('span.v', {}, [icon('life', 0.9), damageNow]),
            ]),
            el('div.forge-stat.is-next', {}, [
              el('span.k', {}, ['Next', nextName]),
              el('span.v', {}, [icon('life', 0.9), damageNext]),
            ]),
          ]),
          deal,
        ]),
      ]),
      el('div.forge-counter', { 'aria-hidden': 'true' }),
    ]);

    render();

    const screen = el('div.screen.venue-screen.forge-screen', {}, [
      band,
      el('div.screen-body', {}, [shop]),
      el('div.screen-footer', {}, [
        el('button.btn.btn--ghost', {
          onclick: () => openInventory({
            context: 'shop',
            onUse: (id, result) => {
              if (result.effect === 'map') openTrailMapForRun();
            },
          }),
        }, [icon('shopTag', 1.1), 'Saddlebag']),
        el('button.btn.btn--primary', { onclick: () => finishEncounter() }, ['Back to the road']),
      ]),
    ]);

    root.append(screen);
    attachButtonSounds(screen);

    /**
     * The price and the button follow the purse in real time.
     *
     * The counter used to be painted once on arrival, so a player who sold
     * something out of the saddlebag while standing at the bench — which is
     * exactly what you do when you are short — came back to a button still
     * greyed out at the price they could now afford, and had to leave the
     * forge and walk back in to be told otherwise.
     */
    const unsubGold = on(EVENTS.GOLD_CHANGED, () => { if (!disposed) render(); });

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      for (const id of timers) clearTimeout(id);
      unsubGold();
      band.dispose();
      setRenderer(null);
    };
  },
};

/**
 * The gun, turning on its plate.
 *
 * Everything the duel puts around the weapon is here too — the glow, the
 * orbit, the sparks — because the point of the plate is that it is a PREVIEW:
 * what you are looking at is exactly what comes out of the holster.
 *
 * @param {{canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D}} plate
 * @param {object} tier an entry of GUN_TIERS
 * @param {number} clock milliseconds since the screen was mounted
 * @param {number} reveal 0 → 1 as a newly forged gun comes out of the white
 */
function drawPlate(plate, tier, clock, reveal) {
  const { ctx, canvas } = plate;
  const s = PLATE.scale;
  const fx = tier.fx || {};
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const gun = getTieredRevolver(tier).level;
  const sprite = gun.sprite;
  // It hovers: a gun lying flat on a plate is a gun in an inventory slot.
  const bob = Math.round(Math.sin(clock / 620) * 1) * s;
  const x = Math.round((canvas.width - sprite.width * s) / 2);
  const y = Math.round((canvas.height - sprite.height * s) / 2) + bob;
  const cx = x + (sprite.width * s) / 2;
  const cy = y + (sprite.height * s) / 2;

  // The plate's own shadow under it, so it is above the iron rather than on it.
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = PALETTE.shadow;
  ctx.fillRect(x + s, y + sprite.height * s + s * 2 - bob, sprite.width * s - s * 2, s);
  ctx.globalAlpha = 1;

  if (fx.glow) {
    const r = Math.max(sprite.width, sprite.height) * s * 1.5;
    const pulse = 0.75 + Math.sin(clock / 340) * 0.25;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(0.75, fx.glow.alpha * 1.5) * pulse;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, fx.glow.color);
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

    if (fx.nebula) {
      for (let i = 0; i < 9; i++) {
        const t = clock / (900 + i * 130) + i;
        ctx.globalAlpha = 0.3 + ((Math.sin(clock / 210 + i * 2.1) + 1) / 2) * 0.6;
        ctx.fillStyle = i % 3 === 0 ? PALETTE.star : i % 3 === 1 ? PALETTE.astralLight : PALETTE.purple;
        ctx.fillRect(
          Math.round(cx + Math.cos(t) * sprite.width * s * 0.4),
          Math.round(cy + Math.sin(t * 1.37) * sprite.height * s * 0.42),
          s,
          s,
        );
      }
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  drawSprite(ctx, sprite, x, y, s);

  // Sparks coming off the barrel, on the same rate the duel uses. They are
  // drawn from a clock rather than simulated: a preview does not need a
  // particle system, it needs to look alive.
  if (fx.spark?.rate) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const count = Math.round(3 + fx.spark.rate * 4);
    for (let i = 0; i < count; i++) {
      const k = ((clock / (900 - fx.spark.rate * 180) + i / count) % 1);
      ctx.globalAlpha = (1 - k) * 0.9;
      ctx.fillStyle = fx.spark.color;
      const sx = x + sprite.width * s * (0.45 + ((i * 37) % 50) / 100);
      ctx.fillRect(Math.round(sx), Math.round(y - k * s * 8), s, s);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  if (fx.orbit) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < fx.orbit; i++) {
      const th = clock / 520 + (i / fx.orbit) * Math.PI * 2;
      const front = Math.sin(th) > 0;
      ctx.globalAlpha = front ? 0.95 : 0.4;
      ctx.fillStyle = front ? PALETTE.star : PALETTE.astral;
      ctx.fillRect(
        Math.round(cx + Math.cos(th) * sprite.width * s * 0.72),
        Math.round(cy + Math.sin(th) * sprite.height * s * 0.55),
        s,
        s,
      );
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // Out of the white: the frame the new gun arrives on.
  if (reveal < 1) {
    ctx.globalAlpha = (1 - reveal) ** 1.5;
    ctx.fillStyle = PALETTE.white;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
  }
}
