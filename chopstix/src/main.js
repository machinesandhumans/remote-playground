import { Piano3D } from './piano3d.js';
import { synth } from './audio.js';
import { Inputs, KEY_LETTER } from './input.js';
import { isBlack, sharpName, pretty, noteNameWithOctave } from './theory.js';
import { h } from './dom.js';
import { lesson1 } from './lessons/lesson1.js';
import { lesson2 } from './lessons/lesson2.js';
import { lesson3 } from './lessons/lesson3.js';

const LOW = 60;
const HIGH = 84;
const fold = (m) => {
  while (m < LOW) m += 12;
  while (m > HIGH) m -= 12;
  return m;
};

const piano = new Piano3D(document.getElementById('piano'), { low: LOW, high: HIGH });
const app = {
  piano,
  handler: null,
  setHandler(hd) {
    this.handler = hd;
    inputs.listenForChords = !!(hd && hd.wantsChords);
  },
};

// --- Labels on the keys ------------------------------------------------------------
const labelSel = document.getElementById('labels');
function applyLabels() {
  const mode = labelSel.value;
  try { localStorage.setItem('chopstix-labels', mode); } catch { /* ignore */ }
  piano.setBaseLabels(
    mode === 'names' ? (m) => (isBlack(m) ? '' : sharpName(m))
      : mode === 'keys' ? (m) => KEY_LETTER[m - 60 - inputs.octaveShift] || ''
        : null,
  );
}
try { labelSel.value = localStorage.getItem('chopstix-labels') || 'names'; } catch { /* ignore */ }
labelSel.addEventListener('change', applyLabels);

// --- Notes coming in from anywhere -------------------------------------------------------
const heardEl = document.getElementById('heard');
function handleNote(midi, source) {
  const shown = fold(midi);
  if (source === 'click' || source === 'keyboard') synth.note(midi);
  if (source === 'mic') piano.tap(shown, 350);
  else piano.press(shown);
  heardEl.textContent = pretty(sharpName(midi));
  heardEl.title = `${noteNameWithOctave(midi)} (from ${source})`;
  heardEl.classList.remove('pop');
  void heardEl.offsetWidth;
  heardEl.classList.add('pop');
  if (app.handler && app.handler.onNote) app.handler.onNote(midi, source);
}
function handleNoteOff(midi) {
  piano.release(fold(midi));
}
piano.onKeyDown = (m) => handleNote(m, 'click');
piano.onKeyUp = (m) => handleNoteOff(m);

const micBtn = document.getElementById('micBtn');
const micState = document.getElementById('micState');
const meter = document.getElementById('meter');
const midiState = document.getElementById('midiState');

const inputs = new Inputs({
  onNote: handleNote,
  onNoteOff: handleNoteOff,
  onChord: (c) => app.handler && app.handler.onChord && app.handler.onChord(c),
  onStatus: (s) => {
    micBtn.classList.toggle('on', s.mic === 'on');
    micBtn.textContent = s.mic === 'on' ? '🎤 Listening… (tap to stop)' : '🎤 Listen to my piano';
    micState.textContent = s.mic === 'blocked' ? 'Microphone was blocked. Allow it in the browser address bar and try again.' : '';
    meter.style.width = `${Math.round((s.level || 0) * 100)}%`;
    meter.parentElement.hidden = s.mic !== 'on';
    midiState.textContent = s.midi && !['none', 'unsupported', 'blocked'].includes(s.midi) ? `🎹 MIDI keyboard: ${s.midi}` : '';
  },
});
applyLabels();
window.addEventListener('keydown', (e) => { if (e.code === 'KeyZ' || e.code === 'KeyX') setTimeout(applyLabels); });

micBtn.addEventListener('click', async () => {
  if (inputs.mic) inputs.stopMic();
  else await inputs.startMic();
});

const soundBtn = document.getElementById('soundBtn');
soundBtn.addEventListener('click', () => {
  synth.enabled = !synth.enabled;
  soundBtn.textContent = synth.enabled ? '🔊 Sound on' : '🔇 Sound off';
  soundBtn.setAttribute('aria-pressed', String(!synth.enabled));
});

// --- Lessons -----------------------------------------------------------------------
const LESSONS = [lesson1, lesson2, lesson3];
const lessonRoot = document.getElementById('lesson');
const tabs = [...document.querySelectorAll('#lessonTabs button')];
let current = null;
function openLesson(i) {
  if (current && current.destroy) current.destroy();
  lessonRoot.replaceChildren();
  tabs.forEach((t, j) => t.setAttribute('aria-selected', String(i === j)));
  current = LESSONS[i](app, lessonRoot);
  if (location.hash !== `#lesson${i + 1}`) history.replaceState(null, '', `#lesson${i + 1}`);
}
tabs.forEach((t, i) => t.addEventListener('click', () => openLesson(i)));
const fromHash = Number((location.hash.match(/lesson(\d)/) || [])[1]) - 1;
openLesson(fromHash >= 0 && fromHash < 3 ? fromHash : 0);

// Audio can only start from a tap, click or key press. Keep trying on every gesture
// until the browser reports that sound is running (iPhone/iPad need a tap that ends).
const soundHint = document.getElementById('soundHint');
const GESTURES = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'];
const unlock = () => {
  synth.unlock();
  setTimeout(() => {
    if (synth.running) {
      GESTURES.forEach((g) => window.removeEventListener(g, unlock, true));
      soundHint.hidden = true;
    }
  }, 100);
};
GESTURES.forEach((g) => window.addEventListener(g, unlock, true));
soundHint.addEventListener('click', unlock);

window.chopstix = { app, inputs, piano, h };
