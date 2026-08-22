/**
 * SHOOT! — Admin overrides.
 *
 * THE ONE PLACE THE GAME IS ALLOWED TO BE LIED TO
 * ---------------------------------------------------------------------------
 * Everything the Admin Panel can bend lives in this single mutable object, and
 * every system that can be bent reads it in exactly one line. That shape is
 * deliberate and it is the only reason a debug tool this wide is safe to have
 * in the tree:
 *
 *   - the panel never reaches into a system. It writes a number in here and the
 *     system picks it up on its next tick, so there is no second code path
 *     through the walk, the road, the shop or the duel — there is the real one,
 *     reading one extra multiplier.
 *   - a hook is always written so that the untouched value is the identity: a
 *     multiplier is 1, a replacement is `null`, a flag is `false`. Reset this
 *     object and the game is the game again, with nothing left behind.
 *   - it holds NO imports. Anything in `game/`, `explore/`, `shops/` or `duel/`
 *     can read it without risking an import cycle, which is what lets the hooks
 *     be one line each instead of an event plumbing exercise.
 *
 * IT IS THIS RUN ONLY, AND IT IS NEVER WRITTEN DOWN
 * ---------------------------------------------------------------------------
 * Nothing in here is serialised into a save slot. `resetOverrides()` is called
 * when a run is started or loaded (see src/game/run.js), so a slot that was
 * played with the volcano chance at 100% comes back tomorrow as an ordinary
 * run. A tester who wants the change again makes it again — that is the whole
 * contract, and it is what keeps a bent run from quietly becoming a bent save.
 *
 * The one thing that DOES persist is the door itself (which slots have been
 * unlocked, and how many attempts each one has left) — see src/admin/access.js.
 */

/** Everything at its identity value: the game exactly as designed. */
function blank() {
  return {
    /**
     * The road, and what it deals next.
     *
     * `forceNext` is the strongest thing in this file: it takes the choice away
     * from `revealNext` entirely, so the next face-down stop is whatever is
     * named here (as long as the world still holds one of that kind — the road
     * is allowed to be bent, not to be given a seventh inn).
     */
    road: {
      forceNext: null,
      /** Multipliers on each kind's appetite. See APPETITE in encounters.js. */
      appetite: { enemy: 1, inn: 1, shop: 1, forge: 1, tailor: 1 },
      /** Ignore the spacing dimmer and the "never two doors in a row" floor. */
      ignoreSpacing: false,
    },

    /**
     * What the next rider is made of. Everything here is applied AFTER the
     * ordinary roll, so leaving a field null keeps the world's own distribution
     * and the seeded road stays reproducible around it.
     */
    enemy: {
      lives: null,
      accuracy: null,
      gunDamage: null,
      archetype: null,
      name: null,
      /** null keeps the roll; [] means "carrying nothing"; a list replaces it. */
      abilities: null,
      /** undefined keeps the roll, null strips the landmark, an id forces one. */
      special: undefined,
      /** Multiplier on how often the engine lets them reach for a trick. */
      abilityChanceMul: 1,
    },

    /**
     * The opponent's head. `mode` swaps the whole policy; the three numbers
     * under it tune the ordinary one. See src/duel/duel-ai.js.
     */
    ai: {
      mode: 'normal',
      accuracy: null,
      readShare: null,
      shieldShare: null,
      thinkMs: null,
      /** A fixed loop of moves, played in order. Empty means "think for yourself". */
      script: [],
    },

    /** What a body is worth, and what a counter charges. */
    economy: { goldMul: 1, expMul: 1, priceMul: 1 },

    /** The road under the player's feet and the clocks that run on it. */
    walk: { speedMul: 1, hungerMul: 1, freezeHunger: false, freezeClock: false },

    /** Rules the player themselves is allowed to break. */
    player: { invulnerable: false, freeGold: false, gunDamage: null },

    /** What a counter stocks and what it charges for it. */
    shop: { rarity: null, discountChance: null, extraSlots: 0 },

    /** Anything else the fight itself asks about. */
    duel: { infiniteBullets: false, chargeMul: 1 },
  };
}

/**
 * The live object. Read it directly from a hook — `OVERRIDES.walk.speedMul` —
 * and never replace it, because every reader holds this same reference.
 */
export const OVERRIDES = blank();

/** A record of what was changed this session, newest last. Shown in the Lab. */
export const AUDIT = [];

const AUDIT_LIMIT = 200;

/**
 * Write one value and note it down.
 *
 * `path` is dotted (`'walk.speedMul'`). It goes through here rather than being
 * assigned directly so the panel can show a tester what they have actually
 * bent — half an hour into a session that is a genuinely hard question to
 * answer from memory, and "why is this run behaving like that" is exactly the
 * kind of bug a debug tool should not be able to cause silently.
 */
export function setOverride(path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  let node = OVERRIDES;
  for (const key of keys) {
    if (node[key] == null || typeof node[key] !== 'object') return false;
    node = node[key];
  }
  const before = node[last];
  if (before === value) return false;
  node[last] = value;
  /**
   * The detail is the old VALUE, not a sentence about it. This file imports
   * nothing on purpose (see the header), translation included — so the wording
   * is left to the Lab tab that prints the audit. See `dump(AUDIT…)` in
   * src/admin/tab-lab.js.
   */
  note(`${path} = ${describe(value)}`, { was: describe(before) });
  return true;
}

export function getOverride(path) {
  return path.split('.').reduce((node, key) => (node == null ? node : node[key]), OVERRIDES);
}

/** Add a line to the session log. Anything the panel DOES, not just sets. */
/**
 * Write a line in the session's audit.
 *
 * `detail` is either a string that is already worded, or `{ was }` carrying the
 * value a dial used to hold — the Lab tab words that one, because wording it
 * here would mean importing the language table into a file whose whole value is
 * that it imports nothing.
 *
 * @param {string} what
 * @param {string | {was: string}} [detail]
 */
export function note(what, detail = '') {
  AUDIT.push({ at: Date.now(), what, detail });
  if (AUDIT.length > AUDIT_LIMIT) AUDIT.shift();
}

function describe(value) {
  if (value === null) return 'off';
  if (value === undefined) return 'default';
  if (Array.isArray(value)) return value.length ? `[${value.join(', ')}]` : '[]';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/** Put every dial back where the designer left it. */
export function resetOverrides() {
  const fresh = blank();
  for (const key of Object.keys(OVERRIDES)) {
    delete OVERRIDES[key];
  }
  Object.assign(OVERRIDES, fresh);
  note('overrides reset');
}

/**
 * True when anything at all is bent. The panel wears a badge when it is, and
 * so does the travel band — a tester handing a screenshot to somebody else
 * should never have to be asked "was this a real run?".
 */
export function isOverridden() {
  return JSON.stringify(OVERRIDES) !== JSON.stringify(blank());
}

/** Every path that differs from the default, for the panel's summary. */
export function activeOverrides() {
  const base = blank();
  const out = [];
  const walk = (real, def, prefix) => {
    for (const key of Object.keys(def)) {
      const path = prefix ? `${prefix}.${key}` : key;
      const a = real[key];
      const b = def[key];
      if (b && typeof b === 'object' && !Array.isArray(b)) walk(a || {}, b, path);
      else if (JSON.stringify(a) !== JSON.stringify(b)) out.push({ path, value: a, was: b });
    }
  };
  walk(OVERRIDES, base, '');
  return out;
}
