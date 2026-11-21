# Chopstix · Piano basics

A friendly web app that teaches beginner piano music theory on a 3D keyboard.

## Lessons

1. **Steps & the major scale** – half steps, whole steps, and the recipe **W W H W W W H** (2‑2‑1‑2‑2‑2‑1).
2. **All 12 keys** – the same recipe from every starting note, with a key map for each key and a chart of all 12.
3. **Chords** – the chords built on each note of the scale (**I ii iii IV V vi vii°**, i.e. Major‑minor‑minor‑Major‑Major‑minor‑diminished), then progressions such as **I–IV–V–I**, **I–V–vi–IV**, **I–vi–IV–V**, **I–vi–ii–V** and **ii–V–I**.

Each lesson has a step‑by‑step **Learn** section and **practice exercises** that check answers and keep score
(today's score plus all‑time accuracy, saved in the browser).

## Ways to answer

| Input | How |
| --- | --- |
| Screen | Click or tap the 3D keys. |
| Computer keyboard | `A S D F G H J K` are white keys from C, `W E T Y U` the black keys (`Z`/`X` shift an octave). |
| Real piano (microphone) | Press **🎤 Listen to my piano**. Single notes are detected reliably. Chords are detected on a best‑effort basis; playing the chord notes one after another always works. |
| MIDI keyboard | Plug in over USB (Chrome or Edge) and play. |

Answers are checked by note name, so any octave counts.

## Run it

No build step. It's plain HTML, CSS and JavaScript modules, with three.js bundled in `vendor/`.

```bash
cd chopstix
npm start            # serves on http://localhost:8080
# or: python3 -m http.server 8080
```

Open http://localhost:8080. The microphone needs `localhost` or an `https://` address. Opening `index.html` straight from disk won't work, because browsers block JavaScript modules on `file://`.

Any static host works too (for example GitHub Pages pointed at this folder).

## Tests

```bash
cd chopstix
npm test   # music theory (scales, spelling, chords) and pitch detection
```

## Code map

- `src/theory.js` – scales, key spelling, chords, progressions (pure functions, unit tested)
- `src/piano3d.js` – the three.js keyboard: highlights, labels, W/H bubbles, key animation, click handling
- `src/audio.js` – a small Web Audio piano synth
- `src/input.js` – computer keyboard, Web MIDI, microphone pitch detection and chord guessing
- `src/exercise.js` – the exercise types and scoring
- `src/lessons/` – lesson content

## Note reader (`read/`)

A large‑print sight reading practice page, built for an iPad held sideways. A very large treble staff shows four
whole notes at a time; play the highlighted one on the real piano (tap **Listen**) or on the on‑screen keys.
Right notes turn green and show their letter, wrong ones shake red. After two misses, or when you tap **Help**,
the letter appears under the note and the matching key glows. **Letters on keys** can be switched off once the
key names are familiar. Note sets: **C to G** (middle‑C position), **C to C**, and **Whole staff** (middle C up to G).
Any octave on the piano counts. The clef and notehead shapes come from the Bravura music font (SIL Open Font License).
