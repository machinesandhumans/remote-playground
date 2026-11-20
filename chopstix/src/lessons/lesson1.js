// Lesson 1: half steps, whole steps, and the major scale recipe W W H W W W H.
import { h } from '../dom.js';
import { COLORS } from '../piano3d.js';
import { scaleMidi, majorScale, genericName, MAJOR_STEPS, STEP_LETTER } from '../theory.js';
import { ChoiceExercise, PlayExercise } from '../exercise.js';
import { synth } from '../audio.js';
import { subTabs, slides, showScale, playNotes, pick } from './common.js';

const recipeStrip = () => h('div', { class: 'strip big' },
  ...MAJOR_STEPS.map((s) => h('span', { class: 'step ' + STEP_LETTER[s] }, STEP_LETTER[s])));

export function lesson1(app, root) {
  const tabs = subTabs(app, root, [
    { label: '📖 Learn', render: (el) => learn(app, el, () => tabs.open(1)) },
    { label: '✏️ Half or whole?', practice: true, render: (el) => halfOrWhole(app, el) },
    { label: '✏️ Play C major', practice: true, render: (el) => playC(app, el) },
    { label: '✏️ Take a step', practice: true, render: (el) => takeAStep(app, el) },
  ]);
  return tabs;
}

function learn(app, el, done) {
  const list = [
    {
      title: 'Meet the keyboard',
      html: `<p>The black keys come in groups of <b>two</b> and <b>three</b>. That pattern repeats all the way up the piano.</p>
             <p>The white key just to the <b>left of each group of two</b> black keys is called <b>C</b>. It's lit up in orange.</p>
             <p class="tip">Try it: press any key on the screen, or on your piano if the microphone is on.</p>`,
      render: (area) => {
        const cs = [60, 72, 84];
        app.piano.setHighlights(new Map(cs.map((m) => [m, { color: COLORS.tonic, label: 'C' }])));
        area.append(h('button', { class: 'btn', onclick: () => playNotes(app, cs, { bpm: 90 }) }, '🔊 Play the C keys'));
      },
    },
    {
      title: 'A half step is the very next key',
      html: `<p>Going from one key to the <b>very next key</b> (black or white!) is a <b>half step</b>. We'll write it as <span class="step H">H</span>.</p>
             <p>Most white keys have a black key between them. But <b>E→F</b> and <b>B→C</b> have no black key in between, so they're half steps too.</p>
             <p class="tip">Press any key and I'll show you the half step above it.</p>`,
      render: (area, handler) => {
        const show = (a) => {
          const b = a + 1 <= 84 ? a + 1 : a - 1;
          const [lo, hi] = a < b ? [a, b] : [b, a];
          app.piano.setHighlights(new Map([[lo, { color: COLORS.tonic, label: genericName(lo) }], [hi, { color: COLORS.scale, label: genericName(hi) }]]));
          app.piano.setSteps([{ from: lo, to: hi, text: 'H' }]);
        };
        app.piano.setHighlights(new Map([[64, { color: COLORS.tonic, label: 'E' }], [65, { color: COLORS.scale, label: 'F' }], [71, { color: COLORS.tonic, label: 'B' }], [72, { color: COLORS.scale, label: 'C' }], [60, { color: COLORS.tonic, label: 'C' }], [61, { color: COLORS.scale, label: 'C♯' }]]));
        app.piano.setSteps([{ from: 64, to: 65, text: 'H' }, { from: 71, to: 72, text: 'H' }, { from: 60, to: 61, text: 'H' }]);
        handler.onNote = (m) => show(Math.min(84, Math.max(60, m)));
        area.append(h('button', { class: 'btn', onclick: () => playNotes(app, [64, 65, 71, 72], { bpm: 80 }) }, '🔊 Hear E→F and B→C'));
      },
    },
    {
      title: 'A whole step is two half steps',
      html: `<p>A <b>whole step</b> <span class="step W">W</span> skips over one key. Count two keys to the right, and remember that <b>black keys count</b>.</p>
             <p>C→D is a whole step (skipping C♯). E→F♯ is a whole step too (skipping F).</p>
             <p class="tip">Press any key and I'll show you the whole step above it.</p>`,
      render: (area, handler) => {
        const show = (a) => {
          const lo = a + 2 <= 84 ? a : a - 2;
          app.piano.setHighlights(new Map([[lo, { color: COLORS.tonic, label: genericName(lo) }], [lo + 1, { color: 0xdddddd, label: '' }], [lo + 2, { color: COLORS.scale, label: genericName(lo + 2) }]]));
          app.piano.setSteps([{ from: lo, to: lo + 2, text: 'W' }]);
        };
        app.piano.setHighlights(new Map([[60, { color: COLORS.tonic, label: 'C' }], [62, { color: COLORS.scale, label: 'D' }], [64, { color: COLORS.tonic, label: 'E' }], [66, { color: COLORS.scale, label: 'F♯' }]]));
        app.piano.setSteps([{ from: 60, to: 62, text: 'W' }, { from: 64, to: 66, text: 'W' }]);
        handler.onNote = (m) => show(Math.min(84, Math.max(60, m)));
        area.append(h('button', { class: 'btn', onclick: () => playNotes(app, [60, 62, 64, 66], { bpm: 80 }) }, '🔊 Hear C→D and E→F♯'));
      },
    },
    {
      title: 'The major scale recipe',
      html: `<p>Every major scale is built with the same recipe of steps. Start on any note and go up:</p>`,
      render: (area) => {
        area.append(recipeStrip(),
          h('p', {}, 'Whole, Whole, Half, Whole, Whole, Whole, Half. In numbers that\'s 2 – 2 – 1 – 2 – 2 – 2 – 1 (counting half steps).'),
          h('p', {}, 'Starting on C, the recipe lands on C D E F G A B C. The orange C is "home", note number 1.'),
          h('button', { class: 'btn primary', onclick: () => playNotes(app, scaleMidi('C'), { bpm: 90 }) }, '🔊 Play the C major scale'));
        showScale(app, 'C', { mode: 'both' });
      },
    },
    {
      title: 'Why C major is all white keys',
      html: `<p>Look where the <span class="step H">H</span> half steps land: between <b>E→F</b> (notes 3 and 4) and <b>B→C</b> (notes 7 and 8).</p>
             <p>Those are exactly the two places on the piano where white keys sit right next to each other with no black key in between. That's why C major needs no black keys at all.</p>`,
      render: () => showScale(app, 'C', { mode: 'numbers' }),
    },
    {
      title: 'Same recipe, new starting note',
      html: `<p>Start on <b>G</b> and follow the same recipe. Everything works with white keys until the last whole step: from E, a whole step up is <b>F♯</b>, the black key.</p>
             <p>So G major is G A B C D E F♯ G. In Lesson 2 you'll use the recipe to find the scale in all 12 keys.</p>`,
      render: (area) => {
        showScale(app, 'G', { mode: 'both' });
        area.append(recipeStrip(), h('button', { class: 'btn primary', onclick: () => playNotes(app, scaleMidi('G'), { bpm: 90 }) }, '🔊 Play the G major scale'));
      },
    },
  ];
  list.done = done;
  return slides(app, el, list);
}

function halfOrWhole(app, el) {
  return new ChoiceExercise(app, el, {
    id: 'l1-half-whole',
    title: 'Whole step or half step?',
    intro: 'Two keys light up and play. Is the distance between them a whole step or a half step?',
    make: () => {
      const size = pick([1, 2]);
      const a = 60 + Math.floor(Math.random() * (84 - 60 - size + 1));
      const b = a + size;
      const hl = new Map([[a, { color: COLORS.target, label: genericName(a) }], [b, { color: COLORS.target, label: genericName(b) }]]);
      return {
        prompt: `From <b>${genericName(a)}</b> up to <b>${genericName(b)}</b>: whole step or half step?`,
        options: [{ label: 'Half step (H)', value: 1 }, { label: 'Whole step (W)', value: 2 }],
        answer: size,
        setup: (p) => p.setHighlights(hl),
        reveal: (p) => {
          if (size === 2) p.setHighlight(a + 1, { color: 0xdddddd, label: '' });
          p.setSteps([{ from: a, to: b, text: size === 1 ? 'H' : 'W' }]);
        },
        explain: size === 1 ? 'They are right next to each other: a half step.' : 'There is one key in between them: a whole step.',
        play: () => { synth.note(a, { dur: 0.9 }); synth.note(b, { dur: 1.2, delay: 0.6 }); app.piano.tap(a); setTimeout(() => app.piano.tap(b), 600); },
      };
    },
  });
}

function playC(app, el) {
  const midis = scaleMidi('C');
  const names = [...majorScale('C').map((n) => n.name), 'C'];
  return new PlayExercise(app, el, {
    id: 'l1-play-c',
    title: 'Play the C major scale',
    intro: 'Play C D E F G A B C going up. Uncheck the box below when you want to try it from memory.',
    guideOption: true,
    guideDefault: true,
    make: () => ({
      prompt: 'Play the <b>C major</b> scale, from C up to the next C.',
      notes: midis,
      names,
      strip: MAJOR_STEPS.map((s) => STEP_LETTER[s]),
      steps: MAJOR_STEPS.map((s, i) => ({ from: midis[i], to: midis[i + 1], text: STEP_LETTER[s] })),
      hintText: (i) => (i === 0
        ? 'Start on C: the white key just left of the two black keys.'
        : `From ${names[i - 1]}, go up a ${MAJOR_STEPS[i - 1] === 2 ? 'whole step (skip one key)' : 'half step (the very next key)'}.`),
    }),
  });
}

function takeAStep(app, el) {
  return new PlayExercise(app, el, {
    id: 'l1-step',
    title: 'Take a step',
    intro: 'Start on the orange key and play the key a whole step or a half step above it.',
    make: () => {
      const size = pick([1, 2, 2]);
      const a = 60 + Math.floor(Math.random() * 20);
      const b = a + size;
      return {
        prompt: `Start on <b>${genericName(a)}</b> (orange). Play the key one <b>${size === 2 ? 'whole' : 'half'} step</b> up.`,
        notes: [b],
        names: [genericName(b)],
        base: [[a, { color: COLORS.tonic, label: genericName(a) }]],
        onFinish: (p) => p.setSteps([{ from: a, to: b, text: size === 2 ? 'W' : 'H' }]),
        hintText: () => (size === 2 ? 'Count two keys to the right. Skip one key in between (black keys count!).' : 'Play the very next key to the right, black or white.'),
      };
    },
  });
}
