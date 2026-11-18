# Keyboard sounds

Individual keystrokes cut from "Keyboard Typing 2 (HHKB, Topre)" by grcekh,
https://freesound.org/people/grcekh/sounds/546033/ — licensed CC0 (public
domain). Credit is not required; kept here as a courtesy.

- `keys.mp3`: 24 regular key presses
- `big.mp3`: 3 deep strokes (space bar, Enter)
- `up.mp3`: 10 soft strokes, played quietly on key release

Each file is strokes separated by 60 ms of silence; the app splits them on
those gaps after decoding (`splitStrokes` in `src/lib/relish/keyboard-sound.ts`).
