/**
 * SHOOT! — The duel HUD.
 *
 * Everything the fight puts ON TOP of the road: the two fighter plates, the
 * round marker, the conditions ribbon and the threat dial that counts a world
 * special down. The screen (src/duel/duel-screen.js) owns the fight; this file
 * owns the shape of the furniture around it, and it exists because that
 * furniture had grown into the one thing a duel cannot afford — a box that
 * gets taller the more interesting the duel is.
 *
 * THE RULE THIS FILE IS BUILT ON: NOTHING GROWS
 * ---------------------------------------------------------------------------
 * A fighter's plate is the same height with three lives or with twenty, with
 * no abilities or with six, poisoned and frozen and marked at the same time.
 * The old card was a column of rows — a wrapping bar of diamonds, a gun chip,
 * a cylinder, a row of ability icons, a row of status icons — and each one of
 * them was allowed to push the next one down. Eleven lives wrapped onto a
 * second line; a boss with four tricks and a special added a third; and the
 * two cards, being fed different things, were never the same size as each
 * other. That is what the screenshot of a Galaxy boss fight looked like.
 *
 * So the plate is now THREE FIXED BANDS and no more:
 *
 *   1. the name, with what they are carrying beside it
 *   2. one vital bar — a track, not a row of diamonds, so twenty lives is
 *      the same width as three and losing one is a piece of it draining
 *   3. one strip: the cylinder, then the tokens, capped, with the rest
 *      behind a `+n` the player can open if they want the whole list
 *
 * And the middle of the screen is one narrow column rather than a stack of
 * pills that grew downwards over the duellists' heads: a round marker, a
 * conditions ribbon written small because the weather is not the fight, and
 * the threat dial — which is a clock, drawn as a clock, instead of the
 * fourth pill in a tower of them.
 */

import { el, clearNode, setText, setTip } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { icon, cylinder, updateCylinder } from '../ui/widgets.js';
import { getAbility } from '../game/world-abilities.js';

/**
 * The gap between two tokens, in pixels. It is in here as well as in the
 * stylesheet because the strip works out how many tokens fit before it draws
 * them — see `measureCap` — and a cap guessed at a constant six was six on a
 * 300-pixel plate and six on a 150-pixel one, where the last two were quietly
 * clipped off the end by `overflow: hidden`. Hiding the overflow key was the
 * one failure mode this design could not afford.
 */
const TOKEN_GAP = 4;

/** The width of one token when the strip has not been laid out yet. */
const TOKEN_W = 24;

/**
 * The two effects that are not abilities — the things the PLAYER carries into
 * the fight. Everything else names its own icon in world-abilities.js.
 */
const EFFECT_ICONS = { vest: 'vest', immune: 'diadem', duskTotem: 'duskTotem' };

/** Segments around a threat dial. Sixteen reads as a clock face; twelve did not. */
const DIAL_SEGMENTS = 16;

const clamp01 = (n) => Math.max(0, Math.min(1, n));

/**
 * Bring a colour up until it reads on a dark plate, keeping its hue.
 *
 * The brightest channel is taken to near-full and then everything is nudged a
 * fifth of the way to white, which turns a sky wash into an ink: a dark violet
 * stays violet, a near-black green comes back as a pale green, and neither of
 * them arrives as a smudge on a black dial. Returns null for anything that is
 * not a six-digit hex, and the stylesheet's own default stands.
 */
function lift(hex) {
  const match = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''));
  if (!match) return null;
  const n = parseInt(match[1], 16);
  const channels = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const k = 235 / Math.max(1, ...channels);
  const [r, g, b] = channels.map((c) => {
    const up = Math.min(255, Math.round(c * k));
    return Math.round(up + (255 - up) * 0.18);
  });
  return { r, g, b, css: `rgb(${r}, ${g}, ${b})` };
}

/** Lives can be halves. Show the half, never `10.500000000000002`. */
function fmtLives(n) {
  const v = Math.round(n * 10) / 10;
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

/* ==========================================================================
   The fighter plate
   ========================================================================== */

/**
 * One fighter's plate: name, vital bar, cylinder and tokens.
 *
 * @param {object} opts
 * @param {'player'|'enemy'} opts.side which end of the road this one is
 * @param {string} opts.name
 * @param {string} [opts.tip] the archetype's one-line description of itself
 * @param {number} opts.maxLives
 * @param {number} [opts.lives]
 * @param {number} [opts.bullets]
 * @param {number} [opts.chambers]
 * @returns {object} the plate's node and the handful of ways to change it
 */
export function createFighterPlate({
  side = 'player',
  name = '',
  tip = null,
  maxLives = 6,
  lives = maxLives,
  bullets = 0,
  chambers = 6,
} = {}) {
  const nameNode = el('span.plate-name', { text: name, 'data-tip': tip || null });
  const tagSlot = el('span.plate-tag');
  const head = el('div.plate-head', {}, [nameNode, tagSlot]);

  /**
   * THE VITAL BAR
   * -------------------------------------------------------------------------
   * Two tracks, not one: the red one is the bar the fighter brought, the gold
   * one is whatever a Potion hung on the end of it. They share the row by
   * weight — a bar of ten with three gold lives gives the gold track three
   * tenths of the width — so a bonus life is visibly a bonus life and the
   * whole thing still occupies exactly one line.
   *
   * Inside each track there are two fills. `fill` is the truth and moves at
   * once. `trail` is the same width a beat behind, in bone white, and it is
   * the only reason a bar can say what a row of diamonds said for free: with
   * fifteen lives one diamond is 6% of the width, and 6% disappearing in a
   * frame is not something an eye catches. The trail catches it.
   */
  const mainFill = el('div.vital-fill');
  const mainTrail = el('div.vital-trail');
  const mainTrack = el('div.vital-track', {}, [mainTrail, mainFill, el('div.vital-notches')]);
  const bonusFill = el('div.vital-fill');
  const bonusTrack = el('div.vital-track.is-bonus', { hidden: true }, [
    bonusFill,
    el('div.vital-notches'),
  ]);
  const count = el('span.vital-count');
  const countNow = el('b');
  const countMax = el('i');
  count.append(countNow, countMax);
  const vitals = el('div.vital', { role: 'img' }, [
    el('span.vital-mark'),
    el('div.vital-tracks', {}, [mainTrack, bonusTrack]),
    count,
  ]);

  const cyl = cylinder(bullets, chambers);
  const tokens = el('div.token-strip');
  const tokenMap = new Map();
  let expanded = false;
  let cap = 0;
  const foot = el('div.plate-foot', {}, [cyl, tokens]);

  const node = el(`div.plate.plate--${side}`, { dataset: { side } }, [head, vitals, foot]);

  let shown = { lives, maxLives, bonus: 0 };
  setLives(lives, maxLives, 0, false);

  /**
   * Put the bar where the numbers say it is.
   *
   * `animate` is false exactly once — while the plate is being built, before
   * anybody is looking at it. Everything after that is a change somebody is
   * watching, and a change somebody is watching gets the trail and the flash.
   */
  function setLives(now, max, bonus = 0, animate = true) {
    const reds = Math.max(1, Math.ceil(max));
    const golds = Math.ceil(Math.max(0, bonus));
    mainTrack.style.flexGrow = String(reds);
    mainTrack.style.setProperty('--n', String(reds));
    // Past sixteen the notches are thinner than the gaps between them and the
    // bar reads as a hatched texture rather than as a count. It becomes a
    // plain bar, and the number beside it does the counting.
    mainTrack.classList.toggle('is-smooth', reds > 16);
    const ratio = clamp01(max > 0 ? now / max : 0);
    /**
     * Both bars are sent to the same place; the LAG IS THE TRANSITION, not the
     * value (`.vital-trail` holds for a fifth of a second before it moves —
     * see styles/game.css). Which is also why the trail needs no special case
     * for healing: it sits behind the fill, so on the way up the fill has
     * already covered the ground before the trail starts crossing it, and the
     * only time any of the trail is visible is the moment after a hit.
     */
    mainFill.style.width = `${ratio * 100}%`;
    mainTrail.style.width = `${ratio * 100}%`;

    bonusTrack.hidden = golds === 0;
    if (golds > 0) {
      bonusTrack.style.flexGrow = String(golds);
      bonusTrack.style.setProperty('--n', String(golds));
      bonusFill.style.width = `${clamp01(bonus / golds) * 100}%`;
    }

    setText(countNow, fmtLives(now));
    setText(countMax, `/${fmtLives(max)}${bonus > 0 ? ` +${fmtLives(bonus)}` : ''}`);
    // A quarter of the bar left is the point at which the fight is being lost,
    // and it is worth a heartbeat rather than a colour nobody notices changing.
    node.classList.toggle('is-critical', max > 0 && now / max <= 0.25 && now > 0);
    if (animate && now < shown.lives) {
      countNow.classList.remove('is-hurt');
      void countNow.offsetWidth;
      countNow.classList.add('is-hurt');
    }
    vitals.setAttribute(
      'aria-label',
      bonus > 0
        ? t('{lives} of {max} lives, plus {bonus} bonus', { lives: fmtLives(now), max: fmtLives(max), bonus: fmtLives(bonus) })
        : t('{lives} of {max} lives', { lives: fmtLives(now), max: fmtLives(max) }),
    );
    shown = { lives: now, maxLives: max, bonus };
  }

  /**
   * The tokens, reconciled by key rather than rebuilt.
   *
   * Rebuilding the row every round is what used to make an ability icon
   * restart its own arrival animation every time anything else on the plate
   * changed, and it threw away the `is-firing` flash mid-flash. Keeping the
   * node means a badge that was already there simply stays there, and a badge
   * that is genuinely new is the only one that animates in.
   */
  /**
   * The overflow key. It is a real button rather than a label because the
   * information behind it is not decoration — being able to see that the man
   * across the road is ALSO carrying dynamite is the difference between a
   * planned round and a surprise — and hiding something behind a tooltip on a
   * touch screen is hiding it.
   */
  const more = el('button.token.token--more', {
    hidden: true,
    style: { order: '9999' },
    onclick: () => {
      expanded = !expanded;
      tokens.classList.toggle('is-expanded', expanded);
      layTokens();
    },
  });
  tokens.append(more);

  let lastItems = [];
  function setTokens(items) {
    lastItems = items.filter(Boolean);
    const seen = new Set();
    for (const item of lastItems) {
      seen.add(item.key);
      let token = tokenMap.get(item.key);
      if (!token) {
        token = buildToken(item);
        tokenMap.set(item.key, token);
        tokens.append(token);
      } else {
        updateToken(token, item);
      }
    }
    for (const [key, token] of tokenMap) {
      if (seen.has(key)) continue;
      tokenMap.delete(key);
      token.remove();
    }
    layTokens();
  }

  /**
   * How many tokens the strip can actually show, worked out from the strip's
   * own width rather than assumed.
   *
   * If everything fits there is no key and every slot is a token; if it does
   * not, one slot goes to the key, because a strip that has silently dropped
   * two icons off its end is worse than one that says it is holding two back.
   */
  function measureCap() {
    const width = tokens.clientWidth;
    if (!width) return tokenMap.size;
    // Measured off a token that is actually on screen: the first entry in the
    // map is not always the first one in the row, and a hidden one measures
    // zero — which would make room for an infinite number of them.
    let width1 = 0;
    for (const token of tokenMap.values()) {
      if (token.offsetWidth) { width1 = token.offsetWidth; break; }
    }
    const unit = (width1 || TOKEN_W) + TOKEN_GAP;
    const room = Math.max(1, Math.floor((width + TOKEN_GAP) / unit));
    return tokenMap.size <= room ? tokenMap.size : Math.max(1, room - 1);
  }

  /** Put the tokens in order and decide which of them are behind the key. */
  function layTokens() {
    cap = expanded ? tokenMap.size : measureCap();
    let index = 0;
    for (const item of lastItems) {
      const token = tokenMap.get(item.key);
      if (!token) continue;
      token.style.order = String(index++);
      token.classList.toggle('is-hidden', index > cap);
    }
    const held = Math.max(0, tokenMap.size - cap);
    more.hidden = held === 0 && !expanded;
    if (!more.hidden) {
      setText(more, expanded ? '−' : `+${held}`);
      setTip(more, expanded ? 'Show fewer' : 'Show everything on them');
    }
    tokens.classList.toggle('is-empty', tokenMap.size === 0);
  }

  /**
   * The strip is only as wide as the plate lets it be, and the plate is as
   * wide as the window lets it be — so the cap is recomputed when the box
   * changes rather than once at build time. Nothing else in here reads the
   * layout, which is what makes one observer enough.
   *
   * IT IS HELD SO IT CAN BE DROPPED
   * -------------------------------------------------------------------------
   * A run is dozens of duels and every duel builds two of these. An observer
   * with a live observation keeps its target — and therefore this whole
   * closure, the token map and every node in it — reachable after the screen
   * has been torn down, so a player who fights forty riders is carrying forty
   * dead plates. `dispose` is what the duel screen calls on its way out.
   */
  const observer = typeof ResizeObserver === 'function'
    ? new ResizeObserver(() => {
        if (!expanded && cap !== measureCap()) layTokens();
      })
    : null;
  observer?.observe(tokens);

  return {
    node,
    setLives,
    setTokens,
    setBullets: (loaded) => updateCylinder(cyl, loaded),
    setName(next, nextTip) {
      setText(nameNode, next);
      setTip(nameNode, nextTip || '');
    },
    /** What they are carrying, shown beside the name. Null takes it away. */
    setTag(nodeOrNull) {
      clearNode(tagSlot);
      if (nodeOrNull) tagSlot.append(nodeOrNull);
    },
    /** Let go of the layout watcher. The screen calls this when it unmounts. */
    dispose() {
      observer?.disconnect();
    },
    /** Something landed on this fighter. */
    hit() {
      node.classList.remove('is-hit');
      void node.offsetWidth;
      node.classList.add('is-hit');
    },
    /** One token going off, if that token is on this plate at all. */
    flash(key) {
      const token = tokenMap.get(key);
      if (!token) return;
      token.classList.remove('is-firing');
      void token.offsetWidth;
      token.classList.add('is-firing');
    },
  };
}

/**
 * One token: a framed pixel icon, and the word it replaces on the tooltip.
 *
 * @param {{key: string, iconName?: string, tone?: string, count?: number,
 *          tip?: string, label?: string}} item
 */
function buildToken(item) {
  const token = el('span.token.is-new', { dataset: { effect: item.key }, role: 'img' });
  updateToken(token, item);
  return token;
}

function updateToken(token, item) {
  const ability = getAbility(item.key);
  const label = item.label || ability.label || item.key;
  const tip = item.tip || (ability.tip ? `${t(label)} — ${t(ability.tip)}` : label);
  const iconName = item.iconName || EFFECT_ICONS[item.key] || ability.icon || 'skull';
  if (token.dataset.icon !== iconName) {
    token.dataset.icon = iconName;
    const art = icon(iconName, 1);
    const old = token.querySelector('img');
    if (old) old.replaceWith(art);
    else token.prepend(art);
  }
  /**
   * The tone is swapped rather than the whole class list rewritten. A token
   * can be mid-flash while the plate around it re-renders — which happens on
   * every round — and blowing away `is-firing` was how an ability going off
   * became invisible in exactly the fights busy enough to need it.
   */
  const tone = item.tone || '';
  if (token.dataset.tone !== tone) {
    if (token.dataset.tone) token.classList.remove(...token.dataset.tone.split(' '));
    token.dataset.tone = tone;
    if (tone) token.classList.add(...tone.split(' '));
  }
  setTip(token, tip);
  token.setAttribute('aria-label', t(tip));
  let badge = token.querySelector('.token-count');
  if (item.count != null) {
    if (!badge) {
      badge = el('span.token-count');
      token.append(badge);
    }
    setText(badge, String(item.count));
  } else if (badge) badge.remove();
}

/* ==========================================================================
   The centre column
   ========================================================================== */

/**
 * The round marker.
 *
 * It flips when the number changes, which is the whole reason it is not a
 * label: a duel is counted in rounds, and the moment one ends is a beat worth
 * seeing rather than a digit quietly becoming a different digit.
 */
export function createRoundMarker() {
  const value = el('span.round-value');
  const node = el('div.round-chip', {}, [el('span.round-word', { text: 'Round' }), value]);
  let last = null;
  return {
    node,
    set(n) {
      if (n === last) return;
      last = n;
      setText(value, String(n));
      node.classList.remove('is-turning');
      void node.offsetWidth;
      node.classList.add('is-turning');
    },
  };
}

/**
 * The conditions ribbon: night, weather, boss.
 *
 * Deliberately the smallest type on the screen and deliberately one line. It
 * used to be a stack of full-size pills in the middle of the road — "STARFALL"
 * in Spanish is "LLUVIA DE ESTRELLAS", which is a very long way of saying
 * something that changes one accuracy number. It is context, not news, and
 * context is written small.
 */
export function createConditionsRibbon(items) {
  const node = el('div.conditions');
  for (const item of items) {
    if (!item) continue;
    node.append(
      el(`span.condition.condition--${item.tone || 'plain'}`, {
        text: item.label,
        'data-tip': item.tip || null,
      }),
    );
  }
  node.hidden = !node.children.length;
  return node;
}

/* ==========================================================================
   The threat dial — a world special, counted down
   ========================================================================== */

/**
 * THE ONE THING ON THIS SCREEN THAT IS ITS OWN INSTRUMENT
 * ---------------------------------------------------------------------------
 * A world special runs on real time while the player reads three buttons, and
 * it used to be told as a text pill — "LA GRIETA · 9S" — sitting in a stack of
 * other text pills that looked exactly like it. Three problems, all fatal:
 * the one clock in the game looked like the two labels beside it; a number
 * counting down in a pill is read, not felt; and it took a whole row of the
 * middle of the screen to say one number.
 *
 * A clock is a ring. Sixteen segments fill as the quiet runs out, the special's
 * own icon sits in the middle, the seconds sit under it, and the ring takes
 * the sky's colour from the special itself — so the rift's dial is the rift's
 * purple and the volcano's is its red without a line of per-special code. The
 * whole instrument is 64 pixels wide and says more than the pill did.
 *
 * A charge special (the rift) is the reason the ring has a second reading:
 * during the wind-up it stops counting seconds and starts filling with the
 * shot itself, which is the number that decides whether the player presses the
 * fight or spends the round hiding.
 */
function createThreatDial(spec, owner) {
  const segs = [];
  const ring = el('div.dial-ring');
  for (let i = 0; i < DIAL_SEGMENTS; i++) {
    const seg = el('span.dial-seg');
    seg.style.transform = `rotate(${(360 / DIAL_SEGMENTS) * i}deg)`;
    segs.push(seg);
    ring.append(seg);
  }
  const num = el('span.dial-num');
  const dial = el('div.dial', {}, [ring, el('span.dial-core', {}, [icon(spec.icon, 1.35)]), num]);
  const label = el('span.threat-label', { text: spec.label });
  const node = el('div.threat', {
    dataset: { owner },
    role: 'img',
  }, [dial, label]);
  /**
   * THE DIAL WEARS THE SPECIAL'S OWN COLOUR
   * -------------------------------------------------------------------------
   * Straight off the spec, so the rift's dial is the rift's violet and the
   * volcano's is its red — one line here instead of six colours in the
   * stylesheet that would go stale the day an eighth world is added.
   *
   * It is LIFTED first, and it has to be. `sky.color` is a wash laid over a
   * whole scene, so it is picked dark on purpose: the rift's is #4c2f80 and
   * the gallows' is very nearly black. Painted straight onto a dial those are
   * a lit segment darker than an unlit one and a label nobody can read. See
   * `lift`.
   */
  const accent = lift(spec.sky?.color);
  if (accent) {
    node.style.setProperty('--threat-accent', accent.css);
    node.style.setProperty('--threat-glow', `rgba(${accent.r}, ${accent.g}, ${accent.b}, 0.55)`);
  }

  let litCount = -1;
  let lastPhase = '';
  let lastNum = '';

  return {
    node,
    spec,
    /**
     * @param {{phase: string, k: number, text: string, tone: string, tip: string}} view
     */
    update(view) {
      const lit = Math.round(clamp01(view.k) * DIAL_SEGMENTS);
      if (lit !== litCount) {
        litCount = lit;
        // Toggling only the segments that changed, because this runs on the
        // canvas frame loop and sixteen class writes a frame is sixteen too
        // many for a number that moves once a second.
        segs.forEach((seg, i) => seg.classList.toggle('is-lit', i < lit));
      }
      if (view.tone !== lastPhase) {
        lastPhase = view.tone;
        node.dataset.phase = view.tone;
      }
      if (view.text !== lastNum) {
        lastNum = view.text;
        setText(num, view.text);
      }
      if (view.tip && node.dataset.tip !== view.tip) {
        node.dataset.tip = view.tip;
        node.setAttribute('aria-label', view.tip);
      }
    },
    /** The eruption itself, on the frame it lands. */
    strike() {
      node.classList.remove('is-striking');
      void node.offsetWidth;
      node.classList.add('is-striking');
    },
  };
}

/**
 * The board the dials live on.
 *
 * Both ends of the road can have one up at the same time — the player's
 * one-shot and the enemy's landmark — so this is a list keyed by owner rather
 * than a single widget, and it takes no room at all when there is nothing
 * ticking, which is most of most duels.
 */
export function createThreatBoard() {
  const node = el('div.threat-board');
  const dials = new Map();

  /**
   * @param {Array<{owner: string, spec: object, state: object, seconds: number}>} entries
   */
  function sync(entries) {
    const seen = new Set();
    for (const entry of entries) {
      seen.add(entry.owner);
      let dial = dials.get(entry.owner);
      if (!dial || dial.spec.id !== entry.spec.id) {
        dial?.node.remove();
        dial = createThreatDial(entry.spec, entry.owner);
        dials.set(entry.owner, dial);
        // The player's sits on the left, the enemy's on the right, matching
        // which end of the road raised it.
        if (entry.owner === 'player') node.prepend(dial.node);
        else node.append(dial.node);
      }
      dial.update(readClock(entry));
    }
    for (const [owner, dial] of dials) {
      if (seen.has(owner)) continue;
      dials.delete(owner);
      dial.node.remove();
    }
    node.hidden = dials.size === 0;
  }

  return {
    node,
    sync,
    strike: (owner) => dials.get(owner)?.strike(),
  };
}

/**
 * One hazard clock, read into the four things the dial draws: how full the
 * ring is, what the middle says, which state it is in, and the sentence that
 * explains all three to anyone who hovers.
 */
function readClock({ spec, state, seconds, rate }) {
  const phase = state.phase;
  const charge = state.charge ?? -1;
  // What one window of it costs, said on every state: a player hovering the
  // dial mid-eruption is asking the same question as one hovering it in the
  // quiet, and the answer does not change.
  const price = rate ? ` ${rate}` : '';
  if (phase === 'dormant') {
    // Which quiet is being served: the opening one is deliberately shorter
    // than the ones after it (see `firstCycleMs` in src/duel/duel-hazard.js),
    // and a ring that filled at the wrong rate would be a clock that lies.
    const cycle = state.eruptions === 0 ? (spec.firstCycleMs ?? spec.cycleMs) : spec.cycleMs;
    return {
      k: cycle > 0 ? clamp01(state.t / cycle) : 1,
      text: t('{seconds}s', { seconds }),
      tone: 'calm',
      tip: `${t('{label} — {tip}', { label: t(spec.label), tip: t(spec.tip) })}${price}`,
    };
  }
  /**
   * THE READING IS A MARK, NOT A WORD
   * ---------------------------------------------------------------------------
   * Everything the middle of this dial says is a number or a mark: seconds, a
   * percentage, an exclamation, a dash. That is partly because a 62-pixel ring
   * has no room for a word, and mostly because a shouted word on its own has
   * no translation — "NOW" is not a sentence and there is nothing in it for
   * the Spanish table to agree with. The words are all on the tooltip, where
   * they arrive as whole sentences with the special's name in them.
   */
  /**
   * A CHARGE SPECIAL IS ALREADY WINDING UP DURING THE WARNING
   * ---------------------------------------------------------------------------
   * This is asked before the warning state, not after it, and the order is the
   * whole point: `chargeLevel` in src/duel/duel-hazard.js starts filling the
   * moment the sky turns and runs from nought to three tenths across the
   * warning — deliberately, because "a rift that is quiet for two seconds and
   * then suddenly full has hidden the half of the wind-up the player most
   * needed". Answering the warning first threw that half away and drew a full
   * ring instead, so the dial read FULL, then dropped to 30%, then filled
   * again: the one instrument on the screen going backwards at the exact
   * moment the player is deciding whether to press the fight.
   */
  if (charge >= 0) {
    return {
      k: charge,
      text: `${Math.min(99, Math.round(charge * 100))}%`,
      tone: 'charge',
      tip: `${t('{label} — charging', { label: t(spec.label) })}${price}`,
    };
  }
  if (phase === 'warning') {
    return {
      k: 1,
      text: '!',
      tone: 'warn',
      tip: `${t('{label} — it is waking', { label: t(spec.label) })}${price}`,
    };
  }
  if (state.pattern === 'charge') {
    return {
      k: 1,
      text: '—',
      tone: 'spent',
      tip: `${t('{label} — it has fired', { label: t(spec.label) })}${price}`,
    };
  }
  return {
    k: clamp01(state.activeK < 0 ? 1 : 1 - state.activeK),
    text: '!!',
    tone: 'erupt',
    tip: `${t('{label} — erupting', { label: t(spec.label) })}${price}`,
  };
}
