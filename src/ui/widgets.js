/**
 * SHOOT! — Shared UI widgets.
 *
 * These are the only places that know what a life, a meter, a cylinder or a
 * back button look like. Screens compose them; they never hand-roll the markup.
 *
 * The red-diamond life row has survived every version of this game since the
 * Roblox prototype and must never change shape.
 */

import { el } from '../core/dom.js';
import { play } from '../core/audio.js';
import { t } from '../core/i18n.js';
import { iconURL } from '../art/sprites-items.js';
import { uiIconURL } from '../art/sprites-ui.js';
import { registerPurse } from './gold-fly.js';

/**
 * Row of red diamonds — and, hung on the end of it, the gold ones.
 *
 * THE BAR HAS TWO HALVES AND ONLY ONE OF THEM IS YOURS
 * ---------------------------------------------------------------------------
 * Everything left of `maxLives` is the life bar the run has grown: red, healed
 * by beds and bandages, drawn hollow where it is missing. Everything right of
 * it is what a Potion hung there — gold, never hollow (a gold life you no
 * longer have is not drawn at all, because it is not a slot waiting to be
 * refilled), and spent before the red. See `bonusLives` in src/game/player.js.
 *
 * The row is built out of one kind of node in one loop rather than two, so the
 * flex row cannot disagree with itself about sizing and every animation in here
 * works on a gold diamond for free.
 *
 * @param {number} lives current
 * @param {number} maxLives capacity (missing lives are drawn hollow)
 * @param {{large?: boolean, small?: boolean, bonus?: number}} opts
 */
export function livesRow(lives, maxLives, opts = {}) {
  const size = opts.large ? 'life--lg' : opts.small ? 'life--sm' : '';
  const row = el('div.lives', { role: 'img' });
  row.dataset.size = size;
  layLives(row, lives, maxLives, opts.bonus || 0, () => el('span.life'), false);
  return row;
}

/**
 * Update a life row in place, animating the diamonds that just changed. Keeping
 * the nodes rather than rebuilding them is what makes the loss read as a hit.
 *
 * @param {number} [bonus] gold lives on the end of the bar
 */
export function updateLivesRow(row, lives, maxLives, bonus = 0) {
  layLives(row, lives, maxLives, bonus, () => el('span.life.is-gained'), true);
}

/**
 * The one place that knows what a life row looks like: grow or shrink the node
 * list to fit, then say what each diamond is. `make` is how a missing node is
 * born — silently when the row is being built, with the gain animation when one
 * appears on a row somebody is already looking at — and `animate` is the same
 * distinction for the other direction: a diamond that empties while being
 * watched takes the hit, one that is merely drawn empty does not.
 */
function layLives(row, lives, maxLives, bonus, make, animate) {
  const size = row.dataset.size || '';
  const reds = Math.ceil(maxLives);
  const golds = Math.ceil(Math.max(0, bonus));
  while (row.children.length < reds + golds) {
    const life = make();
    if (size) life.classList.add(size);
    row.append(life);
  }
  while (row.children.length > reds + golds) row.lastElementChild.remove();

  [...row.children].forEach((node, i) => {
    const gold = i >= reds;
    const fill = gold
      ? Math.max(0, Math.min(1, bonus - (i - reds)))
      : Math.max(0, Math.min(1, lives - i));
    const wasFull = !node.classList.contains('is-empty');
    node.classList.toggle('is-bonus', gold);
    node.classList.toggle('is-empty', fill === 0);
    node.classList.toggle('is-half', fill === 0.5);
    if (animate && wasFull && fill !== 1) {
      node.classList.remove('is-lost');
      void node.offsetWidth; // restart the animation
      node.classList.add('is-lost');
    }
  });
  row.setAttribute(
    'aria-label',
    bonus > 0
      ? t('{lives} of {max} lives, plus {bonus} bonus', { lives, max: maxLives, bonus })
      : t('{lives} of {max} lives', { lives, max: maxLives }),
  );
}

/**
 * A revolver cylinder: every chamber is drawn, loaded ones hold a round.
 *
 * This is why the duel no longer prints "no bullets" under each fighter — an
 * empty gun is six dark holes, which needs no caption.
 *
 * @param {number} loaded @param {number} chambers
 */
export function cylinder(loaded, chambers = 6) {
  const node = el('div.cylinder', {
    role: 'img',
    'aria-label': t('{loaded} of {chambers} chambers loaded', { loaded, chambers }),
  });
  for (let i = 0; i < chambers; i++) {
    node.append(el('span.chamber', { class: i < loaded ? 'is-loaded' : '' }));
  }
  return node;
}

/** Update a cylinder in place, flaring only the chambers that just filled. */
export function updateCylinder(node, loaded) {
  [...node.children].forEach((chamber, i) => {
    const wasLoaded = chamber.classList.contains('is-loaded');
    const isLoaded = i < loaded;
    chamber.classList.toggle('is-loaded', isLoaded);
    chamber.classList.remove('is-fresh');
    if (isLoaded && !wasLoaded) {
      void chamber.offsetWidth;
      chamber.classList.add('is-fresh');
    }
  });
  node.setAttribute(
    'aria-label',
    t('{loaded} of {chambers} chambers loaded', { loaded, chambers: node.children.length }),
  );
}

/** A small pixel item icon. `scale` is a multiple of the 16px source. */
export function icon(name, scale = 1.5, className = '') {
  return el('img.pixel', {
    src: iconURL(name, 2),
    alt: '',
    'aria-hidden': 'true',
    class: className,
    style: { width: `${Math.round(16 * scale)}px`, height: `${Math.round(16 * scale)}px` },
    draggable: 'false',
  });
}

/**
 * A pixel interface icon — back arrows, crosses, the help mark.
 *
 * Everything the chrome used to say with a typed character (`◀`, `✕`, `?`)
 * comes from here instead, so it is drawn in the game's own palette at the
 * game's own resolution rather than borrowed from the system font.
 */
export function uiIcon(name, scale = 1.25, className = '') {
  return el('img.pixel', {
    src: uiIconURL(name, 2),
    alt: '',
    'aria-hidden': 'true',
    class: className,
    style: { width: `${Math.round(16 * scale)}px`, height: `${Math.round(16 * scale)}px` },
    draggable: 'false',
  });
}

/**
 * Gold counter chip. Returns the element; call `setValue` to update it.
 *
 * It also REGISTERS itself as a purse (src/ui/gold-fly.js) so money earned
 * anywhere on the screen has something to fly to. Whichever chip was mounted
 * last catches the coins, which means a shop's own pill takes them while the
 * counter is open and the travel band takes them on the road — neither of them
 * has to know the other is there. `dispose()` unregisters; every screen that
 * mounts one already tears its band down.
 */
export function goldChip(gold, tip = 'Gold') {
  const value = el('span', { text: String(gold) });
  const chip = el('span.chip.chip--gold', { 'data-tip': tip }, [icon('coin', 1), value]);
  chip.setValue = (next) => {
    value.textContent = String(next);
    chip.classList.remove('is-bumped');
    void chip.offsetWidth;
    chip.classList.add('is-bumped');
  };
  const unregister = registerPurse(
    chip,
    (next) => chip.setValue(next),
    () => Number(value.textContent) || 0,
  );
  chip.dispose = unregister;
  return chip;
}

/**
 * A vital gauge: an icon, a notched track, and the number inside the track.
 *
 * It replaced a stacked meter — a label row with the value on the far right,
 * and a bar underneath it — which was as tall as the whole rest of the travel
 * band and, given a full-width row to sit in, drew a metre-long hunger bar.
 * Everything is on one line here, so the band stays one line, and the number
 * rides inside the track instead of at the other end of the strip from it.
 *
 * The notches are the point. A smooth bar at 40% is a percentage; ten ration
 * marks with four of them left is a supply, and the player can read it without
 * reading the number at all.
 *
 * `setRate` is how a gauge says it is emptying faster than normal — a badge
 * with the multiplier on it, and a state class on the track so the track can
 * show the reason (see the scoured hunger gauge in styles/ui.css). A rate
 * change the player cannot see is a difficulty change they can only discover
 * by losing to it.
 *
 * @returns {{
 *   node: HTMLElement,
 *   track: HTMLElement,
 *   set(ratio: number, text?: string): void,
 *   setRate(rate: {text: string, tip?: string, state?: string} | null): void,
 * }}
 */
export function gauge({ label, iconName, ratio = 1, value = '', tip = '' } = {}) {
  const fill = el('div.gauge-fill', { style: { width: `${clamp01(ratio) * 100}%` } });
  const valueNode = el('span.gauge-value', { text: value });
  const track = el('div.gauge-track', {}, [fill, el('span.gauge-notches'), valueNode]);
  const rateNode = el('span.gauge-rate', { hidden: true });
  const node = el('div.gauge', {
    role: 'meter',
    'aria-label': label,
    'aria-valuemin': '0',
    'aria-valuemax': '100',
    'aria-valuenow': String(Math.round(clamp01(ratio) * 100)),
    'data-tip': tip || label,
  }, [
    iconName ? icon(iconName, 0.9, 'gauge-icon') : null,
    label ? el('span.gauge-label', { text: label }) : null,
    track,
    rateNode,
  ]);

  let rateState = null;
  applyLevel(track, clamp01(ratio));

  return {
    node,
    track,
    set(nextRatio, nextValue) {
      const r = clamp01(nextRatio);
      fill.style.width = `${r * 100}%`;
      applyLevel(track, r);
      node.setAttribute('aria-valuenow', String(Math.round(r * 100)));
      if (nextValue != null) valueNode.textContent = nextValue;
    },
    setRate(rate) {
      if (rateState) track.classList.remove(rateState);
      rateState = rate?.state || null;
      rateNode.hidden = !rate;
      rateNode.textContent = rate?.text || '';
      if (rate?.tip) rateNode.dataset.tip = rate.tip;
      else delete rateNode.dataset.tip;
      if (rateState) track.classList.add(rateState);
    },
  };
}

/** Three thresholds, one class each: getting low, nearly gone, gone. */
function applyLevel(track, r) {
  track.classList.toggle('is-warn', r <= 0.45 && r > 0.2);
  track.classList.toggle('is-low', r <= 0.2 && r > 0);
  track.classList.toggle('is-empty', r <= 0);
}

/**
 * Rarity chip — only ever shown for rare and legendary.
 *
 * Common is the default for most of the catalogue, so a "COMMON" chip on every
 * card was noise: it appeared so often it stopped carrying information, while
 * the card's top edge and the icon frame already say the same thing.
 */
export function rarityChip(rarity) {
  if (rarity === 'common') return null;
  // The class keeps the id; only the WORD is translated, and it is passed as a
  // child rather than as `text` so the sentence and the class cannot be
  // confused for one another.
  return el(`span.chip.chip--${rarity}`, {}, [t(rarity)]);
}

/** Stat tile for overviews and profiles. */
export function statTile(label, value, iconName) {
  return el('div.stat-tile', {}, [
    el('span.k', { text: label }),
    el('span.v', {}, [iconName ? icon(iconName, 1) : null, String(value)]),
  ]);
}


/**
 * The game's own dropdown.
 *
 * WHY THIS IS NOT A `<select>`
 * ---------------------------------------------------------------------------
 * A native select paints itself with the operating system's list: white on
 * grey on macOS, a full-screen wheel on iOS, a flat sheet on Android. Every
 * other control in this game — the switches, the sliders, the buttons, the
 * chips — is carved wood and bone, and the one place the player chose anything
 * from a list was the one place the game stopped looking like itself. Worse,
 * none of it could be styled: `appearance: none` reaches the closed field and
 * nothing at all reaches the open menu.
 *
 * So the list is ours. It is a button and a panel of buttons, which means it
 * takes the same borders, the same display face and the same focus ring as
 * everything else, and it works the same on every platform the game runs on.
 *
 * IT IS DELIBERATELY GENERAL
 * ---------------------------------------------------------------------------
 * Language is the reason it exists, but nothing in here knows that. It takes a
 * list of `{ value, label, detail, disabled }`, hands back the value that was
 * picked, and every other list in the game has been moved onto it — the
 * difficulty on an empty save slot, the online room form, the admin panel's
 * fields. The next screen that needs a choice should use this and not reach
 * for a `<select>`.
 *
 * ACCESSIBILITY
 * ---------------------------------------------------------------------------
 * The button is `aria-haspopup="listbox"`, the panel is a `listbox` and each
 * row is an `option` with `aria-selected` — so a screen reader gets the same
 * thing a native select would give it. Up and Down move, Home and End jump,
 * Enter and Space pick, Escape closes and puts focus back on the button, Tab
 * closes and moves on. A pointer anywhere else on the page closes it too.
 *
 * The panel is mounted on `#app` rather than inside the field and positioned
 * from the button's rectangle, because a list that opens inside a scrolling
 * panel gets clipped by it — which is exactly what happened the first time
 * this was tried inside the settings screen.
 *
 * @param {{
 *   value: any,
 *   options: Array<{ value: any, label: string, detail?: string, disabled?: boolean }>,
 *   onChange?: (value: any) => void,
 *   label?: string,
 *   tip?: string,
 *   placeholder?: string,
 *   grow?: boolean,
 * }} opts
 * @returns {HTMLElement} the field, with `setValue(value)` on it
 */
export function select({
  value,
  options = [],
  onChange,
  label,
  tip,
  placeholder = 'Choose',
  grow = false,
} = {}) {
  let current = value;
  let menu = null;
  /** Which row the keyboard is on while the menu is open. */
  let cursor = Math.max(0, options.findIndex((o) => same(o.value, current)));

  const text = el('span.pick-value');
  const button = el('button.btn.pick-btn', {
    type: 'button',
    'aria-haspopup': 'listbox',
    'aria-expanded': 'false',
    'aria-label': label,
    'data-tip': tip,
    onclick: () => (menu ? close() : open()),
    /**
     * Only ever OPENS. Once the list is up, `onKey` below owns the keyboard —
     * it is bound on the window in the capture phase, so a key handled here as
     * well would be handled twice and Down would skip a row.
     */
    onkeydown: (e) => {
      if (menu) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open();
      }
    },
  }, [text, uiIcon('chevronDown', 0.9, 'pick-arrow')]);

  const field = el(`div.pick${grow ? '.grow' : ''}`, {}, [button]);

  function paint() {
    const chosen = options.find((o) => same(o.value, current));
    text.textContent = chosen ? t(chosen.label) : t(placeholder);
  }
  paint();

  // --- the panel ----------------------------------------------------------

  function open() {
    if (menu || !options.length) return;
    cursor = Math.max(0, options.findIndex((o) => same(o.value, current)));
    menu = el('div.pick-menu', { role: 'listbox', 'aria-label': label }, options.map((opt, i) =>
      el('button.pick-option', {
        type: 'button',
        role: 'option',
        'aria-selected': String(same(opt.value, current)),
        disabled: opt.disabled || null,
        class: same(opt.value, current) ? 'is-chosen' : '',
        onclick: () => choose(i),
        onpointerenter: () => {
          if (opt.disabled) return;
          cursor = i;
          highlight();
        },
      }, [
        el('span.pick-option-label', { text: t(opt.label) }),
        opt.detail ? el('span.pick-option-detail', { text: t(opt.detail) }) : null,
        same(opt.value, current) ? uiIcon('check', 0.85, 'pick-tick') : null,
      ])));

    (document.getElementById('app') || document.body).append(menu);
    button.setAttribute('aria-expanded', 'true');
    field.classList.add('is-open');
    position();
    highlight();
    play('click');

    window.addEventListener('pointerdown', onOutside, true);
    window.addEventListener('keydown', onKey, true);
    // Capture, so a list that opened over a scrolling panel follows it rather
    // than hanging in the air where the field used to be.
    window.addEventListener('scroll', position, true);
    window.addEventListener('resize', position);
  }

  function close({ focus = false } = {}) {
    if (!menu) return;
    menu.remove();
    menu = null;
    button.setAttribute('aria-expanded', 'false');
    field.classList.remove('is-open');
    window.removeEventListener('pointerdown', onOutside, true);
    window.removeEventListener('keydown', onKey, true);
    window.removeEventListener('scroll', position, true);
    window.removeEventListener('resize', position);
    if (focus) button.focus();
  }

  /**
   * Under the field, unless there is no room under the field — in which case
   * above it. Fixed to the viewport, so nothing it opens inside can clip it.
   */
  function position() {
    if (!menu) return;
    const rect = button.getBoundingClientRect();
    const gap = 6;
    menu.style.minWidth = `${Math.round(rect.width)}px`;
    menu.style.left = `${Math.round(rect.left)}px`;
    const height = menu.offsetHeight;
    const below = window.innerHeight - rect.bottom;
    if (below < height + gap && rect.top > height + gap) {
      menu.style.top = `${Math.round(rect.top - height - gap)}px`;
    } else {
      menu.style.top = `${Math.round(rect.bottom + gap)}px`;
    }
    // Never off the right-hand edge on a narrow screen.
    const overflow = menu.getBoundingClientRect().right - (window.innerWidth - 8);
    if (overflow > 0) menu.style.left = `${Math.round(rect.left - overflow)}px`;
  }

  function highlight() {
    if (!menu) return;
    [...menu.children].forEach((node, i) => node.classList.toggle('is-cursor', i === cursor));
    menu.children[cursor]?.scrollIntoView({ block: 'nearest' });
  }

  /** Step the cursor, skipping anything that cannot be picked. */
  function move(step) {
    if (!menu) return;
    for (let i = 0; i < options.length; i++) {
      cursor = (cursor + step + options.length) % options.length;
      if (!options[cursor].disabled) break;
    }
    highlight();
    play('hover');
  }

  function choose(i) {
    const opt = options[i];
    if (!opt || opt.disabled) return;
    const changed = !same(opt.value, current);
    current = opt.value;
    paint();
    close({ focus: true });
    play('click');
    if (changed && onChange) onChange(opt.value);
  }

  const onOutside = (e) => {
    if (!menu) return;
    if (menu.contains(e.target) || field.contains(e.target)) return;
    close();
  };

  const onKey = (e) => {
    if (!menu) return;
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        close({ focus: true });
        break;
      case 'ArrowDown':
        e.preventDefault();
        move(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        move(-1);
        break;
      case 'Home':
        e.preventDefault();
        cursor = 0;
        highlight();
        break;
      case 'End':
        e.preventDefault();
        cursor = options.length - 1;
        highlight();
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        choose(cursor);
        break;
      case 'Tab':
        close();
        break;
      default:
        break;
    }
  };

  /** Set the field from outside without firing `onChange`. */
  field.setValue = (next) => {
    current = next;
    paint();
  };
  /** Screens that unmount while a list is open must not leave it on the page. */
  field.dispose = () => close();
  return field;
}

/** Values may be strings, numbers or null; compare them the way a list means. */
function same(a, b) {
  return a === b || (a == null && b == null);
}

/**
 * Switch-style toggle.
 * @returns {HTMLLabelElement}
 */
export function toggle({ label, checked = false, onChange, tip }) {
  const input = el('input', {
    type: 'checkbox',
    checked,
    onchange: (e) => onChange && onChange(e.target.checked),
  });
  return el('label.switch', { 'data-tip': tip }, [
    input,
    el('span.track'),
    el('span.switch-label', { text: label }),
  ]);
}

/** Back button — same look, same label, same place on every screen. */
export function backButton(onClick, label = 'Back') {
  return el('button.btn.btn--sm.btn--ghost', {
    onclick: onClick,
    'aria-label': label,
  }, [uiIcon('chevronLeft', 1), el('span', { text: label })]);
}

/** Square icon-only button. `name` is a UI icon. */
export function iconButton(name, { onClick, label, tip, variant = 'btn--ghost' } = {}) {
  return el(`button.btn.btn--sm.btn--icon.${variant}`, {
    onclick: onClick,
    'aria-label': label,
    'data-tip': tip || label,
  }, [uiIcon(name, 1.1)]);
}

/** The close cross used by every dialog. */
export function closeButton(onClick) {
  return iconButton('close', { onClick, label: 'Close' });
}

/** Empty-state block. */
export function emptyState(title, detail, iconName) {
  return el('div.empty', {}, [
    iconName ? icon(iconName, 2.5) : null,
    el('div.empty-title', { text: title }),
    detail ? el('p', { text: detail }) : null,
  ]);
}

function clamp01(n) {
  return Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));
}
