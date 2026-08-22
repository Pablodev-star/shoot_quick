/**
 * SHOOT! — Screen router.
 *
 * Every full-screen view (title, story, online, shop, duel, ...) registers here.
 * The router owns:
 *   - mounting / unmounting screens into #screen-root
 *   - the animated transition between them (a saloon-door style wipe)
 *   - a back stack, so every screen gets a working "Back" without wiring
 *
 * A screen is `{ id, mount(root, params) -> void, unmount?() -> void }`.
 */

import { EVENTS, emit } from './events.js';
import { clearNode } from './dom.js';
import { play } from './audio.js';

const screens = new Map();
const stack = [];
let current = null;
let root = null;
let overlay = null;
let transitioning = false;
/** The navigation asked for while one was already running. See `go`. */
let pending = null;

export function initRouter(rootNode, overlayNode) {
  root = rootNode;
  overlay = overlayNode;
}

export function register(screen) {
  screens.set(screen.id, screen);
}

export function currentScreen() {
  return current ? current.id : null;
}

const TRANSITION_MS = 320;

function runTransition(phase) {
  if (!overlay) return Promise.resolve();
  overlay.classList.toggle('is-closing', phase === 'in');
  overlay.classList.toggle('is-opening', phase === 'out');
  return new Promise((resolve) => setTimeout(resolve, TRANSITION_MS));
}

/**
 * Navigate to a screen.
 * @param {string} id
 * @param {object} params passed to the screen's mount()
 * @param {{replace?: boolean, silent?: boolean}} opts
 */
export async function go(id, params = {}, opts = {}) {
  const screen = screens.get(id);
  if (!screen) {
    console.error(`[router] unknown screen "${id}"`);
    return;
  }

  /**
   * A NAVIGATION ASKED FOR DURING A TRANSITION IS QUEUED, NEVER DROPPED
   * -------------------------------------------------------------------------
   * This used to be `if (transitioning) return;` — a guard against two screens
   * mounting on top of each other, which is a real thing to guard against and
   * the wrong way to do it. A `go` is not always a button press: the walk
   * engine fires ENCOUNTER_REACHED from inside its own frame, and the run
   * controller answers that with a `go`. The doors are open for 640 ms around
   * every mount, and the walk is running for the second half of that — so an
   * encounter that came up inside the out-swing was silently thrown away.
   *
   * The engine had already paused itself and marked the event resolved by
   * then, so nothing was ever going to fire it again: the player stood on an
   * empty road, in the walk's idle pose, with no way forward. THAT is the
   * "loading a slot freezes the character" bug — a saved position lands
   * wherever it lands, and any save made within about twenty pixels of the
   * next encounter reloaded straight into the dead window.
   *
   * So the request is remembered instead. The transition in flight finishes
   * its own mount, then runs whatever came in behind it; the last one asked
   * for wins, because a screen that has been superseded before it was ever
   * shown is not worth showing.
   */
  if (transitioning) {
    const superseded = pending;
    const queued = { id, params, opts };
    pending = queued;
    // The one it replaced is never going to be mounted; its caller is told so
    // now rather than left waiting on a promise nothing will settle.
    superseded?.resolve?.();
    return new Promise((resolve) => {
      queued.resolve = resolve;
    });
  }

  transitioning = true;
  let next = { id, params, opts };
  try {
    while (next) {
      pending = null;
      try {
        await navigate(next.id, next.params, next.opts);
      } catch (err) {
        console.error(`[router] navigation to "${next.id}" threw`, err);
      }
      next.resolve?.();
      next = pending;
    }
  } finally {
    pending = null;
    transitioning = false;
  }
}

/** One mount, doors and all. Only ever called from `go`. */
async function navigate(id, params, opts) {
  const screen = screens.get(id);
  if (!screen) return;

  if (!opts.silent) play(opts.back ? 'back' : 'click');

  await runTransition('in');

  if (current && current.unmount) {
    try {
      current.unmount();
    } catch (err) {
      console.error(`[router] unmount of "${current.id}" threw`, err);
    }
  }
  if (current && !opts.replace && !opts.back) stack.push({ id: current.id, params: current.params });

  // Overlays (inventory, battle overview, dialogs) live outside #screen-root so
  // they can cover the whole app. Clear any that survived the old screen.
  document.querySelectorAll('#app > .modal-backdrop').forEach((node) => node.remove());

  clearNode(root);
  root.dataset.screen = id;
  current = { id, params, unmount: null };
  const unmount = screen.mount(root, params);
  current.unmount = typeof unmount === 'function' ? unmount : screen.unmount;

  emit(EVENTS.SCREEN_CHANGED, { id, params });

  await runTransition('out');
}

/** Pop back to the previous screen (or to a fallback when the stack is empty). */
export async function back(fallback = 'title') {
  const prev = stack.pop();
  if (prev) await go(prev.id, prev.params, { back: true });
  else await go(fallback, {}, { back: true });
}

/**
 * Rebuild the screen that is already up, in place.
 *
 * This exists for exactly one caller: the language setting. Half of the game's
 * text is baked into pixel canvases and DOM nodes at mount time, so there is no
 * patching it — the honest way to change the language of a screen is to build
 * the screen again. No doors, no sound and no back-stack entry, because nothing
 * NAVIGATED: the player is still on the settings screen looking at the row they
 * just changed, and it should simply be in Spanish now.
 */
export function remount() {
  if (!current || !root) return;
  const { id, params } = current;
  const screen = screens.get(id);
  if (!screen) return;

  if (current.unmount) {
    try {
      current.unmount();
    } catch (err) {
      console.error(`[router] unmount of "${id}" threw`, err);
    }
  }
  clearNode(root);
  current = { id, params, unmount: null };
  const unmount = screen.mount(root, params);
  current.unmount = typeof unmount === 'function' ? unmount : screen.unmount;
}

/** Wipe the back stack — used when entering/leaving a run. */
export function resetStack() {
  stack.length = 0;
}
