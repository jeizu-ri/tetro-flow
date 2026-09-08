# Tetra Friends

A single-player Tetris built around the **old Tetris Friends website rules**. Bright toy-plastic look, not a neon overlay.

The board slams, pieces spin, and line clears pop — same juice, daylight clothes.

## Play

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8080
```

Then visit [http://localhost:8080](http://localhost:8080).

## Modes

| Mode | Rules |
| --- | --- |
| **Marathon** | 15 levels. Goal for each level is `5 × level`. Goal from a clear is `base score / 100` (Single 1, Double 3, Triple 5, Tetris 8, T-spin singles/doubles/triples scale the same way). Leftover goal does not carry. Finish level 15 to clear the run. |
| **Sprint** | 40 lines as fast as you can. Level-1 gravity. |
| **Ultra** | Two minutes. Score attack at level-1 gravity. |

## Guideline feel

- 10×20 visible well with hidden buffer
- SRS wall kicks (including I-kicks and T-spin triples)
- 7-bag; the first piece of a game is never S, Z, or O
- Hold once per piece
- 500ms lock delay, move-reset, 15-reset cap
- 500ms line-clear delay, IRS / IHS buffered during the delay
- No ARE
- Soft drop 1 point per cell, hard drop 2
- Back-to-back on Tetrises and T-spin line clears (`×1.5`)
- Combo `50 × combo × level`
- DAS / ARR are adjustable in Settings (defaults 167ms / 33ms)

## Controls

| Action | Keys |
| --- | --- |
| Move | Left / Right, A / D |
| Soft drop | Down, S |
| Hard drop | Space |
| Rotate CW | Up, X, W |
| Rotate CCW | Z, Ctrl, Q |
| Hold | C, Shift, E |
| Pause | P, Esc |
| Mute music | M |

Touch buttons appear on phones.

## Tests

```bash
node test/engine.test.js
```
