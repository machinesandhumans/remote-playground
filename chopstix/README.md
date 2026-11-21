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

A large‑print sight reading practice page, built for an iPad held sideways. A very large staff shows four whole
notes at a time; play the highlighted one on the real piano (tap **Listen**) or on the on‑screen keys.

- **Clef:** Treble, Bass, or Both (a grand staff). With Both, middle C shows up on either staff.
- **How much of the piano:** 2 octaves (C3–C5, an octave either side of middle C), 4 octaves (C2–C6) or all 88 keys
  (A0–C8). The on‑screen keyboard shows the same stretch, with middle C marked. Notes far above or below the staff
  are written with 8va / 8vb, as in real music.
- **Exact notes:** only the exact key counts. Playing C3 when middle C is written says "Right letter, wrong C. Go one octave higher".
- Right notes turn green and show their letter; wrong ones shake red. After two misses, or on **Help**, the letter
  appears under the note and the matching key glows. **Letters** turns the key labels on and off.

**Songs.** The **Song** list starts with **Random** (the random notes above), then real songs A to Z; the first is
*O Holy Night* (Adolphe Adam), transcribed from a lead sheet in C, 6/8. A song is drawn in real note values
(quarter, eighth and dotted notes, rests, ties, time signature) with the lyrics under it, one line of the
printed page at a time. **Part** picks one line, a lettered section (several lines, played one after another)
or the whole song. **Hear it** plays the line at the song's tempo, **Again** restarts the part and **Next** moves on.
Tied notes are played once. Songs live in the `SONGS` list in `read/index.html`, written as `pitch beats lyric`
tokens (beats in eighth notes, `~` tie, `^` fermata, `r` rest).

The staff stretches to fill the space, so one clef and 2 octaves gives the biggest notes; all 88 keys on both staves is the smallest.
The clef and notehead shapes come from the Bravura music font (SIL Open Font License).
