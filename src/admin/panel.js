/**
 * SHOOT! — The Admin Panel.
 *
 * A workbench for whoever is building or testing this game, opened from the
 * road by the sigil and the passphrase (src/admin/access.js) and closed back
 * onto the same step of the same walk.
 *
 * WHAT IT IS FOR
 * ---------------------------------------------------------------------------
 * Everything in this game is a consequence of something else. A duel is a
 * consequence of a road that dealt it, which is a consequence of a reading of
 * a run, which is a consequence of forty minutes of walking. That is a good
 * game and a miserable thing to test: to look at the Bayou's boss you play
 * four worlds, and to look at it on a full bar in the rain with a maxed gun you
 * play four worlds and get lucky. The panel cuts every one of those chains —
 * not by simulating anything, but by reaching into the real systems and moving
 * the real numbers, so what you end up looking at is the actual game in a state
 * it would otherwise take an hour to reach.
 *
 * HOW IT IS BUILT
 * ---------------------------------------------------------------------------
 * A modal over the top of the road, not a screen. That matters: the run stays
 * mounted underneath, the walk engine is paused rather than torn down, and
 * closing the panel puts the player back on the same pixel of the same road.
 * Anything that genuinely has to navigate (a custom battle, a jump to another
 * world) closes the panel first and lets the router do it.
 *
 * Every tab is a plain function returning a node, rebuilt in full whenever
 * anything is touched (`ctx.refresh()`). Nothing here is a live-updating view;
 * a debug tool that maintains its own incremental state is a debug tool with
 * its own bugs, which is the last thing anybody needs while chasing one.
 */

import { el, clearNode } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { attachButtonSounds, play } from '../core/audio.js';
import { closeButton } from '../ui/widgets.js';
import { toast } from '../ui/toast.js';
import { getState } from '../game/player.js';
import { getWorld } from '../game/worlds.js';
import { isOverridden, activeOverrides, resetOverrides, note } from './overrides.js';
import { shortcutShown, setShortcutShown } from './access.js';
import { chip } from './widgets.js';

import { RunTab } from './tab-run.js';
import { RoadTab } from './tab-road.js';
import { GearTab } from './tab-gear.js';
import { LooksTab } from './tab-looks.js';
import { OddsTab } from './tab-odds.js';
import { EnemyTab } from './tab-enemy.js';
import { BattleTab } from './tab-battle.js';
import { LabTab } from './tab-lab.js';

const TABS = [RunTab, RoadTab, GearTab, LooksTab, OddsTab, EnemyTab, BattleTab, LabTab];

/** Which tab was open last, so reopening the panel lands where you left it. */
let lastTab = TABS[0].id;

/**
 * Open the panel over whatever is on screen.
 *
 * @param {object} opts
 * @param {object} opts.engine the walk engine — paused by the caller
 * @param {number} opts.slot the permanent slot this run occupies
 * @returns {Promise<void>} resolves when the panel is closed
 */
export function openAdminPanel({ engine, slot }) {
  return new Promise((resolve) => {
    let settled = false;
    let active = TABS.find((t) => t.id === lastTab) || TABS[0];

    const tabsBar = el('div.tabs.admin-tabs', { role: 'tablist' });
    const body = el('div.modal-content.admin-body');
    const headChips = el('div.admin-head-chips');
    const footChips = el('div.admin-foot-chips');

    const ctx = {
      engine,
      slot,
      /** Rebuild the open tab. Everything that changes state calls this. */
      refresh: () => render(),
      /** Jump to another tab by id — used by the cross-links between them. */
      go: (id) => {
        active = TABS.find((t) => t.id === id) || active;
        lastTab = active.id;
        render();
      },
      close,
      /** Close the panel and let something else own the screen. */
      leave: (message) => {
        if (message) toast(message, 'info');
        close();
      },
      toast,
    };

    function close() {
      if (settled) return;
      settled = true;
      document.removeEventListener('keydown', onKey, true);
      backdrop.remove();
      play('back');
      resolve();
    }

    /**
     * Keys are captured. The road underneath still has I and M live on it, and
     * a tester typing a number into a field must not open the saddlebag behind
     * the panel — the same reason the trail map swallows them.
     */
    const onKey = (e) => {
      if (e.key === 'Escape') {
        close();
        e.preventDefault();
      }
      e.stopPropagation();
    };
    document.addEventListener('keydown', onKey, true);

    function renderTabs() {
      clearNode(tabsBar);
      for (const tab of TABS) {
        tabsBar.append(
          el('button.tab', {
            role: 'tab',
            'aria-selected': String(tab.id === active.id),
            onclick: () => ctx.go(tab.id),
            text: tab.label,
          }),
        );
      }
    }

    /** The two strips that say, at all times, where you are and what is bent. */
    function renderChips() {
      const player = getState();
      const world = getWorld(player.world);
      clearNode(headChips);
      headChips.append(chip(t('slot {n}', { n: slot })));
      headChips.append(chip(`W${world.id} ${world.name}`));
      if (isOverridden()) {
        const bent = activeOverrides().length;
        headChips.append(chip(`${bent} override${bent === 1 ? '' : 's'}`, 'chip--danger'));
      }

      clearNode(footChips);
      footChips.append(chip(t('lv {n}', { n: player.level })));
      footChips.append(chip(t('{lives}/{max}{bonus} lives', {
        lives: player.lives,
        max: player.maxLives,
        bonus: player.bonusLives ? ` +${player.bonusLives}` : '',
      })));
      footChips.append(chip(t('{gold} gold', { gold: player.gold })));
      footChips.append(chip(t('gun {n}', { n: player.gunLevel })));
      footChips.append(chip(t('hunger {n}', { n: Math.round(player.hunger) })));
    }

    /**
     * The button on the road, and the switch that puts it away.
     *
     * It lives in the panel's own footer rather than in a tab because it is not
     * a thing about the run — it is a thing about the workbench, and the moment
     * anybody wants it is the moment they are looking at the workbench and
     * about to hand the screen to somebody else. See the note in
     * src/admin/access.js.
     */
    function renderShortcut() {
      const shown = shortcutShown(slot);
      shortcutBtn.textContent = shown ? 'Hide the road button' : 'Show the road button';
      shortcutBtn.setAttribute('aria-pressed', String(shown));
      shortcutBtn.dataset.tip = shown
        ? 'The sigil still opens this panel with the button hidden'
        : 'Put the one-tap button back on the road';
    }

    const shortcutBtn = el('button.btn.btn--sm.btn--ghost', {
      onclick: async () => {
        await setShortcutShown(slot, !shortcutShown(slot));
        note(t(shortcutShown(slot) ? 'road button shown' : 'road button hidden'));
        renderShortcut();
      },
    }, ['']);

    function render() {
      renderTabs();
      renderChips();
      renderShortcut();
      clearNode(body);
      try {
        body.append(active.render(ctx));
      } catch (err) {
        console.error('[admin] tab failed', err);
        body.append(el('p.admin-hint', { text: t('This tab threw: {message}', { message: err.message }) }));
      }
      attachButtonSounds(body);
    }

    const backdrop = el('div.modal-backdrop.admin-backdrop', {
      onclick: (e) => {
        if (e.target === backdrop) close();
      },
    });

    const modal = el('div.panel.modal.admin-modal', {
      role: 'dialog',
      'aria-label': 'Admin panel',
    }, [
      el('div.modal-header', {}, [
        el('div.col', { style: { gap: '2px' } }, [
          el('h2.panel-title', { text: 'ADMIN' }),
          headChips,
        ]),
        closeButton(close),
      ]),
      tabsBar,
      body,
      el('div.admin-footer', {}, [
        footChips,
        el('div.admin-buttons', {}, [
          shortcutBtn,
          el('button.btn.btn--sm.btn--danger', {
            onclick: () => {
              resetOverrides();
              note('reset from the panel footer');
              toast('Every override is back to the game', 'good');
              render();
            },
          }, ['Reset overrides']),
          el('button.btn.btn--sm.btn--gold', { onclick: close }, ['Back to the road']),
        ]),
      ]),
    ]);

    backdrop.append(modal);
    document.getElementById('app').append(backdrop);
    attachButtonSounds(modal);
    render();
  });
}
