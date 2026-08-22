/**
 * SHOOT! — Minimal DOM helpers.
 *
 * The UI layer is plain HTML/CSS (no framework, no build step — it has to run
 * straight off GitHub Pages), so these four helpers stand in for one.
 *
 * THIS IS ALSO WHERE THE GAME GETS TRANSLATED
 * ---------------------------------------------------------------------------
 * `el` runs every string it is about to SHOW a person through `t` — the `text`
 * prop, the handful of attributes that are read out or hovered, and any plain
 * string passed as a child. Nothing else: ids, classes, values, srcs and event
 * handlers are untouched.
 *
 * It is done here, once, rather than at eleven hundred call sites, and the
 * reason is coverage. This game keeps its words in its data — an item's name is
 * a field on the item, an achievement's line is a field on the achievement, a
 * world is a row in a table — and every one of those reaches a person through
 * this function and nowhere else. Wrapping the call sites instead would mean
 * wrapping `item.name` in `t` in the shop, in the saddlebag, in the sell sheet,
 * in the duel bar and in the forge, and being wrong the day somebody adds a
 * sixth. Wrapping the door they all walk through cannot be forgotten.
 *
 * `t` is identity for anything the Spanish table has never heard of, so this is
 * safe on a player's own name, on a number, on an id that ended up on screen.
 * And it is safe to apply twice: a sentence already translated at its call site
 * simply misses the lookup here and comes back as itself.
 *
 * WHAT IT CANNOT DO
 * ---------------------------------------------------------------------------
 * A sentence BUILT before it arrives. `` `${n} rounds left` `` reaches this
 * function as "5 rounds left", which is in no dictionary. Those have to be
 * written as `t('{n} rounds left', { n })` where they are composed — see the
 * note on placeholders in src/core/i18n.js.
 */

import { t } from './i18n.js';

/**
 * Attributes that are shown to, or read out to, a person. Everything else an
 * element carries is machinery and must survive untranslated.
 */
const SPOKEN_ATTRS = new Set([
  'aria-label',
  'aria-description',
  'aria-placeholder',
  'aria-roledescription',
  'aria-valuetext',
  'data-tip',
  'placeholder',
  'title',
  'alt',
]);

/**
 * el('div.card#id', { onclick }, [children])
 * Tag string supports .class and #id shorthands.
 */
export function el(spec, props = {}, children = []) {
  const [tagAndId, ...classes] = String(spec).split('.');
  const [tag, id] = tagAndId.split('#');
  const node = document.createElement(tag || 'div');
  if (id) node.id = id;
  if (classes.length) node.className = classes.join(' ');

  for (const [key, value] of Object.entries(props || {})) {
    if (value == null || value === false) continue;
    if (key === 'class') node.className = `${node.className} ${value}`.trim();
    else if (key === 'html') node.innerHTML = value;
    else if (key === 'text') node.textContent = t(value);
    else if (key === 'style' && typeof value === 'object') Object.assign(node.style, value);
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (SPOKEN_ATTRS.has(key)) node.setAttribute(key, t(value));
    else node.setAttribute(key, value === true ? '' : value);
  }

  const list = Array.isArray(children) ? children : [children];
  for (const child of list) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(t(String(child))));
  }
  return node;
}

/**
 * Append children, skipping null/false/undefined.
 *
 * Native `node.append(null)` inserts the *text* "null", which is exactly the
 * kind of bug that reaches a screenshot, so conditional children must always go
 * through here (or through `el`, which filters the same way).
 */
export function appendAll(node, children) {
  for (const child of children) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(t(String(child))));
  }
  return node;
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function clearNode(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

/** Wrap a baked pixel canvas in an <img>-like element that scales crisply. */
export function pixelImg(canvas, scale = 2, className = '') {
  const img = document.createElement('img');
  img.src = canvas.toDataURL('image/png');
  img.width = canvas.width * scale;
  img.height = canvas.height * scale;
  img.className = `pixel ${className}`.trim();
  img.draggable = false;
  return img;
}

/** Promise that resolves after `ms`. */
export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
