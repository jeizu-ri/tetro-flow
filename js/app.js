(function () {
  const E = window.TFEngine;
  const COLORS = E.COLORS;
  const HIDDEN = E.HIDDEN;
  const COLS = E.COLS;
  const VISIBLE = E.VISIBLE;

  const SETTINGS_KEY = "tetra-friends-settings-v1";
  const SCORES_KEY = "tetra-friends-scores-v1";

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }
  function rand(a, b) {
    return a + Math.random() * (b - a);
  }
  function easeOutBack(t) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }
  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }
  function hexToRgb(hex) {
    const h = hex.replace("#", "");
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function withAlpha(hex, a) {
    const [r, g, b] = hexToRgb(hex);
    return "rgba(" + r + "," + g + "," + b + "," + a + ")";
  }
  function mix(hex, t, other) {
    const a = hexToRgb(hex);
    const b = hexToRgb(other || "#ffffff");
    const r = Math.round(lerp(a[0], b[0], t));
    const g = Math.round(lerp(a[1], b[1], t));
    const bl = Math.round(lerp(a[2], b[2], t));
    return "rgb(" + r + "," + g + "," + bl + ")";
  }
  function formatTime(ms) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const r = s % 60;
    const frac = Math.floor((ms % 1000) / 10);
    if (m > 0) return m + ":" + String(r).padStart(2, "0") + "." + String(frac).padStart(2, "0");
    return r + "." + String(frac).padStart(2, "0");
  }
  function formatClock(ms) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return m + ":" + String(s % 60).padStart(2, "0");
  }
  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function loadSettings() {
    const base = {
      das: 167,
      arr: 33,
      music: 55,
      sfx: 80,
      shake: true,
      ghost: true,
    };
    try {
      return Object.assign(base, JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}"));
    } catch (e) {
      return base;
    }
  }
  function saveSettings(s) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  }
  function loadScores() {
    const base = { marathon: [], sprint: [], ultra: [] };
    try {
      return Object.assign(base, JSON.parse(localStorage.getItem(SCORES_KEY) || "{}"));
    } catch (e) {
      return base;
    }
  }
  function saveScores(s) {
    localStorage.setItem(SCORES_KEY, JSON.stringify(s));
  }

  class AudioBus {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.musicGain = null;
      this.sfxGain = null;
      this.musicOn = true;
      this.enabled = true;
      this.nextNote = 0;
      this.step = 0;
      this.bpm = 128;
      this.started = false;
    }
    unlock() {
      if (this.ctx) {
        if (this.ctx.state === "suspended") this.ctx.resume();
        return;
      }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain.connect(this.master);
      this.sfxGain.connect(this.master);
      this.setMusic(0.55);
      this.setSfx(0.8);
      this.nextNote = this.ctx.currentTime + 0.05;
    }
    setMusic(v) {
      if (this.musicGain) this.musicGain.gain.value = v * 0.22;
    }
    setSfx(v) {
      if (this.sfxGain) this.sfxGain.gain.value = v * 0.7;
    }
    osc(type, freq, t, dur, vol, dest, slide) {
      if (!this.ctx) return;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, slide), t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(dest || this.sfxGain);
      o.start(t);
      o.stop(t + dur + 0.02);
    }
    noise(t, dur, vol, hp) {
      if (!this.ctx) return;
      const n = this.ctx.createBufferSource();
      const frames = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
      const buf = this.ctx.createBuffer(1, frames, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
      n.buffer = buf;
      const f = this.ctx.createBiquadFilter();
      f.type = hp ? "highpass" : "lowpass";
      f.frequency.value = hp || 1400;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      n.connect(f);
      f.connect(g);
      g.connect(this.sfxGain);
      n.start(t);
      n.stop(t + dur);
    }
    move() {
      if (!this.ctx) return;
      this.osc("square", 620, this.ctx.currentTime, 0.03, 0.05);
    }
    rotate() {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      this.osc("sawtooth", 240, t, 0.09, 0.07, this.sfxGain, 720);
      this.noise(t, 0.06, 0.04, 1800);
    }
    kick() {
      if (!this.ctx) return;
      this.osc("triangle", 180, this.ctx.currentTime, 0.12, 0.09, this.sfxGain, 90);
    }
    hold() {
      if (!this.ctx) return;
      this.osc("square", 330, this.ctx.currentTime, 0.08, 0.06, this.sfxGain, 520);
    }
    lock() {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      this.osc("sine", 140, t, 0.08, 0.1, this.sfxGain, 70);
      this.noise(t, 0.05, 0.05, 900);
    }
    slam(dist) {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const p = clamp(dist / 20, 0.3, 1);
      this.osc("sine", 90, t, 0.16, 0.16 * p, this.sfxGain, 40);
      this.noise(t, 0.1, 0.1 * p, 400);
      this.osc("sawtooth", 220, t, 0.08, 0.05 * p, this.sfxGain, 60);
    }
    line(n) {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      for (let i = 0; i < n; i++) {
        this.osc("triangle", 420 + i * 160, t + i * 0.04, 0.12, 0.08);
      }
    }
    tetris() {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const notes = [523, 659, 784, 1046, 1318];
      for (let i = 0; i < notes.length; i++) this.osc("triangle", notes[i], t + i * 0.045, 0.18, 0.1);
      this.noise(t, 0.2, 0.07, 600);
    }
    tspin() {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      this.osc("sawtooth", 160, t, 0.2, 0.08, this.sfxGain, 620);
      this.osc("triangle", 740, t + 0.05, 0.16, 0.08, this.sfxGain, 1180);
    }
    level() {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      [440, 554, 659, 880].forEach((f, i) => this.osc("square", f, t + i * 0.07, 0.12, 0.06));
    }
    over() {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      [392, 311, 247, 196].forEach((f, i) => this.osc("triangle", f, t + i * 0.14, 0.28, 0.09));
    }
    win() {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => this.osc("triangle", f, t + i * 0.09, 0.22, 0.09));
    }
    combo(n) {
      if (!this.ctx) return;
      this.osc("square", 300 + n * 40, this.ctx.currentTime, 0.08, 0.06);
    }
    tickMusic() {
      if (!this.ctx || !this.started) return;
      const ctx = this.ctx;
      const stepDur = 60 / this.bpm / 2;
      const lead = [
        440, 0, 523, 659, 880, 0, 784, 659, 587, 659, 523, 440, 392, 440, 523, 659,
        440, 523, 659, 0, 698, 659, 523, 440, 392, 0, 349, 392, 440, 523, 587, 659,
      ];
      const bass = [110, 110, 164, 110, 87, 87, 130, 87, 98, 98, 146, 98, 110, 82, 98, 110];
      while (this.nextNote < ctx.currentTime + 0.12) {
        const t = this.nextNote;
        const i = this.step % 32;
        const b = bass[i % 16];
        this.osc("sine", b, t, 0.18, 0.11, this.musicGain);
        this.osc("triangle", b * 2, t, 0.12, 0.03, this.musicGain);
        const l = lead[i];
        if (l) this.osc("triangle", l, t, 0.14, 0.045, this.musicGain);
        if (i % 2 === 0) this._hat(t, i % 4 === 2 ? 0.04 : 0.02);
        this.step += 1;
        this.nextNote += stepDur;
      }
    }
    _hat(t, vol) {
      this.noise(t, 0.04, vol, 2400);
    }
  }

  class Particles {
    constructor() {
      this.max = 900;
      this.list = new Array(this.max);
      this.i = 0;
    }
    spawn(p) {
      this.list[this.i % this.max] = p;
      this.i += 1;
    }
    burst(x, y, color, n, speed) {
      for (let i = 0; i < n; i++) {
        const a = rand(0, Math.PI * 2);
        const s = rand(speed * 0.3, speed);
        this.spawn({
          type: "spark",
          x: x,
          y: y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          life: rand(0.25, 0.7),
          max: 0.7,
          size: rand(1.5, 4.5),
          color: color,
          drag: 2.4,
          g: 420,
        });
      }
    }
    swirl(x, y, color) {
      for (let i = 0; i < 28; i++) {
        const a = (i / 28) * Math.PI * 2;
        this.spawn({
          type: "spark",
          x: x + Math.cos(a) * 10,
          y: y + Math.sin(a) * 10,
          vx: Math.cos(a + 1.2) * 220,
          vy: Math.sin(a + 1.2) * 220,
          life: 0.55,
          max: 0.55,
          size: 3,
          color: color,
          drag: 1.6,
          g: 0,
        });
      }
    }
    ring(x, y, color, size) {
      this.spawn({
        type: "ring",
        x: x,
        y: y,
        life: 0.45,
        max: 0.45,
        size: size || 12,
        color: color,
        grow: 280,
      });
    }
    shards(cells, cell, hidden, colors) {
      for (let i = 0; i < cells.length; i++) {
        const c = cells[i];
        const x = (c.x + 0.5) * cell;
        const y = (c.y - hidden + 0.5) * cell;
        const col = colors[c.type] || "#fff";
        for (let k = 0; k < 5; k++) {
          this.spawn({
            type: "shard",
            x: x + rand(-cell * 0.2, cell * 0.2),
            y: y + rand(-cell * 0.2, cell * 0.2),
            vx: rand(-220, 220),
            vy: rand(-420, -40),
            life: rand(0.45, 0.9),
            max: 0.9,
            size: cell * rand(0.18, 0.36),
            color: col,
            rot: rand(0, 6),
            vr: rand(-10, 10),
            drag: 1.2,
            g: 980,
          });
        }
      }
    }
    stars(x, y, n) {
      const cols = ["#2de8f0", "#3cde62", "#f2d234", "#ff9a2e", "#f0445d", "#c44bee", "#3b6cff"];
      for (let i = 0; i < n; i++) {
        const a = rand(0, Math.PI * 2);
        const s = rand(80, 520);
        this.spawn({
          type: "star",
          x: x,
          y: y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s - 80,
          life: rand(0.6, 1.1),
          max: 1.1,
          size: rand(3, 7),
          color: cols[i % cols.length],
          drag: 1.1,
          g: 120,
        });
      }
    }
    text(x, y, str, color) {
      this.spawn({
        type: "text",
        x: x,
        y: y,
        vx: 0,
        vy: -70,
        life: 0.9,
        max: 0.9,
        text: str,
        color: color || "#fff",
        size: 16,
      });
    }
    update(dt) {
      for (let i = 0; i < this.list.length; i++) {
        const p = this.list[i];
        if (!p || p.life <= 0) continue;
        p.life -= dt;
        if (p.type === "ring") {
          p.size += (p.grow || 200) * dt;
          continue;
        }
        if (p.vx != null) {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          if (p.g) p.vy += p.g * dt;
          if (p.drag) {
            p.vx *= Math.max(0, 1 - p.drag * dt);
            p.vy *= Math.max(0, 1 - p.drag * dt);
          }
        }
        if (p.vr) p.rot += p.vr * dt;
      }
    }
    draw(ctx) {
      for (let i = 0; i < this.list.length; i++) {
        const p = this.list[i];
        if (!p || p.life <= 0) continue;
        const a = clamp(p.life / (p.max || 1), 0, 1);
        if (p.type === "text") {
          ctx.save();
          ctx.globalAlpha = a;
          ctx.fillStyle = p.color;
          ctx.font = "700 16px Orbitron, Rajdhani, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(p.text, p.x, p.y);
          ctx.restore();
          continue;
        }
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.strokeStyle = p.color;
        if (p.type === "ring") {
          ctx.lineWidth = 3 * a;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.stroke();
        } else if (p.type === "shard") {
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot || 0);
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        } else if (p.type === "star") {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillRect(p.x - p.size * 1.6, p.y - 1, p.size * 3.2, 2);
          ctx.fillRect(p.x - 1, p.y - p.size * 1.6, 2, p.size * 3.2);
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }
  }

  class Sky {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.stars = [];
      this.floaters = [];
      this.hue = 210;
      this.t = 0;
      this.resize();
      for (let i = 0; i < 140; i++) {
        this.stars.push({
          x: Math.random(),
          y: Math.random(),
          s: rand(0.4, 1.8),
          p: rand(0, Math.PI * 2),
        });
      }
      const types = E.TYPES;
      for (let i = 0; i < 14; i++) {
        this.floaters.push({
          type: types[i % 7],
          x: rand(0, 1),
          y: rand(-0.2, 1),
          rot: rand(0, Math.PI * 2),
          vr: rand(-0.6, 0.6),
          vy: rand(0.02, 0.06),
          scale: rand(12, 26),
        });
      }
    }
    resize() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      this.w = window.innerWidth;
      this.h = window.innerHeight;
      this.canvas.width = this.w * dpr;
      this.canvas.height = this.h * dpr;
      this.canvas.style.width = this.w + "px";
      this.canvas.style.height = this.h + "px";
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    update(dt, playing, color) {
      this.t += dt;
      if (color) {
        const [r, g, b] = hexToRgb(color);
        const target = (Math.atan2(Math.sqrt(3) * (g - b), 2 * r - g - b) * 180) / Math.PI;
        this.hue = lerp(this.hue, (target + 360) % 360, 0.04);
      }
      for (let i = 0; i < this.floaters.length; i++) {
        const f = this.floaters[i];
        f.y += f.vy * dt * (playing ? 0.25 : 1);
        f.rot += f.vr * dt;
        if (f.y > 1.15) {
          f.y = -0.15;
          f.x = Math.random();
        }
      }
    }
    draw(playing) {
      const ctx = this.ctx;
      const w = this.w;
      const h = this.h;
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "hsl(" + this.hue + ", 55%, 8%)");
      g.addColorStop(0.5, "#07081a");
      g.addColorStop(1, "#04040e");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      const blobs = [
        [w * 0.2, h * 0.25, w * 0.45, "hsla(" + this.hue + ",80%,50%,0.16)"],
        [w * 0.8, h * 0.2, w * 0.4, "hsla(" + ((this.hue + 40) % 360) + ",90%,55%,0.12)"],
        [w * 0.5, h * 0.85, w * 0.5, "hsla(" + ((this.hue + 300) % 360) + ",70%,45%,0.1)"],
      ];
      blobs.forEach((b, i) => {
        const x = b[0] + Math.sin(this.t * 0.3 + i) * 40;
        const y = b[1] + Math.cos(this.t * 0.2 + i) * 30;
        const rad = ctx.createRadialGradient(x, y, 0, x, y, b[2]);
        rad.addColorStop(0, b[3]);
        rad.addColorStop(1, "transparent");
        ctx.fillStyle = rad;
        ctx.fillRect(0, 0, w, h);
      });

      for (let i = 0; i < this.stars.length; i++) {
        const s = this.stars[i];
        const tw = 0.4 + 0.6 * Math.abs(Math.sin(this.t * 1.6 + s.p));
        ctx.globalAlpha = tw;
        ctx.fillStyle = "#cfe6ff";
        ctx.fillRect(s.x * w, s.y * h, s.s, s.s);
      }
      ctx.globalAlpha = 1;

      if (!playing) {
        for (let i = 0; i < this.floaters.length; i++) {
          const f = this.floaters[i];
          const cells = E.SHAPES[f.type][0];
          ctx.save();
          ctx.translate(f.x * w, f.y * h);
          ctx.rotate(f.rot);
          ctx.globalAlpha = 0.18;
          ctx.fillStyle = COLORS[f.type];
          ctx.shadowColor = COLORS[f.type];
          ctx.shadowBlur = 16;
          for (let k = 0; k < cells.length; k++) {
            ctx.fillRect((cells[k][0] - 1.5) * f.scale, (cells[k][1] - 1.5) * f.scale, f.scale - 1, f.scale - 1);
          }
          ctx.restore();
        }
      }
    }
  }

  class Atlas {
    constructor() {
      this.cache = {};
      this.size = 0;
    }
    rebuild(size) {
      this.size = size;
      this.cache = {};
      const types = Object.keys(COLORS);
      for (let i = 0; i < types.length; i++) {
        const type = types[i];
        const c = document.createElement("canvas");
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        c.width = size * dpr;
        c.height = size * dpr;
        const ctx = c.getContext("2d");
        ctx.scale(dpr, dpr);
        this._paint(ctx, size, COLORS[type]);
        this.cache[type] = c;
      }
    }
    _paint(ctx, s, color) {
      const pad = s * 0.06;
      const r = s * 0.18;
      roundRect(ctx, pad, pad, s - pad * 2, s - pad * 2, r);
      const g = ctx.createLinearGradient(0, 0, 0, s);
      g.addColorStop(0, mix(color, 0.45, "#ffffff"));
      g.addColorStop(0.4, color);
      g.addColorStop(1, mix(color, 0.42, "#000000"));
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = mix(color, 0.25, "#000000");
      ctx.lineWidth = Math.max(1, s * 0.05);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.32)";
      roundRect(ctx, pad + s * 0.1, pad + s * 0.08, s * 0.55, s * 0.22, r);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.beginPath();
      ctx.arc(s * 0.28, s * 0.28, s * 0.06, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = 1;
      roundRect(ctx, pad + 2, pad + 2, s - pad * 2 - 4, s - pad * 2 - 4, r * 0.8);
      ctx.stroke();
    }
    draw(ctx, type, x, y, size, alpha) {
      ctx.globalAlpha = alpha == null ? 1 : alpha;
      const img = this.cache[type];
      if (img) ctx.drawImage(img, x, y, size, size);
      ctx.globalAlpha = 1;
    }
  }

  const KEYMAP = {
    ArrowLeft: "left",
    ArrowRight: "right",
    ArrowDown: "down",
    ArrowUp: "rotCW",
    Space: "hard",
    KeyZ: "rotCCW",
    KeyX: "rotCW",
    KeyC: "hold",
    ShiftLeft: "hold",
    ShiftRight: "hold",
    ControlLeft: "rotCCW",
    ControlRight: "rotCCW",
    KeyW: "rotCW",
    KeyA: "left",
    KeyS: "down",
    KeyD: "right",
    KeyQ: "rotCCW",
    KeyE: "hold",
    KeyP: "pause",
    Escape: "pause",
  };

  const app = {
    settings: loadSettings(),
    game: new E.Game(),
    audio: new AudioBus(),
    particles: new Particles(),
    atlas: new Atlas(),
    sky: null,
    cell: 32,
    dpr: 1,
    spin: null,
    slam: null,
    shake: 0,
    zoom: 0,
    flash: 0,
    flashColor: "#fff",
    trails: [],
    landed: [],
    stackSlide: 0,
    dropMap: null,
    wellPulse: 0,
    last: 0,
    mode: "marathon",
    intro: 0,
    running: false,
    nextSlide: 0,
    holdFlash: 0,
    piecePath: [],
    lastScore: 0,
  };

  function $(id) {
    return document.getElementById(id);
  }

  function layout() {
    const frame = $("well-frame");
    const canvas = $("board");
    const maxH = Math.min(window.innerHeight * (window.innerWidth < 860 ? 0.58 : 0.9), 880);
    const maxW = Math.min(window.innerWidth * (window.innerWidth < 860 ? 0.72 : 0.42), 460);
    app.cell = Math.max(16, Math.floor(Math.min(maxH / VISIBLE, maxW / COLS)));
    app.dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = COLS * app.cell;
    const h = VISIBLE * app.cell;
    canvas.width = w * app.dpr;
    canvas.height = h * app.dpr;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    const ctx = canvas.getContext("2d");
    ctx.setTransform(app.dpr, 0, 0, app.dpr, 0, 0);
    app.ctx = ctx;
    app.atlas.rebuild(app.cell);
    if (app.sky) app.sky.resize();
    sizePreview($("hold"), 4, 3);
    sizePreview($("next"), 4, 16);
  }

  function sizePreview(canvas, cw, ch) {
    const s = 28;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = cw * s * dpr;
    canvas.height = ch * s * dpr;
    canvas.style.width = cw * s + "px";
    canvas.style.height = ch * s + "px";
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function showScreen(id) {
    $("menu").classList.toggle("hidden", id !== "menu");
    $("play").classList.toggle("hidden", id !== "play");
  }

  function openModal(name) {
    $("overlay").classList.remove("hidden");
    ["how", "scores", "settings", "pause", "end"].forEach((n) => {
      $("modal-" + n).classList.toggle("hidden", n !== name);
    });
    if (name === "scores") renderScores();
    if (name === "settings") syncSettingsUi();
  }
  function closeModal() {
    $("overlay").classList.add("hidden");
  }

  function syncSettingsUi() {
    $("set-das").value = app.settings.das;
    $("set-arr").value = app.settings.arr;
    $("set-music").value = app.settings.music;
    $("set-sfx").value = app.settings.sfx;
    $("set-shake").checked = app.settings.shake;
    $("set-ghost").checked = app.settings.ghost;
    $("das-val").textContent = app.settings.das + "ms";
    $("arr-val").textContent = app.settings.arr + "ms";
  }

  function applySettings() {
    app.game.setDasArr(app.settings.das, app.settings.arr);
    app.audio.setMusic(app.settings.music / 100);
    app.audio.setSfx(app.settings.sfx / 100);
    saveSettings(app.settings);
  }

  function banner(text, kind, sub) {
    const el = document.createElement("div");
    el.className = "banner " + (kind || "");
    el.innerHTML = sub ? text + "<small>" + sub + "</small>" : text;
    $("banners").appendChild(el);
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 720);
  }

  function startMode(mode) {
    app.mode = mode;
    app.audio.unlock();
    app.audio.started = true;
    app.audio.nextNote = (app.audio.ctx && app.audio.ctx.currentTime + 0.05) || 0;
    app.particles = new Particles();
    showScreen("play");
    closeModal();
    layout();
    app.game.setDasArr(app.settings.das, app.settings.arr);
    app.running = true;
    app.frozen = true;
    app.held = {};
    app.intro = 1.15;
    $("ready-go").classList.remove("hidden");
    $("ready-go").querySelector("span").textContent = "READY";
    app.game.start(mode);
    handleEvents(app.game.drainEvents());
    app.spin = null;
    app.slam = null;
    app.trails = [];
    app.landed = [];
    app.piecePath = [];
    app.lastScore = app.game.score;
    document.body.classList.add("playing");
    if (("ontouchstart" in window || navigator.maxTouchPoints > 0) && window.innerWidth < 900) {
      $("touch").classList.remove("hidden");
    }
  }

  function actuallyStart() {
    $("ready-go").querySelector("span").textContent = "GO";
    setTimeout(function () {
      $("ready-go").classList.add("hidden");
    }, 280);
    app.frozen = false;
    app.intro = 0;
    const held = app.held || {};
    Object.keys(held).forEach(function (act) {
      if (held[act]) app.game.keyDown(act);
    });
  }

  function quitToMenu() {
    app.running = false;
    app.game.state = "ready";
    app.audio.started = false;
    showScreen("menu");
    closeModal();
    document.body.classList.remove("playing");
    $("touch").classList.add("hidden");
  }

  function sx(x) {
    return x * app.cell;
  }
  function sy(y) {
    return (y - HIDDEN) * app.cell;
  }

  function handleEvents(events) {
    const cell = app.cell;
    for (let i = 0; i < events.length; i++) {
      const ev = events[i];
      if (ev.type === "move") app.audio.move();
      if (ev.type === "rotate") {
        app.audio.rotate();
        const origin = ev.origin;
        app.spin = {
          age: 0,
            dur: 0.2,
          dir: ev.dir,
          kick: ev.kick,
          origin: origin,
          type: ev.to.type,
        };
        const ox = sx(origin.x);
        const oy = sy(origin.y);
        app.particles.swirl(ox, oy, COLORS[ev.to.type]);
        app.particles.burst(ox, oy, "#ffffff", 10, 180);
        if (ev.kickIndex > 0) {
          app.audio.kick();
          app.particles.ring(ox, oy, COLORS[ev.to.type], 8);
          app.wellPulse = 1;
        }
        app.zoom = Math.max(app.zoom, 0.03);
      }
      if (ev.type === "hardDrop") {
        app.audio.slam(ev.dist);
        app.slam = { age: 0, dur: 0.18, dist: ev.dist, cells: ev.cells, from: ev.from, to: ev.to };
        app.shake = app.settings.shake ? clamp(0.35 + ev.dist * 0.05, 0.4, 1.4) : 0;
        app.zoom = 0.08 + Math.min(0.08, ev.dist * 0.004);
        app.flash = 0.35;
        app.flashColor = COLORS[ev.to.type];
        const midX = sx(ev.to.x + 1.5);
        const landY = sy((ev.cells[0] && ev.cells[0].y) || ev.to.y) + cell;
        for (let d = 0; d < ev.dist; d++) {
          app.trails.push({
            cells: ev.cells.map(function (c) {
              return { x: c.x, y: c.y - d, type: c.type };
            }),
            age: 0,
            dur: 0.22,
            alpha: 0.22 * (1 - d / (ev.dist + 1)),
          });
        }
        app.particles.ring(midX, landY, COLORS[ev.to.type], 16);
        app.particles.ring(midX, landY, "#fff", 6);
        app.particles.burst(midX, landY, COLORS[ev.to.type], 26, 380);
        app.particles.burst(midX, landY, "#fff", 10, 260);
      }
      if (ev.type === "lock") {
        if (!ev.hard) app.audio.lock();
        $("combo-chip").classList.add("hidden");
        for (let c = 0; c < ev.cells.length; c++) {
          app.landed.push({ cell: ev.cells[c], age: 0, dur: 0.2 });
        }
        if (!ev.hard) {
          const cx = sx(ev.cells[0].x + 0.5);
          const cy = sy(ev.cells[0].y + 0.5);
          app.particles.burst(cx, cy, COLORS[ev.piece.type], 8, 120);
        }
      }
      if (ev.type === "hold") {
        app.audio.hold();
        app.holdFlash = 1;
      }
      if (ev.type === "spawn") {
        app.nextSlide = 1;
        app.piecePath = [];
        app.particles.burst(sx(5), sy(HIDDEN + 0.5), COLORS[ev.piece.type], 12, 140);
      }
      if (ev.type === "lineClear") {
        const kind = ev.lines === 4 ? "tetris" : ev.tspin ? "tspin" : ev.lines ? "combo" : "";
        banner(ev.name, kind, ev.points ? "+" + ev.points.toLocaleString() : "");
        if (ev.b2b) banner("BACK-TO-BACK", "b2b");
        if (ev.combo > 0) {
          banner("COMBO x" + (ev.combo + 1), "combo");
          app.audio.combo(ev.combo);
          $("combo-chip").classList.remove("hidden");
          $("combo-chip").textContent = "COMBO " + (ev.combo + 1);
        } else $("combo-chip").classList.add("hidden");
        if (ev.perfect) banner("PERFECT CLEAR", "perfect", "+" + ev.perfectPts);
        if (ev.lines === 4) {
          app.audio.tetris();
          app.shake = app.settings.shake ? 1.6 : 0;
          app.zoom = 0.14;
          app.flash = 0.7;
          app.flashColor = "#ffffff";
          app.particles.stars(sx(5), sy(HIDDEN + 10), 50);
        } else if (ev.tspin) {
          app.audio.tspin();
          app.shake = app.settings.shake ? 1.1 : 0;
          app.flash = 0.45;
          app.flashColor = "#c44bee";
          app.particles.swirl(sx(5), sy((ev.rows[0] != null ? ev.rows[0] : HIDDEN + 8)), "#c44bee");
        } else if (ev.lines > 0) app.audio.line(ev.lines);
        if (ev.cells && ev.cells.length) app.particles.shards(ev.cells, app.cell, HIDDEN, COLORS);
        for (let r = 0; r < ev.rows.length; r++) {
          const y = sy(ev.rows[r] + 0.5);
          app.particles.spawn({
            type: "ring",
            x: sx(5),
            y: y,
            life: 0.28,
            max: 0.28,
            size: 4,
            color: "#fff",
            grow: 8,
          });
          for (let x = 0; x < 10; x++) {
            app.particles.spawn({
              type: "spark",
              x: sx(x + 0.5),
              y: y,
              vx: 0,
              vy: 0,
              life: 0.28,
              max: 0.28,
              size: app.cell * 0.18,
              color: "#fff",
              drag: 0,
              g: 0,
            });
          }
        }
        const gained = app.game.score - app.lastScore;
        if (gained > 0) app.particles.text(sx(5), sy(ev.rows[0]) - 8, "+" + gained, "#fff");
      }
      if (ev.type === "levelUp") {
        app.audio.level();
        banner("LEVEL " + ev.level, "level");
        app.flash = 0.4;
        app.flashColor = "#35e7f2";
      }
      if (ev.type === "stackDrop") {
        app.dropMap = ev.dropFrom;
        app.stackSlide = 1;
      }
      if (ev.type === "gameOver") {
        app.audio.started = false;
        app.audio.over();
        endGame(false);
      }
      if (ev.type === "victory") {
        app.audio.started = false;
        app.audio.win();
        app.particles.stars(sx(5), sy(HIDDEN + 10), 80);
        endGame(true);
      }
    }
    app.lastScore = app.game.score;
  }

  function endGame(win) {
    const g = app.game;
    const scores = loadScores();
    const rec = {
      score: g.score,
      lines: g.lines,
      level: g.level,
      time: g.time,
      date: Date.now(),
      win: win,
    };
    if (g.mode === "marathon") {
      scores.marathon.unshift(rec);
      scores.marathon = scores.marathon.slice(0, 8);
    } else if (g.mode === "sprint") {
      if (win) {
        scores.sprint.unshift(rec);
        scores.sprint.sort(function (a, b) {
          return a.time - b.time;
        });
        scores.sprint = scores.sprint.slice(0, 8);
      }
    } else {
      if (win || g.mode === "ultra") {
        scores.ultra.unshift(rec);
        scores.ultra.sort(function (a, b) {
          return b.score - a.score;
        });
        scores.ultra = scores.ultra.slice(0, 8);
      }
    }
    saveScores(scores);
    $("end-kicker").textContent = win ? "CLEAR" : "TOP OUT";
    $("end-title").textContent = win
      ? g.mode === "sprint"
        ? formatTime(g.time)
        : "You made it"
      : "Game over";
    $("end-stats").innerHTML =
      "<div>Score <strong>" +
      g.score.toLocaleString() +
      "</strong></div><div>Lines <strong>" +
      g.lines +
      "</strong></div><div>Level <strong>" +
      g.level +
      "</strong></div><div>Time <strong>" +
      formatTime(g.time) +
      "</strong></div><div>Tetrises <strong>" +
      g.stats.tetrises +
      "</strong></div><div>T-Spins <strong>" +
      g.stats.tspins +
      "</strong></div><div>Max combo <strong>" +
      g.stats.maxCombo +
      "</strong></div><div>Pieces <strong>" +
      g.stats.pieces +
      "</strong></div>";
    openModal("end");
  }

  function renderScores() {
    const s = loadScores();
    function list(arr, fmt) {
      if (!arr.length) return "<p>No records yet.</p>";
      return arr
        .map(function (r, i) {
          return "<p>" + (i + 1) + ". " + fmt(r) + "</p>";
        })
        .join("");
    }
    $("scoreboard").innerHTML =
      "<h3>Marathon</h3>" +
      list(s.marathon, function (r) {
        return r.score.toLocaleString() + " pts · L" + r.level;
      }) +
      "<h3>Sprint</h3>" +
      list(s.sprint, function (r) {
        return formatTime(r.time);
      }) +
      "<h3>Ultra</h3>" +
      list(s.ultra, function (r) {
        return r.score.toLocaleString() + " pts";
      });
  }

  function updateHud() {
    const g = app.game;
    $("stat-score").textContent = g.score.toLocaleString();
    $("stat-level").textContent = g.mode === "marathon" ? g.level : "—";
    $("stat-lines").textContent = g.lines;
    if (g.mode === "ultra") $("stat-time").textContent = formatClock(g.remainingTime());
    else $("stat-time").textContent = formatClock(g.time);
    if (g.mode === "marathon") {
      $("stat-goal-wrap").style.display = "";
      $("stat-goal").textContent = Math.max(0, g.goal);
      const pct = g.goalMax ? (1 - g.goal / g.goalMax) * 100 : 0;
      $("goal-fill").style.width = clamp(pct, 0, 100) + "%";
    } else {
      $("stat-goal-wrap").style.display = "none";
      $("goal-fill").style.width = g.mode === "sprint" ? clamp((g.lines / 40) * 100, 0, 100) + "%" : "100%";
    }
    const color = g.current ? COLORS[g.current.type] : "#35e7f2";
    $("well-ring").style.boxShadow =
      "inset 0 0 40px " + withAlpha(color, 0.12 + app.wellPulse * 0.25) + ", 0 0 " + (30 + app.wellPulse * 40) + "px " + withAlpha(color, 0.18);
  }

  function drawPreviewStack(canvas, types, dim) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    ctx.clearRect(0, 0, w, h);
    const size = Math.min(24, Math.floor(w / 4.2));
    const slot = types.length > 1 ? h / Math.max(types.length, 1) : h;
    for (let i = 0; i < types.length; i++) {
      const type = types[i];
      if (!type) continue;
      const shape = E.SHAPES[type][0];
      let minX = 9,
        minY = 9,
        maxX = 0,
        maxY = 0;
      for (let k = 0; k < shape.length; k++) {
        minX = Math.min(minX, shape[k][0]);
        minY = Math.min(minY, shape[k][1]);
        maxX = Math.max(maxX, shape[k][0]);
        maxY = Math.max(maxY, shape[k][1]);
      }
      const bw = maxX - minX + 1;
      const bh = maxY - minY + 1;
      const ox = (w - bw * size) / 2 - minX * size;
      const oy =
        i * slot +
        (slot - bh * size) / 2 -
        minY * size +
        (i === 0 ? app.nextSlide * -14 : 0);
      ctx.save();
      let alpha = dim ? 0.35 : i === 0 ? 1 : 0.82;
      if (i === 0 && app.holdFlash) alpha = 0.35 + 0.65 * (1 - app.holdFlash);
      ctx.globalAlpha = alpha;
      for (let k = 0; k < shape.length; k++) {
        app.atlas.draw(ctx, type, ox + shape[k][0] * size, oy + shape[k][1] * size, size, alpha);
      }
      ctx.restore();
    }
  }

  function drawBoard(dt) {
    const ctx = app.ctx;
    const g = app.game;
    const cell = app.cell;
    const w = COLS * cell;
    const h = VISIBLE * cell;
    ctx.clearRect(0, 0, w, h);

    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, "#0b1024");
    bg.addColorStop(1, "#070814");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = "rgba(140,160,220,0.07)";
    ctx.lineWidth = 1;
    for (let x = 1; x < COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * cell + 0.5, 0);
      ctx.lineTo(x * cell + 0.5, h);
      ctx.stroke();
    }
    for (let y = 1; y < VISIBLE; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * cell + 0.5);
      ctx.lineTo(w, y * cell + 0.5);
      ctx.stroke();
    }

    const clearing = {};
    for (let i = 0; i < g.clearingRows.length; i++) clearing[g.clearingRows[i]] = true;
    const clearPulse = g.state === "clearing" ? 0.5 + 0.5 * Math.sin(g.clearTimer * 0.04) : 0;

    for (let y = HIDDEN; y < E.ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const block = g.board[y][x];
        if (!block) continue;
        if (clearing[y]) {
          ctx.globalCompositeOperation = "lighter";
          ctx.fillStyle = withAlpha("#ffffff", 0.35 + clearPulse * 0.5);
          ctx.fillRect(sx(x), sy(y), cell, cell);
          ctx.globalCompositeOperation = "source-over";
          continue;
        }
        let dy = 0;
        if (app.stackSlide > 0 && app.dropMap) {
          const dist = app.dropMap[y] || 0;
          dy = -dist * cell * easeOutCubic(app.stackSlide);
        }
        let squash = 1;
        for (let k = 0; k < app.landed.length; k++) {
          const L = app.landed[k];
          if (L.cell.x === x && L.cell.y === y) {
            const t = clamp(L.age / L.dur, 0, 1);
            squash = 1 - 0.22 * Math.sin(t * Math.PI);
            dy += Math.sin(t * Math.PI) * 3;
          }
        }
        ctx.save();
        ctx.translate(sx(x) + cell / 2, sy(y) + cell / 2 + dy);
        ctx.scale(2 - squash, squash);
        ctx.translate(-cell / 2, -cell / 2);
        app.atlas.draw(ctx, block.type, 0, 0, cell, 1);
        ctx.restore();
      }
    }

    if (g.current && app.settings.ghost && g.state === "playing") {
      const ghost = g.ghost();
      ctx.save();
      for (let i = 0; i < ghost.length; i++) {
        const c = ghost[i];
        if (c.y < HIDDEN) continue;
        ctx.strokeStyle = withAlpha(COLORS[c.type], 0.55);
        ctx.lineWidth = 2;
        roundRect(ctx, sx(c.x) + 3, sy(c.y) + 3, cell - 6, cell - 6, 5);
        ctx.stroke();
        ctx.fillStyle = withAlpha(COLORS[c.type], 0.08);
        ctx.fill();
      }
      ctx.restore();
    }

    for (let i = 0; i < app.trails.length; i++) {
      const tr = app.trails[i];
      const a = (1 - tr.age / tr.dur) * (tr.alpha || 0.2);
      for (let k = 0; k < tr.cells.length; k++) {
        const c = tr.cells[k];
        if (c.y < HIDDEN) continue;
        app.atlas.draw(ctx, c.type, sx(c.x), sy(c.y), cell, a);
      }
    }

    for (let i = 0; i < app.piecePath.length; i++) {
      const snap = app.piecePath[i];
      const a = (i / app.piecePath.length) * 0.18;
      ctx.save();
      ctx.globalAlpha = a;
      for (let k = 0; k < snap.length; k++) {
        const c = snap[k];
        ctx.fillStyle = COLORS[c.type];
        roundRect(ctx, sx(c.x) + 8, sy(c.y) + 8, cell - 16, cell - 16, 4);
        ctx.fill();
      }
      ctx.restore();
    }

    if (g.current) {
      drawActive(ctx, g.current, cell);
    }

    if (g.state === "clearing") {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const pulse = 0.35 + 0.65 * Math.abs(Math.sin((500 - g.clearTimer) * 0.02));
      for (let i = 0; i < g.clearingRows.length; i++) {
        const y = sy(g.clearingRows[i]);
        const grad = ctx.createLinearGradient(0, y, w, y);
        grad.addColorStop(0, "rgba(53,231,242,0)");
        grad.addColorStop(0.5, "rgba(255,255,255," + (0.85 * pulse) + ")");
        grad.addColorStop(1, "rgba(255,138,42,0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, y + cell * 0.32, w, cell * 0.36);
        ctx.fillStyle = "rgba(255,255,255," + 0.12 * pulse + ")";
        ctx.fillRect(0, y, w, cell);
      }
      ctx.restore();
    }

    if (app.flash > 0) {
      ctx.fillStyle = withAlpha(app.flashColor, app.flash * 0.28);
      ctx.fillRect(0, 0, w, h);
    }

    app.particles.draw(ctx);
  }

  function drawActive(ctx, piece, cell) {
    const cells = E.cellsOf(piece);
    const origin = (app.spin && app.spin.origin) || E.srsOrigin(piece);
    let angle = 0;
    let kx = 0;
    let ky = 0;
    let scale = 1;
    if (app.spin) {
      const t = clamp(app.spin.age / app.spin.dur, 0, 1);
      const e = easeOutBack(t);
      angle = app.spin.dir * (Math.PI / 2) * (e - 1);
      kx = -app.spin.kick.x * (1 - e) * cell;
      ky = -app.spin.kick.y * (1 - e) * cell;
      scale = 1 + 0.12 * Math.sin(t * Math.PI);
      const ghostAngles = [0.35, 0.6, 0.82];
      for (let i = 0; i < ghostAngles.length; i++) {
        const ga = app.spin.dir * (Math.PI / 2) * (ghostAngles[i] * easeOutBack(t) - 1);
        ctx.save();
        ctx.translate(sx(origin.x) + kx, sy(origin.y) + ky);
        ctx.rotate(ga);
        ctx.globalAlpha = 0.18 * (1 - t);
        ctx.fillStyle = COLORS[piece.type];
        for (let k = 0; k < cells.length; k++) {
          const c = cells[k];
          ctx.fillRect(sx(c.x) - sx(origin.x) + 6, sy(c.y) - sy(origin.y) + 6, cell - 12, cell - 12);
        }
        ctx.restore();
      }
    }
    if (app.slam && app.slam.age < app.slam.dur) {
      const t = app.slam.age / app.slam.dur;
      scale *= 1 + 0.18 * Math.sin(t * Math.PI);
    }
    ctx.save();
    ctx.translate(sx(origin.x) + kx, sy(origin.y) + ky);
    ctx.rotate(angle);
    ctx.scale(scale, 2 - scale);
    ctx.translate(-sx(origin.x), -sy(origin.y));
    ctx.shadowColor = COLORS[piece.type];
    ctx.shadowBlur = 18;
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i];
      app.atlas.draw(ctx, piece.type, sx(c.x), sy(c.y), cell, 1);
    }
    ctx.restore();
  }

  function tick(ts) {
    const dt = Math.min(50, ts - (app.last || ts));
    app.last = ts;
    const dts = dt / 1000;

    if (app.sky) {
      const col = app.game.current ? COLORS[app.game.current.type] : null;
      app.sky.update(dts, !$("play").classList.contains("hidden"), col);
      app.sky.draw(!$("menu").classList.contains("hidden") ? false : true);
    }

    if (app.running && app.game.state !== "paused") {
      if (app.intro > 0) {
        app.intro -= dts;
        if (app.intro <= 0.45 && $("ready-go").querySelector("span").textContent === "READY") {
          actuallyStart();
        }
      }
      if (!app.frozen && (app.game.state === "playing" || app.game.state === "clearing")) {
        app.game.update(dt);
        handleEvents(app.game.drainEvents());
      }
    }

    if (app.spin) {
      app.spin.age += dts;
      if (app.spin.age >= app.spin.dur) app.spin = null;
    }
    if (app.slam) {
      app.slam.age += dts;
      if (app.slam.age >= app.slam.dur) app.slam = null;
    }
    app.shake *= Math.pow(0.04, dts);
    app.zoom *= Math.pow(0.02, dts);
    app.flash = Math.max(0, app.flash - dts * 2.2);
    app.wellPulse = Math.max(0, app.wellPulse - dts * 3);
    app.nextSlide = Math.max(0, app.nextSlide - dts * 4);
    app.holdFlash = Math.max(0, app.holdFlash - dts * 3);
    app.stackSlide = Math.max(0, app.stackSlide - dts * 5);
    for (let i = app.trails.length - 1; i >= 0; i--) {
      app.trails[i].age += dts;
      if (app.trails[i].age >= app.trails[i].dur) app.trails.splice(i, 1);
    }
    for (let i = app.landed.length - 1; i >= 0; i--) {
      app.landed[i].age += dts;
      if (app.landed[i].age >= app.landed[i].dur) app.landed.splice(i, 1);
    }

    if (app.game.current && app.game.state === "playing") {
      app.piecePath.push(E.cellsOf(app.game.current));
      if (app.piecePath.length > 7) app.piecePath.shift();
    } else app.piecePath = [];

    app.particles.update(dts);
    if (app.audio.started) app.audio.tickMusic();

    if (!$("play").classList.contains("hidden") && app.ctx) {
      const sh = app.settings.shake ? app.shake : 0;
      const ox = (Math.random() * 2 - 1) * sh * 10;
      const oy = (Math.random() * 2 - 1) * sh * 10;
      $("well-frame").style.transform = "translate(" + ox + "px," + oy + "px) scale(" + (1 + app.zoom) + ")";
      drawBoard(dts);
      updateHud();
      drawPreviewStack($("next"), app.game.nextPieces(5), false);
      drawPreviewStack($("hold"), [app.game.hold], app.game.holdUsed);
    }

    requestAnimationFrame(tick);
  }

  function bind() {
    app.sky = new Sky($("sky"));
    layout();
    window.addEventListener("resize", layout);

    document.querySelectorAll(".mode-card").forEach(function (btn) {
      btn.addEventListener("click", function () {
        startMode(btn.getAttribute("data-mode"));
      });
    });
    $("btn-how").onclick = function () {
      openModal("how");
    };
    $("btn-scores").onclick = function () {
      openModal("scores");
    };
    $("btn-settings").onclick = function () {
      openModal("settings");
    };
    document.querySelectorAll("[data-close]").forEach(function (b) {
      b.onclick = closeModal;
    });
    $("btn-resume").onclick = function () {
      app.game.resume();
      closeModal();
    };
    $("btn-quit").onclick = quitToMenu;
    $("btn-menu").onclick = quitToMenu;
    $("btn-retry").onclick = function () {
      closeModal();
      startMode(app.mode);
    };

    ["set-das", "set-arr", "set-music", "set-sfx"].forEach(function (id) {
      $(id).addEventListener("input", function () {
        app.settings.das = Number($("set-das").value);
        app.settings.arr = Number($("set-arr").value);
        app.settings.music = Number($("set-music").value);
        app.settings.sfx = Number($("set-sfx").value);
        $("das-val").textContent = app.settings.das + "ms";
        $("arr-val").textContent = app.settings.arr + "ms";
        applySettings();
      });
    });
    $("set-shake").onchange = function () {
      app.settings.shake = $("set-shake").checked;
      applySettings();
    };
    $("set-ghost").onchange = function () {
      app.settings.ghost = $("set-ghost").checked;
      applySettings();
    };

    window.addEventListener("keydown", function (e) {
      app.audio.unlock();
      if (e.code === "Enter" && !$("menu").classList.contains("hidden")) {
        startMode("marathon");
        return;
      }
      if (e.code === "KeyM") {
        app.settings.music = app.settings.music ? 0 : 55;
        applySettings();
      }
      const act = KEYMAP[e.code];
      if (!act) return;
      if (e.repeat) return;
      e.preventDefault();
      if (act === "pause") {
        if (app.game.state === "playing" || app.game.state === "clearing") {
          app.game.pause();
          openModal("pause");
        } else if (app.game.state === "paused") {
          app.game.resume();
          closeModal();
        }
        return;
      }
      if ($("overlay").classList.contains("hidden") === false && $("modal-end").classList.contains("hidden") === false) return;
      app.held = app.held || {};
      app.held[act] = true;
      if (app.frozen) return;
      app.game.keyDown(act);
    });
    window.addEventListener("keyup", function (e) {
      const act = KEYMAP[e.code];
      if (!act) return;
      if (app.held) app.held[act] = false;
      app.game.keyUp(act);
    });

    $("touch").addEventListener("pointerdown", function (e) {
      const btn = e.target.closest("button");
      if (!btn) return;
      e.preventDefault();
      app.audio.unlock();
      const act = btn.getAttribute("data-act");
      btn._act = act;
      app.game.keyDown(act);
    });
    window.addEventListener("pointerup", function (e) {
      const btn = e.target.closest && e.target.closest("#touch button");
      const act = btn && btn.getAttribute("data-act");
      if (act === "left" || act === "right" || act === "down") app.game.keyUp(act);
    });

    document.addEventListener("visibilitychange", function () {
      if (document.hidden && (app.game.state === "playing" || app.game.state === "clearing")) {
        app.game.pause();
        openModal("pause");
      }
    });

    applySettings();
    const bootMode = new URLSearchParams(location.search).get("mode");
    if (bootMode === "marathon" || bootMode === "sprint" || bootMode === "ultra") {
      startMode(bootMode);
    }
    requestAnimationFrame(tick);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
  else bind();
})();
