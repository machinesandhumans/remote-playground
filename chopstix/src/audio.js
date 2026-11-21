// A small piano-like synthesizer built on the Web Audio API (no sound files needed).
import { midiToFrequency } from './theory.js';

// 0.1 s of silence as a WAV, used to switch iOS into "media playback" mode.
const SILENT_WAV = (() => {
  const n = 800;
  const bytes = new Uint8Array(44 + n * 2);
  const v = new DataView(bytes.buffer);
  const str = (o, t) => [...t].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, 8000, true); v.setUint32(28, 16000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, 'data'); v.setUint32(40, n * 2, true);
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return 'data:audio/wav;base64,' + btoa(bin);
})();

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
    if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
    return this.ctx;
  }

  get running() {
    return !!this.ctx && this.ctx.state === 'running';
  }

  // Call from inside a tap/click/key press. Phones and tablets only allow sound to
  // start from a real user gesture (on iPhone/iPad: a tap that ends, not a touch that starts).
  unlock() {
    // iPhone/iPad mute Web Audio when the ring/silent switch is on, unless the page
    // says it is a "playback" app (Safari 17+) or is already playing an <audio> element.
    try {
      if (navigator.audioSession) navigator.audioSession.type = 'playback';
    } catch { /* not supported */ }
    if (!this.silentEl) {
      this.silentEl = new Audio(SILENT_WAV);
      this.silentEl.loop = true;
      this.silentEl.setAttribute('playsinline', '');
    }
    this.silentEl.play().catch(() => {});
    const ctx = this.ensure();
    // Playing a tiny silent buffer during the gesture is what really wakes iOS audio.
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
    return ctx.resume ? ctx.resume().catch(() => {}) : Promise.resolve();
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
