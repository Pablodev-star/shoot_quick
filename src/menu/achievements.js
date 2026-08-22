/**
 * SHOOT! — Achievements screen.
 *
 * The ledger, read back. It took the Credits' place on the main menu (the
 * credits screen itself is untouched and still registered — it simply has no
 * door on it for now), because a menu entry is a promise about what the player
 * will find behind it, and a list of things still to do is worth more of the
 * front page than a history of the project.
 *
 * THE PERCENTAGE IS THE HEADLINE
 * ---------------------------------------------------------------------------
 * One number, at the top, big: how much of the game you have actually seen.
 * Everything else on the screen is that number taken apart — the count under
 * it, the bar behind it, and six sections that each say how much of themselves
 * is done. A player who opens this screen wants to know what is left, so what
 * is left is what the screen leads with.
 *
 * LOCKED IS NOT HIDDEN
 * ---------------------------------------------------------------------------
 * Every card is legible whether or not it has been earned: name, what it asks
 * for, and its reward slot. There are no secret achievements, because a secret
 * achievement is one the player cannot decide to go and get, and this list is
 * meant to be a set of things to go and do. Locked ones are simply drained of
 * colour, with a padlock where the medal goes.
 *
 * THE REWARD ROW IS FULL NOW
 * ---------------------------------------------------------------------------
 * It used to read "Clothing — coming soon" on every card in the game. The
 * wardrobe exists (src/game/wardrobe.js), so twenty-six of these lines now show
 * the garment they hand over — a picture of the thing, its slot and its name —
 * and the row is a picture of what is behind the lock rather than a promise.
 *
 * The picture is a CROP of a gunslinger wearing it, not an icon drawn twice:
 * the same art the wardrobe screen dresses the mannequin in, sliced to the rows
 * that garment lives on. There is no second version of a hat to keep in step.
 *
 * The lines that pay nothing say so plainly. An achievement whose reward is the
 * fact you did it is not a broken one, and "coming soon" on sixty of them was
 * worse than an honest blank.
 */

import { el, pixelImg } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { back, go } from '../core/router.js';
import { attachButtonSounds } from '../core/audio.js';
import { startMenuScene } from './menu-scene.js';
import { backButton, uiIcon } from '../ui/widgets.js';
import { CATEGORIES, getAchievementState } from '../game/achievements.js';
import { SLOT_LABELS, rewardsOf } from '../game/wardrobe.js';
import { pieceThumb } from '../art/sprites-wardrobe.js';

export const AchievementsScreen = {
  id: 'achievements',

  mount(root) {
    startMenuScene();

    const { list, unlockedCount, total, percent } = getAchievementState();

    const screen = el('div.screen.achievements-screen', {}, [
      el('div.screen-header', {}, [
        backButton(() => back('title')),
        el('h1.screen-title', { text: 'Achievements' }),
        el('span.chip.chip--gold', { text: `${unlockedCount}/${total}` }),
      ]),

      el('div.screen-body', {}, [
        summary(percent, unlockedCount, total),
        ...CATEGORIES.map((category) => section(category, list)),
      ]),
    ]);

    root.append(screen);
    attachButtonSounds(screen);
  },
};

/** The headline: the percentage, the count, and the bar behind both. */
function summary(percent, unlockedCount, total) {
  return el('div.panel.panel--braced.ach-summary', {}, [
    el('div.ach-summary-figure', {}, [
      el('span.ach-summary-percent', { text: `${percent}%` }),
      el('span.ach-summary-label', { text: 'Complete' }),
    ]),
    el('div.ach-summary-meter', {}, [
      el('div.ach-bar', {
        role: 'meter',
        'aria-label': 'Achievements unlocked',
        'aria-valuemin': '0',
        'aria-valuemax': String(total),
        'aria-valuenow': String(unlockedCount),
      }, [
        el('div.ach-bar-fill', { style: { width: `${percent}%` } }),
      ]),
      el('p.ach-summary-note', {
        text: unlockedCount === total
          ? 'Every last one of them. There is nothing left on this road you have not done.'
          : t('{done} of {total} earned · {left} still out there', {
            done: unlockedCount,
            total,
            left: total - unlockedCount,
          }),
      }),
      el('p.field-hint', {
        text: 'Kept on this device, alongside your profile — a run can end, these do not.',
      }),
      /**
       * Twenty-six of these hand over clothes, and the place to put them on is
       * one screen away. A reward you have earned and never seen on yourself is
       * a reward you did not get.
       */
      el('button.btn.btn--sm.btn--ghost', { onclick: () => go('wardrobe') }, [
        uiIcon('pencil', 1),
        el('span', { text: 'Open wardrobe' }),
      ]),
    ]),
  ]);
}

/** One category: a divider that counts itself, then its cards. */
function section(category, list) {
  const mine = list.filter((a) => a.category === category.id);
  if (!mine.length) return null;
  const done = mine.filter((a) => a.unlocked).length;

  return el('div.ach-section', {}, [
    el('div.divider', { text: t('{category} · {done}/{total}', { category: t(category.name), done, total: mine.length }) }),
    el('p.ach-section-blurb', { text: category.blurb }),
    el('div.ach-grid.stagger', {}, mine.map(card)),
  ]);
}

function card(achievement) {
  const { unlocked, name, description } = achievement;
  /**
   * A list, not a garment. Nearly every line pays one piece and one line pays
   * five — see `rewardPieces` in src/game/wardrobe.js — and the card draws
   * whatever it is handed rather than knowing which is which.
   */
  const rewards = rewardsOf(achievement);

  return el('div.ach-card', {
    class: unlocked ? 'is-unlocked' : 'is-locked',
    'aria-label': t(unlocked ? '{name}. {description} Unlocked.' : '{name}. {description} Locked.', { name: t(name), description: t(description) })
      + (rewards.length
        ? ` ${t('Reward: {garments}.', { garments: rewards.map((r) => t(r.name)).join(', ') })}`
        : ''),
  }, [
    el('div.ach-card-top', {}, [
      el('div.ach-medal', {}, [uiIcon(unlocked ? 'star' : 'lock', 1.3)]),
      el('div.ach-card-text', {}, [
        el('div.ach-name', { text: name }),
        el('p.ach-desc', { text: description }),
      ]),
      unlocked ? el('span.ach-tick', {}, [uiIcon('check', 1)]) : null,
    ]),

    // The wardrobe hook. See the note at the top of this file.
    el('div.ach-reward', {
      class: `${rewards.length ? 'has-reward' : ''} ${rewards.length > 1 ? 'is-set' : ''}`.trim(),
    }, [
      el('span.ach-reward-label', { text: rewards.length > 1 ? 'Outfit' : 'Reward' }),
      ...(rewards.length
        ? rewards.map((reward, i) => el('span.ach-reward-value', {}, [
          // Tack is a whole horse and every other reward is a crop off a man,
          // so the horse is drawn at half the scale: same size on the card.
          el('span.ach-reward-art', {}, [
            pixelImg(pieceThumb(reward.slot, reward.id), reward.slot === 'horse' ? 1 : 2),
          ]),
          /**
           * Only the first piece of a set is named. Five names stacked under
           * five thumbs is a wall of text on a card that is three lines tall,
           * and the pieces of a set all share a name anyway — what the player
           * wants off this card is "the Ember Reaver, and it is five pieces",
           * which the thumbs say better than the words would.
           */
          rewards.length === 1 || i === 0
            ? el('span.ach-reward-text', {}, [
              el('span.ach-reward-name', {
                text: rewards.length > 1 ? 'Ember Reaver' : reward.name,
              }),
              el('span.ach-reward-slot', {
                text: rewards.length > 1
                  ? `${rewards.length} pieces`
                  : SLOT_LABELS[reward.slot].name,
              }),
            ])
            : null,
        ]))
        : [el('span.ach-reward-empty', { text: 'Bragging rights' })]),
    ]),
  ]);
}
