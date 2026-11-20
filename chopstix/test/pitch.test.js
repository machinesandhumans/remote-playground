import test from 'node:test';
import assert from 'node:assert/strict';
import { detectPitch, bestTriad } from '../src/input.js';
import { frequencyToMidi, midiToFrequency } from '../src/theory.js';

// A piano-ish tone: fundamental plus decaying overtones.
function tone(midi, sr = 48000, n = 2048) {
  const f = midiToFrequency(midi);
  const buf = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    buf[i] = 0.3 * Math.sin(2 * Math.PI * f * t) + 0.2 * Math.sin(2 * Math.PI * 2 * f * t) + 0.1 * Math.sin(2 * Math.PI * 3 * f * t) + 0.05 * Math.sin(2 * Math.PI * 4 * f * t);
  }
  return buf;
}

test('detects single notes across the keyboard', () => {
  for (let m = 40; m <= 88; m++) {
    const { freq } = detectPitch(tone(m), 48000);
    assert.equal(Math.round(frequencyToMidi(freq)), m, `midi ${m}`);
  }
});

test('silence gives no pitch', () => {
  assert.equal(detectPitch(new Float32Array(2048), 48000).freq, -1);
});

test('picks the triad that matches a chroma profile', () => {
  const chroma = new Float32Array(12);
  chroma[7] = 1; chroma[11] = 0.8; chroma[2] = 0.9; chroma[9] = 0.1; // G B D + a bit of A
  const t = bestTriad(chroma);
  assert.equal(t.rootPc, 7);
  assert.equal(t.quality, 'major');
});
