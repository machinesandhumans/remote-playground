// A small piano-like synthesizer built on the Web Audio API (no sound files needed).
import { midiToFrequency } from './theory.js';

class Synth {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.busyUntil = 0; // performance.now() time until which our own sound is playing (mic ignores it)
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      const comp = this.ctx.createDynamicsCompressor();
      this.master.connect(comp).connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  note(midi, { dur = 1.4, delay = 0, velocity = 0.8 } = {}) {
    if (!this.enabled) return;
    const ctx = this.ensure();
    const t = ctx.currentTime + delay + 0.01;
    const f = midiToFrequency(midi);
    const out = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(Math.min(8000, f * 8), t);
    lp.frequency.exponentialRampToValueAtTime(Math.max(400, f * 2), t + dur);
    out.connect(lp).connect(this.master);
    const peak = 0.28 * velocity;
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(peak, t + 0.008);
    out.gain.exponentialRampToValueAtTime(peak * 0.35, t + 0.35);
    out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const partials = [
      [1, 'triangle', 1],
      [2, 'sine', 0.35],
      [3, 'sine', 0.12],
    ];
    for (const [mult, type, g] of partials) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f * mult;
      o.detune.value = (Math.random() - 0.5) * 4;
      const pg = ctx.createGain();
      pg.gain.value = g;
      o.connect(pg).connect(out);
      o.start(t);
      o.stop(t + dur + 0.05);
    }
    this.busyUntil = Math.max(this.busyUntil, performance.now() + (delay + dur * 0.7) * 1000);
  }

  chord(midis, opts = {}) {
    midis.forEach((m, i) => this.note(m, { ...opts, delay: (opts.delay || 0) + i * 0.012, velocity: 0.6 }));
  }
}

export const synth = new Synth();

// Play a list of steps one after another, calling onStep(i) as each one sounds.
// steps: [{ notes: [midi...], beats }]. Returns a function that cancels playback.
export function playSequence(steps, { bpm = 80, onStep = () => {}, onDone = () => {} } = {}) {
  const beat = 60 / bpm;
  let t = 0;
  const timers = [];
  steps.forEach((s, i) => {
    const dur = (s.beats || 1) * beat;
    timers.push(setTimeout(() => {
      if (s.notes.length > 1) synth.chord(s.notes, { dur: Math.max(1, dur * 1.1) });
      else synth.note(s.notes[0], { dur: Math.max(0.8, dur * 1.2) });
      onStep(i);
    }, t * 1000));
    t += dur;
  });
  timers.push(setTimeout(onDone, t * 1000 + 100));
  return () => timers.forEach(clearTimeout);
}
