const assert = require("assert");
const E = require("../js/engine.js");

function rngFrom(arr) {
  let i = 0;
  return () => {
    const v = arr[i % arr.length];
    i += 1;
    return v;
  };
}

function fill(board, x, y) {
  board[y][x] = { type: "G" };
}

function test(name, fn) {
  try {
    fn();
    console.log("ok  " + name);
  } catch (err) {
    console.error("fail  " + name);
    console.error(err);
    process.exitCode = 1;
  }
}

test("7-bag deals each type once", () => {
  const g = new E.Game({ rng: Math.random });
  g.start("marathon");
  const seen = [];
  for (let i = 0; i < 7; i++) seen.push(g.nextPieces(14)[i]);
  // queue after first spawn has remaining 6 of first bag + more
  const firstSeven = [g.current.type].concat(g.nextPieces(6));
  const sorted = firstSeven.slice().sort().join("");
  assert.strictEqual(sorted, "IJLOSTZ");
});

test("first piece is never S, Z, or O", () => {
  for (let n = 0; n < 40; n++) {
    const g = new E.Game();
    g.start("marathon");
    assert.ok(!["S", "Z", "O"].includes(g.current.type));
  }
});

test("I piece wall-kicks off the left wall", () => {
  const g = new E.Game();
  g.start("marathon");
  g.current = { type: "I", x: -2, y: 20, rot: 1 };
  const ok = g.rotate(-1);
  assert.ok(ok);
  assert.ok(!E.collides(g.board, g.current));
});

test("full T-spin when three corners and both fronts are filled", () => {
  const board = E.emptyBoard();
  fill(board, 3, 20);
  fill(board, 5, 20);
  fill(board, 3, 22);
  const piece = { type: "T", x: 3, y: 20, rot: 0 };
  const r = E.detectTSpin(board, piece, 0, true);
  assert.strictEqual(r.tspin, true);
  assert.strictEqual(r.mini, false);
});

test("mini T-spin when the pointing corners are not both filled", () => {
  const board = E.emptyBoard();
  fill(board, 5, 20);
  fill(board, 3, 22);
  fill(board, 5, 22);
  const piece = { type: "T", x: 3, y: 20, rot: 0 };
  const r = E.detectTSpin(board, piece, 0, true);
  assert.strictEqual(r.tspin, true);
  assert.strictEqual(r.mini, true);
});

test("5th kick is never a mini T-spin", () => {
  const board = E.emptyBoard();
  fill(board, 5, 20);
  fill(board, 3, 22);
  fill(board, 5, 22);
  const piece = { type: "T", x: 3, y: 20, rot: 0 };
  const r = E.detectTSpin(board, piece, 4, true);
  assert.strictEqual(r.tspin, true);
  assert.strictEqual(r.mini, false);
});

test("T-spin double scores 1200 × level and sends 4 garbage", () => {
  const a = E.scoreClear(2, true, false, 1);
  assert.strictEqual(a.points, 1200);
  assert.strictEqual(a.name, "T-SPIN DOUBLE");
  const g = new E.Game();
  g.start("battle");
  const n = g._attackCount(2, true, false, false, 0, false);
  assert.strictEqual(n, 4);
  const b2b = g._attackCount(2, true, false, true, 0, false);
  assert.strictEqual(b2b, 5);
});

test("battle levels up every 10 lines and speeds gravity", () => {
  const g = new E.Game();
  g.start("battle");
  assert.strictEqual(g.level, 1);
  const slow = E.gravityInterval(1);
  g.board = E.emptyBoard();
  for (let y = 36; y < 40; y++) {
    for (let x = 0; x < 10; x++) {
      if (x !== 7) g.board[y][x] = { type: "L" };
    }
  }
  g.current = { type: "I", x: 5, y: 32, rot: 1 };
  g.state = "playing";
  g.lines = 8;
  g.hardDrop();
  assert.strictEqual(g.lines, 12);
  assert.strictEqual(g.level, 2);
  assert.ok(E.gravityInterval(g.level) < slow);
  assert.ok(g.events.some((e) => e.type === "levelUp" && e.level === 2));
});

test("SRS T rotations match Tetris Friends / guideline", () => {
  const t0 = E.cellsOf({ type: "T", x: 3, y: 20, rot: 0 }).map((c) => c.x + "," + c.y).sort().join(" ");
  assert.strictEqual(t0, "3,21 4,20 4,21 5,21");
  const t1 = E.cellsOf({ type: "T", x: 3, y: 20, rot: 1 }).map((c) => c.x + "," + c.y).sort().join(" ");
  assert.strictEqual(t1, "4,20 4,21 4,22 5,21");
});

test("variable goal is 5 × level", () => {
  assert.strictEqual(E.goalForLevel(1), 5);
  assert.strictEqual(E.goalForLevel(15), 75);
});

test("locking a tetris clears four rows and awards 800 × level", () => {
  const g = new E.Game();
  g.start("marathon");
  g.current = null;
  g.board = E.emptyBoard();
  for (let y = 36; y < 40; y++) {
    for (let x = 0; x < 10; x++) {
      if (x !== 7) g.board[y][x] = { type: "Z" };
    }
  }
  g.current = { type: "I", x: 5, y: 32, rot: 1 };
  g.lastRotate = false;
  g.state = "playing";
  g.hardDrop();
  assert.strictEqual(g.lines, 4);
  assert.strictEqual(g.score >= 800, true);
  assert.ok(g.events.some((e) => e.type === "lineClear" && e.lines === 4));
});

test("marathon completes after finishing level 15 goal", () => {
  const g = new E.Game();
  g.start("marathon");
  g.level = 15;
  g.goal = 8;
  g.goalMax = 75;
  g.board = E.emptyBoard();
  for (let y = 36; y < 40; y++) {
    for (let x = 0; x < 10; x++) {
      if (x !== 7) g.board[y][x] = { type: "L" };
    }
  }
  g.current = { type: "I", x: 5, y: 32, rot: 1 };
  g.state = "playing";
  g.hardDrop();
  assert.strictEqual(g.state, "won");
});

test("hold swaps once per piece", () => {
  const g = new E.Game();
  g.start("marathon");
  const first = g.current.type;
  const incoming = g.nextPieces(1)[0];
  g.holdPiece();
  assert.strictEqual(g.hold, first);
  assert.strictEqual(g.current.type, incoming);
  const after = g.current.type;
  g.holdPiece();
  assert.strictEqual(g.current.type, after);
});

test("T-spin with no lines still scores and keeps back-to-back", () => {
  const g = new E.Game();
  g.start("marathon");
  g.b2b = true;
  g.board = E.emptyBoard();
  g.board[36][3] = { type: "G" };
  g.board[36][5] = { type: "G" };
  g.board[38][3] = { type: "G" };
  g.current = { type: "T", x: 3, y: 36, rot: 0 };
  g.lastRotate = true;
  g.state = "playing";
  g.hardDrop();
  assert.ok(g.score >= 400);
  assert.strictEqual(g.b2b, true);
  assert.ok(g.events.some((e) => e.type === "lineClear" && e.tspin && e.lines === 0));
});

test("holding left auto-shifts after DAS then ARR", () => {
  const g = new E.Game({ dasMs: 80, arrMs: 20 });
  g.start("marathon");
  g.current = { type: "T", x: 6, y: 20, rot: 0 };
  g.keyDown("left");
  assert.strictEqual(g.current.x, 5);
  g.update(80);
  assert.strictEqual(g.current.x, 4);
  g.update(100);
  assert.ok(g.current.x <= 1);
});

test("hard bot plays faster than easy", () => {
  const easy = new E.BattleMatch("easy");
  const hard = new E.BattleMatch("hard");
  easy.start();
  hard.start();
  for (let i = 0; i < 90; i++) {
    easy.update(40);
    hard.update(40);
  }
  assert.ok(hard.bot.stats.pieces > easy.bot.stats.pieces);
  assert.strictEqual(easy.skill, "easy");
  assert.strictEqual(hard.skill, "hard");
  assert.strictEqual(hard.ai.skillName, "hard");
});

test("line clears resolve immediately with no freeze", () => {
  const g = new E.Game();
  g.start("battle");
  g.current = null;
  g.board = E.emptyBoard();
  for (let y = 36; y < 40; y++) {
    for (let x = 0; x < 10; x++) {
      if (x !== 7) g.board[y][x] = { type: "Z" };
    }
  }
  g.current = { type: "I", x: 5, y: 32, rot: 1 };
  g.state = "playing";
  g.hardDrop();
  assert.notStrictEqual(g.state, "clearing");
  assert.strictEqual(g.lines, 4);
  assert.ok(g.current);
});

test("battle top-out is a KO, not match over", () => {
  const m = new E.BattleMatch();
  m.start();
  m.you._gameOver();
  const ev = m.update(16);
  assert.ok(ev.you.some((e) => e.type === "ko"));
  assert.strictEqual(m.kosBot, 1);
  assert.strictEqual(m.state, "playing");
  assert.strictEqual(m.you.state, "playing");
});

test("three KOs ends the battle with a winner", () => {
  const m = new E.BattleMatch();
  m.start();
  m.you._gameOver();
  m.you._gameOver();
  m.you._gameOver();
  m.update(16);
  assert.strictEqual(m.state, "over");
  assert.strictEqual(m.winner, "bot");
});

test("random play does not throw", () => {
  for (let seed = 0; seed < 4; seed++) {
    let s = seed + 3;
    const rng = () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
    const g = new E.Game({ rng: rng });
    g.start("marathon");
    const acts = ["left", "right", "down", "rotCW", "rotCCW", "hard", "hold"];
    for (let i = 0; i < 600; i++) {
      const act = acts[i % acts.length];
      g.keyDown(act);
      g.update(16);
      if (act === "left" || act === "right" || act === "down") g.keyUp(act);
      if (g.state === "clearing") g.update(520);
      if (g.state === "over" || g.state === "won") break;
    }
  }
});

if (!process.exitCode) console.log("\nAll engine tests passed.");
