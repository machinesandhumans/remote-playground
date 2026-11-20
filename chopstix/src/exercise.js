// Practice exercises with accuracy checking.
// Three kinds:
//   choiceExercise – answer by pressing a big button (e.g. "Whole step or half step?")
//   playExercise   – play notes in order (e.g. a scale, or a single note)
//   chordExercise  – play one or more chords (notes can be in any order or octave)
import { COLORS } from './piano3d.js';
import { pc, pretty, sharpName, sameSet } from './theory.js';
import { synth, playSequence } from './audio.js';
import { h } from './dom.js';

const STORE = 'chopstix-scores-v1';
function loadScores() {
  try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch { return {}; }
}
function saveScores(s) {
  try { localStorage.setItem(STORE, JSON.stringify(s)); } catch { /* private mode etc. */ }
}
export function getScore(id) {
  return loadScores()[id] || { tries: 0, right: 0, done: 0 };
}
export function resetScores() {
  saveScores({});
}

class Base {
  constructor(app, root, opts) {
    this.app = app;
    this.opts = opts;
    this.id = opts.id;
    this.session = { tries: 0, right: 0 };
    this.el = h('div', { class: 'exercise' },
      h('h2', {}, opts.title),
      opts.intro ? h('p', { class: 'intro' }, opts.intro) : null,
      (this.controls = h('div', { class: 'ex-controls' })),
      (this.promptEl = h('p', { class: 'prompt', 'aria-live': 'polite' })),
      (this.extra = h('div', { class: 'ex-extra' })),
      (this.optionsEl = h('div', { class: 'options' })),
      (this.feedbackEl = h('p', { class: 'feedback', 'aria-live': 'polite' })),
      h('div', { class: 'actions' },
        (this.hintBtn = h('button', { class: 'btn secondary', onclick: () => this.hint() }, '💡 Hint')),
        (this.showBtn = h('button', { class: 'btn secondary', onclick: () => this.showMe() }, '👀 Show me')),
        (this.nextBtn = h('button', { class: 'btn primary', onclick: () => this.next() }, 'Next question ▶'))),
      (this.scoreEl = h('div', { class: 'score' })));
    root.appendChild(this.el);
    this.updateScore();
  }

  record(ok) {
    const all = loadScores();
    const s = all[this.id] || { tries: 0, right: 0, done: 0 };
    s.tries++;
    if (ok) s.right++;
    all[this.id] = s;
    saveScores(all);
    this.session.tries++;
    if (ok) this.session.right++;
    this.updateScore();
  }

  markDone() {
    const all = loadScores();
    const s = all[this.id] || { tries: 0, right: 0, done: 0 };
    s.done = (s.done || 0) + 1;
    all[this.id] = s;
    saveScores(all);
    this.updateScore();
  }

  updateScore() {
    const s = getScore(this.id);
    const pct = (a, b) => (b ? Math.round((100 * a) / b) + '%' : '–');
    this.scoreEl.replaceChildren(
      h('span', { class: 'score-big' }, `Today: ${this.session.right} right out of ${this.session.tries}`),
      h('span', { class: 'score-pct' }, ` (${pct(this.session.right, this.session.tries)})`),
      h('span', { class: 'score-all' }, `All-time accuracy: ${pct(s.right, s.tries)} · finished ${s.done || 0} question${s.done === 1 ? '' : 's'}`));
  }

  feedback(text, kind = '') {
    this.feedbackEl.textContent = text;
    this.feedbackEl.className = 'feedback ' + kind;
  }

  setPrompt(html) {
    this.promptEl.innerHTML = html;
  }

  stop() {
    if (this.cancelPlay) this.cancelPlay();
  }

  destroy() {
    this.stop();
    this.el.remove();
  }
}

// ---------------------------------------------------------------------------------
// opts.make() => { prompt, options: [{label, value}], answer, setup(piano), explain, play() }
export class ChoiceExercise extends Base {
  constructor(app, root, opts) {
    super(app, root, opts);
    this.hintBtn.hidden = true;
    this.showBtn.textContent = '🔊 Hear it again';
    this.next();
  }

  next() {
    this.stop();
    this.q = this.opts.make();
    this.answered = false;
    this.app.piano.clear();
    this.q.setup && this.q.setup(this.app.piano);
    this.setPrompt(this.q.prompt);
    this.feedback('');
    this.optionsEl.replaceChildren(...this.q.options.map((o) => h('button', {
      class: 'btn option', onclick: (e) => this.choose(o, e.currentTarget),
    }, o.label)));
    this.q.play && setTimeout(() => this.q.play(), 250);
  }

  showMe() { this.q.play && this.q.play(); }

  choose(o, btn) {
    if (this.answered) return;
    const ok = o.value === this.q.answer;
    this.record(ok);
    if (ok) {
      this.answered = true;
      btn.classList.add('right');
      this.feedback('✅ Correct! ' + (this.q.explain || ''), 'good');
      this.markDone();
      this.q.reveal && this.q.reveal(this.app.piano);
    } else {
      btn.classList.add('wrong');
      btn.disabled = true;
      this.feedback('❌ Not quite. Try another answer.', 'bad');
    }
  }

  onNote() { /* choice questions ignore played notes */ }
}

// ---------------------------------------------------------------------------------
// opts.make() => { prompt, notes: [midi], names: [text], base(piano) draws starting picture,
//                  strip: optional array of strings shown under the prompt (e.g. W W H ...) }
// opts.guide: if true there is a "Show the keys" checkbox that lights up the next key.
export class PlayExercise extends Base {
  constructor(app, root, opts) {
    super(app, root, opts);
    if (opts.guideOption) {
      const id = 'guide-' + opts.id;
      this.guide = opts.guideDefault ?? true;
      this.controls.append(h('label', { class: 'toggle', for: id },
        h('input', { type: 'checkbox', id, checked: this.guide, onchange: (e) => { this.guide = e.target.checked; this.draw(); } }),
        ' Show me which keys to press'));
    }
    if (opts.controls) opts.controls(this.controls, () => this.next());
    this.next();
  }

  next() {
    this.stop();
    this.q = this.opts.make();
    this.idx = 0;
    this.mistakes = 0;
    this.hints = 0;
    this.finished = false;
    this.setPrompt(this.q.prompt);
    this.feedback(this.q.notes.length > 1 ? 'Play the notes one at a time, from left to right.' : 'Play one note.');
    this.draw();
  }

  draw() {
    const p = this.app.piano;
    p.clear();
    const hl = new Map();
    if (this.q.base) for (const [m, v] of this.q.base) hl.set(m, v);
    const showAll = this.guide || this.showing;
    this.q.notes.forEach((m, i) => {
      if (i < this.idx) hl.set(m, { color: COLORS.correct, label: this.q.names[i] });
      else if (i === this.idx && (showAll || this.hints > 1)) hl.set(m, { color: COLORS.target, label: this.q.names[i] });
      else if (showAll) {
        // Don't paint over a key that is already green (e.g. the top note equals a played one).
        if (!hl.has(m) || hl.get(m).color !== COLORS.correct) hl.set(m, { color: COLORS.scale, label: this.q.names[i] });
      }
    });
    p.setHighlights(hl);
    if (this.q.steps && showAll) p.setSteps(this.q.steps);
    // Progress dots: each note name, green once played.
    this.extra.replaceChildren(h('div', { class: 'dots' }, ...this.q.notes.map((m, i) => h('span', {
      class: 'dot' + (i < this.idx ? ' done' : i === this.idx ? ' now' : ''),
    }, i < this.idx || showAll ? pretty(this.q.names[i]) : '?'))));
    if (this.q.strip) this.extra.append(h('div', { class: 'strip' }, ...this.q.strip.map((s, i) => h('span', { class: 'step ' + s + (i < this.idx ? ' done' : '') }, s))));
  }

  hint() {
    if (this.finished) return;
    this.hints++;
    const name = pretty(this.q.names[this.idx]);
    if (this.hints === 1 && this.q.hintText) this.feedback('💡 ' + this.q.hintText(this.idx), 'info');
    else {
      this.hints = Math.max(this.hints, 2);
      this.feedback(`💡 The next note is ${name}. It's lit up in yellow.`, 'info');
    }
    this.draw();
  }

  showMe() {
    this.stop();
    this.showing = true;
    this.draw();
    const p = this.app.piano;
    this.cancelPlay = playSequence(this.q.notes.map((m) => ({ notes: [m] })), {
      bpm: 100,
      onStep: (i) => { p.tap(this.q.notes[i], 300); },
      onDone: () => { this.showing = false; this.draw(); },
    });
  }

  onNote(midi, source) {
    if (this.finished) return;
    const want = this.q.notes[this.idx];
    if (pc(midi) === pc(want)) {
      this.record(true);
      this.app.piano.flash(midi, COLORS.correct, 400);
      this.idx++;
      this.hints = 0;
      if (this.idx >= this.q.notes.length) {
        this.finished = true;
        this.markDone();
        const msg = this.mistakes === 0 ? '🎉 Perfect! Every note was right.' : `🎉 Done! You got there with ${this.mistakes} slip${this.mistakes > 1 ? 's' : ''}.`;
        this.feedback(msg + ' Press "Next question" for another.', 'good');
        this.q.onFinish && this.q.onFinish(this.app.piano);
      } else {
        this.feedback(`✅ Yes, ${pretty(this.q.names[this.idx - 1])}! Now the next one.`, 'good');
      }
      this.draw();
    } else {
      this.mistakes++;
      this.record(false);
      this.app.piano.flash(midi, COLORS.wrong, 700);
      const heard = source === 'mic' ? ` (I heard ${pretty(sharpName(midi))})` : ` (that was ${pretty(sharpName(midi))})`;
      this.feedback(`❌ Not that one${heard}. Try again${this.q.hintText ? ', or press Hint' : ''}.`, 'bad');
    }
  }
}

// ---------------------------------------------------------------------------------
// opts.make() => { prompt, chords: [{ pcs, midis, name, roman }], base(piano) }
export class ChordExercise extends Base {
  constructor(app, root, opts) {
    super(app, root, opts);
    this.wantsChords = true;
    if (opts.guideOption) {
      const id = 'guide-' + opts.id;
      this.guide = opts.guideDefault ?? false;
      this.controls.append(h('label', { class: 'toggle', for: id },
        h('input', { type: 'checkbox', id, checked: this.guide, onchange: (e) => { this.guide = e.target.checked; this.draw(); } }),
        ' Show me which keys to press'));
    }
    if (opts.controls) opts.controls(this.controls, () => this.next());
    this.next();
  }

  next() {
    this.stop();
    this.q = this.opts.make();
    this.idx = 0;
    this.got = new Map(); // pc -> midi played
    this.hints = 0;
    this.slips = 0;
    this.finished = false;
    this.setPrompt(this.q.prompt);
    this.feedback('Play the three notes of the chord, together or one at a time, in any order.');
    this.draw();
  }

  get chord() { return this.q.chords[this.idx]; }

  draw() {
    const p = this.app.piano;
    p.clear();
    const hl = new Map();
    if (this.q.base) for (const [m, v] of this.q.base) hl.set(m, v);
    if (this.finished) {
      this.q.chords.at(-1).midis.forEach((m) => hl.set(m, { color: COLORS.correct, label: '' }));
    } else {
      const c = this.chord;
      if (this.guide || this.hints >= 2 || this.showing) c.midis.forEach((m, i) => hl.set(m, { color: COLORS.target, label: pretty(c.noteNames[i]) }));
      for (const m of this.got.values()) hl.set(m, { color: COLORS.correct, label: pretty(sharpName(m)) });
    }
    p.setHighlights(hl);
    const cards = this.q.chords.length > 1
      ? h('div', { class: 'chord-row' }, ...this.q.chords.map((c, i) => h('div', {
        class: 'chord-card small' + (i < this.idx || this.finished ? ' done' : i === this.idx ? ' now' : ''),
      }, h('div', { class: 'roman' }, c.roman), h('div', { class: 'cname' }, i < this.idx || this.finished || this.hints || this.guide ? pretty(c.name) : '?'))))
      : null;
    const have = this.finished ? '' : `Notes so far: ${[...this.got.values()].map((m) => pretty(sharpName(m))).join(' + ') || 'none yet'}`;
    this.extra.replaceChildren(...[cards, h('p', { class: 'collected' }, have),
      this.finished ? null : h('button', { class: 'btn small secondary', onclick: () => { this.got.clear(); this.draw(); } }, 'Start this chord over')].filter(Boolean));
  }

  hint() {
    if (this.finished) return;
    this.hints++;
    const c = this.chord;
    if (this.hints === 1) this.feedback(`💡 The ${c.roman} chord is ${pretty(c.name)} (${c.qualityWord}). Its root note is ${pretty(c.noteNames[0])}.`, 'info');
    else this.feedback(`💡 Play ${c.noteNames.map(pretty).join(' + ')}. They're lit up in yellow.`, 'info');
    this.draw();
  }

  showMe() {
    this.stop();
    const p = this.app.piano;
    this.showing = true;
    this.draw();
    const steps = this.q.chords.slice(this.idx).map((c) => ({ notes: c.midis, beats: 2 }));
    this.cancelPlay = playSequence(steps, {
      bpm: 90,
      onStep: (i) => {
        const c = this.q.chords[this.idx + i];
        p.setHighlights(new Map(c.midis.map((m, j) => [m, { color: COLORS.target, label: pretty(c.noteNames[j]) }])));
        c.midis.forEach((m) => p.tap(m, 500));
      },
      onDone: () => { this.showing = false; this.draw(); },
    });
  }

  completeChord() {
    this.record(true);
    this.idx++;
    this.got.clear();
    this.hints = 0;
    if (this.idx >= this.q.chords.length) {
      this.finished = true;
      this.markDone();
      const all = this.q.chords;
      this.feedback(`🎉 ${all.length > 1 ? 'You played the whole progression!' : `Yes! That's ${pretty(all[0].name)}.`} ${this.slips ? '' : 'No wrong notes!'} Press "Next question" for another.`, 'good');
      if (all.length > 1) {
        // Play it back so he hears what he just played.
        this.cancelPlay = playSequence(all.map((c) => ({ notes: c.midis, beats: 2 })), { bpm: 110 });
      }
    } else {
      this.feedback(`✅ ${pretty(this.q.chords[this.idx - 1].name)}, great! Now chord ${this.idx + 1}: ${this.chord.roman}.`, 'good');
    }
    this.draw();
  }

  onNote(midi, source) {
    if (this.finished) return;
    const c = this.chord;
    const p = pc(midi);
    if (c.pcs.includes(p)) {
      this.got.set(p, midi);
      if (c.pcs.every((x) => this.got.has(x))) this.completeChord();
      else this.draw();
    } else if (source !== 'mic') {
      // The mic sometimes hears overtones, so only count clear wrong keys from click/keyboard/MIDI.
      this.slips++;
      this.record(false);
      this.app.piano.flash(midi, COLORS.wrong, 700);
      this.feedback(`❌ ${pretty(sharpName(midi))} isn't in the ${c.roman} chord. Try another key, or press Hint.`, 'bad');
    }
  }

  onChord(ch) {
    if (this.finished) return;
    if (sameSet(ch.pcs, this.chord.pcs)) {
      this.chord.midis.forEach((m) => this.app.piano.tap(m, 400));
      this.completeChord();
    }
  }

  stop() {
    super.stop();
    this.showing = false;
  }
}

export { synth };
