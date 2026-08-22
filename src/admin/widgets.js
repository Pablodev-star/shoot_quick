/**
 * SHOOT! — Admin Panel widgets.
 *
 * The panel is a workbench, not a screen: it is read by somebody who already
 * knows what everything is called, it changes shape constantly, and it is
 * rebuilt in full every time anything is touched. So it gets its own small kit
 * — dense rows, a number that is always editable, a probability drawn as a bar
 * — instead of stretching the game's own widgets (`src/ui/widgets.js`) into
 * shapes they were never meant to take.
 *
 * Two rules hold across all of them:
 *   - an empty box means "no override". Every nullable field in the panel says
 *     so the same way, and every one of them prints the value the game would
 *     have used as its placeholder, so an untouched field still tells you what
 *     the number is.
 *   - nothing here validates anything. This is the tool for doing what the game
 *     will not let you do; a field that argued with the tester would be missing
 *     the point. The systems downstream clamp what they must.
 */

import { el } from '../core/dom.js';
import { select } from '../ui/widgets.js';

/** A titled block of controls. */
export function section(title, children = [], hint = null) {
  return el('section.admin-section', {}, [
    el('h3.admin-section-title', { text: title }),
    hint ? el('p.admin-hint', { text: hint }) : null,
    el('div.admin-section-body', {}, children.filter(Boolean)),
  ]);
}

/** Label on the left, control on the right, explanation underneath. */
export function row(label, control, hint = null) {
  return el('div.admin-row', {}, [
    el('div.admin-row-label', {}, [
      el('span.admin-label', { text: label }),
      hint ? el('span.admin-hint', { text: hint }) : null,
    ]),
    el('div.admin-row-control', {}, [control]),
  ]);
}

/**
 * A number you can type into or nudge.
 *
 * `onChange` is called with a real number, or with null when the field is
 * emptied — which is how "no override" is expressed everywhere in the panel.
 */
export function numberField({
  value,
  min = null,
  max = null,
  step = 1,
  onChange,
  placeholder = '',
  width = '110px',
  nullable = false,
}) {
  const input = el('input.input.admin-number', {
    type: 'number',
    value: value == null ? '' : String(value),
    step: String(step),
    placeholder,
    style: { width },
  });
  if (min != null) input.min = String(min);
  if (max != null) input.max = String(max);
  input.addEventListener('change', () => {
    const raw = input.value.trim();
    if (raw === '') {
      onChange(nullable ? null : 0);
      return;
    }
    onChange(Number(raw));
  });
  return input;
}

export function textField({ value = '', onChange, placeholder = '', width = '180px' }) {
  const input = el('input.input', {
    type: 'text',
    value,
    placeholder,
    autocomplete: 'off',
    spellcheck: 'false',
    style: { width },
  });
  input.addEventListener('change', () => onChange(input.value));
  return input;
}

/**
 * A dropdown.
 *
 * `options` is `[{ value, label }]`, and the values are matched by shape rather
 * than by identity — the tabs in here hand it objects and nulls, not just
 * strings, so `===` would never find the current one. The index is what
 * actually round-trips through the widget; the value is looked back up from it.
 *
 * It is the game's own list (src/ui/widgets.js), like every other list in the
 * product. The admin panel borrows the game's kit rather than the browser's:
 * that is the rule the whole panel is built on.
 */
export function selectField({ value, options, onChange, width = '180px' }) {
  const chosen = options.findIndex((opt) => sameValue(opt.value, value));
  const field = select({
    value: chosen < 0 ? null : chosen,
    options: options.map((opt, i) => ({ value: i, label: opt.label })),
    onChange: (i) => onChange(options[i].value),
  });
  field.style.width = width;
  return field;
}

function sameValue(a, b) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

/** A slider with its value printed beside it. */
export function sliderField({ value, min, max, step = 0.05, onChange, format = (n) => n.toFixed(2) }) {
  const out = el('span.admin-slider-value', { text: format(value) });
  const input = el('input.admin-slider', {
    type: 'range',
    min: String(min),
    max: String(max),
    step: String(step),
    value: String(value),
  });
  input.addEventListener('input', () => {
    out.textContent = format(Number(input.value));
  });
  input.addEventListener('change', () => onChange(Number(input.value)));
  return el('div.admin-slider-wrap', {}, [input, out]);
}

/** An on/off switch that reports its new state. */
export function switchField({ checked, onChange, label = '' }) {
  const input = el('input', { type: 'checkbox', checked });
  input.addEventListener('change', () => onChange(input.checked));
  return el('label.switch.admin-switch', {}, [
    input,
    el('span.track'),
    label ? el('span.switch-label', { text: label }) : null,
  ]);
}

/** A button, in the panel's own compact size. */
export function action(label, onClick, { variant = '', tip = '', disabled = false } = {}) {
  return el(`button.btn.btn--sm.admin-btn${variant ? `.${variant}` : ''}`, {
    onclick: onClick,
    'data-tip': tip || null,
    disabled,
  }, [label]);
}

/** A wrapped row of buttons. */
export function buttons(list) {
  return el('div.admin-buttons', {}, list.filter(Boolean));
}

/** A dense key/value readout. Values may be nodes or strings. */
export function readout(rows) {
  return el('div.admin-readout', {}, rows.filter(Boolean).map(([k, v, tip]) =>
    el('div.admin-kv', { 'data-tip': tip || null }, [
      el('span.k', { text: k }),
      el('span.v', {}, [v instanceof Node ? v : String(v)]),
    ])));
}

/**
 * A probability, drawn.
 *
 * The bar is the point: a table of weights is a table, and what a tester needs
 * to see at a glance on the road map is which of five outcomes is actually
 * likely. The number is printed too, because "likely" is not a figure you can
 * file a bug against.
 */
export function probBar(label, p, detail = '') {
  const pct = Math.max(0, Math.min(1, p));
  return el('div.admin-prob', { 'data-tip': detail || null }, [
    el('div.admin-prob-head', {}, [
      el('span.admin-prob-label', { text: label }),
      el('span.admin-prob-value', { text: `${(pct * 100).toFixed(1)}%` }),
    ]),
    el('div.admin-prob-track', {}, [
      el('div.admin-prob-fill', { style: { width: `${pct * 100}%` } }),
    ]),
    detail ? el('div.admin-prob-detail', { text: detail }) : null,
  ]);
}

/** Monospaced block for dumps — state, seeds, JSON. */
export function dump(text) {
  return el('pre.admin-dump', { text });
}

/** A short status chip. */
export function chip(text, tone = '') {
  return el(`span.chip.admin-chip${tone ? `.${tone}` : ''}`, { text });
}

/** A grid of small cards — items, garments, archetypes. */
export function grid(children, className = '') {
  return el(`div.admin-grid${className ? `.${className}` : ''}`, {}, children.filter(Boolean));
}

/**
 * A search box that filters a rendered list. It re-renders through the caller
 * rather than hiding nodes, because every list in this panel is cheap to build
 * and a hidden node is a node that lies to a screen reader.
 */
export function searchField({ value = '', onChange, placeholder = 'Search' }) {
  const input = el('input.input.admin-search', {
    type: 'search',
    value,
    placeholder,
    autocomplete: 'off',
  });
  input.addEventListener('input', () => onChange(input.value));
  return input;
}
