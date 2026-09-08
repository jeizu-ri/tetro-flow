# Tetra Friends

A Tetris Friends–style **Battle 2P** game: you vs a bot on two boards. Bright toy-plastic look, not a neon overlay.

The board slams, pieces spin, and line clears pop — same juice, daylight clothes.

## Play

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8080
```

Then visit [http://localhost:8080](http://localhost:8080).

## Battle 2P

You and **Rival Bot** play at the same time.

- First to **3 KOs** wins the set
- If the **2:00** buzzer hits first, winner is decided by KOs, then garbage sent, then stack height
- Doubles, triples, Tetrises, T-spins, back-to-back, combos, and perfect clears send garbage
- Incoming garbage is cancelled by your own attacks
- Topping out is a KO: the board resets and the match continues until someone takes 3
- Line clears are instant (no freeze frame)

## Guideline feel

- 10×20 visible well with hidden buffer
- SRS wall kicks (including I-kicks and T-spin triples)
- 7-bag; the first piece of a game is never S, Z, or O
- Hold once per piece
- 500ms lock delay, move-reset, 15-reset cap
- No ARE, no line-clear delay
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
