/**
 * SHOOT! — Speech.
 *
 * A character saying something, out loud, with their face next to it. Built as
 * a general system rather than as part of the Stranger's cut-scene, because the
 * first thing it is used for is not the last: any fighter on either side of the
 * road can be given lines, and the box does not know or care which.
 *
 * WHAT IT IS
 * ---------------------------------------------------------------------------
 * One strip along the bottom of the screen: a framed portrait, a name plate,
 * and the line typing itself out a character at a time. It sits over whatever
 * the canvas is drawing, so a scene keeps running behind it — the speaker is
 * still breathing while they talk, which is most of what makes a line land.
 *
 *   const speech = createSpeech();
 *   await speech.say({ name: 'The Stranger', portrait, side: 'enemy',
 *                      text: 'You are a long way from the flats.' });
 *   speech.dispose();
 *
 * `say` resolves when the line is finished with — typed out, then held for as
 * long as it takes to read, or immediately on a tap. Tapping *while* it types
 * finishes the typing instead of skipping the line, which is the one
 * interaction every game with a text box has agreed on for thirty years: the
 * first press catches up, the second moves on.
 *
 * WHY IT TYPES
 * ---------------------------------------------------------------------------
 * A line that appears all at once is read at whatever speed the player happens
 * to read at, which is usually faster than any pacing the scene wanted. Typing
 * hands the pacing back: it puts a beat after a comma, a longer one after a
 * full stop, and it gives an em dash the pause an actor would give it. The
 * characters land on a soft tick so a long speech has a voice rather than
 * being silent film.
 *
 * IT IS NOT A MODAL
 * ---------------------------------------------------------------------------
 * There is no backdrop and nothing is trapped behind it. A speech box that
 * blocks the frame turns a cut-scene into a dialog box, and the whole point of
 * this one is that the fight it interrupts is still visible underneath.
 */

import { el, pixelImg } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { play } from '../core/audio.js';

/**
 * Milliseconds per character.
 *
 * Slow. Slower than a text box that exists to get out of the way, because this
 * one does not: a line spoken over a held close-up is the scene, and the pace
 * it types at IS the pace of the scene. At twenty-two it read as a chat window
 * scrolling; at forty it reads as somebody speaking.
 */
const CHAR_MS = 40;

/**
 * Extra beats after punctuation, in milliseconds. This is the whole of the
 * "performance": a comma is a breath, a full stop is a thought, and an em dash
 * is somebody deciding not to finish the sentence.
 */
const PUNCTUATION_MS = {
  ',': 110,
  ';': 140,
  ':': 140,
  '.': 260,
  '!': 260,
  '?': 300,
  '—': 320,
  '…': 380,
};

/**
 * How long a finished line is held before it moves on by itself.
 *
 * Long enough to read the whole line a second time. A line that vanishes on
 * the last character was only ever readable by someone who read it as it
 * typed, and the shot it is sitting on deserves the beat anyway.
 */
const DWELL_BASE_MS = 1000;
const DWELL_PER_CHAR_MS = 26;

/**
 * @param {object} [opts]
 * @param {HTMLElement} [opts.parent] where to mount. Defaults to #app.
 * @param {boolean} [opts.autoAdvance] hold each finished line for a readable
 *   beat and move on by itself. On by default: a cut-scene should play. Turn it
 *   off for conversation, where the player sets the pace.
 */
export function createSpeech({ parent, autoAdvance = true } = {}) {
  const portraitSlot = el('div.speech-portrait');
  const nameNode = el('div.speech-name');
  const textNode = el('div.speech-text');
  const caret = el('span.speech-next', { text: '▾', 'aria-hidden': 'true' });

  const box = el('div.speech', {
    role: 'status',
    'aria-live': 'polite',
    hidden: true,
  }, [
    portraitSlot,
    el('div.speech-body', {}, [nameNode, textNode]),
    caret,
  ]);

  (parent || document.getElementById('app')).append(box);

  /** The line currently being said, or null. */
  let active = null;
  let disposed = false;

  /** A tap anywhere counts: catch the typing up, or move the line on. */
  const onPress = (e) => {
    if (!active) return;
    // Ignore modifier-only keys, and let a real button underneath be a button.
    if (e.type === 'keydown' && !['Enter', ' ', 'Escape'].includes(e.key)) return;
    if (e.type === 'keydown') e.preventDefault();
    active.advance();
  };
  window.addEventListener('pointerdown', onPress);
  window.addEventListener('keydown', onPress);

  /**
   * Say one line.
   *
   * @param {object} line
   * @param {string} line.text
   * @param {string} [line.name] the name plate. Omitted lines get no plate.
   * @param {HTMLCanvasElement} [line.portrait] a baked pixel canvas
   * @param {'player'|'enemy'} [line.side] which way the box is dressed
   * @param {number} [line.charMs] override the typing speed for this line
   * @param {string} [line.voice] audio cue played per character
   * @returns {Promise<void>} resolves when the line is done with
   */
  function say(line) {
    if (disposed) return Promise.resolve();
    const {
      /**
       * Translated HERE, once, before a single character of it is typed.
       * The typewriter walks the string a letter at a time, so a line
       * translated on the way out would be looked up against a fragment —
       * "Sev", "Seve", "Seven " — and never found. What gets typed has to
       * already be the sentence the player is going to read.
       */
      text: rawText = '',
      name = '',
      portrait = null,
      side = 'enemy',
      charMs = CHAR_MS,
      voice = 'type',
    } = line || {};
    const text = t(rawText);

    return new Promise((resolve) => {
      box.hidden = false;
      box.className = `speech is-${side}`;
      box.classList.add('is-in');
      nameNode.textContent = t(name);
      nameNode.hidden = !name;
      textNode.textContent = '';
      caret.classList.remove('is-ready');

      portraitSlot.replaceChildren();
      if (portrait) portraitSlot.append(pixelImg(portrait, 3, 'speech-face'));
      portraitSlot.hidden = !portrait;

      let index = 0;
      let timer = null;
      let dwell = null;
      let typed = false;

      const finish = () => {
        clearTimeout(timer);
        clearTimeout(dwell);
        active = null;
        resolve();
      };

      const complete = () => {
        clearTimeout(timer);
        textNode.textContent = text;
        typed = true;
        caret.classList.add('is-ready');
        if (autoAdvance) {
          dwell = setTimeout(finish, DWELL_BASE_MS + text.length * DWELL_PER_CHAR_MS);
        }
      };

      const tick = () => {
        if (index >= text.length) {
          complete();
          return;
        }
        const ch = text[index];
        textNode.textContent += ch;
        index += 1;
        // Spaces and punctuation are silent; letters tick.
        if (voice && /\S/.test(ch) && index % 2 === 0) play(voice);
        timer = setTimeout(tick, charMs + (PUNCTUATION_MS[ch] || 0));
      };

      active = {
        advance() {
          if (!typed) complete();
          else finish();
        },
      };

      tick();
    });
  }

  /** Take the box off screen without tearing it down. */
  function hide() {
    box.classList.remove('is-in');
    box.hidden = true;
    textNode.textContent = '';
  }

  function dispose() {
    disposed = true;
    active = null;
    window.removeEventListener('pointerdown', onPress);
    window.removeEventListener('keydown', onPress);
    box.remove();
  }

  return { node: box, say, hide, dispose };
}
