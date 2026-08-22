/**
 * SHOOT! — Language.
 *
 * The game ships in two: English, which is the language it is WRITTEN in, and
 * Spanish, which is a dictionary laid over the top of it.
 *
 * THE KEY IS THE ENGLISH SENTENCE
 * ---------------------------------------------------------------------------
 * There is no `ui.settings.title` in this codebase and there never will be.
 * `t('Screen shake')` is the call, the English string is the key, and the
 * Spanish table in src/core/lang-es.js is keyed by the same. That buys three
 * things worth more than tidy identifiers:
 *
 *   - Every call site still reads as the sentence it prints. A translation
 *     layer whose call sites say `t('shop.sold.none')` makes the file it lives
 *     in unreadable, and this game's source is meant to be read.
 *   - A missing translation is not a crash and not a `???`. `t` returns its
 *     own argument, so the worst case for a line nobody has translated yet is
 *     that a Spanish player sees it in English — which is what they would have
 *     seen anyway.
 *   - The English text cannot drift out of sync with a key, because it IS the
 *     key. Change the sentence and the lookup misses, loudly and visibly, on
 *     the screen it belongs to.
 *
 * PLACEHOLDERS
 * ---------------------------------------------------------------------------
 * Anything that varies goes in braces and comes in as the second argument:
 *
 *     t('{name} sold you {count} rounds', { name, count })
 *
 * Never build a sentence by concatenation and then translate the pieces —
 * Spanish does not put its words where English does, and a half-sentence has
 * no translation. The braces are what lets the Spanish table move them.
 *
 * AUTO IS A PLACE, NOT A LANGUAGE
 * ---------------------------------------------------------------------------
 * The default setting is `auto`, and it resolves ONCE, at boot, by asking the
 * device where it is: Spain or Spanish-speaking Latin America gets Spanish,
 * everywhere else gets English. It is a guess about geography made from a time
 * zone and a locale, and it is always overridable — the settings screen lists
 * English and Español underneath it, and picking one pins it for good.
 */

import { ES } from './lang-es.js';

/**
 * What the settings screen offers. `auto` is first because it is the default
 * and the one most people should leave alone; there is no third language, and
 * the ones that used to be listed here as "soon" are gone — a menu entry that
 * cannot be picked is a promise, not a feature.
 */
export const LANGUAGES = [
  { id: 'auto', label: 'Auto' },
  { id: 'en', label: 'English' },
  { id: 'es', label: 'Español' },
];

/** The tables. English has none: it is the source text. */
const TABLES = { es: ES };

/**
 * Time zones that mean Spain or Spanish-speaking Latin America.
 *
 * A time zone is a better answer to "where are you" than a browser language is
 * — someone in Bogotá running an English-language phone is still in Bogotá —
 * so it is asked first. Brazil is deliberately not in here: it is Latin America
 * and it does not speak Spanish, and a Brazilian player is better served by the
 * English the game is written in than by a language that is merely nearby.
 */
const SPANISH_ZONES = new Set([
  // Spain, including the islands and the North African cities
  'Europe/Madrid',
  'Atlantic/Canary',
  'Africa/Ceuta',
  // Mexico
  'America/Mexico_City',
  'America/Cancun',
  'America/Merida',
  'America/Monterrey',
  'America/Matamoros',
  'America/Chihuahua',
  'America/Ciudad_Juarez',
  'America/Ojinaga',
  'America/Mazatlan',
  'America/Bahia_Banderas',
  'America/Hermosillo',
  'America/Tijuana',
  // Central America and the Caribbean
  'America/Guatemala',
  'America/El_Salvador',
  'America/Tegucigalpa',
  'America/Managua',
  'America/Costa_Rica',
  'America/Panama',
  'America/Havana',
  'America/Santo_Domingo',
  'America/Puerto_Rico',
  // South America
  'America/Bogota',
  'America/Caracas',
  'America/Guayaquil',
  'Pacific/Galapagos',
  'America/Lima',
  'America/La_Paz',
  'America/Santiago',
  'America/Punta_Arenas',
  'Pacific/Easter',
  'America/Asuncion',
  'America/Montevideo',
  'America/Buenos_Aires',
  'America/Cordoba',
  'America/Argentina/Buenos_Aires',
  'America/Argentina/Cordoba',
  'America/Argentina/Salta',
  'America/Argentina/Jujuy',
  'America/Argentina/Tucuman',
  'America/Argentina/Catamarca',
  'America/Argentina/La_Rioja',
  'America/Argentina/San_Juan',
  'America/Argentina/San_Luis',
  'America/Argentina/Mendoza',
  'America/Argentina/Rio_Gallegos',
  'America/Argentina/Ushuaia',
]);

/** The same list as country codes, for when a locale carries a region tag. */
const SPANISH_REGIONS = new Set([
  'ES', 'MX', 'GT', 'SV', 'HN', 'NI', 'CR', 'PA', 'CU', 'DO', 'PR',
  'CO', 'VE', 'EC', 'PE', 'BO', 'CL', 'AR', 'UY', 'PY', 'GQ',
]);

/**
 * Where the device thinks it is, as a language id.
 *
 * Three questions, in order of how much they actually say about location:
 *   1. the time zone, which is the closest thing a browser has to a country
 *   2. the region tag on any preferred locale — `es-AR`, but also `en-MX`
 *   3. whether Spanish is preferred at all, for a locale with no region
 *
 * Every one of them is wrapped, because all three are allowed to be missing or
 * to throw on an old engine, and a language guess is never worth a failed boot.
 *
 * @returns {'en'|'es'}
 */
export function detectLanguage() {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (zone && SPANISH_ZONES.has(zone)) return 'es';
  } catch {
    /* no Intl, or no zone: fall through to the locale */
  }

  const tags = preferredTags();
  for (const tag of tags) {
    const region = (tag.split(/[-_]/)[1] || '').toUpperCase();
    if (region.length === 2 && SPANISH_REGIONS.has(region)) return 'es';
  }
  if (tags.some((tag) => tag.toLowerCase().startsWith('es'))) return 'es';

  return 'en';
}

function preferredTags() {
  try {
    const nav = typeof navigator === 'undefined' ? null : navigator;
    if (!nav) return [];
    return [...(nav.languages || []), nav.language].filter(Boolean).map(String);
  } catch {
    return [];
  }
}

/**
 * The language actually in use. Never `auto` — `auto` is a setting, this is an
 * answer, and everything downstream of here only ever sees `en` or `es`.
 */
let active = 'en';
/** What the setting said, so the settings screen can show `auto` as picked. */
let preference = 'auto';

const listeners = new Set();

/**
 * Point the game at a language.
 *
 * @param {'auto'|'en'|'es'} pref
 * @returns {'en'|'es'} what `auto` resolved to, or the language itself
 */
export function setLanguage(pref = 'auto') {
  preference = LANGUAGES.some((l) => l.id === pref) ? pref : 'auto';
  const next = preference === 'auto' ? detectLanguage() : preference;
  const changed = next !== active;
  active = next;
  if (changed) for (const fn of [...listeners]) fn(active);
  return active;
}

/** `en` or `es` — what is being printed right now. */
export const getLanguage = () => active;

/** `auto`, `en` or `es` — what the player chose. */
export const getLanguagePreference = () => preference;

/**
 * Run `fn` whenever the language changes. Returns an unsubscribe.
 *
 * Screens do not use this: they are rebuilt wholesale when the setting changes
 * (see `remount` in src/core/router.js), because half of the game's text is
 * baked into pixel canvases and DOM nodes at mount time and there is no sane
 * way to patch it in place. This is for the few things that outlive a screen.
 */
export function onLanguageChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Translate.
 *
 * @param {string} text the English sentence, which is also the key
 * @param {Record<string, string|number>} [params] values for `{placeholders}`
 * @returns {string}
 */
export function t(text, params) {
  if (text == null) return '';
  const source = String(text);
  const table = TABLES[active];
  const out = (table && table[source]) || source;
  return params ? fill(out, params) : out;
}

/**
 * Translate a list in one call — menu rows, chip labels, a table of headers.
 * @param {string[]} list
 */
export const tAll = (list) => list.map((item) => t(item));

/**
 * Pick between a singular and a plural sentence, then translate it.
 *
 * Both forms are written out in English at the call site rather than assembled
 * from a stem and an `s`, because Spanish plurals do not work that way and a
 * translator needs the whole sentence to move the words around in.
 *
 * @param {number} count
 * @param {string} one the sentence for exactly one
 * @param {string} many the sentence for everything else, zero included
 * @param {Record<string, string|number>} [params]
 */
export function tPlural(count, one, many, params = {}) {
  return t(Math.abs(count) === 1 ? one : many, { count, ...params });
}

/** `{name}` → params.name. An unknown placeholder is left exactly as it is. */
function fill(text, params) {
  return text.replace(/\{(\w+)\}/g, (whole, key) =>
    Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : whole,
  );
}
