# Pencil sounds

Strokes cut from "Writing with pencil 2" by fthgurdy,
https://freesound.org/people/fthgurdy/sounds/376705/ — licensed CC0 (public
domain). Credit is not required; kept here as a courtesy.

- `strokes.mp3`: 24 pencil strokes of 120 ms, each evened to the same loudness
  with a short fade in and out

Strokes are separated by 60 ms of silence; the app splits them on those gaps
after decoding (`splitStrokes` in `src/lib/relish/keyboard-sound.ts`), the same
way as the keyboard sounds.
