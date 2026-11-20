// Lesson 3: the chords of a key (I ii iii IV V vi vii°) and common progressions.
import { h } from '../dom.js';
import { COLORS } from '../piano3d.js';
import { diatonicChords, chordMidi, pretty, QUALITY, PROGRESSIONS, progressionChords, scaleMidi } from '../theory.js';
import { ChoiceExercise, ChordExercise } from '../exercise.js';
import { synth, playSequence } from '../audio.js';
import { subTabs, slides, keyButtons, keyChooser, pick } from './common.js';

const QCOLOR = { major: COLORS.tonic, minor: COLORS.scale, dim: COLORS.dim };

export function exChord(c) {
  return {
    ...c,
    midis: chordMidi(c),
    noteNames: c.notes.map((n) => n.name),
    qualityWord: QUALITY[c.quality].word,
  };
}

function showChord(app, c, { label = 'names', play = true } = {}) {
  const midis = chordMidi(c);
  app.piano.setHighlights(new Map(midis.map((m, i) => [m, { color: QCOLOR[c.quality], label: label === 'names' ? pretty(c.notes[i].name) : String([1, 3, 5][i]) }])));
  const steps = QUALITY[c.quality].steps;
  app.piano.setSteps([
    { from: midis[0], to: midis[1], text: String(steps[0]), color: '#264653' },
    { from: midis[1], to: midis[2], text: String(steps[1]), color: '#264653' },
  ]);
  if (play) {
    synth.chord(midis, { dur: 1.6 });
    midis.forEach((m) => app.piano.tap(m, 400));
  }
}

export function lesson3(app, root) {
  const tabs = subTabs(app, root, [
    { label: '📖 Learn', render: (el) => learn(app, el, () => tabs.open(1)) },
    { label: '✏️ Major or minor?', practice: true, render: (el) => whatKind(app, el) },
    { label: '✏️ Play the chord', practice: true, render: (el) => playChord(app, el) },
    { label: '✏️ Play a progression', practice: true, render: (el) => playProgression(app, el) },
  ]);
  return tabs;
}

function chordCard(c, { onclick, on = false } = {}) {
  return h('button', { class: `chord-card ${c.quality}${on ? ' on' : ''}`, onclick },
    h('div', { class: 'roman' }, c.roman),
    h('div', { class: 'cname' }, pretty(c.name)),
    h('div', { class: 'qual' }, QUALITY[c.quality].word));
}

function learn(app, el, done) {
  let keyName = 'C';
  const list = [
    {
      title: 'Building a chord: every other note',
      html: `<p>A basic chord (a "triad") is three notes played together. To build one, start on any note of the scale and <b>skip every other note</b>: play one, skip one, play one, skip one, play one.</p>
             <p>In C major, starting on C gives notes 1, 3 and 5: <b>C + E + G</b>. That's the C major chord.</p>`,
      render: (area) => {
        const midis = scaleMidi('C');
        const hl = new Map(midis.map((m, i) => [m, { color: [0, 2, 4].includes(i) ? COLORS.tonic : 0xe6eef2, label: String(i === 7 ? 1 : i + 1) }]));
        app.piano.setHighlights(hl);
        area.append(h('button', { class: 'btn primary', onclick: () => { synth.chord([60, 64, 67]); [60, 64, 67].forEach((m) => app.piano.tap(m, 500)); } }, '🔊 Play C + E + G together'),
          h('button', { class: 'btn', onclick: () => playSequence([60, 64, 67].map((m) => ({ notes: [m] })), { bpm: 120, onStep: (i) => app.piano.tap([60, 64, 67][i]) }) }, '🔊 One at a time'));
      },
    },
    {
      title: 'Major, minor and diminished',
      html: `<p>Chords sound different depending on the gaps between their notes. Count the half steps (the numbers above the keys):</p>
             <ul class="big-list">
               <li><b>Major</b> = 4 then 3. Sounds bright and happy.</li>
               <li><b>minor</b> = 3 then 4. Sounds sad or serious.</li>
               <li><b>diminished</b> = 3 then 3. Sounds tense, like it wants to move.</li>
             </ul>`,
      render: (area) => {
        const cs = diatonicChords('C');
        const examples = [cs[0], cs[1], cs[6]];
        const row = h('div', { class: 'chord-row' });
        const draw = (sel) => {
          row.replaceChildren(...examples.map((c) => chordCard(c, { on: c === sel, onclick: () => { draw(c); showChord(app, c); } })));
        };
        draw(examples[0]);
        showChord(app, examples[0], { play: false });
        area.append(h('p', { class: 'label' }, 'Tap a chord to see and hear it:'), row);
      },
    },
    {
      title: 'The 7 chords in every major key',
      html: `<p>Build a chord on each of the 7 notes of the scale and you always get the same pattern:</p>
             <p class="pattern"><b>M</b>ajor – <b>m</b>inor – <b>m</b>inor – <b>M</b>ajor – <b>M</b>ajor – <b>m</b>inor – <b>D</b>iminished</p>
             <p>Musicians number them with Roman numerals: <b>I ii iii IV V vi vii°</b>. Capital = Major, small = minor, ° = diminished. Pick a key, then tap a chord.</p>`,
      render: (area) => {
        const cards = h('div', { class: 'chord-row seven' });
        let sel = 0;
        const draw = () => {
          const cs = diatonicChords(keyName);
          cards.replaceChildren(...cs.map((c, i) => chordCard(c, { on: i === sel, onclick: () => { sel = i; draw(); showChord(app, c); } })));
          showChord(app, cs[sel], { play: false });
        };
        area.append(h('p', { class: 'label' }, 'Key:'), keyButtons(keyName, (k) => { keyName = k; sel = 0; draw(); }, { compact: true }), cards,
          h('button', {
            class: 'btn', onclick: () => {
              const cs = diatonicChords(keyName);
              playSequence(cs.map((c) => ({ notes: chordMidi(c), beats: 1.5 })), { bpm: 100, onStep: (i) => { sel = i; draw(); chordMidi(cs[i]).forEach((m) => app.piano.tap(m, 400)); } });
            },
          }, '🔊 Play all 7 chords'));
        draw();
      },
    },
    {
      title: 'Chord progressions',
      html: `<p>Songs move from chord to chord in a few favorite patterns called <b>progressions</b>. Because every key has the same pattern of chords, a progression like <b>I – IV – V</b> works in any key.</p>`,
      render: (area) => {
        let progIdx = 0;
        let cancel = null;
        const cardsRow = h('div', { class: 'chord-row' });
        const about = h('p', { class: 'tip' });
        const progBtns = h('div', { class: 'seg wrap' });
        const draw = (active = -1) => {
          const p = PROGRESSIONS[progIdx];
          const cs = progressionChords(keyName, p.degrees);
          cardsRow.replaceChildren(...cs.map((c, i) => chordCard(c, { on: i === active, onclick: () => showChord(app, c) })));
          about.textContent = p.about;
          progBtns.replaceChildren(...PROGRESSIONS.map((pp, i) => h('button', { class: 'segbtn' + (i === progIdx ? ' on' : ''), onclick: () => { progIdx = i; draw(); showChord(app, progressionChords(keyName, PROGRESSIONS[i].degrees)[0], { play: false }); } }, pp.label)));
        };
        const play = () => {
          if (cancel) cancel();
          const cs = progressionChords(keyName, PROGRESSIONS[progIdx].degrees);
          cancel = playSequence(cs.map((c) => ({ notes: chordMidi(c), beats: 2 })), {
            bpm: 90,
            onStep: (i) => { draw(i); showChord(app, cs[i], { play: false }); chordMidi(cs[i]).forEach((m) => app.piano.tap(m, 500)); },
            onDone: () => draw(),
          });
        };
        area.append(h('p', { class: 'label' }, 'Progression:'), progBtns, about,
          h('p', { class: 'label' }, 'Key:'), keyButtons(keyName, (k) => { keyName = k; draw(); showChord(app, progressionChords(keyName, PROGRESSIONS[progIdx].degrees)[0], { play: false }); }, { compact: true }),
          cardsRow, h('button', { class: 'btn primary', onclick: play }, '▶ Play the progression'));
        draw();
        showChord(app, progressionChords(keyName, PROGRESSIONS[0].degrees)[0], { play: false });
        return { cleanup: () => cancel && cancel() };
      },
    },
  ];
  list.done = done;
  list.doneLabel = 'Start practicing ▶';
  return slides(app, el, list);
}

function whatKind(app, el) {
  return new ChoiceExercise(app, el, {
    id: 'l3-quality',
    title: 'Major, minor, or diminished?',
    intro: 'Remember the pattern: M m m M M m D. Or count the half steps: 4+3 is Major, 3+4 is minor, 3+3 is diminished.',
    make: () => {
      const k = pick(['C', 'G', 'F', 'D', 'A', 'Bb', 'Eb', 'E']);
      const cs = diatonicChords(k);
      const c = pick(cs);
      const midis = chordMidi(c);
      const names = c.notes.map((n) => pretty(n.name));
      const steps = QUALITY[c.quality].steps;
      return {
        prompt: `In the key of <b>${pretty(k)}</b>, the chord built on note <b>${c.degree}</b> (${pretty(c.notes[0].name)}) is…`,
        options: Object.entries(QUALITY).map(([q, d]) => ({ label: d.word[0].toUpperCase() + d.word.slice(1), value: q })),
        answer: c.quality,
        setup: (p) => p.setHighlights(new Map(midis.map((m, i) => [m, { color: COLORS.target, label: names[i] }]))),
        reveal: () => showChord(app, c, { play: false }),
        explain: `It's ${names.join(' + ')}: ${steps[0]} then ${steps[1]} half steps, so it's ${QUALITY[c.quality].word}. That's the ${c.roman} chord, ${pretty(c.name)}.`,
        play: () => { synth.chord(midis); midis.forEach((m) => app.piano.tap(m, 400)); },
      };
    },
  });
}

function playChord(app, el) {
  let nextKey = () => 'C';
  return new ChordExercise(app, el, {
    id: 'l3-chord',
    title: 'Play the chord',
    intro: 'Play all three notes of the chord. You can press them together or one at a time, in any order and any octave.',
    guideOption: true,
    controls: (c, restart) => { nextKey = keyChooser(c, restart); },
    make: () => {
      const keyName = nextKey();
      const c = exChord(pick(diatonicChords(keyName).slice(0, 6).concat(diatonicChords(keyName))));
      return {
        prompt: `In the key of <b>${pretty(keyName)}</b>, play the <b>${c.roman}</b> chord.`,
        chords: [c],
        base: [[scaleMidi(keyName)[0], { color: 0xffe2bd, label: '1' }]],
      };
    },
  });
}

function playProgression(app, el) {
  let nextKey = () => 'C';
  let prog = 'any';
  return new ChordExercise(app, el, {
    id: 'l3-progression',
    title: 'Play a progression',
    intro: 'Play each chord in order. When one chord is right, the next one lights up.',
    guideOption: true,
    controls: (c, restart) => {
      nextKey = keyChooser(c, restart);
      c.append(h('label', { class: 'chooser' }, 'Progression: ', h('select', { class: 'select', onchange: (e) => { prog = e.target.value; restart(); } },
        h('option', { value: 'any' }, 'Any'),
        ...PROGRESSIONS.map((p) => h('option', { value: p.id }, p.label)))));
    },
    make: () => {
      const keyName = nextKey();
      const p = prog === 'any' ? pick(PROGRESSIONS) : PROGRESSIONS.find((x) => x.id === prog);
      const chords = progressionChords(keyName, p.degrees).map(exChord);
      return {
        prompt: `In the key of <b>${pretty(keyName)}</b>, play <b>${p.label}</b>.`,
        chords,
      };
    },
  });
}

