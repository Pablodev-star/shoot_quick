/**
 * SHOOT! — Settings.
 *
 * Each row states what the setting does, not just what it is called, so nothing
 * needs guessing. Changes apply instantly and save themselves.
 */

import { el } from '../core/dom.js';
import { back, remount } from '../core/router.js';
import { attachButtonSounds, play } from '../core/audio.js';
import { getSettings, updateSettings } from '../core/settings.js';
import { LANGUAGES, getLanguage, getLanguagePreference, detectLanguage, t } from '../core/i18n.js';
import { toast } from '../ui/toast.js';
import { backButton, toggle, select } from '../ui/widgets.js';
import { openHowToPlay } from '../ui/help.js';

/** One settings row: label + description on the left, control on the right. */
function row(name, desc, control) {
  return el('div.setting-row', {}, [
    el('div.setting-label', {}, [
      el('span.name', { text: name }),
      el('span.desc', { text: desc }),
    ]),
    el('div.setting-control', {}, Array.isArray(control) ? control : [control]),
  ]);
}

export const SettingsScreen = {
  id: 'settings',

  mount(root) {
    const settings = getSettings();

    const volumeValue = el('span.value', { text: `${Math.round(settings.volume * 100)}%` });
    const volume = el('input.grow', {
      type: 'range',
      min: '0',
      max: '100',
      step: '5',
      value: String(Math.round(settings.volume * 100)),
      'aria-label': 'Volume',
      oninput: (e) => {
        volumeValue.textContent = `${e.target.value}%`;
        updateSettings({ volume: Number(e.target.value) / 100 });
      },
      onchange: () => play('click'),
    });

    /**
     * THE LANGUAGE ROW
     * -----------------------------------------------------------------------
     * Three entries and no more. `Auto` says what it actually resolved to on
     * this device, because "Auto" on its own is a promise the player cannot
     * check — a phone in Lima should be able to see the word `Español` next to
     * it before deciding whether to override it.
     *
     * Changing it rebuilds the screen underneath the player's finger
     * (`remount`), which is the only honest way to do this: half the game's
     * words are baked into canvases and DOM nodes when a screen mounts, so a
     * language that changed without a rebuild would leave the settings screen
     * in the old one and every screen after it in the new.
     */
    const detected = LANGUAGES.find((l) => l.id === detectLanguage());
    const language = select({
      value: getLanguagePreference(),
      grow: true,
      label: 'Language',
      options: LANGUAGES.map((l) => ({
        value: l.id,
        label: l.label,
        detail: l.id === 'auto' ? t('now: {language}', { language: detected.label }) : '',
      })),
      onChange: async (id) => {
        await updateSettings({ language: id });
        toast(t('Language: {language}', {
          language: LANGUAGES.find((l) => l.id === getLanguage()).label,
        }), 'gold');
        remount();
      },
    });

    const screen = el('div.screen.settings-screen', {}, [
      el('div.screen-header', {}, [
        backButton(() => back('title')),
        el('h1.screen-title', { text: 'Settings' }),
        el('span'),
      ]),

      el('div.screen-body', {}, [
        el('div.panel.panel--braced.col', { style: { gap: 'var(--sp-3)' } }, [
          el('div.divider', { text: 'Audio' }),
          el('div.settings-list', {}, [
            row('Volume', 'How loud everything is.', [volume, volumeValue]),
            row(
              'Mute',
              'Silence the game entirely.',
              toggle({
                label: settings.muted ? 'Muted' : 'Sound on',
                checked: settings.muted,
                onChange: (checked) => updateSettings({ muted: checked }),
              }),
            ),
          ]),

          el('div.divider', { text: 'Game' }),
          el('div.settings-list', {}, [
            row('Language', 'Auto follows where you are riding from.', language),
            row(
              'Screen shake',
              'Kick the camera when a shot lands.',
              toggle({
                label: 'Shake on gunfire',
                checked: settings.screenShake,
                onChange: (checked) => updateSettings({ screenShake: checked }),
              }),
            ),
            row(
              'Hints',
              'Show tips and the first-run guide.',
              toggle({
                label: 'Show hints',
                checked: settings.showHints,
                onChange: (checked) => updateSettings({ showHints: checked }),
              }),
            ),
            row(
              'How to play',
              'The duel rules, any time you want them.',
              el('button.btn.btn--sm.btn--ghost', { onclick: () => openHowToPlay() }, ['Open guide']),
            ),
          ]),
        ]),
      ]),
    ]);

    root.append(screen);
    attachButtonSounds(screen);

    // A list left open when the screen goes is a list left on the page.
    return () => language.dispose();
  },
};
