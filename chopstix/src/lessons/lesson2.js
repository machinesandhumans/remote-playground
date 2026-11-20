// Lesson 2: the same W W H W W W H recipe in all 12 keys, with a key map for each.
import { h } from '../dom.js';
import { COLORS } from '../piano3d.js';
import { KEYS, keyByName, majorScale, scaleMidi, pretty, accidentalsText, MAJOR_STEPS, STEP_LETTER } from '../theory.js';
import { ChoiceExercise, PlayExercise } from '../exercise.js';
import { subTabs, slides, showScale, playNotes, keyButtons, keyChooser, keyLabel, pick } from './common.js';

export function lesson2(app, root) {
  const tabs = subTabs(app, root, [
    { label: '📖 Learn', render: (el) => learn(app, el, () => tabs.open(1)) },
    { label: '✏️ Play a scale', practice: true, render: (el) => playScale(app, el) },
    { label: '✏️ Find the note', practice: true, render: (el) => findNote(app, el) },
    { label: '✏️ Which spelling?', practice: true, render: (el) => whichSpelling(app, el) },
  ]);
  return tabs;
}

function scaleRow(keyName) {
  const scale = majorScale(keyName);
  const names = [...scale.map((n) => n.name), scale[0].name];
  const row = h('div', { class: 'scale-row' });
  names.forEach((n, i) => {
    const black = n.length > 1 && !['E#', 'B#', 'Fb', 'Cb'].includes(n);
    row.append(h('div', { class: 'scale-note' + (black ? ' black' : '') + (i % 7 === 0 ? ' home' : '') },
      h('div', { class: 'deg' }, String(i === 7 ? 1 : i + 1)), h('div', { class: 'nm' }, pretty(n))));
    if (i < 7) row.append(h('span', { class: 'step ' + STEP_LETTER[MAJOR_STEPS[i]] }, STEP_LETTER[MAJOR_STEPS[i]]));
  });
  return row;
}

function learn(app, el, done) {
  let keyName = 'D';
  let mode = 'both';
  const list = [
    {
      title: 'One recipe, twelve keys',
      html: `<p>Pick any starting note below. The app follows the recipe <b>W W H W W W H</b> from that note and lights up the keys for you.
             The orange key is "home" (note 1). The blue keys are the rest of the scale.</p>`,
      render: (area) => {
        const info = h('div', { class: 'key-info' });
        const draw = () => {
          showScale(app, keyName, { mode });
          info.replaceChildren(
            h('h3', {}, `The key of ${keyLabel(keyByName(keyName))} major`),
            scaleRow(keyName),
            h('p', { class: 'acc' }, accidentalsText(keyName)),
            keyByName(keyName).alt ? h('p', { class: 'tip' }, `${pretty(keyName)} and ${pretty(keyByName(keyName).alt)} are the same key on the piano. Musicians usually write it as ${pretty(keyName)}.`) : null,
            h('button', { class: 'btn primary', onclick: () => playNotes(app, scaleMidi(keyName), { bpm: 90 }) }, `🔊 Play ${pretty(keyName)} major`));
        };
        const modeSel = h('div', { class: 'seg' }, ...[['names', 'Note names'], ['numbers', 'Numbers 1–7'], ['both', 'Both']].map(([v, l]) => h('button', {
          class: 'segbtn' + (v === mode ? ' on' : ''),
          onclick: (e) => { mode = v; [...modeSel.children].forEach((b) => b.classList.remove('on')); e.currentTarget.classList.add('on'); draw(); },
        }, l)));
        area.append(h('p', { class: 'label' }, 'Choose a key:'), keyButtons(keyName, (k) => { keyName = k; draw(); }),
          h('div', { class: 'row' }, h('span', { class: 'label' }, 'Show on keys: '), modeSel), info);
        draw();
      },
    },
    {
      title: 'Map of all 12 keys',
      html: '<p>Here is every major scale at once. Tap a row to see it on the keyboard. Notes on <span class="pill black">dark</span> squares are black keys.</p>',
      render: (area) => {
        const table = h('table', { class: 'keymap' },
          h('thead', {}, h('tr', {}, h('th', {}, 'Key'), ...[1, 2, 3, 4, 5, 6, 7].map((d) => h('th', {}, String(d))), h('th', {}, 'Sharps / flats'))),
          h('tbody', {}, ...KEYS.map((k) => {
            const tr = h('tr', {
              tabindex: '0',
              onclick: () => select(k.name, tr),
              onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(k.name, tr); } },
            }, h('th', {}, keyLabel(k)), ...majorScale(k.name).map((n) => h('td', { class: [1, 3, 6, 8, 10].includes(n.pc) ? 'black' : '' }, pretty(n.name))),
            h('td', { class: 'acc' }, accidentalsText(k.name).replace(' (all white keys)', '')));
            return tr;
          })));
        function select(name, tr) {
          table.querySelectorAll('tr.on').forEach((r) => r.classList.remove('on'));
          tr.classList.add('on');
          showScale(app, name, { mode: 'names' });
          playNotes(app, scaleMidi(name), { bpm: 140 });
        }
        area.append(h('div', { class: 'table-wrap' }, table),
          h('p', { class: 'tip' }, 'Tip: you can print this page to keep the chart next to the piano.'));
        showScale(app, 'C', { mode: 'names' });
      },
    },
    {
      title: 'Why the funny names like E♯ and C♭?',
      html: `<p>Each major scale uses every letter <b>A B C D E F G exactly once</b>. That rule decides whether a black key is called a sharp (♯, "one key up") or a flat (♭, "one key down").</p>
             <p>For example, in F♯ major the 7th note is the white key we usually call F. But F is already used (as F♯), so it gets written as <b>E♯</b>. Same key on the piano, different name.</p>
             <p>Don't worry about memorizing this. What matters most is your fingers finding the right keys, and the recipe always gets you there.</p>`,
      render: () => showScale(app, 'F#', { mode: 'names' }),
    },
  ];
  list.done = done;
  return slides(app, el, list);
}

function playScale(app, el) {
  let nextKey = () => 'C';
  return new PlayExercise(app, el, {
    id: 'l2-play-scale',
    title: 'Play a major scale',
    intro: 'Play the scale going up, from home note to home note. Use the recipe W W H W W W H. Tick the box if you want the keys shown.',
    guideOption: true,
    guideDefault: false,
    controls: (c, restart) => { nextKey = keyChooser(c, restart); },
    make: () => {
      const keyName = nextKey();
      const midis = scaleMidi(keyName);
      const scale = majorScale(keyName);
      const names = [...scale.map((n) => n.name), scale[0].name];
      return {
        prompt: `Play the <b>${pretty(keyName)} major</b> scale.`,
        notes: midis,
        names,
        strip: MAJOR_STEPS.map((s) => STEP_LETTER[s]),
        steps: MAJOR_STEPS.map((s, i) => ({ from: midis[i], to: midis[i + 1], text: STEP_LETTER[s] })),
        hintText: (i) => (i === 0
          ? `Start on ${pretty(keyName)}, the home note.`
          : `From ${pretty(names[i - 1])}, go up a ${MAJOR_STEPS[i - 1] === 2 ? 'whole step (skip one key)' : 'half step (the very next key)'}.`),
      };
    },
  });
}

function findNote(app, el) {
  let nextKey = () => 'C';
  return new PlayExercise(app, el, {
    id: 'l2-find-note',
    title: 'Find the note',
    intro: 'The home note (1) is shown in orange. Use the recipe to count up to the note asked for.',
    controls: (c, restart) => { nextKey = keyChooser(c, restart); },
    make: () => {
      const keyName = nextKey();
      const midis = scaleMidi(keyName);
      const scale = majorScale(keyName);
      const d = pick([2, 3, 4, 5, 6, 7]);
      const ordinal = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th'][d];
      const recipe = MAJOR_STEPS.slice(0, d - 1).map((s) => STEP_LETTER[s]).join(' ');
      return {
        prompt: `In the key of <b>${pretty(keyName)}</b>, play note number <b>${d}</b> (the ${ordinal} note of the scale).`,
        notes: [midis[d - 1]],
        names: [scale[d - 1].name],
        base: [[midis[0], { color: COLORS.tonic, label: '1', sub: pretty(keyName) }]],
        hintText: () => `From ${pretty(keyName)}, follow the first ${d - 1} step${d > 2 ? 's' : ''} of the recipe: ${recipe}.`,
        onFinish: (p) => {
          const hl = new Map(midis.slice(0, d).map((m, i) => [m, { color: i === 0 ? COLORS.tonic : i === d - 1 ? COLORS.correct : COLORS.scale, label: String(i + 1), sub: pretty(scale[i].name) }]));
          p.setHighlights(hl);
          p.setSteps(MAJOR_STEPS.slice(0, d - 1).map((s, i) => ({ from: midis[i], to: midis[i + 1], text: STEP_LETTER[s] })));
        },
      };
    },
  });
}

function whichSpelling(app, el) {
  return new ChoiceExercise(app, el, {
    id: 'l2-spelling',
    title: 'Which note is in the key?',
    intro: 'Each scale uses each letter once. Pick the version of the note that belongs in the key.',
    make: () => {
      // Prefer keys with sharps/flats so the question is interesting.
      const keyName = pick(KEYS.filter((k) => k.name !== 'C')).name;
      const scale = majorScale(keyName);
      const d = pick([2, 3, 4, 5, 6, 7]);
      const right = scale[d - 1].name;
      const letter = right[0];
      const acc = right.slice(1);
      const wrong = acc === '' ? (pick([0, 1]) ? letter + '#' : letter + 'b') : letter;
      const options = [right, wrong].sort(() => Math.random() - 0.5).map((n) => ({ label: pretty(n), value: n }));
      return {
        prompt: `Note number <b>${d}</b> of <b>${pretty(keyName)} major</b> is…`,
        options,
        answer: right,
        setup: (p) => p.setHighlights(new Map([[scaleMidi(keyName)[0], { color: COLORS.tonic, label: '1', sub: pretty(keyName) }]])),
        reveal: () => showScale(app, keyName, { mode: 'both' }),
        explain: `${pretty(keyName)} major is ${scale.map((n) => pretty(n.name)).join(' ')}.`,
        play: () => playNotes(app, scaleMidi(keyName).slice(0, d), { bpm: 120 }),
      };
    },
  });
}
