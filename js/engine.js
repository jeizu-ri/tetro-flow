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

  function evaluateBoard(board, skill) {
    const holeW = skill && skill.holeW != null ? skill.holeW : 85;
    const bumpW = skill && skill.bumpW != null ? skill.bumpW : 3.4;
    const heights = boardHeights(board);
    let holes = 0;
    let agg = 0;
    let bump = 0;
    for (let x = 0; x < COLS; x++) {
      agg += heights[x];
      let seen = false;
      for (let y = 0; y < ROWS; y++) {
        if (board[y][x]) seen = true;
        else if (seen) holes += 1;
      }
    }
    for (let x = 0; x < COLS - 1; x++) bump += Math.abs(heights[x] - heights[x + 1]);
    let well = 0;
    if (skill && skill.tetris >= 200) {
      let minH = 99;
      let wellCol = 9;
      for (let x = 0; x < COLS; x++) {
        if (heights[x] < minH) {
          minH = heights[x];
          wellCol = x;
        }
      }
      if (wellCol === 9 || wellCol === 0) {
        let others = 0;
        for (let x = 0; x < COLS; x++) if (x !== wellCol) others += heights[x];
        others /= COLS - 1;
        if (others - minH >= 3) well = 22;
      }
    }
    return -holes * holeW - agg * 2.2 - bump * bumpW + well;
  }

  function simulatePlace(board, piece, skill) {
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
    const clearW = skill && skill.clearW != null ? skill.clearW : 48;
    const tetris = skill && skill.tetris != null ? skill.tetris : 220;
    let score = evaluateBoard(out, skill) + cleared * clearW;
    if (cleared === 4) score += tetris;
    if (cleared === 3) score += 40;
    if (cleared === 2) score += 12;
    return { score: score, lines: cleared, board: out };
  }

  const BOT_SKILLS = {
    easy: {
      think: [640, 200],
      action: 210,
      drop: 300,
      noise: 70,
      holdMargin: 9999,
      lookAhead: false,
      mistake: 0.28,
      holeW: 32,
      bumpW: 1.8,
      tetris: 40,
      clearW: 18,
    },
    medium: {
      think: [220, 90],
      action: 92,
      drop: 120,
      noise: 8,
      holdMargin: 24,
      lookAhead: false,
      mistake: 0.04,
      holeW: 92,
      bumpW: 3.6,
      tetris: 280,
      clearW: 58,
    },
    hard: {
      think: [55, 35],
      action: 36,
      drop: 36,
      noise: 0,
      holdMargin: 8,
      lookAhead: true,
      mistake: 0,
      holeW: 125,
      bumpW: 4.4,
      tetris: 560,
      clearW: 90,
    },
  };

  class TetrisBot {
    constructor(game, skill) {
      this.game = game;
      this.plan = null;
      this.timer = 0;
      this.actionMs = 92;
      this.thinkMs = 220;
      this.dropWait = 120;
      this.phase = "think";
      this.tries = 0;
      this.pieceId = -1;
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
    }

    _pace() {
      const lv = this.game.level || 1;
      const s = this.skill;
      const thinkCut = this.skillName === "hard" ? 4 : 12;
      return {
        think: Math.max(40, s.think[0] - lv * thinkCut) + Math.random() * s.think[1],
        action: Math.max(28, s.action - lv * (this.skillName === "hard" ? 1 : 3)),
        drop: Math.max(24, s.drop - lv * (this.skillName === "hard" ? 1 : 4)),
      };
    }

    _candidates(type, board, lookAhead) {
      const skill = this.skill;
      const spawnY = SPAWN[type].y;
      const threat = this.game.pendingGarbage || 0;
      const nextType = lookAhead && this.game.queue && this.game.queue[0];
      const list = [];
      for (let rot = 0; rot < 4; rot++) {
        for (let x = -2; x <= 8; x++) {
          const p = { type: type, x: x, y: spawnY, rot: rot };
          if (collides(board, p)) continue;
          while (!collides(board, { type: p.type, x: p.x, y: p.y + 1, rot: p.rot })) p.y += 1;
          const sim = simulatePlace(board, p, skill);
          let score = sim.score;
          if (threat > 0 && sim.lines > 0) score += sim.lines * 110 + (sim.lines >= 2 ? 60 : 0);
          if (lookAhead && nextType) {
            const follow = this._bestOn(nextType, sim.board, false);
            if (follow) score += follow.score * 0.42;
          }
          if (skill.noise) score += (Math.random() - 0.5) * 2 * skill.noise;
          list.push({ rot: rot, x: x, y: p.y, score: score, hold: false, lines: sim.lines });
        }
      }
      return list;
    }

    _bestOn(type, board, lookAhead) {
      const list = this._candidates(type, board, lookAhead);
      if (!list.length) return null;
      if (this.skill.mistake && Math.random() < this.skill.mistake) {
        return list[Math.floor(Math.random() * list.length)];
      }
      let best = list[0];
      for (let i = 1; i < list.length; i++) if (list[i].score > best.score) best = list[i];
      return best;
    }

    _best() {
      const g = this.game;
      const piece = g.current;
      if (!piece) return null;
      const now = this._bestOn(piece.type, g.board, this.skill.lookAhead);
      if (!g.holdUsed) {
        const alt = g.hold || g.queue[0];
        if (alt && alt !== piece.type) {
          const other = this._bestOn(alt, g.board, false);
          if (other && (!now || other.score > now.score + this.skill.holdMargin)) {
            return { hold: true, score: other.score };
          }
        }
      }
      return now;
    }

    update(dt) {
      const g = this.game;
      if (g.state !== "playing" || !g.current) {
        this.plan = null;
        return;
      }
      if (this.pieceId !== g.pieceCount) {
        this.plan = null;
        this.pieceId = g.pieceCount;
        this.phase = "think";
        this.timer = 0;
        this.tries = 0;
        const pace = this._pace();
        this.thinkMs = pace.think;
        this.actionMs = pace.action;
        this.dropWait = pace.drop;
      }
      this.timer += dt;
      if (this.phase === "think") {
        if (this.timer < this.thinkMs) return;
        this.plan = this._best();
        this.timer = 0;
        this.phase = "move";
        if (!this.plan) {
          g.hardDrop();
          return;
        }
      }
      if (!this.plan) return;
      if (this.plan.hold) {
        if (this.timer < this.actionMs) return;
        g.holdPiece();
        this.plan = null;
        return;
      }
      if (this.phase === "drop") {
        if (this.timer < this.dropWait) return;
        g.hardDrop();
        this.plan = null;
        return;
      }
      if (this.timer < this.actionMs) return;
      this.timer = 0;
      this.tries += 1;
      const p = g.current;
      if (p.rot !== this.plan.rot) {
        if (!g.rotate(1)) g.rotate(-1);
        if (this.tries > 12) g.hardDrop();
        return;
      }
      if (p.x < this.plan.x) {
        if (!g._shift(1)) g.hardDrop();
        return;
      }
      if (p.x > this.plan.x) {
        if (!g._shift(-1)) g.hardDrop();
        return;
      }
      this.phase = "drop";
      this.timer = 0;
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
