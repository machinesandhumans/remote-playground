import { h } from '../dom.js';
import { COLORS } from '../piano3d.js';
import { KEYS, EASY_KEYS, majorScale, scaleMidi, pretty, MAJOR_STEPS, STEP_LETTER } from '../theory.js';
import { playSequence } from '../audio.js';

export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const keyLabel = (k) => pretty(k.name) + (k.alt ? ` / ${pretty(k.alt)}` : '');

// Sub-tabs inside a lesson: "Learn", then each practice exercise.
export function subTabs(app, root, items) {
  const bar = h('div', { class: 'subtabs', role: 'tablist' });
  const body = h('div', { class: 'subtab-body' });
  root.append(bar, body);
  let current = null;
  const buttons = items.map((it, i) => h('button', {
    class: 'subtab' + (it.practice ? ' practice' : ''), role: 'tab', onclick: () => open(i),
  }, it.label));
  bar.append(...buttons);
  function open(i) {
    if (current && current.destroy) current.destroy();
    body.replaceChildren();
    app.piano.clear();
    app.setHandler(null);
    buttons.forEach((b, j) => b.setAttribute('aria-selected', String(i === j)));
    current = items[i].render(body) || null;
    if (current && (current.onNote || current.onChord)) app.setHandler(current);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  open(0);
  return { destroy: () => current && current.destroy && current.destroy(), open };
}

// Step-by-step explanation pages with Back / Next.
export function slides(app, root, list) {
  let i = 0;
  let cleanup = null;
  const box = h('div', { class: 'slide' });
  const nav = h('div', { class: 'slide-nav' });
  root.append(box, nav);
  const handler = { onNote: () => {}, destroy: () => cleanup && cleanup() };
  function show() {
    if (cleanup) cleanup();
    cleanup = null;
    app.piano.clear();
    handler.onNote = () => {};
    const s = list[i];
    box.replaceChildren(h('div', { class: 'slide-count' }, `Step ${i + 1} of ${list.length}`), h('h2', {}, s.title));
    if (s.html) box.append(h('div', { class: 'slide-text', html: s.html }));
    if (s.render) {
      const area = h('div', { class: 'slide-area' });
      box.append(area);
      const r = s.render(area, handler) || {};
      cleanup = r.cleanup || null;
    }
    nav.replaceChildren(
      h('button', { class: 'btn secondary', disabled: i === 0, onclick: () => { i--; show(); } }, '◀ Back'),
      i < list.length - 1
        ? h('button', { class: 'btn primary', onclick: () => { i++; show(); } }, 'Next ▶')
        : (list.done ? h('button', { class: 'btn primary', onclick: list.done }, list.doneLabel || 'Start practicing ▶') : null));
  }
  show();
  return handler;
}

// Paint a major scale on the piano: tonic orange, other notes blue, with labels.
// mode: 'names' | 'numbers' | 'both'
export function scaleHighlight(keyName, { mode = 'names', steps = true, base = 60 } = {}) {
  const scale = majorScale(keyName);
  const midis = scaleMidi(keyName, base);
  const hl = new Map();
  midis.forEach((m, i) => {
    const n = scale[i % 7];
    const label = mode === 'numbers' ? String(i === 7 ? 1 : n.degree) : pretty(n.name);
    const sub = mode === 'both' ? String(i === 7 ? 1 : n.degree) : undefined;
    hl.set(m, { color: i % 7 === 0 ? COLORS.tonic : COLORS.scale, label, sub });
  });
  const stepList = steps ? MAJOR_STEPS.map((s, i) => ({ from: midis[i], to: midis[i + 1], text: STEP_LETTER[s] })) : [];
  return { hl, steps: stepList, midis, scale };
}

export function showScale(app, keyName, opts) {
  const { hl, steps } = scaleHighlight(keyName, opts);
  app.piano.setHighlights(hl);
  app.piano.setSteps(steps);
}

// Play notes in order and press each key as it sounds.
export function playNotes(app, midis, { bpm = 100, onStep } = {}) {
  return playSequence(midis.map((m) => ({ notes: [m] })), {
    bpm,
    onStep: (i) => { app.piano.tap(midis[i], 300); onStep && onStep(i); },
  });
}

export function keyButtons(selected, onPick, { compact = false } = {}) {
  const wrap = h('div', { class: 'key-buttons' + (compact ? ' compact' : '') });
  const render = (sel) => {
    wrap.replaceChildren(...KEYS.map((k) => h('button', {
      class: 'keybtn' + (k.name === sel ? ' on' : ''),
      'aria-pressed': String(k.name === sel),
      onclick: () => { render(k.name); onPick(k.name); },
    }, h('span', { class: 'kname' }, pretty(k.name)), k.alt ? h('span', { class: 'kalt' }, pretty(k.alt)) : null)));
  };
  render(selected);
  return wrap;
}

// A "which key?" dropdown for practice: easy keys, all keys, or one fixed key.
export function keyChooser(container, onChange, initial = 'easy') {
  let value = initial;
  const sel = h('select', { class: 'select', onchange: (e) => { value = e.target.value; onChange(); } },
    h('option', { value: 'easy', selected: initial === 'easy' }, 'Easy keys: C, G, F, D'),
    h('option', { value: 'all', selected: initial === 'all' }, 'Any of the 12 keys'),
    ...KEYS.map((k) => h('option', { value: k.name, selected: initial === k.name }, `Only ${keyLabel(k)}`)));
  container.append(h('label', { class: 'chooser' }, 'Keys to practice: ', sel));
  return () => (value === 'easy' ? pick(EASY_KEYS) : value === 'all' ? pick(KEYS).name : value);
}
