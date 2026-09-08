/**
 * Tetra Friends — Tetris Friends–style guideline engine.
 * SRS kicks, 7-bag, hold, 5 previews, move-reset lock, variable-goal marathon.
 */
(function (root) {
  const COLS = 10;
  const HIDDEN = 20;
  const VISIBLE = 20;
  const ROWS = HIDDEN + VISIBLE;
  const VISIBLE_TOP = HIDDEN;

  const TYPES = ["I", "O", "T", "S", "Z", "J", "L"];

  // SRS cell offsets. Origin is the top-left of each piece's bounding box.
  const SHAPES = {
    I: [
      [[0, 1], [1, 1], [2, 1], [3, 1]],
      [[2, 0], [2, 1], [2, 2], [2, 3]],
      [[0, 2], [1, 2], [2, 2], [3, 2]],
      [[1, 0], [1, 1], [1, 2], [1, 3]],
    ],
    O: [
      [[1, 0], [2, 0], [1, 1], [2, 1]],
      [[1, 0], [2, 0], [1, 1], [2, 1]],
      [[1, 0], [2, 0], [1, 1], [2, 1]],
      [[1, 0], [2, 0], [1, 1], [2, 1]],
    ],
    T: [
      [[1, 0], [0, 1], [1, 1], [2, 1]],
      [[1, 0], [1, 1], [2, 1], [1, 2]],
      [[0, 1], [1, 1], [2, 1], [1, 2]],
      [[1, 0], [0, 1], [1, 1], [1, 2]],
    ],
    S: [
      [[1, 0], [2, 0], [0, 1], [1, 1]],
      [[1, 0], [1, 1], [2, 1], [2, 2]],
      [[1, 1], [2, 1], [0, 2], [1, 2]],
      [[0, 0], [0, 1], [1, 1], [1, 2]],
    ],
    Z: [
      [[0, 0], [1, 0], [1, 1], [2, 1]],
      [[2, 0], [1, 1], [2, 1], [1, 2]],
      [[0, 1], [1, 1], [1, 2], [2, 2]],
      [[1, 0], [0, 1], [1, 1], [0, 2]],
    ],
    J: [
      [[0, 0], [0, 1], [1, 1], [2, 1]],
      [[1, 0], [2, 0], [1, 1], [1, 2]],
      [[0, 1], [1, 1], [2, 1], [2, 2]],
      [[1, 0], [1, 1], [0, 2], [1, 2]],
    ],
    L: [
      [[2, 0], [0, 1], [1, 1], [2, 1]],
      [[1, 0], [1, 1], [1, 2], [2, 2]],
      [[0, 1], [1, 1], [2, 1], [0, 2]],
      [[0, 0], [1, 0], [1, 1], [1, 2]],
    ],
  };

  // Wiki kicks are Y-up. These tables are Y-down (row increases downward).
  const KICKS_JLSTZ = {
    "0-1": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    "1-0": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
    "1-2": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
    "2-1": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    "2-3": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
    "3-2": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    "3-0": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    "0-3": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  };

  const KICKS_I = {
    "0-1": [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
    "1-0": [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
    "1-2": [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
    "2-1": [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
    "2-3": [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
    "3-2": [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
    "3-0": [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
    "0-3": [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
  };

  const KICKS_O = {
    "0-1": [[0, 0]],
    "1-0": [[0, 0]],
    "1-2": [[0, 0]],
    "2-1": [[0, 0]],
    "2-3": [[0, 0]],
    "3-2": [[0, 0]],
    "3-0": [[0, 0]],
    "0-3": [[0, 0]],
  };

  const SPAWN = {
    I: { x: 3, y: HIDDEN - 2 },
    O: { x: 3, y: HIDDEN - 1 },
    T: { x: 3, y: HIDDEN - 1 },
    S: { x: 3, y: HIDDEN - 1 },
    Z: { x: 3, y: HIDDEN - 1 },
    J: { x: 3, y: HIDDEN - 1 },
    L: { x: 3, y: HIDDEN - 1 },
  };

  const COLORS = {
    I: "#2DE8F0",
    O: "#F2D234",
    T: "#C44BEE",
    S: "#3CDE62",
    Z: "#F0445D",
    J: "#3B6CFF",
    L: "#FF9A2E",
    G: "#5A6478",
  };

  const LOCK_DELAY = 500;
  const LINE_CLEAR_MS = 500;
  const MAX_LOCK_RESETS = 15;
  const DEFAULT_DAS = 167;
  const DEFAULT_ARR = 33;

  function shuffle(arr, rng) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function newBag(rng) {
    return shuffle(TYPES, rng);
  }

  function cellsOf(piece) {
    const shape = SHAPES[piece.type][piece.rot];
    const out = [];
    for (let i = 0; i < shape.length; i++) {
      out.push({ x: piece.x + shape[i][0], y: piece.y + shape[i][1], type: piece.type });
    }
    return out;
  }

  function srsOrigin(piece) {
    if (piece.type === "I") return { x: piece.x + 2, y: piece.y + 2 };
    if (piece.type === "O") return { x: piece.x + 2, y: piece.y + 1 };
    return { x: piece.x + 1.5, y: piece.y + 1.5 };
  }

  function kicksFor(type, from, to) {
    const key = from + "-" + to;
    if (type === "I") return KICKS_I[key];
    if (type === "O") return KICKS_O[key];
    return KICKS_JLSTZ[key];
  }

  function emptyBoard() {
    const board = new Array(ROWS);
    for (let y = 0; y < ROWS; y++) {
      board[y] = new Array(COLS);
      for (let x = 0; x < COLS; x++) board[y][x] = null;
    }
    return board;
  }

  function occupied(board, x, y) {
    if (x < 0 || x >= COLS || y >= ROWS) return true;
    if (y < 0) return false;
    return board[y][x] != null;
  }

  function collides(board, piece) {
    const cells = cellsOf(piece);
    for (let i = 0; i < cells.length; i++) {
      if (occupied(board, cells[i].x, cells[i].y)) return true;
    }
    return false;
  }

  function onGround(board, piece) {
    return collides(board, { ...piece, y: piece.y + 1 });
  }

  function clonePiece(p) {
    return { type: p.type, x: p.x, y: p.y, rot: p.rot };
  }

  /**
   * 3-corner T-spin with pointing-side Mini, plus the 5th-kick exception
   * so T-spin triples count as full T-spins (Tetris Friends / guideline).
   */
  function detectTSpin(board, piece, lastKickIndex, lastWasRotate) {
    if (piece.type !== "T" || !lastWasRotate) {
      return { tspin: false, mini: false };
    }
    const cx = piece.x + 1;
    const cy = piece.y + 1;
    const corners = [
      occupied(board, cx - 1, cy - 1),
      occupied(board, cx + 1, cy - 1),
      occupied(board, cx - 1, cy + 1),
      occupied(board, cx + 1, cy + 1),
    ];
    let filled = 0;
    for (let i = 0; i < 4; i++) if (corners[i]) filled++;
    if (filled < 3) return { tspin: false, mini: false };

    // Front (pointing) corners: 0=NW, 1=NE, 2=SW, 3=SE
    let frontA;
    let frontB;
    if (piece.rot === 0) {
      frontA = 0;
      frontB = 1;
    } else if (piece.rot === 1) {
      frontA = 1;
      frontB = 3;
    } else if (piece.rot === 2) {
      frontA = 2;
      frontB = 3;
    } else {
      frontA = 0;
      frontB = 2;
    }
    const pointing = corners[frontA] && corners[frontB];
    const mini = !pointing && lastKickIndex !== 4 && filled < 4;
    return { tspin: true, mini };
  }

  function scoreClear(lines, tspin, mini, level) {
    let base = 0;
    let difficult = false;
    let name = "";
    if (tspin) {
      if (mini) {
        if (lines === 0) {
          base = 100;
          name = "MINI T-SPIN";
        } else if (lines === 1) {
          base = 200;
          difficult = true;
          name = "MINI T-SPIN SINGLE";
        } else if (lines === 2) {
          base = 400;
          difficult = true;
          name = "MINI T-SPIN DOUBLE";
        }
      } else if (lines === 0) {
        base = 400;
        name = "T-SPIN";
      } else if (lines === 1) {
        base = 800;
        difficult = true;
        name = "T-SPIN SINGLE";
      } else if (lines === 2) {
        base = 1200;
        difficult = true;
        name = "T-SPIN DOUBLE";
      } else if (lines === 3) {
        base = 1600;
        difficult = true;
        name = "T-SPIN TRIPLE";
      }
    } else if (lines === 1) {
      base = 100;
      name = "SINGLE";
    } else if (lines === 2) {
      base = 300;
      name = "DOUBLE";
    } else if (lines === 3) {
      base = 500;
      name = "TRIPLE";
    } else if (lines === 4) {
      base = 800;
      difficult = true;
      name = "TETRIS";
    }
    return {
      base,
      points: base * level,
      difficult,
      name,
      goal: lines > 0 ? Math.floor(base / 100) : 0,
    };
  }

  function gravityInterval(level) {
    const lv = Math.max(1, Math.min(level, 20));
    const seconds = Math.pow(0.8 - (lv - 1) * 0.007, lv - 1);
    return Math.max(seconds * 1000, 0.5);
  }

  function goalForLevel(level) {
    return 5 * level;
  }

  class Game {
    constructor(options) {
      const opt = options || {};
      this.rng = opt.rng || Math.random;
      this.dasMs = opt.dasMs != null ? opt.dasMs : DEFAULT_DAS;
      this.arrMs = opt.arrMs != null ? opt.arrMs : DEFAULT_ARR;
      this.mode = "marathon";
      this.reset("marathon");
    }

    reset(mode) {
      this.mode = mode || "marathon";
      this.board = emptyBoard();
      this.queue = [];
      this.hold = null;
      this.holdUsed = false;
      this.current = null;
      this.score = 0;
      this.lines = 0;
      this.level = 1;
      this.goal = goalForLevel(1);
      this.goalMax = this.goal;
      this.combo = -1;
      this.b2b = false;
      this.state = "ready";
      this.time = 0;
      this.fallAcc = 0;
      this.lockTimer = 0;
      this.lockResets = 0;
      this.clearTimer = 0;
      this.clearingRows = [];
      this.clearingCells = [];
      this.lastRotate = false;
      this.lastKickIndex = 0;
      this.keys = { left: false, right: false, down: false };
      this.dasDir = 0;
      this.dasTimer = 0;
      this.dasCharged = false;
      this.pendingRot = 0;
      this.pendingHold = false;
      this.events = [];
      this.pieceCount = 0;
      this.stats = {
        tetrises: 0,
        tspins: 0,
        maxCombo: 0,
        pieces: 0,
        perfects: 0,
        b2bMax: 0,
      };
      this.b2bChain = 0;
      this.ultraLimit = 120000;
      this.sprintGoal = 40;
      this._firstBag = true;
      this._fillQueue();
    }

    start(mode) {
      this.reset(mode || this.mode);
      this.state = "playing";
      this._spawn();
      this.emit({ type: "start", mode: this.mode });
    }

    emit(ev) {
      this.events.push(ev);
    }

    drainEvents() {
      const e = this.events;
      this.events = [];
      return e;
    }

    _fillQueue() {
      while (this.queue.length < 14) {
        let bag = newBag(this.rng);
        if (this._firstBag) {
          while (bag[0] === "S" || bag[0] === "Z" || bag[0] === "O") {
            bag = newBag(this.rng);
          }
          this._firstBag = false;
        }
        this.queue.push.apply(this.queue, bag);
      }
    }

    _nextType() {
      this._fillQueue();
      return this.queue.shift();
    }

    _makePiece(type, rot) {
      const s = SPAWN[type];
      return { type: type, x: s.x, y: s.y, rot: rot || 0 };
    }

    _spawn() {
      const type = this._nextType();
      let piece = this._makePiece(type, 0);
      if (this.pendingRot) {
        const dir = this.pendingRot > 0 ? 1 : -1;
        const steps = Math.abs(this.pendingRot) % 4;
        for (let i = 0; i < steps; i++) {
          const attempt = this._tryRotate(piece, dir);
          if (attempt) piece = attempt.piece;
        }
      }
      this.pendingRot = 0;
      const doHold = this.pendingHold;
      this.pendingHold = false;

      if (collides(this.board, piece)) {
        const unrotated = this._makePiece(type, 0);
        if (!collides(this.board, unrotated)) piece = unrotated;
        else {
          this.current = piece;
          this._gameOver();
          return;
        }
      }

      this.current = piece;
      this.holdUsed = false;
      this.fallAcc = 0;
      this.lockTimer = 0;
      this.lockResets = 0;
      this.lastRotate = false;
      this.lastKickIndex = 0;
      this.pieceCount += 1;
      this.stats.pieces += 1;
      this.emit({
        type: "spawn",
        piece: clonePiece(piece),
        cells: cellsOf(piece),
      });

      if (this.dasCharged && this.dasDir) this._shift(this.dasDir);
      if (doHold) this.holdPiece();
    }

    _gameOver() {
      this.state = "over";
      this.emit({ type: "gameOver", score: this.score, lines: this.lines });
    }

    _victory() {
      this.state = "won";
      this.emit({ type: "victory", score: this.score, lines: this.lines, time: this.time });
    }

    pause() {
      if (this.state === "playing" || this.state === "clearing") {
        this._prePause = this.state;
        this.state = "paused";
        this.emit({ type: "pause" });
      }
    }

    resume() {
      if (this.state === "paused") {
        this.state = this._prePause || "playing";
        this.emit({ type: "resume" });
      }
    }

    setDasArr(das, arr) {
      this.dasMs = das;
      this.arrMs = Math.max(0, arr);
    }

    keyDown(action) {
      if (this.state === "paused" && action !== "pause") return;
      if (this.state === "over" || this.state === "won" || this.state === "ready") return;

      if (action === "pause") {
        if (this.state === "paused") this.resume();
        else this.pause();
        return;
      }

      if (this.state === "clearing") {
        if (action === "rotCW") this.pendingRot += 1;
        else if (action === "rotCCW") this.pendingRot -= 1;
        else if (action === "hold") this.pendingHold = !this.pendingHold;
        else if (action === "left") {
          this.keys.left = true;
          this._setDas(-1);
        } else if (action === "right") {
          this.keys.right = true;
          this._setDas(1);
        } else if (action === "down") this.keys.down = true;
        return;
      }

      if (this.state !== "playing") return;

      if (action === "left") {
        this.keys.left = true;
        this._setDas(-1);
        this._shift(-1);
      } else if (action === "right") {
        this.keys.right = true;
        this._setDas(1);
        this._shift(1);
      } else if (action === "down") {
        this.keys.down = true;
        this._softStep();
      } else if (action === "hard") {
        this.hardDrop();
      } else if (action === "rotCW") {
        this.rotate(1);
      } else if (action === "rotCCW") {
        this.rotate(-1);
      } else if (action === "hold") {
        this.holdPiece();
      }
    }

    keyUp(action) {
      if (action === "left") {
        this.keys.left = false;
        if (this.dasDir === -1) {
          if (this.keys.right) this._setDas(1);
          else this._clearDas();
        }
      } else if (action === "right") {
        this.keys.right = false;
        if (this.dasDir === 1) {
          if (this.keys.left) this._setDas(-1);
          else this._clearDas();
        }
      } else if (action === "down") {
        this.keys.down = false;
      }
    }

    _setDas(dir) {
      this.dasDir = dir;
      this.dasTimer = 0;
      this.dasCharged = false;
    }

    _clearDas() {
      this.dasDir = 0;
      this.dasTimer = 0;
      this.dasCharged = false;
    }

    _shift(dx) {
      if (!this.current) return false;
      const next = { ...this.current, x: this.current.x + dx };
      if (collides(this.board, next)) return false;
      this.current = next;
      this.lastRotate = false;
      this._afterMove(false);
      this.emit({ type: "move", dx: dx, cells: cellsOf(this.current) });
      return true;
    }

    _softStep() {
      if (!this.current) return;
      const next = { ...this.current, y: this.current.y + 1 };
      if (!collides(this.board, next)) {
        this.current = next;
        this.score += 1;
        this.lastRotate = false;
        this._afterMove(true);
        this.emit({ type: "softDrop", cells: cellsOf(this.current) });
      }
    }

    hardDrop() {
      if (!this.current || this.state !== "playing") return;
      const start = clonePiece(this.current);
      let dist = 0;
      while (!collides(this.board, { ...this.current, y: this.current.y + 1 })) {
        this.current.y += 1;
        dist += 1;
      }
      this.score += dist * 2;
      this.lastRotate = dist === 0 ? this.lastRotate : false;
      this.emit({
        type: "hardDrop",
        from: start,
        to: clonePiece(this.current),
        dist: dist,
        cells: cellsOf(this.current),
        origin: srsOrigin(this.current),
      });
      this._lock(true, dist);
    }

    rotate(dir) {
      if (!this.current || this.state !== "playing") return false;
      const result = this._tryRotate(this.current, dir);
      if (!result) {
        this.emit({ type: "rotateFail", dir: dir });
        return false;
      }
      const prev = clonePiece(this.current);
      this.current = result.piece;
      this.lastRotate = true;
      this.lastKickIndex = result.kickIndex;
      this._afterMove(false);
      this.emit({
        type: "rotate",
        dir: dir,
        kickIndex: result.kickIndex,
        kick: result.kick,
        from: prev,
        to: clonePiece(this.current),
        origin: srsOrigin(this.current),
        cells: cellsOf(this.current),
      });
      return true;
    }

    _tryRotate(piece, dir) {
      const from = piece.rot;
      const to = (from + dir + 4) % 4;
      const kicks = kicksFor(piece.type, from, to);
      for (let i = 0; i < kicks.length; i++) {
        const k = kicks[i];
        const next = {
          type: piece.type,
          x: piece.x + k[0],
          y: piece.y + k[1],
          rot: to,
        };
        if (!collides(this.board, next)) {
          return { piece: next, kickIndex: i, kick: { x: k[0], y: k[1] } };
        }
      }
      return null;
    }

    holdPiece() {
      if (!this.current || this.holdUsed || this.state !== "playing") return;
      const swapping = this.current.type;
      const oldHold = this.hold;
      this.hold = swapping;
      this.holdUsed = true;
      this.emit({
        type: "hold",
        held: swapping,
        released: oldHold,
        from: clonePiece(this.current),
      });
      if (oldHold) {
        const piece = this._makePiece(oldHold, 0);
        if (collides(this.board, piece)) {
          this.current = piece;
          this._gameOver();
          return;
        }
        this.current = piece;
      } else {
        this._spawn();
        this.holdUsed = true;
        return;
      }
      this.fallAcc = 0;
      this.lockTimer = 0;
      this.lockResets = 0;
      this.lastRotate = false;
      this.lastKickIndex = 0;
    }

    _afterMove(fromGravity) {
      if (!this.current) return;
      const grounded = onGround(this.board, this.current);
      if (!grounded) {
        this.lockTimer = 0;
        return;
      }
      if (fromGravity) return;
      if (this.lockResets < MAX_LOCK_RESETS) {
        this.lockTimer = 0;
        this.lockResets += 1;
      }
    }

    update(dt) {
      if (this.state === "paused" || this.state === "over" || this.state === "won" || this.state === "ready") {
        return;
      }

      if (this.mode === "ultra" && this.state === "playing") {
        if (this.time >= this.ultraLimit) {
          this.time = this.ultraLimit;
          this._victory();
          return;
        }
      }

      if (this.state === "clearing") {
        this._chargeDas(dt);
        if (this.mode === "ultra") {
          this.time += dt;
          if (this.time >= this.ultraLimit) {
            this.time = this.ultraLimit;
            this._finishClear();
            if (this.state !== "won" && this.state !== "over") this._victory();
            return;
          }
        }
        this.clearTimer -= dt;
        if (this.clearTimer <= 0) this._finishClear();
        return;
      }

      this.time += dt;
      if (this.mode === "ultra" && this.time >= this.ultraLimit) {
        this.time = this.ultraLimit;
        this._victory();
        return;
      }

      this._updateDas(dt);
      this._updateGravity(dt);
      this._updateLock(dt);
    }

    _chargeDas(dt) {
      if (!this.dasDir) return;
      if (this.dasCharged) return;
      this.dasTimer += dt;
      if (this.dasTimer >= this.dasMs) {
        this.dasCharged = true;
        this.dasTimer -= this.dasMs;
      }
    }

    _updateDas(dt) {
      if (!this.dasDir || this.state !== "playing") return;
      this.dasTimer += dt;
      if (!this.dasCharged) {
        if (this.dasTimer < this.dasMs) return;
        this.dasCharged = true;
        this.dasTimer -= this.dasMs;
        this._shift(this.dasDir);
      }
      if (this.arrMs <= 0) {
        while (this._shift(this.dasDir)) {}
        this.dasTimer = 0;
        return;
      }
      while (this.dasTimer >= this.arrMs) {
        this.dasTimer -= this.arrMs;
        if (!this._shift(this.dasDir)) {
          this.dasTimer = 0;
          break;
        }
      }
    }

    _gravityMs() {
      if (this.mode === "sprint" || this.mode === "ultra") return gravityInterval(1);
      return gravityInterval(this.level);
    }

    _updateGravity(dt) {
      if (!this.current) return;
      let interval = this._gravityMs();
      if (this.keys.down) interval = Math.min(interval, 50);
      this.fallAcc += dt / Math.max(interval, 0.5);
      let steps = 0;
      while (this.fallAcc >= 1 && steps < 40) {
        this.fallAcc -= 1;
        steps += 1;
        const next = { ...this.current, y: this.current.y + 1 };
        if (collides(this.board, next)) {
          this.fallAcc = 0;
          break;
        }
        this.current = next;
        if (this.keys.down) this.score += 1;
        this.lastRotate = false;
        this.emit({ type: "fall", cells: cellsOf(this.current), soft: this.keys.down });
      }
    }

    _updateLock(dt) {
      if (!this.current) return;
      if (!onGround(this.board, this.current)) {
        return;
      }
      this.lockTimer += dt;
      if (this.lockTimer >= LOCK_DELAY) {
        this._lock(false, 0);
      }
    }

    _lock(hard, dist) {
      if (!this.current) return;
      const piece = this.current;
      const cells = cellsOf(piece);
      const spin = detectTSpin(this.board, piece, this.lastKickIndex, this.lastRotate);

      for (let i = 0; i < cells.length; i++) {
        const c = cells[i];
        if (c.y >= 0 && c.y < ROWS && c.x >= 0 && c.x < COLS) {
          this.board[c.y][c.x] = { type: piece.type };
        }
      }

      let lockOut = true;
      for (let i = 0; i < cells.length; i++) {
        if (cells[i].y >= VISIBLE_TOP) {
          lockOut = false;
          break;
        }
      }

      this.emit({
        type: "lock",
        hard: hard,
        dist: dist,
        cells: cells,
        tspin: spin.tspin,
        mini: spin.mini,
        piece: clonePiece(piece),
      });

      this.current = null;

      if (lockOut) {
        this._gameOver();
        return;
      }

      const full = [];
      for (let y = 0; y < ROWS; y++) {
        let filled = true;
        for (let x = 0; x < COLS; x++) {
          if (!this.board[y][x]) {
            filled = false;
            break;
          }
        }
        if (filled) full.push(y);
      }

      if (full.length === 0) {
        if (spin.tspin) {
          const award = scoreClear(0, true, spin.mini, this.level);
          this.score += award.points;
          this.stats.tspins += 1;
          this.emit({
            type: "lineClear",
            lines: 0,
            rows: [],
            cells: [],
            name: award.name,
            points: award.points,
            combo: -1,
            comboPts: 0,
            b2b: false,
            tspin: true,
            mini: spin.mini,
            perfect: false,
            perfectPts: 0,
            level: this.level,
          });
        }
        this.combo = -1;
        this._spawn();
        return;
      }

      this._beginClear(full, spin);
    }

    _beginClear(rows, spin) {
      const lines = rows.length;
      const award = scoreClear(lines, spin.tspin, spin.mini, this.level);
      let points = award.points;
      let usedB2B = false;
      if (award.difficult && this.b2b) {
        points = Math.floor(points * 1.5);
        usedB2B = true;
        this.b2bChain += 1;
        if (this.b2bChain > this.stats.b2bMax) this.stats.b2bMax = this.b2bChain;
      } else if (award.difficult) {
        this.b2bChain = 1;
      } else {
        this.b2bChain = 0;
      }
      if (award.difficult) this.b2b = true;
      else this.b2b = false;

      this.combo += 1;
      let comboPts = 0;
      if (this.combo > 0) {
        comboPts = 50 * this.combo * this.level;
        if (this.combo > this.stats.maxCombo) this.stats.maxCombo = this.combo;
      }

      const clearingCells = [];
      for (let i = 0; i < rows.length; i++) {
        const y = rows[i];
        for (let x = 0; x < COLS; x++) {
          clearingCells.push({ x: x, y: y, type: this.board[y][x] && this.board[y][x].type });
        }
      }

      let perfect = true;
      for (let y = 0; y < ROWS; y++) {
        if (rows.indexOf(y) !== -1) continue;
        for (let x = 0; x < COLS; x++) {
          if (this.board[y][x]) {
            perfect = false;
            break;
          }
        }
        if (!perfect) break;
      }
      let perfectPts = 0;
      if (perfect) {
        const table = [0, 800, 1200, 1800, 2000];
        perfectPts = table[lines] * this.level;
        if (lines === 4 && usedB2B) perfectPts = 3200 * this.level;
        this.stats.perfects += 1;
      }

      this.score += points + comboPts + perfectPts;
      this.lines += lines;
      if (lines === 4) this.stats.tetrises += 1;
      if (spin.tspin) this.stats.tspins += 1;

      if (this.mode === "marathon") {
        this.goal -= award.goal;
        if (this.goal <= 0) {
          if (this.level >= 15) {
            this.goal = 0;
            this.clearingRows = rows;
            this.clearingCells = clearingCells;
            this.clearTimer = LINE_CLEAR_MS;
            this.state = "clearing";
            this._pendingWin = true;
            this._pendingClear = { rows: rows, award: award, usedB2B: usedB2B, comboPts: comboPts, perfect: perfect };
            this.emit({
              type: "lineClear",
              lines: lines,
              rows: rows,
              cells: clearingCells,
              name: award.name,
              points: points,
              combo: this.combo,
              comboPts: comboPts,
              b2b: usedB2B,
              tspin: spin.tspin,
              mini: spin.mini,
              perfect: perfect,
              perfectPts: perfectPts,
              level: this.level,
            });
            return;
          }
          this.level += 1;
          this.goal = goalForLevel(this.level);
          this.goalMax = this.goal;
          this.emit({ type: "levelUp", level: this.level });
        }
      }

      this.clearingRows = rows;
      this.clearingCells = clearingCells;
      this.clearTimer = LINE_CLEAR_MS;
      this.state = "clearing";
      this._pendingWin = false;
      this._pendingClear = { rows: rows };

      this.emit({
        type: "lineClear",
        lines: lines,
        rows: rows,
        cells: clearingCells,
        name: award.name,
        points: points,
        combo: this.combo,
        comboPts: comboPts,
        b2b: usedB2B,
        tspin: spin.tspin,
        mini: spin.mini,
        perfect: perfect,
        perfectPts: perfectPts,
        level: this.level,
      });

      if (this.mode === "sprint" && this.lines >= this.sprintGoal) {
        this._pendingWin = true;
      }
    }

    _finishClear() {
      const rows = (this._pendingClear && this._pendingClear.rows) || this.clearingRows;
      const dropFrom = new Array(ROWS);
      for (let y = 0; y < ROWS; y++) dropFrom[y] = 0;

      const skip = {};
      for (let i = 0; i < rows.length; i++) skip[rows[i]] = true;

      const next = emptyBoard();
      let write = ROWS - 1;
      for (let y = ROWS - 1; y >= 0; y--) {
        if (skip[y]) continue;
        for (let x = 0; x < COLS; x++) next[write][x] = this.board[y][x];
        dropFrom[write] = write - y;
        write -= 1;
      }
      this.board = next;
      this.clearingRows = [];
      this.clearingCells = [];
      this.clearTimer = 0;
      this.state = "playing";
      this.emit({ type: "stackDrop", dropFrom: dropFrom });

      if (this._pendingWin) {
        this._pendingWin = false;
        this._victory();
        return;
      }
      this._spawn();
    }

    ghost() {
      if (!this.current) return [];
      const p = clonePiece(this.current);
      while (!collides(this.board, { ...p, y: p.y + 1 })) p.y += 1;
      return cellsOf(p);
    }

    nextPieces(n) {
      this._fillQueue();
      return this.queue.slice(0, n || 5);
    }

    remainingTime() {
      if (this.mode !== "ultra") return 0;
      return Math.max(0, this.ultraLimit - this.time);
    }
  }

  const api = {
    COLS: COLS,
    ROWS: ROWS,
    HIDDEN: HIDDEN,
    VISIBLE: VISIBLE,
    VISIBLE_TOP: VISIBLE_TOP,
    TYPES: TYPES,
    SHAPES: SHAPES,
    COLORS: COLORS,
    SPAWN: SPAWN,
    LOCK_DELAY: LOCK_DELAY,
    LINE_CLEAR_MS: LINE_CLEAR_MS,
    cellsOf: cellsOf,
    srsOrigin: srsOrigin,
    collides: collides,
    detectTSpin: detectTSpin,
    scoreClear: scoreClear,
    gravityInterval: gravityInterval,
    goalForLevel: goalForLevel,
    emptyBoard: emptyBoard,
    Game: Game,
    occupied: occupied,
    kicksFor: kicksFor,
  };

  root.TFEngine = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : global);
