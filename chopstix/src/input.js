// All the ways to "play" a note into the app:
//   1. the computer keyboard (A W S E D F T G Y H U J K ...)
//   2. a MIDI keyboard plugged into the computer (Web MIDI)
//   3. a real piano heard through the microphone (pitch detection)
// Clicking the 3D keys is wired up in main.js.
import { frequencyToMidi, QUALITY } from './theory.js';
import { synth } from './audio.js';

// Bottom row = white keys, top row = black keys, like a piano.
export const KEYBOARD_MAP = {
  KeyA: 0, KeyW: 1, KeyS: 2, KeyE: 3, KeyD: 4, KeyF: 5, KeyT: 6, KeyG: 7, KeyY: 8, KeyH: 9, KeyU: 10, KeyJ: 11,
  KeyK: 12, KeyO: 13, KeyL: 14, KeyP: 15, Semicolon: 16, Quote: 17,
};
export const KEY_LETTER = {};
for (const [code, off] of Object.entries(KEYBOARD_MAP)) {
  KEY_LETTER[off] = code === 'Semicolon' ? ';' : code === 'Quote' ? "'" : code.slice(3);
}

export class Inputs {
  constructor({ onNote, onNoteOff, onChord, onStatus }) {
    this.onNote = onNote;
    this.onNoteOff = onNoteOff;
    this.onChord = onChord;
    this.onStatus = onStatus || (() => {});
    this.octaveShift = 0;
    this.status = { midi: 'none', mic: 'off', heard: '' };
    this.bindKeyboard();
    this.initMidi();
  }

  setStatus(patch) {
    Object.assign(this.status, patch);
    this.onStatus(this.status);
  }

  // --- Computer keyboard ---------------------------------------------------------
  bindKeyboard() {
    const down = new Set();
    window.addEventListener('keydown', (e) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.code === 'KeyZ') { this.octaveShift = Math.max(-12, this.octaveShift - 12); return; }
      if (e.code === 'KeyX') { this.octaveShift = Math.min(12, this.octaveShift + 12); return; }
      const off = KEYBOARD_MAP[e.code];
      if (off == null) return;
      e.preventDefault();
      const midi = 60 + off + this.octaveShift;
      down.add(e.code);
      this.onNote(midi, 'keyboard');
    });
    window.addEventListener('keyup', (e) => {
      const off = KEYBOARD_MAP[e.code];
      if (off == null || !down.has(e.code)) return;
      down.delete(e.code);
      this.onNoteOff(60 + off + this.octaveShift, 'keyboard');
    });
  }

  // --- MIDI keyboard ---------------------------------------------------------------
  async initMidi() {
    if (!navigator.requestMIDIAccess) {
      this.setStatus({ midi: 'unsupported' });
      return;
    }
    try {
      const access = await navigator.requestMIDIAccess();
      const refresh = () => {
        const names = [];
        for (const input of access.inputs.values()) {
          input.onmidimessage = (msg) => this.handleMidi(msg);
          names.push(input.name);
        }
        this.setStatus({ midi: names.length ? names.join(', ') : 'none' });
      };
      access.onstatechange = refresh;
      refresh();
    } catch {
      this.setStatus({ midi: 'blocked' });
    }
  }

  handleMidi({ data }) {
    const [status, note, vel] = data;
    const cmd = status & 0xf0;
    if (cmd === 0x90 && vel > 0) this.onNote(note, 'midi');
    else if (cmd === 0x80 || (cmd === 0x90 && vel === 0)) this.onNoteOff(note, 'midi');
  }

  // --- Microphone ------------------------------------------------------------------
  async startMic() {
    if (this.mic) return true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      const ctx = synth.ensure();
      const src = ctx.createMediaStreamSource(stream);
      const pitchAn = ctx.createAnalyser();
      pitchAn.fftSize = 2048;
      const chromaAn = ctx.createAnalyser();
      chromaAn.fftSize = 8192;
      chromaAn.smoothingTimeConstant = 0.6;
      src.connect(pitchAn);
      src.connect(chromaAn);
      this.mic = new MicListener(ctx, pitchAn, chromaAn, {
        onNote: (m) => this.onNote(m, 'mic'),
        onChord: (c) => this.onChord && this.onChord(c),
        onLevel: (level, heard) => this.setStatus({ mic: 'on', level, heard }),
      });
      this.mic.stream = stream;
      this.mic.chordMode = !!this._chords;
      this.mic.start();
      this.setStatus({ mic: 'on' });
      return true;
    } catch (err) {
      console.warn('Microphone unavailable', err);
      this.setStatus({ mic: 'blocked' });
      return false;
    }
  }

  stopMic() {
    if (!this.mic) return;
    this.mic.stop();
    this.mic.stream.getTracks().forEach((t) => t.stop());
    this.mic = null;
    this.setStatus({ mic: 'off', heard: '', level: 0 });
  }

  // Tell the mic whether the current exercise wants whole chords detected.
  set listenForChords(v) {
    this._chords = v;
    if (this.mic) this.mic.chordMode = v;
  }
  get listenForChords() { return this._chords; }
}

// Pitch detection by autocorrelation (works well for one note at a time),
// plus a "chroma" (energy per note name) estimate used to guess chords.
export function detectPitch(buf, sampleRate) {
  const n = buf.length;
  let rms = 0;
  for (let i = 0; i < n; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / n);
  if (rms < 0.005) return { freq: -1, rms, clarity: 0 };

  const minLag = Math.floor(sampleRate / 2100);
  const maxLag = Math.min(Math.floor(sampleRate / 55), n >> 1);
  const size = n - maxLag;
  // Normalized squared difference (McLeod style) for each lag.
  const nsdf = new Float32Array(maxLag + 1);
  for (let lag = minLag; lag <= maxLag; lag++) {
    let ac = 0;
    let m = 0;
    for (let i = 0; i < size; i++) {
      const a = buf[i];
      const b = buf[i + lag];
      ac += a * b;
      m += a * a + b * b;
    }
    nsdf[lag] = m > 0 ? (2 * ac) / m : 0;
  }
  // Pick the first peak that is close to the highest one (avoids octave-down errors).
  let best = 0;
  for (let lag = minLag; lag <= maxLag; lag++) best = Math.max(best, nsdf[lag]);
  if (best < 0.5) return { freq: -1, rms, clarity: best };
  const threshold = best * 0.9;
  let lag = -1;
  for (let i = minLag + 1; i < maxLag; i++) {
    if (nsdf[i] >= threshold && nsdf[i] >= nsdf[i - 1] && nsdf[i] >= nsdf[i + 1]) { lag = i; break; }
  }
  if (lag < 0) return { freq: -1, rms, clarity: best };
  // Parabolic interpolation for sub-sample accuracy.
  const a = nsdf[lag - 1], b = nsdf[lag], c = nsdf[lag + 1];
  const shift = (a - c) / (2 * (a - 2 * b + c) || 1);
  return { freq: sampleRate / (lag + shift), rms, clarity: b };
}

const TEMPLATES = [];
for (let r = 0; r < 12; r++) {
  for (const [q, def] of Object.entries(QUALITY)) {
    TEMPLATES.push({ rootPc: r, quality: q, pcs: [r, (r + def.steps[0]) % 12, (r + def.steps[0] + def.steps[1]) % 12] });
  }
}

export function chromaFromSpectrum(db, sampleRate, fftSize) {
  const chroma = new Float32Array(12);
  const binHz = sampleRate / fftSize;
  const lo = Math.ceil(90 / binHz);
  const hi = Math.min(db.length - 1, Math.floor(1400 / binHz));
  for (let i = lo; i <= hi; i++) {
    const mag = Math.pow(10, db[i] / 20);
    const m = frequencyToMidi(i * binHz);
    const near = Math.round(m);
    if (Math.abs(m - near) > 0.3) continue;
    chroma[((near % 12) + 12) % 12] += mag * mag;
  }
  return chroma;
}

export function bestTriad(chroma) {
  const norm = Math.hypot(...chroma) || 1;
  let best = null;
  let second = 0;
  for (const t of TEMPLATES) {
    const score = (chroma[t.pcs[0]] + chroma[t.pcs[1]] + chroma[t.pcs[2]]) / (norm * Math.sqrt(3));
    if (!best || score > best.score) {
      if (best) second = Math.max(second, best.score);
      best = { ...t, score };
    } else second = Math.max(second, score);
  }
  return best && { ...best, margin: best.score - second };
}

class MicListener {
  constructor(ctx, pitchAn, chromaAn, handlers) {
    this.ctx = ctx;
    this.pitchAn = pitchAn;
    this.chromaAn = chromaAn;
    this.h = handlers;
    this.buf = new Float32Array(pitchAn.fftSize);
    this.spec = new Float32Array(chromaAn.frequencyBinCount);
    this.chordMode = false;
    this.minRms = 0.01;
  }

  start() {
    this.candidate = null;
    this.stable = 0;
    this.lastEmitted = null;
    this.armed = true;
    this.avgRms = 0;
    this.chordStable = 0;
    this.chordCandidate = null;
    this.chordArmed = true;
    this.timer = setInterval(() => this.frame(), 35);
  }

  stop() {
    clearInterval(this.timer);
  }

  frame() {
    this.pitchAn.getFloatTimeDomainData(this.buf);
    const { freq, rms, clarity } = detectPitch(this.buf, this.ctx.sampleRate);
    const now = performance.now();
    const ourOwnSound = now < synth.busyUntil;

    // A sudden jump in loudness means a new key was struck.
    if (rms > this.avgRms * 1.8 + 0.004) { this.armed = true; this.chordArmed = true; }
    if (rms < this.minRms * 0.6) { this.armed = true; this.chordArmed = true; this.lastEmitted = null; }
    this.avgRms = this.avgRms * 0.8 + rms * 0.2;

    let heard = '';
    if (!ourOwnSound && freq > 0 && rms > this.minRms && clarity > 0.8) {
      const m = Math.round(frequencyToMidi(freq));
      heard = m;
      if (m === this.candidate) this.stable++;
      else { this.candidate = m; this.stable = 1; }
      if (this.stable >= 3 && (this.armed || m !== this.lastEmitted)) {
        this.lastEmitted = m;
        this.armed = false;
        this.h.onNote(m);
      }
    } else {
      this.candidate = null;
      this.stable = 0;
    }

    if (this.chordMode && !ourOwnSound && rms > this.minRms) {
      this.chromaAn.getFloatFrequencyData(this.spec);
      const chroma = chromaFromSpectrum(this.spec, this.ctx.sampleRate, this.chromaAn.fftSize);
      const t = bestTriad(chroma);
      if (t && t.score > 0.8 && t.margin > 0.02) {
        const key = t.rootPc + t.quality;
        if (key === this.chordCandidate) this.chordStable++;
        else { this.chordCandidate = key; this.chordStable = 1; }
        if (this.chordStable >= 4 && this.chordArmed) {
          this.chordArmed = false;
          this.h.onChord({ rootPc: t.rootPc, quality: t.quality, pcs: t.pcs });
        }
      }
    }
    this.h.onLevel(Math.min(1, rms * 8), heard);
  }
}
