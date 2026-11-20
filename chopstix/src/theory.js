// Music theory helpers: note names, the major scale recipe, keys, chords, progressions.
// Everything here is pure (no DOM), so it can be tested with `node --test`.

export const MAJOR_STEPS = [2, 2, 1, 2, 2, 2, 1]; // W W H W W W H
export const STEP_LETTER = { 1: 'H', 2: 'W' };

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const LETTER_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// The 12 major keys, spelled the way they are usually written.
// `alt` is the other name for the same key (the "enharmonic" name).
export const KEYS = [
  { name: 'C', pc: 0 },
  { name: 'Db', pc: 1, alt: 'C#' },
  { name: 'D', pc: 2 },
  { name: 'Eb', pc: 3, alt: 'D#' },
  { name: 'E', pc: 4 },
  { name: 'F', pc: 5 },
  { name: 'F#', pc: 6, alt: 'Gb' },
  { name: 'G', pc: 7 },
  { name: 'Ab', pc: 8, alt: 'G#' },
  { name: 'A', pc: 9 },
  { name: 'Bb', pc: 10, alt: 'A#' },
  { name: 'B', pc: 11 },
];
export const EASY_KEYS = ['C', 'G', 'F', 'D'];

export const pc = (midi) => ((midi % 12) + 12) % 12;
export const isBlack = (midi) => [1, 3, 6, 8, 10].includes(pc(midi));

// Pretty-print with real sharp/flat symbols.
export function pretty(name) {
  return name.replace(/##/g, '𝄪').replace(/#/g, '♯').replace(/bb/g, '𝄫').replace(/(?<=[A-G])b/g, '♭');
}

export function sharpName(midi) {
  return SHARP_NAMES[pc(midi)];
}
export function noteNameWithOctave(midi) {
  return sharpName(midi) + (Math.floor(midi / 12) - 1);
}
// Name a single key on the piano without a key context: "C♯/D♭" style for black keys.
export function genericName(midi) {
  const p = pc(midi);
  const flats = { 1: 'Db', 3: 'Eb', 6: 'Gb', 8: 'Ab', 10: 'Bb' };
  return flats[p] ? `${pretty(SHARP_NAMES[p])}/${pretty(flats[p])}` : SHARP_NAMES[p];
}

export function keyByName(name) {
  return KEYS.find((k) => k.name === name || k.alt === name);
}

// Spell a note with a given letter so that it lands on pitch class `target`.
function spell(letter, target) {
  let diff = (target - LETTER_PC[letter] + 12) % 12;
  if (diff > 6) diff -= 12;
  const acc = diff > 0 ? '#'.repeat(diff) : 'b'.repeat(-diff);
  return letter + acc;
}

// The major scale of a key: 7 notes, each with its spelled name, pitch class, and degree (1..7).
export function majorScale(keyName) {
  const tonicLetter = keyName[0];
  const tonicPc = (LETTER_PC[tonicLetter] + (keyName.includes('#') ? 1 : 0) - (keyName.slice(1).includes('b') ? 1 : 0) + 12) % 12;
  const start = LETTERS.indexOf(tonicLetter);
  const notes = [];
  let p = tonicPc;
  for (let i = 0; i < 7; i++) {
    const letter = LETTERS[(start + i) % 7];
    notes.push({ degree: i + 1, pc: p, name: spell(letter, p) });
    p = (p + MAJOR_STEPS[i]) % 12;
  }
  return notes;
}

// The scale as MIDI notes going up one octave from the tonic, starting in octave 4 (C4 = 60).
export function scaleMidi(keyName, base = 60) {
  const k = keyByName(keyName);
  const out = [base + k.pc];
  for (const s of MAJOR_STEPS) out.push(out[out.length - 1] + s);
  return out; // 8 notes, tonic to tonic
}

export function accidentalsText(keyName) {
  const names = majorScale(keyName).map((n) => n.name);
  const order = (seq) => (a, b) => seq.indexOf(a[0]) - seq.indexOf(b[0]);
  const sharps = names.filter((n) => n.includes('#')).sort(order('FCGDAEB'));
  const flats = names.filter((n) => n.slice(1).includes('b')).sort(order('BEADGCF'));
  if (sharps.length) return `${sharps.length} sharp${sharps.length > 1 ? 's' : ''}: ${sharps.map(pretty).join(', ')}`;
  if (flats.length) return `${flats.length} flat${flats.length > 1 ? 's' : ''}: ${flats.map(pretty).join(', ')}`;
  return 'No sharps or flats (all white keys)';
}

// --- Chords -----------------------------------------------------------------

export const QUALITY = {
  major: { word: 'Major', short: 'M', suffix: '', steps: [4, 3] },
  minor: { word: 'minor', short: 'm', suffix: 'm', steps: [3, 4] },
  dim: { word: 'diminished', short: 'D', suffix: '°', steps: [3, 3] },
};
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

export function romanFor(degree, quality) {
  const r = ROMAN[degree - 1];
  if (quality === 'major') return r;
  if (quality === 'minor') return r.toLowerCase();
  return r.toLowerCase() + '°';
}

function qualityOf(a, b, c) {
  const i1 = (b - a + 12) % 12;
  const i2 = (c - b + 12) % 12;
  if (i1 === 4 && i2 === 3) return 'major';
  if (i1 === 3 && i2 === 4) return 'minor';
  if (i1 === 3 && i2 === 3) return 'dim';
  return 'other';
}

// The 7 chords built on each note of the scale ("stack every other note").
export function diatonicChords(keyName) {
  const scale = majorScale(keyName);
  return scale.map((root, i) => {
    const third = scale[(i + 2) % 7];
    const fifth = scale[(i + 4) % 7];
    const quality = qualityOf(root.pc, third.pc, fifth.pc);
    return {
      degree: i + 1,
      roman: romanFor(i + 1, quality),
      quality,
      name: root.name + QUALITY[quality].suffix,
      notes: [root, third, fifth],
      pcs: [root.pc, third.pc, fifth.pc],
    };
  });
}

// Voice a chord on the keyboard: root in octave 4 (60..71), then stack upward.
export function chordMidi(chord, base = 60) {
  const root = base + chord.pcs[0];
  const steps = QUALITY[chord.quality].steps;
  return [root, root + steps[0], root + steps[0] + steps[1]];
}

export const PROGRESSIONS = [
  { id: '1451', label: 'I – IV – V – I', degrees: [1, 4, 5, 1], about: 'The classic. Thousands of folk, country, blues and rock songs use just these three chords.' },
  { id: '1564', label: 'I – V – vi – IV', degrees: [1, 5, 6, 4], about: 'The "pop" progression heard in countless modern songs.' },
  { id: '1645', label: 'I – vi – IV – V', degrees: [1, 6, 4, 5], about: 'The 1950s doo-wop progression ("Stand By Me", "Earth Angel").' },
  { id: '1625', label: 'I – vi – ii – V', degrees: [1, 6, 2, 5], about: 'The jazz-standard "turnaround" ("Heart and Soul", "Blue Moon").' },
  { id: '251', label: 'ii – V – I', degrees: [2, 5, 1], about: 'The most common move in jazz. It pulls strongly back home to I.' },
];

export function progressionChords(keyName, degrees) {
  const chords = diatonicChords(keyName);
  return degrees.map((d) => chords[d - 1]);
}

// Find which triad (if any) a set of pitch classes forms. Returns {rootPc, quality} or null.
export function identifyTriad(pcs) {
  const set = [...new Set(pcs.map(pc))];
  if (set.length !== 3) return null;
  for (const r of set) {
    for (const [q, def] of Object.entries(QUALITY)) {
      const want = [r, (r + def.steps[0]) % 12, (r + def.steps[0] + def.steps[1]) % 12];
      if (want.every((x) => set.includes(x))) return { rootPc: r, quality: q };
    }
  }
  return null;
}

export function sameSet(a, b) {
  const A = new Set(a.map(pc));
  const B = new Set(b.map(pc));
  return A.size === B.size && [...A].every((x) => B.has(x));
}

export function frequencyToMidi(f) {
  return 69 + 12 * Math.log2(f / 440);
}
export function midiToFrequency(m) {
  return 440 * Math.pow(2, (m - 69) / 12);
}
