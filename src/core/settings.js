/**
 * SHOOT! — Settings & local profile.
 *
 * Both live outside the save slots (they belong to the device, not to a run)
 * but still go through the storage driver, so they migrate to a remote account
 * with everything else.
 */

import { read, write } from './storage.js';
import { setVolume, setMuted } from './audio.js';
import { setLanguage } from './i18n.js';

const SETTINGS_KEY = 'settings';
const PROFILE_KEY = 'profile';

const DEFAULT_SETTINGS = {
  volume: 0.6,
  muted: false,
  /**
   * `auto` asks the device where it is the first time the game runs and every
   * time after — Spain or Spanish-speaking Latin America gets Spanish, the rest
   * of the world gets English. See src/core/i18n.js. `en` and `es` pin it.
   */
  language: 'auto',
  screenShake: true,
  showHints: true,
  /** Set once the How to Play panel has been shown automatically. */
  seenHowTo: false,
};

const DEFAULT_PROFILE = {
  name: 'STRANGER',
  createdAt: null,
  stats: { duelsWon: 0, duelsLost: 0, worldsCleared: 0, goldEarned: 0, milesWalked: 0 },
  /**
   * What the gunslinger is wearing: five garment ids, one per slot (the fifth
   * is the horse's harness). The catalogue and the lock on each piece live in
   * `src/game/wardrobe.js` — this file only keeps the strings, and what it
   * keeps is never trusted: an outfit is validated against the achievement
   * ledger and the receipts below every time it is read.
   */
  outfit: { hat: 'trail', shirt: 'serape', pants: 'trail', boots: 'trail', horse: 'trail' },
  /**
   * Garments bought over a counter, as `slot:id`. Clothing is the one thing in
   * this game that is paid for with a run's gold and kept by the DEVICE — the
   * clothing shop turns up once in a whole run, so a shirt that died with the
   * run would be a shirt nobody ever wore.
   */
  clothing: [],
};

let settings = { ...DEFAULT_SETTINGS };
let profile = { ...DEFAULT_PROFILE, stats: { ...DEFAULT_PROFILE.stats } };

export async function loadSettings() {
  const stored = await read(SETTINGS_KEY);
  settings = { ...DEFAULT_SETTINGS, ...(stored || {}) };
  const storedProfile = await read(PROFILE_KEY);
  profile = {
    ...DEFAULT_PROFILE,
    ...(storedProfile || {}),
    stats: { ...DEFAULT_PROFILE.stats, ...((storedProfile && storedProfile.stats) || {}) },
    outfit: { ...DEFAULT_PROFILE.outfit, ...((storedProfile && storedProfile.outfit) || {}) },
    // A profile written before clothes could be bought has no list at all, and
    // one that arrived from somewhere else may have something that is not one.
    clothing: Array.isArray(storedProfile?.clothing) ? [...storedProfile.clothing] : [],
  };
  if (!profile.createdAt) profile.createdAt = Date.now();
  applyAudio();
  /**
   * The language is resolved before the first screen mounts, which is the whole
   * reason `loadSettings` is the first thing boot awaits: `auto` has to have
   * become `en` or `es` by the time anything calls `t`, or the title screen
   * comes up in English and then contradicts itself on the next navigation.
   *
   * A device that used to be pinned to English by the old default is migrated
   * to `auto` here rather than left behind it — nobody chose that `en`, it was
   * the only option the settings screen had.
   */
  if (settings.language === 'en' && !stored?.languagePicked) settings.language = 'auto';
  setLanguage(settings.language);
  return settings;
}

function applyAudio() {
  setVolume(settings.volume);
  setMuted(settings.muted);
}

export function getSettings() {
  return { ...settings };
}

export async function updateSettings(patch) {
  settings = { ...settings, ...patch };
  applyAudio();
  if ('language' in patch) {
    // `languagePicked` is the record that a HUMAN chose this, which is what
    // stops the migration above from dragging a deliberate English back to
    // `auto` on the next boot.
    settings.languagePicked = true;
    setLanguage(settings.language);
  }
  await write(SETTINGS_KEY, settings);
  return settings;
}

export function getProfile() {
  return {
    ...profile,
    stats: { ...profile.stats },
    outfit: { ...profile.outfit },
    clothing: [...(profile.clothing || [])],
  };
}

export async function updateProfile(patch) {
  profile = {
    ...profile,
    ...patch,
    stats: { ...profile.stats, ...(patch.stats || {}) },
    outfit: { ...profile.outfit, ...(patch.outfit || {}) },
    // Receipts are replaced wholesale rather than merged: the caller owns the
    // whole list (see `grantClothing`), and merging two arrays by key is a
    // guess about which one is newer.
    clothing: patch.clothing ? [...patch.clothing] : [...(profile.clothing || [])],
  };
  await write(PROFILE_KEY, profile);
  return profile;
}

/** Bump one of the lifetime counters shown on the profile screen. */
export async function bumpStat(key, amount = 1) {
  profile.stats[key] = (profile.stats[key] || 0) + amount;
  await write(PROFILE_KEY, profile);
  return profile.stats[key];
}
