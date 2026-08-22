/**
 * SHOOT! — Online lobby.
 *
 * VISUALLY COMPLETE, DELIBERATELY INERT.
 *
 * Built to its final level of finish so it never has to be rebuilt: room
 * browser, create-room dialog, join-by-code and matchmaking are all here with
 * sample data and full animation. What is missing is only the network layer.
 *
 * HOW THIS SCREEN IS ORGANISED
 * The hard part of an unfinished screen is saying so exactly once. The previous
 * version said it four times — a striped construction banner, a PREVIEW badge,
 * a SOON chip on every button, and another disclaimer inside the matchmaking
 * dialog — which made the screen read as a warning label with a lobby attached.
 *
 * Now there is one notice at the top, and everything below it is a preview of
 * the finished thing. Controls that will do something later are stamped once;
 * pressing one explains itself in a toast. The "Your Standing" panel is gone
 * entirely: three stat tiles reading "—" are not a preview of anything.
 *
 * When the backend lands, replace the handlers marked `// NETWORK:` and delete
 * `SAMPLE_ROOMS`.
 */

import { el } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { back } from '../core/router.js';
import { attachButtonSounds, play } from '../core/audio.js';
import { toast } from '../ui/toast.js';
import { getProfile } from '../core/settings.js';
import { backButton, closeButton, uiIcon, select } from '../ui/widgets.js';

/** Placeholder browser contents. NETWORK: replace with a live room feed. */
const SAMPLE_ROOMS = [
  { name: "Dead Man's Gulch", host: 'CALAMITY', players: 2, max: 2, mode: 'Best of 3', ping: 28, locked: false },
  { name: 'Rusty Spur Saloon', host: 'EL_TUERTO', players: 1, max: 2, mode: 'Sudden death', ping: 46, locked: false },
  { name: 'High Noon Lobby', host: 'BONESAW', players: 1, max: 4, mode: 'Free-for-all', ping: 61, locked: true },
  { name: 'Coyote Ridge', host: 'MISS_ADA', players: 3, max: 4, mode: 'Free-for-all', ping: 112, locked: false },
  { name: 'The Last Round', host: 'DOC_HALLOW', players: 1, max: 2, mode: 'Best of 5', ping: 74, locked: false },
  { name: 'Buzzard Flats', host: 'SIX_SHOT', players: 2, max: 2, mode: 'Best of 3', ping: 155, locked: false },
  { name: 'Silver Vein Mine', host: 'PROSPECTOR', players: 2, max: 4, mode: 'Free-for-all', ping: 39, locked: false },
];

function comingSoon(what = 'Online play') {
  play('error');
  toast(t('{what} is not wired up yet', { what: t(what) }), 'gold');
}

function pingQuality(ping) {
  if (ping < 60) return 'q3';
  if (ping < 120) return 'q2';
  return 'q1';
}

function roomRow(room) {
  const full = room.players >= room.max;
  return el(
    'button.list-row.room-row',
    {
      class: full ? 'is-full' : '',
      onclick: () => comingSoon('Joining a room'),
      'aria-label': t(room.locked ? '{name}, private, {players} of {max} players' : '{name}, {players} of {max} players', { name: t(room.name), players: room.players, max: room.max }),
    },
    [
      el('span.room-name.grow', {}, [
        el('span.title', {}, [
          room.locked ? uiIcon('lock', 0.85) : null,
          el('span', { text: room.name }),
        ]),
        el('span.meta', { text: `${t(room.mode)} · ${room.host}` }),
      ]),
      el('span.room-players', { text: `${room.players}/${room.max}` }),
      el('span.ping', {}, [
        el('span.ping-bars', { class: pingQuality(room.ping) }, [el('i'), el('i'), el('i')]),
        el('span.ping-ms', { text: `${room.ping}ms` }),
      ]),
    ],
  );
}

/** Create-room dialog: complete form, inert Create button. */
function openCreateRoom() {
  /** Closing the dialog takes any list it left open with it. */
  const dismiss = () => {
    pickers.forEach((p) => p.dispose());
    backdrop.remove();
  };
  const backdrop = el('div.modal-backdrop', {
    onclick: (e) => {
      if (e.target === backdrop) dismiss();
    },
  });
  /**
   * The form's dropdowns are the game's own (see `select` in
   * src/ui/widgets.js), not the browser's — even here, where every control on
   * the dialog is inert until online mode exists. A mock-up that opens a system
   * list is a mock-up of a different game.
   */
  const pickers = [];
  const field = (label, options) => {
    const picker = select({ value: options[0], options: options.map((o) => ({ value: o, label: o })), grow: true, label });
    pickers.push(picker);
    return el('div.field.field--wide', {}, [el('label', { text: label }), picker]);
  };

  const modal = el('div.panel.modal.modal--narrow', { role: 'dialog', 'aria-label': 'Create room' }, [
    el('div.modal-header', {}, [
      el('h2.panel-title', { text: 'Create Room' }),
      closeButton(dismiss),
    ]),
    el('div.modal-content.col', { style: { gap: 'var(--sp-3)' } }, [
      el('div.field.field--wide', {}, [
        el('label', { text: 'Room name' }),
        el('input.input', { type: 'text', value: t("{name}'S SALOON", { name: getProfile().name }), maxlength: '24' }),
      ]),
      field('Mode', ['Best of 3', 'Best of 5', 'Sudden death', 'Free-for-all (4)']),
      field('Starting lives', ['3 lives', '5 lives', '1 life']),
      el('label.switch', {}, [
        el('input', { type: 'checkbox' }),
        el('span.track'),
        el('span.switch-label', { text: 'Private — join by code only' }),
      ]),
    ]),
    el('div.modal-footer', {}, [
      el('button.btn.btn--sm.btn--ghost', { onclick: dismiss }, ['Cancel']),
      el('button.btn.btn--sm.btn--soon', { onclick: () => comingSoon('Creating a room') }, ['Create']),
    ]),
  ]);
  backdrop.append(modal);
  document.getElementById('app').append(backdrop);
  attachButtonSounds(backdrop);
}

/** Matchmaking preview: the real search UI, running against nothing. */
function openMatchmaking() {
  const statuses = [
    'Saddling up…',
    'Scanning the territory…',
    'Looking for a challenger…',
    'Checking their trigger finger…',
  ];
  let i = 0;

  const status = el('div.mm-status', { text: statuses[0] });
  const spinner = el('div.mm-spinner');
  const backdrop = el('div.modal-backdrop');
  const modal = el('div.panel.modal.modal--narrow', { role: 'dialog', 'aria-label': 'Quick match' }, [
    el('div.matchmaking', {}, [
      el('h2.panel-title', { text: 'Quick Match' }),
      spinner,
      status,
      el('button.btn.btn--sm.btn--ghost', { onclick: () => stop() }, ['Cancel']),
    ]),
  ]);
  backdrop.append(modal);
  document.getElementById('app').append(backdrop);
  attachButtonSounds(backdrop);

  const timer = setInterval(() => {
    i = (i + 1) % statuses.length;
    status.textContent = statuses[i];
  }, 1400);

  const giveUp = setTimeout(() => {
    clearInterval(timer);
    status.textContent = 'Nobody out there yet.';
    spinner.classList.add('hidden');
  }, 6000);

  function stop() {
    clearInterval(timer);
    clearTimeout(giveUp);
    backdrop.remove();
  }
}

export const OnlineScreen = {
  id: 'online',

  mount(root) {
    const list = el('div.list.room-list');
    SAMPLE_ROOMS.forEach((r) => list.append(roomRow(r)));

    const codeInput = el('input.input', {
      type: 'text',
      maxlength: '6',
      placeholder: 'ABC123',
      'aria-label': 'Room code',
      oninput: (e) => {
        e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      },
    });

    const screen = el('div.screen.online-screen', {}, [
      el('div.screen-header', {}, [
        backButton(() => back('title')),
        el('h1.screen-title', { text: 'Online' }),
        el('span.stamp', { text: 'Not live' }),
      ]),

      el('div.screen-body', {}, [
        // Said once, at the top, and never repeated below.
        el('div.notice', {}, [
          el('span.notice-icon', {}, [uiIcon('hourglass', 1.8)]),
          el('div.notice-text', {}, [
            el('div.notice-title', { text: 'Online duels are still being built' }),
            el('p.notice-body', {
              text: 'Everything below is the finished interface running on sample data. Nothing connects to anyone yet.',
            }),
          ]),
        ]),

        el('div.online-layout', {}, [
          el('div.panel.panel--braced', {}, [
            el('div.row.spread', { style: { marginBottom: 'var(--sp-3)' } }, [
              el('h2.panel-title', { style: { textAlign: 'left' }, text: 'Rooms' }),
              el('button.btn.btn--sm.btn--ghost', {
                onclick: () => comingSoon('The room browser'),
              }, ['Refresh']),
            ]),
            list,
          ]),

          el('div.online-side', {}, [
            el('div.panel.col', { style: { gap: 'var(--sp-2)' } }, [
              el('h2.panel-title', { text: 'Play' }),
              el('button.btn.btn--block.btn--soon', { onclick: () => openMatchmaking() }, [
                'Quick Match',
              ]),
              el('button.btn.btn--block.btn--soon', { onclick: () => openCreateRoom() }, [
                'Create Room',
              ]),
            ]),

            el('div.panel.col', { style: { gap: 'var(--sp-2)' } }, [
              el('h2.panel-title', { text: 'Join with a code' }),
              el('div.join-code', {}, [
                codeInput,
                el('button.btn.btn--sm.btn--soon', { onclick: () => comingSoon('Joining by code') }, [
                  'Join',
                ]),
              ]),
              el('p.field-hint.center', { text: 'Six characters, from whoever made the room.' }),
            ]),
          ]),
        ]),
      ]),
    ]);

    root.append(screen);
    attachButtonSounds(screen);
  },
};
