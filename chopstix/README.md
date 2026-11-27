# Chopstix · Piano basics

A friendly web app (🔥🚸🌭) that teaches beginner piano. The home page (`index.html`) has a tile for each module,
and every module is its own page with a home button and the same look:

- **Read** (`read/`) – a level-up note reading game.
- **Play** (`play/`) – songs, line by line, with the words.
- **Scale dial** (`dial/`) – turn a dial to see each major scale.
- **Lessons** (`lessons/`) – the original 3D piano lessons below (not linked from the home page for now).
- Rhythm is planned.

## Read (`read/`)

One note at a time on a big staff. Answer it and the next note comes up. **Play / Say / Both** picks how:
play the exact key (real piano through **Mic**, or the on‑screen keys), say the letter out loud (speech
recognition, Safari or Chrome; the **C D E F G A B** buttons work too), or **Play & Say**.

**Treble / Bass / Both** picks the clef. Each has 5 levels that start at middle C, and each remembers its own progress.

| Level | Treble | Bass | Both (grand staff) |
| --- | --- | --- | --- |
| 1 | C E G | C A F (down) | A3 to E4 |
| 2 | C4 to G4 | G3 to C4 | F3 to G4 |
| 3 | C4 to C5 | C3 to C4 | C3 to C5 |
| 4 | up to F5 (top line) | down to G2 (bottom line) | G2 to F5 |
| 5 | up to A5 (2 above the staff) | down to E2 (2 below the staff) | E2 to A5 |

The piano shows whole octaves around the notes in play, with middle C at one end (or in the middle for Both).

A right first answer fills the bar by 1; three or more in a row count double, so a quick learner moves up
faster. A miss takes 1 off, brings that note back two cards later, and makes it come up more often from then on
(per‑note weights, saved with the level progress in `localStorage` under `read-game`). New notes in a level also
come up more at first. After two misses the letter shows and the key glows. A full bar unlocks the next level
with a celebration; any unlocked level can be picked from the 1–5 buttons. Add `?reset` to the URL to start over.

## Lessons (`lessons/`)

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

Open http://localhost:8080 for the home page. The microphone needs `localhost` or an `https://` address. Opening `index.html` straight from disk won't work, because browsers block JavaScript modules on `file://`.

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

## Play (`play/`)

A large‑print song page, built for an iPad held sideways, with the piano keys right under the staff;
play the highlighted note on the real piano (tap **Mic**) or on the on‑screen keys.

- **Exact notes:** only the exact key counts. Playing C3 when middle C is written says "Right letter, wrong C. Go one octave higher".
- Right notes turn green and show their letter; wrong ones shake red. After two misses the letter appears under
  the note and the matching key glows. The keys always show their letters.
- Tap a note on the staff to hear it; its key on the keyboard lights up blue for a moment.

**Songs.** The **Song** list has real songs A to Z; the first is
*Danny Boy* (F major, 4/4, one bar per line so the notes stay big), *O Holy Night* (C major, 6/8), *Scarborough Fair* (D minor, 3/4, the piano intro then all three verses) and *Canon in D* (D major, 2/2, the right-hand tune of an easy piano version), each transcribed from a lead sheet. A song is drawn in real note values
(quarter, eighth, sixteenth and dotted notes, rests, ties, time signature) with the lyrics under it, one line of the
printed page at a time. **Part** picks one line, a lettered section (several lines, played one after another)
or the whole song. **Play it** plays the whole chosen part (a line, a section or the whole song) at the song's tempo, turning the staff to each next line as it goes; tap it again (Stop) to stop. **Back** and **Next** step a line (or a part) at a time, **Again** restarts the part,
and **Auto next** (on by default) moves straight on to the next line or section when one is finished.
Tied notes are played once. Songs live in the `SONGS` list in `play/index.html`, written as `pitch beats lyric`
tokens (beats in eighth notes, `~` tie, `^` fermata, `r` rest). A song can set `key` (flats negative, sharps positive),
`time` and a `pickup` (in eighths); notes follow the key signature unless written with `#`, `b` or `n`.

The staff stretches to fill the space, so one clef and 2 octaves gives the biggest notes; all 88 keys on both staves is the smallest.
The clef and notehead shapes come from the Bravura music font (SIL Open Font License).
