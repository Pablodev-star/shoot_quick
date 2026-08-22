/**
 * SHOOT! — The Admin Panel's door.
 *
 * Two locks, in this order:
 *
 *   1. THE SIGIL. Three big letters drawn over the road while you are walking —
 *      see src/admin/sigil.js for what counts as one and why it cannot be
 *      stumbled into. Nothing on the screen hints that it exists.
 *   2. THE PASSPHRASE. The sigil only opens a box to type it into. Get it right
 *      and the slot is an admin slot from then on; get it wrong three times and
 *      that slot never opens again.
 *
 * …AND, ONCE THOSE TWO HAVE BEEN GOT PAST, A BUTTON
 * ---------------------------------------------------------------------------
 * A lock is worth what it is worth the first time. An unlocked slot is unlocked
 * for good, so from then on it also gets a one-tap button on the road, shown by
 * default and hideable from inside the panel — see `shortcutShown` below. It is
 * a shortcut past the ceremony, never past the lock: it refuses outright for a
 * slot that has not already been through both of the above.
 *
 * THREE ATTEMPTS, PER SLOT, FOREVER
 * ---------------------------------------------------------------------------
 * The count is kept against the SLOT NUMBER and not against the run in it, and
 * it is written through the ordinary storage driver, so it outlives everything
 * a run can do to itself:
 *
 *   - dying erases the save and does not give the attempts back
 *   - erasing the slot by hand from the picker does not either
 *   - starting a new run in slot 2 inherits whatever slot 2 has left
 *
 * That is what "permanent" means here, and it is the point of a three-guess
 * lock: a tester is told the phrase and types it, and anybody else spends the
 * three guesses they will ever have on a word they have never seen. There is
 * deliberately no cooldown, no hint, and no way back — a lockout that can be
 * waited out is a lockout that can be brute-forced by somebody patient.
 *
 * THE PHRASE IS NOT IN THIS FILE
 * ---------------------------------------------------------------------------
 * What is stored is a fingerprint of it. That is not cryptography and it is not
 * pretending to be — anything shipped to a browser can be read — it is the same
 * courtesy as not printing the answer at the bottom of the page: somebody
 * reading the source to find out how the door works does not have the phrase
 * handed to them on the way past. Case and surrounding spaces are ignored
 * before hashing, because burning one of three permanent attempts on a capital
 * letter would be a cruel joke rather than a security measure.
 */

import { read, write } from '../core/storage.js';
import { tPlural } from '../core/i18n.js';
import { el, setText } from '../core/dom.js';
import { attachButtonSounds, play } from '../core/audio.js';
import { closeButton } from '../ui/widgets.js';
import { toast } from '../ui/toast.js';

const GATE_KEY = 'admin.gate';

/** Guesses a slot ever gets. */
export const MAX_ATTEMPTS = 3;

/**
 * How long the road holds its breath after a letter lands, in milliseconds.
 *
 * Five seconds is a generous beat between two big strokes and nowhere near
 * long enough to be worth anything to somebody who is not drawing the sigil —
 * and the clock is restarted by every letter, so a whole sequence is one held
 * breath rather than three. See `armSigil`.
 */
const HOLD_MS = 5000;

/** The fingerprint of the passphrase, lower-cased and trimmed. See above. */
const PHRASE_FINGERPRINT = '1d7s2pv-rpoffh';

/**
 * Two independent 32-bit walks over the string, printed base 36. Two of them
 * rather than one so that the odds of a wrong phrase happening to collide are
 * somewhere past astronomical rather than merely small.
 */
function fingerprint(text) {
  let h1 = 0x811c9dc5 >>> 0;
  let h2 = 0x01000193 >>> 0;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619) >>> 0;
    h2 = Math.imul(h2 + c + i, 2246822519) >>> 0;
    h2 = ((h2 << 13) | (h2 >>> 19)) >>> 0;
  }
  return `${h1.toString(36)}-${h2.toString(36)}`;
}

/** The whole ledger: `{ slots: { "1": { attempts, unlocked, at } } }`. */
async function readGate() {
  const stored = await read(GATE_KEY);
  return { slots: {}, ...(stored || {}) };
}

async function writeGate(gate) {
  await write(GATE_KEY, gate);
  return gate;
}

function blankSlot() {
  return { attempts: 0, unlocked: false, at: 0, shortcut: true };
}

/** What a slot's door looks like right now. */
export async function slotAccess(slot) {
  const gate = await readGate();
  const record = { ...blankSlot(), ...(gate.slots[slot] || {}) };
  shortcuts.set(Number(slot), record.shortcut !== false);
  return {
    ...record,
    shortcut: record.shortcut !== false,
    left: Math.max(0, MAX_ATTEMPTS - record.attempts),
    locked: !record.unlocked && record.attempts >= MAX_ATTEMPTS,
  };
}

// ---------------------------------------------------------------------------
// The button on the road
// ---------------------------------------------------------------------------

/**
 * ONCE THE DOOR IS OPEN, IT DOES NOT HAVE TO BE PICKED AGAIN
 * ---------------------------------------------------------------------------
 * The sigil and the passphrase are a lock, and a lock is worth exactly as much
 * as the first time it is opened. Making a tester draw three metre-high letters
 * and type a word every time they want to look at the Basin's boss is not
 * security, it is a toll — the slot is already an admin slot, permanently, and
 * anybody who can reach that state can reach it again in twenty seconds.
 *
 * So an unlocked slot gets a button on the road that opens the panel directly.
 * It shows up by itself the moment the passphrase is accepted, because that is
 * the moment it becomes useful, and it can be put away from inside the panel
 * for the one job it gets in the way of: taking a screenshot of the road, or
 * handing the game to somebody who should not be looking at the workbench. The
 * sigil still works with the button hidden, which is what makes hiding it safe.
 *
 * The preference is written against the SLOT, next to the unlock itself, so it
 * survives a reload the way the unlock does — and it is mirrored in memory so
 * that a screen can ask for it while it is building its own DOM.
 */
const shortcuts = new Map();

/** What the last read of this slot said, without going to storage. */
export function shortcutShown(slot) {
  return shortcuts.get(Number(slot)) !== false;
}

/** Show or hide the road button for a slot. Written through immediately. */
export async function setShortcutShown(slot, shown) {
  shortcuts.set(Number(slot), !!shown);
  const gate = await readGate();
  const record = { ...blankSlot(), ...(gate.slots[slot] || {}) };
  record.shortcut = !!shown;
  gate.slots[slot] = record;
  await writeGate(gate);
  return !!shown;
}

/**
 * Spend one attempt on a slot.
 *
 * The attempt is written down BEFORE the answer is checked, so closing the tab
 * mid-guess is not a way to get a free one.
 *
 * @returns {Promise<{ok: boolean, left: number, locked: boolean}>}
 */
export async function attemptPhrase(slot, typed) {
  const gate = await readGate();
  const record = { ...blankSlot(), ...(gate.slots[slot] || {}) };
  if (record.unlocked) return { ok: true, left: MAX_ATTEMPTS - record.attempts, locked: false };
  if (record.attempts >= MAX_ATTEMPTS) return { ok: false, left: 0, locked: true };

  record.attempts += 1;
  const ok = fingerprint(String(typed || '').trim().toLowerCase()) === PHRASE_FINGERPRINT;
  if (ok) {
    record.unlocked = true;
    record.at = Date.now();
  }
  gate.slots[slot] = record;
  await writeGate(gate);
  return {
    ok,
    left: Math.max(0, MAX_ATTEMPTS - record.attempts),
    locked: !ok && record.attempts >= MAX_ATTEMPTS,
  };
}

/**
 * Every slot's standing, for the panel's own "how did I get in here" line.
 */
export async function allSlotAccess(count = 3) {
  const out = [];
  for (let slot = 1; slot <= count; slot++) out.push({ slot, ...(await slotAccess(slot)) });
  return out;
}

// ---------------------------------------------------------------------------
// The box you type it into
// ---------------------------------------------------------------------------

/**
 * Ask for the phrase.
 *
 * It says almost nothing: no title explaining what it opens, no hint, and no
 * mention of the word "admin" anywhere on it. Somebody who has drawn the sigil
 * by accident sees a locked box and closes it, and the three attempts are only
 * spent by somebody who types something.
 *
 * @param {number} slot
 * @returns {Promise<boolean>} true when the slot is now unlocked
 */
export function openPhrasePrompt(slot) {
  return new Promise((resolve) => {
    let settled = false;
    const input = el('input.input', {
      type: 'password',
      autocomplete: 'off',
      autocapitalize: 'off',
      spellcheck: 'false',
      'aria-label': 'Passphrase',
      placeholder: '',
    });
    const status = el('p.field-hint.center', { text: '' });
    const submit = el('button.btn.btn--sm.btn--gold', { onclick: () => tryIt() }, ['Enter']);

    const backdrop = el('div.modal-backdrop.gate-backdrop', {
      onclick: (e) => {
        if (e.target === backdrop) finish(false);
      },
    });

    function finish(result) {
      if (settled) return;
      settled = true;
      document.removeEventListener('keydown', onKey, true);
      backdrop.remove();
      resolve(result);
    }

    const onKey = (e) => {
      if (e.key === 'Escape') finish(false);
      if (e.key === 'Enter') {
        e.preventDefault();
        tryIt();
      }
      e.stopPropagation();
    };
    document.addEventListener('keydown', onKey, true);

    async function tryIt() {
      const typed = input.value;
      if (!typed.trim()) return;
      submit.disabled = true;
      const result = await attemptPhrase(slot, typed);
      if (result.ok) {
        play('levelUp');
        finish(true);
        return;
      }
      play('error');
      input.value = '';
      input.classList.remove('is-wrong');
      void input.offsetWidth;
      input.classList.add('is-wrong');
      if (result.locked) {
        setText(status, 'This slot is closed for good.');
        input.disabled = true;
        submit.disabled = true;
        return;
      }
      setText(status, tPlural(result.left, '1 try left on this slot.', '{count} tries left on this slot.'));
      submit.disabled = false;
    }

    const modal = el('div.panel.modal.modal--narrow.gate-modal', {
      role: 'dialog',
      'aria-label': 'Passphrase',
    }, [
      el('div.modal-header', {}, [
        el('h2.panel-title', { text: '· · ·' }),
        closeButton(() => finish(false)),
      ]),
      el('div.col', { style: { gap: 'var(--sp-3)' } }, [
        el('div.field.field--wide', {}, [input]),
        status,
      ]),
      el('div.modal-footer', { style: { justifyContent: 'center' } }, [submit]),
    ]);

    backdrop.append(modal);
    document.getElementById('app').append(backdrop);
    attachButtonSounds(backdrop);

    slotAccess(slot).then((access) => {
      if (settled) return;
      if (access.unlocked) {
        finish(true);
        return;
      }
      if (access.locked) {
        setText(status, 'This slot is closed for good.');
        input.disabled = true;
        submit.disabled = true;
        return;
      }
      setText(status, tPlural(access.left, '1 try left on this slot.', '{count} tries left on this slot.'));
      input.focus();
    });
  });
}

// ---------------------------------------------------------------------------
// Arming the road
// ---------------------------------------------------------------------------

/**
 * Watch the exploration screen for the sigil, and open whatever the slot has
 * earned when it lands.
 *
 * The walk is held QUIETLY while the letters are being drawn — nothing on the
 * screen may admit that anything is listening — and properly PAUSED from the
 * moment the third letter lands, because from there on there is a dialog on the
 * screen and an encounter arriving while a tester is typing would put a duel
 * under it. Everything here is loaded on demand: a player who never draws the
 * sigil never downloads a byte of the panel.
 *
 * @param {object} opts
 * @param {object} opts.engine the walk engine, so the road can be held
 * @param {() => number} opts.slot which permanent slot this run occupies
 * @param {() => void} [opts.onAccessChanged] called whenever this door has been
 *   through a whole open-and-close: the slot may have been unlocked by it, and
 *   the road button's visibility may have been changed from inside the panel.
 * @returns {{dispose: () => void}}
 */
export function armSigil({ engine, slot, onAccessChanged }) {
  let busy = false;
  /**
   * THE ROAD HOLDS ITS BREATH BETWEEN THE LETTERS, AND NOTHING SAYS SO
   * -------------------------------------------------------------------------
   * Drawing three letters takes a couple of seconds, and the walk does not stop
   * for it — which means an encounter can come up between the P and the L, the
   * exploration screen unmounts, and the sigil is thrown away half finished.
   * Measured across a few dozen attempts that is about one in three on a busy
   * stretch of road, which is not a door, it is a lottery.
   *
   * So the first accepted letter stops the road — but QUIETLY. The traveller
   * keeps walking, the sky keeps moving, the HUD does not change and no toast
   * appears; underneath, the odometer is frozen, the encounters are not coming
   * and the clocks are not being spent (`holdQuietly` in
   * src/explore/walk-engine.js). The old version simply paused, and a road that
   * visibly stops dead the instant a stroke lands is a road that has just told
   * a curious player that something is listening — which is the one thing a
   * door nobody is supposed to find cannot afford.
   *
   * The hold lasts HOLD_MS from the last accepted letter and every letter
   * restarts it, so P … N … L is one held breath. It ends the moment the
   * sequence completes, and it ends IMMEDIATELY on a stroke that breaks it: a
   * failed attempt does not leave the road standing still for five seconds
   * with nothing to show for it, it hands the walk straight back and the next
   * encounter arrives on the ordinary schedule.
   */
  let holding = false;
  let releaseTimer = 0;

  const watcher = createWatcherLazily();

  function createWatcherLazily() {
    let live = null;
    // The recogniser is small, but the panel behind it is not, so the import
    // is deferred to the moment somebody actually draws something.
    import('./sigil.js').then(({ createSigilWatcher }) => {
      live = createSigilWatcher({
        enabled: () => !busy && !document.querySelector('#app > .modal-backdrop'),
        onProgress: ({ index }) => {
          clearTimeout(releaseTimer);
          if (index === 0) {
            // Broken, or never started. Either way the road is the road again
            // this instant — the five seconds are not served out.
            release();
            return;
          }
          if (!holding) {
            engine.holdQuietly();
            holding = true;
          }
          // A sequence that is never finished must not leave the road held, so
          // the hold gives up on its own once the letters stop arriving.
          releaseTimer = setTimeout(release, HOLD_MS);
        },
        onComplete: open,
      });
    });
    return { dispose: () => live?.dispose() };
  }

  /** Give the walk back, if this watcher was the one holding it. */
  function release() {
    clearTimeout(releaseTimer);
    if (!holding) return;
    holding = false;
    engine.releaseQuietly();
  }

  async function open() {
    if (busy) return;
    busy = true;
    /**
     * THE QUIET HOLD ENDS HERE AND A REAL PAUSE TAKES OVER
     * -----------------------------------------------------------------------
     * Everything from this point on is a dialog on top of the road — the
     * passphrase box first, then the panel — and both of them have the same
     * problem the quiet hold was never meant to solve: an encounter arriving
     * while somebody is typing routes the run away, unmounts the exploration
     * screen and leaves a modal floating over a shop.
     *
     * The quiet hold is for the seconds when the player must not be able to
     * tell that anything is happening. Once a box is on the screen that
     * secrecy is spent, so the road stops properly and is handed back at the
     * end — if it was walking when we took it, and if the road is still the
     * thing underneath (see `showPanel`).
     */
    const wasWalking = !engine.isPaused();
    release();
    engine.pause();
    try {
      const current = slot();
      const access = await slotAccess(current);
      let allowed = access.unlocked;
      if (!allowed) {
        if (access.locked) {
          play('error');
          toast('Nothing happens', 'bad');
        } else {
          allowed = await openPhrasePrompt(current);
        }
      }
      if (allowed) await showPanel({ engine, slot: current });
    } finally {
      busy = false;
      if (wasWalking && onTheRoad()) engine.resume();
      // The slot may have just been unlocked, and the button on the road is
      // supposed to appear the moment it is — not at the next screen.
      onAccessChanged?.();
    }
  }

  return {
    dispose: () => {
      release();
      watcher.dispose();
    },
  };
}

/** True while the exploration screen is the one on the screen. */
function onTheRoad() {
  return document.getElementById('screen-root')?.dataset.screen === 'explore';
}

/**
 * Put the panel up over the road, and put the player back exactly where they
 * were when it comes down.
 *
 * The walk is a real pause this time — an encounter firing while somebody is
 * typing a number into a field would drop a duel on top of the panel — and it
 * is only resumed if the road is still the screen underneath: anything that
 * genuinely navigated (a custom battle, a jump to another world) owns the
 * screen now, and resuming a walk that is no longer on it would start the road
 * running underneath something else.
 */
async function showPanel({ engine, slot }) {
  const wasWalking = !engine.isPaused();
  engine.pause();
  try {
    const { openAdminPanel } = await import('./panel.js');
    await openAdminPanel({ engine, slot });
  } finally {
    if (wasWalking && onTheRoad()) engine.resume();
  }
}

/**
 * Open the panel for a slot that has already been through the door, with no
 * sigil and no passphrase. This is what the button on the road calls; it
 * refuses outright for a slot that was never unlocked, so it is never a way
 * past the lock, only a way past the ceremony.
 */
export async function openAdminDirect({ engine, slot }) {
  const access = await slotAccess(slot);
  if (!access.unlocked) return false;
  await showPanel({ engine, slot });
  return true;
}
