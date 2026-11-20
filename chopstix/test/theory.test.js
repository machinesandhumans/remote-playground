import test from 'node:test';
import assert from 'node:assert/strict';
import {
  KEYS, majorScale, scaleMidi, diatonicChords, chordMidi, identifyTriad, accidentalsText, progressionChords,
} from '../src/theory.js';

test('C major is all white keys', () => {
  assert.deepEqual(majorScale('C').map((n) => n.name), ['C', 'D', 'E', 'F', 'G', 'A', 'B']);
});

test('keys are spelled with one of each letter', () => {
  assert.deepEqual(majorScale('D').map((n) => n.name), ['D', 'E', 'F#', 'G', 'A', 'B', 'C#']);
  assert.deepEqual(majorScale('Eb').map((n) => n.name), ['Eb', 'F', 'G', 'Ab', 'Bb', 'C', 'D']);
  assert.deepEqual(majorScale('F#').map((n) => n.name), ['F#', 'G#', 'A#', 'B', 'C#', 'D#', 'E#']);
  assert.deepEqual(majorScale('Db').map((n) => n.name), ['Db', 'Eb', 'F', 'Gb', 'Ab', 'Bb', 'C']);
  for (const k of KEYS) {
    const letters = majorScale(k.name).map((n) => n.name[0]);
    assert.equal(new Set(letters).size, 7, k.name);
  }
});

test('every scale follows W W H W W W H', () => {
  for (const k of KEYS) {
    const m = scaleMidi(k.name);
    const steps = m.slice(1).map((x, i) => x - m[i]);
    assert.deepEqual(steps, [2, 2, 1, 2, 2, 2, 1]);
  }
});

test('chord pattern is Major minor minor Major Major minor diminished in every key', () => {
  for (const k of KEYS) {
    assert.deepEqual(diatonicChords(k.name).map((c) => c.quality), ['major', 'minor', 'minor', 'major', 'major', 'minor', 'dim']);
  }
  assert.deepEqual(diatonicChords('G').map((c) => c.name), ['G', 'Am', 'Bm', 'C', 'D', 'Em', 'F#°']);
  assert.deepEqual(diatonicChords('C').map((c) => c.roman), ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']);
});

test('chords fit on a C4..C6 keyboard', () => {
  for (const k of KEYS) {
    for (const c of diatonicChords(k.name)) {
      const m = chordMidi(c);
      assert.ok(m[0] >= 60 && m[2] <= 84);
      assert.ok(identifyTriad(m));
    }
    assert.ok(scaleMidi(k.name)[7] <= 84);
  }
});

test('triad identification and progressions', () => {
  assert.deepEqual(identifyTriad([67, 71, 74]), { rootPc: 7, quality: 'major' });
  assert.deepEqual(identifyTriad([62, 65, 69]), { rootPc: 2, quality: 'minor' });
  assert.deepEqual(identifyTriad([71, 74, 77]), { rootPc: 11, quality: 'dim' });
  assert.equal(identifyTriad([60, 62, 64]), null);
  assert.deepEqual(progressionChords('C', [1, 6, 2, 5]).map((c) => c.name), ['C', 'Am', 'Dm', 'G']);
  assert.equal(accidentalsText('A'), '3 sharps: F♯, C♯, G♯');
  assert.equal(accidentalsText('Bb'), '2 flats: B♭, E♭');
});
