/**
 * Testris — Tetris Friends–style guideline engine.
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
    I: "#3BA8B8",
    O: "#D4B03A",
    T: "#9A56B5",
    S: "#4DAA58",
    Z: "#D24B4B",
    J: "#3D6BC4",
    L: "#E08A30",
    G: "#7A8494",
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
      this.pendingGarbage = 0;
      this.garbageSent = 0;
      this.garbageReceived = 0;
      this.garbageHole = 3;
      this.koMode = this.mode === "battle";
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
      if (this.koMode && this.mode === "battle") {
        this.emit({ type: "ko", score: this.score, lines: this.lines, sent: this.garbageSent });
        this.board = emptyBoard();
        this.pendingGarbage = 0;
        this.current = null;
        this.combo = -1;
        this.fallAcc = 0;
        this.lockTimer = 0;
        this.lockResets = 0;
        this.holdUsed = false;
        this.state = "playing";
        this._spawn();
        return;
      }
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
        if (!this._flushGarbage()) return;
        this._spawn();
        return;
      }

      this._beginClear(full, spin);
    }

    _attackCount(lines, tspin, mini, b2b, combo, perfect) {
      let n = 0;
      if (tspin && !mini) {
        if (lines === 1) n = 2;
        else if (lines === 2) n = 4;
        else if (lines === 3) n = 6;
      } else if (lines === 2) n = 1;
      else if (lines === 3) n = 2;
      else if (lines === 4) n = 4;
      if (b2b && n > 0) n += 1;
      const comboExtra = [0, 0, 1, 1, 1, 3, 3, 4, 4, 4, 4, 5];
      if (combo >= 0) n += comboExtra[Math.min(combo, comboExtra.length - 1)];
      if (perfect) n += 10;
      return n;
    }

    _injectGarbage(n) {
      if (n <= 0) return true;
      for (let y = 0; y < n; y++) {
        for (let x = 0; x < COLS; x++) {
          if (this.board[y][x]) return false;
        }
      }
      const next = emptyBoard();
      for (let y = n; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) next[y - n][x] = this.board[y][x];
      }
      if (Math.random() < 0.35) this.garbageHole = Math.floor(Math.random() * COLS);
      for (let i = 0; i < n; i++) {
        const y = ROWS - n + i;
        for (let x = 0; x < COLS; x++) {
          if (x !== this.garbageHole) next[y][x] = { type: "G" };
        }
      }
      this.board = next;
      this.emit({ type: "garbage", n: n, hole: this.garbageHole });
      return true;
    }

    _flushGarbage() {
      if (this.pendingGarbage <= 0) return true;
      const n = this.pendingGarbage;
      this.pendingGarbage = 0;
      if (!this._injectGarbage(n)) {
        this._gameOver();
        return false;
      }
      return true;
    }

    _beginClear(rows, spin) {
      this._pendingWin = false;
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
            this._pendingWin = true;
          } else {
            this.level += 1;
            this.goal = goalForLevel(this.level);
            this.goalMax = this.goal;
            this.emit({ type: "levelUp", level: this.level });
          }
        }
      } else if (this.mode === "battle") {
        const nextLevel = Math.min(15, 1 + Math.floor(this.lines / 10));
        if (nextLevel > this.level) {
          this.level = nextLevel;
          this.emit({ type: "levelUp", level: this.level });
        }
      }

      this.clearingRows = rows;
      this.clearingCells = clearingCells;
      this._pendingClear = { rows: rows };

      const attack = this._attackCount(lines, spin.tspin, spin.mini, usedB2B, this.combo, perfect);
      let send = 0;
      let cancelled = 0;
      if (attack > 0) {
        cancelled = Math.min(this.pendingGarbage, attack);
        this.pendingGarbage -= cancelled;
        send = attack - cancelled;
        this.garbageSent += send;
      }

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
        attack: attack,
        send: send,
        cancelled: cancelled,
      });
      if (send > 0 || cancelled > 0) {
        this.emit({ type: "attack", send: send, cancelled: cancelled, attack: attack });
      }

      if (this.mode === "sprint" && this.lines >= this.sprintGoal) {
        this._pendingWin = true;
      }

      this._finishClear();
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

    receiveGarbage(n) {
      if (n > 0) {
        this.pendingGarbage += n;
        this.garbageReceived += n;
      }
    }
  }

  function copyBoard(board) {
    const b = new Array(ROWS);
    for (let y = 0; y < ROWS; y++) b[y] = board[y].slice();
    return b;
  }

  function boardHeights(board) {
    const h = new Array(COLS);
    for (let x = 0; x < COLS; x++) {
      h[x] = 0;
      for (let y = 0; y < ROWS; y++) {
        if (board[y][x]) {
          h[x] = ROWS - y;
          break;
        }
      }
    }
    return h;
  }

  const WELL_COL = 9;

  function wellColumn(skill) {
    return skill && skill.wellCol != null ? skill.wellCol : WELL_COL;
  }

  function pieceHitsCol(piece, col) {
    const cs = cellsOf(piece);
    for (let i = 0; i < cs.length; i++) if (cs[i].x === col) return true;
    return false;
  }

  function wellDepth(board, skill) {
    const heights = boardHeights(board);
    const col = wellColumn(skill);
    let minOther = 99;
    for (let x = 0; x < COLS; x++) {
      if (x === col) continue;
      if (heights[x] < minOther) minOther = heights[x];
    }
    return minOther - heights[col];
  }

  function evaluateBoard(board, skill) {
    const holeW = skill && skill.holeW != null ? skill.holeW : 85;
    const bumpW = skill && skill.bumpW != null ? skill.bumpW : 3.4;
    const wellW = skill && skill.wellW != null ? skill.wellW : 0;
    const wellCol = wellColumn(skill);
    const heights = boardHeights(board);
    let holes = 0;
    let agg = 0;
    let bump = 0;
    let high = 0;
    for (let x = 0; x < COLS; x++) {
      agg += heights[x];
      if (heights[x] > 12) high += (heights[x] - 12) * (heights[x] - 12);
      if (heights[x] > 16) high += (heights[x] - 16) * 10;
      let seen = false;
      for (let y = 0; y < ROWS; y++) {
        if (board[y][x]) seen = true;
        else if (seen) holes += 1;
      }
    }
    for (let x = 0; x < COLS - 1; x++) {
      if (x === wellCol || x + 1 === wellCol) continue;
      bump += Math.abs(heights[x] - heights[x + 1]);
    }
    let well = 0;
    if (wellW) {
      const wh = heights[wellCol];
      let minOther = 99;
      let maxOther = 0;
      for (let x = 0; x < COLS; x++) {
        if (x === wellCol) continue;
        if (heights[x] < minOther) minOther = heights[x];
        if (heights[x] > maxOther) maxOther = heights[x];
      }
      const depth = minOther - wh;
      if (depth >= 1) well += wellW * Math.min(depth, 8) * 0.35;
      if (depth >= 4) well += wellW * 1.8;
      if (minOther <= wh) well -= wellW * 1.4;
      well -= Math.max(0, maxOther - minOther - 2) * bumpW * 5;
    }
    return -holes * holeW - agg * 1.5 - bump * bumpW - high * 3.2 + well;
  }

  function boardIsEmpty(board) {
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) if (board[y][x]) return false;
    }
    return true;
  }

  function garbageForClear(lines, combo) {
    let n = 0;
    if (lines === 2) n = 1;
    else if (lines === 3) n = 2;
    else if (lines === 4) n = 4;
    const extra = [0, 0, 1, 1, 1, 3, 3, 4, 4, 4, 4, 5];
    if (combo >= 0) n += extra[Math.min(combo, extra.length - 1)];
    return n;
  }

  function dropFromTop(board, type, x, rot) {
    const p = { type: type, x: x, y: 0, rot: rot };
    if (collides(board, p)) return null;
    while (!collides(board, { type: p.type, x: p.x, y: p.y + 1, rot: p.rot })) p.y += 1;
    return p;
  }

  function simulatePlace(board, piece, skill, combo, spin, threat) {
    const next = copyBoard(board);
    const cs = cellsOf(piece);
    for (let i = 0; i < cs.length; i++) {
      const c = cs[i];
      if (c.y < 0 || c.y >= ROWS || c.x < 0 || c.x >= COLS) return { score: -99999, lines: 0 };
      next[c.y][c.x] = { type: piece.type };
    }
    let cleared = 0;
    const kept = [];
    for (let y = 0; y < ROWS; y++) {
      let full = true;
      for (let x = 0; x < COLS; x++) {
        if (!next[y][x]) {
          full = false;
          break;
        }
      }
      if (full) cleared += 1;
      else kept.push(next[y]);
    }
    const out = emptyBoard();
    let write = ROWS - 1;
    for (let i = kept.length - 1; i >= 0; i--) {
      out[write] = kept[i];
      write -= 1;
    }
    const wellCol = wellColumn(skill);
    const hitsWell = pieceHitsCol(piece, wellCol);
    const tetris = skill && skill.tetris != null ? skill.tetris : 400;
    const wellBreak = skill && skill.wellBreak != null ? skill.wellBreak : 160;
    const comboNow = combo == null ? -1 : combo;
    const incoming = threat || 0;
    let score = evaluateBoard(out, skill);
    const isSpin = spin && spin.tspin;
    const mini = isSpin && spin.mini;

    if (cleared === 4) score += tetris;
    else if (isSpin && !mini && cleared === 3) score += skill.tspinTriple != null ? skill.tspinTriple : tetris + 80;
    else if (isSpin && !mini && cleared === 2) score += skill.tspin != null ? skill.tspin : 720;
    else if (isSpin && !mini && cleared === 1) score += skill.tspinSingle != null ? skill.tspinSingle : 240;
    else if (isSpin && mini && cleared > 0) score += skill.tspinMini != null ? skill.tspinMini : 40;
    else if (cleared === 3) score += skill.triple != null ? skill.triple : 10;
    else if (cleared === 2) score += skill.double != null ? skill.double : 8;
    else if (cleared === 1) {
      score -= skill.singlePenalty != null ? skill.singlePenalty : 100;
      const heights = boardHeights(out);
      let maxH = 0;
      for (let x = 0; x < COLS; x++) if (heights[x] > maxH) maxH = heights[x];
      if (maxH > 15 || incoming > 4) score += 150;
    }

    if (hitsWell && cleared !== 4 && !(isSpin && cleared >= 2)) score -= wellBreak;
    if (piece.type === "I" && cleared === 4) score += tetris * 0.25;
    if (cleared >= 2 && comboNow >= 0) score += Math.min(comboNow, 2) * 12;
    if (cleared && boardIsEmpty(out)) score += 800;
    if (incoming > 0 && cleared >= 2) score += incoming * 8;
    return { score: score, lines: cleared, board: out, tspin: !!(isSpin && !mini && cleared > 0) };
  }

  const BOT_SKILLS = {
    easy: {
      think: [420, 90],
      action: 78,
      drop: 88,
      noise: 18,
      holdMargin: 90,
      lookAhead: false,
      mistake: 0.1,
      holeW: 55,
      bumpW: 2.2,
      tetris: 160,
      singlePenalty: 8,
      double: 24,
      triple: 36,
      wellW: 18,
      wellBreak: 24,
      wellCol: 9,
      tspin: 0,
      holdI: false,
      snap: false,
    },
    medium: {
      think: [240, 40],
      action: 34,
      drop: 38,
      noise: 0,
      holdMargin: 18,
      lookAhead: true,
      mistake: 0,
      holeW: 120,
      bumpW: 3.6,
      tetris: 860,
      singlePenalty: 110,
      double: 6,
      triple: 12,
      wellW: 95,
      wellBreak: 220,
      wellCol: 9,
      tspin: 780,
      tspinSingle: 260,
      tspinMini: 50,
      tspinTriple: 920,
      holdI: true,
      snap: true,
    },
    hard: {
      think: [150, 28],
      action: 24,
      drop: 22,
      noise: 0,
      holdMargin: 8,
      lookAhead: true,
      mistake: 0,
      holeW: 150,
      bumpW: 4.2,
      tetris: 1200,
      singlePenalty: 160,
      double: 0,
      triple: 8,
      wellW: 130,
      wellBreak: 320,
      wellCol: 9,
      tspin: 1100,
      tspinSingle: 320,
      tspinMini: 40,
      tspinTriple: 1300,
      holdI: true,
      snap: true,
    },
  };

  class TetrisBot {
    constructor(game, skill) {
      this.game = game;
      this.plan = null;
      this.timer = 0;
      this.actionMs = 34;
      this.thinkMs = 240;
      this.dropWait = 38;
      this.phase = "think";
      this.tries = 0;
      this.pieceId = -1;
      this._afterHold = false;
      this._idle = 0;
      this.setSkill(skill);
    }

    setSkill(name) {
      this.skillName = BOT_SKILLS[name] ? name : "medium";
      this.skill = BOT_SKILLS[this.skillName];
    }

    reset() {
      this.plan = null;
      this.timer = 0;
      this.phase = "think";
      this.tries = 0;
      this.pieceId = -1;
      this._afterHold = false;
      this._idle = 0;
    }

    _pace() {
      const lv = Math.max(1, this.game.level || 1);
      const s = this.skill;
      const shave = Math.min(lv - 1, 6) * 2;
      return {
        think: Math.max(s.think[0] * 0.72, s.think[0] - shave) + Math.random() * s.think[1],
        action: Math.max(16, s.action - Math.min(lv - 1, 4)),
        drop: Math.max(14, s.drop - Math.min(lv - 1, 4)),
      };
    }

    _pickBest(list) {
      if (!list.length) return null;
      let best = list[0];
      for (let i = 1; i < list.length; i++) if (list[i].score > best.score) best = list[i];
      return best;
    }

    _pushCand(list, board, p, spin) {
      const skill = this.skill;
      const threat = this.game.pendingGarbage || 0;
      const sim = simulatePlace(board, p, skill, this.game.combo, spin, threat);
      let score = sim.score;
      if (skill.noise) score += (Math.random() - 0.5) * 2 * skill.noise;
      list.push({
        rot: p.rot,
        x: p.x,
        y: p.y,
        score: score,
        hold: false,
        lines: sim.lines,
        board: sim.board,
        tspin: sim.tspin,
      });
    }

    _candidates(type, board, nextType) {
      const skill = this.skill;
      const list = [];
      const seen = {};
      for (let rot = 0; rot < 4; rot++) {
        for (let x = -2; x <= 8; x++) {
          const p = dropFromTop(board, type, x, rot);
          if (!p) continue;
          const key = rot + ":" + x + ":" + p.y;
          seen[key] = true;
          this._pushCand(list, board, p, null);
        }
      }
      if (type === "T" && skill.tspin) {
        const y0 = Math.max(HIDDEN - 1, ROWS - 14);
        for (let rot = 0; rot < 4; rot++) {
          for (let x = -2; x <= 8; x++) {
            for (let y = ROWS - 2; y >= y0; y--) {
              const p = { type: "T", x: x, y: y, rot: rot };
              if (collides(board, p) || !onGround(board, p)) continue;
              const key = rot + ":" + x + ":" + y;
              if (seen[key]) continue;
              const spin = detectTSpin(board, p, 1, true);
              if (!spin.tspin) continue;
              seen[key] = true;
              this._pushCand(list, board, p, spin);
            }
          }
        }
      }
      if (nextType && list.length) {
        list.sort(function (a, b) {
          return b.score - a.score;
        });
        const top = Math.min(4, list.length);
        for (let i = 0; i < top; i++) {
          const follow = this._pickBest(this._candidates(nextType, list[i].board, null));
          if (follow) list[i].score += follow.score * 0.45;
        }
      }
      return list;
    }

    _bestOn(type, board, nextType) {
      return this._pickBest(this._candidates(type, board, nextType));
    }

    _best() {
      const g = this.game;
      const piece = g.current;
      if (!piece) return null;
      const next = this.skill.lookAhead ? g.queue[0] : null;
      let now = this._bestOn(piece.type, g.board, next);
      if (this.skill.mistake && now && Math.random() < this.skill.mistake) {
        const all = this._candidates(piece.type, g.board, null);
        if (all.length) now = all[Math.floor(Math.random() * all.length)];
      }
      if (!g.holdUsed && this.skill.holdI && piece.type === "I") {
        const depth = wellDepth(g.board, this.skill);
        const heights = boardHeights(g.board);
        let maxH = 0;
        for (let x = 0; x < COLS; x++) if (heights[x] > maxH) maxH = heights[x];
        const alt = g.hold || g.queue[0];
        if (depth < 4 && maxH < 15 && alt && alt !== "I") {
          return { hold: true, score: now ? now.score : 0 };
        }
      }
      if (!g.holdUsed) {
        const alt = g.hold || g.queue[0];
        if (alt && alt !== piece.type) {
          const altNext = this.skill.lookAhead ? (g.hold ? g.queue[0] : g.queue[1]) : null;
          const other = this._bestOn(alt, g.board, altNext);
          if (other && (!now || other.score > now.score + this.skill.holdMargin)) {
            return { hold: true, score: other.score };
          }
        }
      }
      return now;
    }

    _snap(plan) {
      const g = this.game;
      if (!g.current || !plan) return;
      if (plan.hold) {
        g.holdPiece();
        return;
      }
      if (plan.tspin) {
        let n = 0;
        while (g.current && g.current.x < plan.x && g._shift(1) && n++ < 12) {}
        n = 0;
        while (g.current && g.current.x > plan.x && g._shift(-1) && n++ < 12) {}
        n = 0;
        while (g.current && g.current.y < plan.y && n++ < 30) {
          const next = { type: g.current.type, x: g.current.x, y: g.current.y + 1, rot: g.current.rot };
          if (collides(g.board, next)) break;
          g.current = next;
        }
        n = 0;
        while (g.current && g.current.rot !== plan.rot && n++ < 5) {
          if (!g.rotate(1)) {
            if (!g.rotate(-1)) break;
          }
        }
        n = 0;
        while (g.current && g.current.x < plan.x && g._shift(1) && n++ < 4) {}
        n = 0;
        while (g.current && g.current.x > plan.x && g._shift(-1) && n++ < 4) {}
        if (g.current && g.current.y < plan.y) {
          const next = { type: g.current.type, x: g.current.x, y: plan.y, rot: g.current.rot };
          if (!collides(g.board, next)) g.current = next;
        }
        if (g.current) g.hardDrop();
        return;
      }
      let n = 0;
      while (g.current && g.current.rot !== plan.rot && n++ < 5) {
        if (!g.rotate(1)) {
          if (!g.rotate(-1)) break;
        }
      }
      n = 0;
      while (g.current && g.current.x < plan.x && g._shift(1) && n++ < 12) {}
      n = 0;
      while (g.current && g.current.x > plan.x && g._shift(-1) && n++ < 12) {}
      if (g.current) g.hardDrop();
    }

    _commit() {
      const g = this.game;
      const wasHold = this.plan && this.plan.hold;
      if (!this.plan) g.hardDrop();
      else this._snap(this.plan);
      this.plan = null;
      this.phase = "think";
      this.pieceId = -1;
      this.timer = 0;
      this.tries = 0;
      this._idle = 0;
      if (wasHold && g.current && g.state === "playing") {
        this._afterHold = true;
        return "again";
      }
      return "wait";
    }

    _replan(g) {
      this.pieceId = g.pieceCount;
      this.plan = null;
      this.phase = "think";
      this.tries = 0;
      const pace = this._pace();
      this.actionMs = pace.action;
      this.dropWait = pace.drop;
      this.thinkMs = this._afterHold ? Math.min(36, pace.think) : pace.think;
      this._afterHold = false;
      this.timer = 0;
    }

    _playOne() {
      const g = this.game;
      if (!g.current || g.state !== "playing") return "wait";
      if (this.pieceId !== g.pieceCount || (!this.plan && this.phase !== "think")) {
        this._replan(g);
      }
      if (this.phase === "think") {
        if (this.timer < this.thinkMs) return "wait";
        this.plan = this._best();
        this.timer = 0;
        this.phase = "move";
        if (!this.plan || this.skill.snap) return this._commit();
      }
      if (!this.plan) return this._commit();
      if (this.plan.hold) {
        if (this.timer < this.actionMs) return "wait";
        return this._commit();
      }
      if (this.phase === "drop") {
        if (this.timer < this.dropWait) return "wait";
        return this._commit();
      }
      if (this.timer < this.actionMs) return "wait";
      this.timer = 0;
      this.tries += 1;
      const p = g.current;
      if (!p) return "wait";
      if (p.rot !== this.plan.rot) {
        if (!g.rotate(1)) g.rotate(-1);
        if (this.tries > 12) return this._commit();
        return "wait";
      }
      if (p.x < this.plan.x) {
        if (!g._shift(1)) return this._commit();
        return "wait";
      }
      if (p.x > this.plan.x) {
        if (!g._shift(-1)) return this._commit();
        return "wait";
      }
      this.phase = "drop";
      this.timer = 0;
      return "wait";
    }

    update(dt) {
      const g = this.game;
      if (g.state !== "playing") {
        this.plan = null;
        this.phase = "think";
        return;
      }
      if (!g.current) {
        this.plan = null;
        this.pieceId = -1;
        this.phase = "think";
        return;
      }
      this.timer += dt;
      this._idle = (this._idle || 0) + dt;
      const stall = this.skill.snap ? 1200 : 1800;
      if (this._idle > stall) {
        g.hardDrop();
        this.pieceId = -1;
        this.plan = null;
        this.phase = "think";
        this.timer = 0;
        this._idle = 0;
      }
      let steps = 0;
      while (g.state === "playing" && g.current && steps++ < 6) {
        const result = this._playOne();
        if (result === "again") {
          this._idle = 0;
          continue;
        }
        break;
      }
      if (this.phase === "move" && this.plan) this._idle = 0;
    }
  }

  class BattleMatch {
    constructor(skill) {
      this.skill = BOT_SKILLS[skill] ? skill : "medium";
      this.you = new Game();
      this.bot = new Game();
      this.ai = new TetrisBot(this.bot, this.skill);
      this.kosYou = 0;
      this.kosBot = 0;
      this.targetKos = 3;
      this.time = 0;
      this.limit = 120000;
      this.state = "ready";
      this.winner = null;
    }

    start() {
      this.you.start("battle");
      this.bot.start("battle");
      this.ai.setSkill(this.skill);
      this.ai.reset();
      this.kosYou = 0;
      this.kosBot = 0;
      this.time = 0;
      this.state = "playing";
      this.winner = null;
    }

    update(dt) {
      if (this.state !== "playing") return { you: [], bot: [] };
      this.time += dt;
      this.ai.update(dt);
      this.you.update(dt);
      this.bot.update(dt);
      const ye = this.you.drainEvents();
      const be = this.bot.drainEvents();
      for (let i = 0; i < ye.length; i++) {
        if (ye[i].type === "attack" && ye[i].send) this.bot.receiveGarbage(ye[i].send);
        if (ye[i].type === "ko") {
          this.kosBot += 1;
          this.ai.reset();
        }
      }
      for (let i = 0; i < be.length; i++) {
        if (be[i].type === "attack" && be[i].send) this.you.receiveGarbage(be[i].send);
        if (be[i].type === "ko") {
          this.kosYou += 1;
        }
      }
      if (this.kosYou >= this.targetKos) this._end("you");
      else if (this.kosBot >= this.targetKos) this._end("bot");
      else if (this.time >= this.limit) this._timeUp();
      return { you: ye, bot: be };
    }

    _end(winner) {
      this.winner = winner;
      this.state = "over";
      this.you.state = "over";
      this.bot.state = "over";
    }

    _timeUp() {
      if (this.kosYou !== this.kosBot) this._end(this.kosYou > this.kosBot ? "you" : "bot");
      else if (this.you.garbageSent !== this.bot.garbageSent) {
        this._end(this.you.garbageSent > this.bot.garbageSent ? "you" : "bot");
      } else {
        const hy = boardHeights(this.you.board).reduce(function (a, b) { return a + b; }, 0);
        const hb = boardHeights(this.bot.board).reduce(function (a, b) { return a + b; }, 0);
        this._end(hy <= hb ? "you" : "bot");
      }
    }

    remainingTime() {
      return Math.max(0, this.limit - this.time);
    }

    pause() {
      if (this.state !== "playing") return;
      this.state = "paused";
      this.you.pause();
      this.bot.pause();
    }

    resume() {
      if (this.state !== "paused") return;
      this.state = "playing";
      this.you.resume();
      this.bot.resume();
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
    TetrisBot: TetrisBot,
    BattleMatch: BattleMatch,
    BOT_SKILLS: BOT_SKILLS,
    occupied: occupied,
    kicksFor: kicksFor,
  };

  root.TFEngine = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : global);
