/* SUPER JAIBA BRAVA - El camino a ser campeon
 * Plataformas 8 bits en HTML5 Canvas puro (sin librerias). */
(function () {
'use strict';

var W = 768, H = 432, T = 32, ROWS = 14;
var canvas = document.getElementById('game');
var ctx = canvas.getContext('2d');
(function () {
  var raw = ctx.drawImage;
  ctx.drawImage = function (im) {
    if (im && im.tagName === 'IMG' && !(im.complete && im.naturalWidth)) return;
    return raw.apply(ctx, arguments);
  };
})();
var FONT = '"Press Start 2P", "Courier New", monospace';

// ---------------------------------------------------------------- escalado
function resize() {
  var s = Math.min(window.innerWidth / W, window.innerHeight / H);
  if (s >= 1) s = Math.floor(s * 4) / 4;
  canvas.style.width = Math.floor(W * s) + 'px';
  canvas.style.height = Math.floor(H * s) + 'px';
  ctx.imageSmoothingEnabled = false;
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', function () { setTimeout(resize, 200); });
resize();

// ---------------------------------------------------------------- assets
var SRC = window.ASSETS || {
  coco: 'assets/coco.png', pirata: 'assets/pirata.png',
  logoV: 'assets/logo_victoria.png', logoP: 'assets/logo_pirata.png',
  bg_playa: 'assets/bg_playa.png', bg_selva: 'assets/bg_selva.png',
  bg_nacaome: 'assets/bg_nacaome.png', mapa: 'assets/mapa.png',
  // vistas de la jaiba: jc = chica (sin balon), jg = grande (con balon)
  // 0 frente, 1 frente, 2 lateral derecha, 3-5 espalda, 6 lateral izquierda, 7 frente
  jc_0: 'assets/jc_0.png', jc_1: 'assets/jc_1.png', jc_2: 'assets/jc_2.png', jc_3: 'assets/jc_3.png',
  jc_4: 'assets/jc_4.png', jc_5: 'assets/jc_5.png', jc_6: 'assets/jc_6.png', jc_7: 'assets/jc_7.png',
  jg_0: 'assets/jg_0.png', jg_1: 'assets/jg_1.png', jg_2: 'assets/jg_2.png', jg_3: 'assets/jg_3.png',
  jg_4: 'assets/jg_4.png', jg_5: 'assets/jg_5.png', jg_6: 'assets/jg_6.png', jg_7: 'assets/jg_7.png'
};
var VIEW = { frente: 0, frente2: 7, derecha: 2, izquierda: 6, espalda: 3 };
function jaibaImg(big, view) { return IMG[(big ? 'jg_' : 'jc_') + VIEW[view]]; }
// dibuja la jaiba con su tamano real, centrada en cx y con los pies en 'bottom'
function drawJaiba(big, view, cx, bottom, scale, rot, sy) {
  var im = jaibaImg(big, view);
  if (!im || !im.width) return;
  scale = scale || 1; sy = sy || 1;
  var w = im.width * scale, h = im.height * scale * sy;
  sprite(im, cx - w / 2, bottom - h, w, h, false, rot || 0);
}
var ASSET_V = 3; // subir este numero cuando cambien las imagenes, para saltar la cache
var IMG = {};
function loadAssets(done) {
  var keys = Object.keys(SRC), left = keys.length;
  keys.forEach(function (k) {
    var im = new Image(), tries = 0;
    im.onload = function () { if (--left === 0) done(); };
    im.onerror = function () {
      if (++tries < 4) setTimeout(function () { im.src = SRC[k] + (SRC[k].indexOf('data:') === 0 ? '' : '?r=' + tries); }, 300 * tries);
      else if (--left === 0) done();
    };
    im.src = SRC[k] + (SRC[k].indexOf('data:') === 0 ? '' : '?v=' + ASSET_V);
    IMG[k] = im;
  });
}

// ---------------------------------------------------------------- utilidades
function rnd(a, b) { return a + Math.random() * (b - a); }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function R(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); }
function mkCanvas(w, h) {
  var c = document.createElement('canvas'); c.width = w; c.height = h;
  var g = c.getContext('2d'); g.imageSmoothingEnabled = false; return [c, g];
}
function seeded(s) { return function () { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
function overlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
// disco pixelado (sin antialias)
function disc(g, cx, cy, r, color, u) {
  u = u || 2; g.fillStyle = color;
  for (var y = -r; y < r; y += u) for (var x = -r; x < r; x += u) {
    var dx = x + u / 2, dy = y + u / 2;
    if (dx * dx + dy * dy <= r * r) g.fillRect(Math.round(cx + x), Math.round(cy + y), u, u);
  }
}
function pattern(g, x, y, rows, pal, u) {
  for (var j = 0; j < rows.length; j++) for (var i = 0; i < rows[j].length; i++) {
    var c = pal[rows[j][i]]; if (c) R(g, x + i * u, y + j * u, u, u, c);
  }
}

// la fuente pixel no trae mayusculas acentuadas: se quitan los acentos (se conserva la Ñ)
function clean(s) { return s.normalize ? s.normalize('NFD').replace(/́/g, '').normalize('NFC') : s; }
function text(s, x, y, size, color, align, shadow) {
  size = size || 16; s = clean(s);
  ctx.font = size + 'px ' + FONT;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'top';
  if (shadow !== false) {
    var o = Math.max(2, Math.round(size / 8));
    ctx.fillStyle = shadow || '#000'; ctx.fillText(s, x + o, y + o);
  }
  ctx.fillStyle = color || '#fff'; ctx.fillText(s, x, y);
}
function outlined(s, x, y, size, fill, stroke, t, align) {
  s = clean(s);
  ctx.font = size + 'px ' + FONT; ctx.textAlign = align || 'center'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#000';
  for (var dy = -t; dy <= t + 3; dy += 1) for (var dx = -t; dx <= t + 3; dx += 1) ctx.fillText(s, x + dx, y + dy);
  ctx.fillStyle = stroke;
  for (dy = -t; dy <= t; dy += 1) for (dx = -t; dx <= t; dx += 1) ctx.fillText(s, x + dx, y + dy);
  ctx.fillStyle = fill; ctx.fillText(s, x, y);
}
function sprite(img, x, y, w, h, flip, rot, alpha) {
  if (!img || !img.width) return;
  ctx.save();
  if (alpha !== undefined) ctx.globalAlpha = alpha;
  ctx.translate(Math.round(x + w / 2), Math.round(y + h / 2));
  if (rot) ctx.rotate(rot);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

// ---------------------------------------------------------------- entrada
var keys = {}, pressed = {};
var GAME_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Enter', 'KeyZ', 'KeyX', 'KeyA', 'KeyD', 'KeyW', 'KeyS', 'ShiftLeft', 'ShiftRight', 'KeyP', 'Escape', 'KeyM'];
function keyCode(e) {
  if (e.code) return e.code;
  var m = { 37: 'ArrowLeft', 38: 'ArrowUp', 39: 'ArrowRight', 40: 'ArrowDown', 32: 'Space', 13: 'Enter', 90: 'KeyZ', 88: 'KeyX', 65: 'KeyA', 68: 'KeyD', 87: 'KeyW', 83: 'KeyS', 16: 'ShiftLeft', 80: 'KeyP', 27: 'Escape', 77: 'KeyM' };
  return m[e.keyCode] || '';
}
window.addEventListener('keydown', function (e) {
  var c = keyCode(e);
  if (!keys[c]) pressed[c] = true;
  keys[c] = true;
  if (GAME_KEYS.indexOf(c) >= 0) e.preventDefault();
  audio.unlock();
});
window.addEventListener('keyup', function (e) { keys[keyCode(e)] = false; });
window.addEventListener('blur', function () { keys = {}; });

var K = {
  left: function () { return keys.ArrowLeft || keys.KeyA; },
  right: function () { return keys.ArrowRight || keys.KeyD; },
  jump: function () { return keys.Space || keys.KeyZ || keys.ArrowUp || keys.KeyW; },
  run: function () { return keys.ShiftLeft || keys.ShiftRight || keys.KeyX; },
  jumpP: function () { return pressed.Space || pressed.KeyZ || pressed.ArrowUp || pressed.KeyW; },
  okP: function () { return pressed.Enter || pressed.Space || pressed.KeyZ; },
  upP: function () { return pressed.ArrowUp || pressed.KeyW; },
  downP: function () { return pressed.ArrowDown || pressed.KeyS; }
};

// controles tactiles
(function () {
  var isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  var box = document.getElementById('touch');
  if (!isTouch || !box) return;
  box.className = 'on';
  var btns = box.querySelectorAll('.tb');
  function set(el, on) {
    var k = el.getAttribute('data-k');
    if (on && !keys[k]) pressed[k] = true;
    keys[k] = on; el.className = on ? 'tb down' : 'tb';
    if (k === 'KeyX') keys.KeyX = on;
  }
  function handle(e) {
    e.preventDefault(); audio.unlock();
    var active = {};
    for (var i = 0; i < e.touches.length; i++) {
      var t = e.touches[i], el = document.elementFromPoint(t.clientX, t.clientY);
      if (el && el.getAttribute && el.getAttribute('data-k')) active[el.id] = el;
    }
    for (var j = 0; j < btns.length; j++) set(btns[j], !!active[btns[j].id]);
  }
  ['touchstart', 'touchmove', 'touchend', 'touchcancel'].forEach(function (ev) {
    box.addEventListener(ev, handle, { passive: false });
  });
  canvas.addEventListener('touchstart', function (e) {
    e.preventDefault(); audio.unlock();
    if (G.state !== 'play') pressed.Enter = true;
  }, { passive: false });
})();
canvas.addEventListener('mousedown', function () { audio.unlock(); });

// ---------------------------------------------------------------- audio (chiptune propio)
var NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
function freq(n) {
  var m = /^([A-G]#?)(\d)$/.exec(n);
  var midi = (+m[2] + 1) * 12 + NOTE[m[1]];
  return 440 * Math.pow(2, (midi - 69) / 12);
}
function parseTrack(str) {
  var ev = [], t = 0;
  str.trim().split(/\s+/).forEach(function (tok) {
    var p = tok.split(':'), d = +p[1] || 1;
    if (p[0] === 'x') ev.push({ t: t, noise: true, d: d });
    else if (p[0] !== 'R') ev.push({ t: t, f: freq(p[0]), d: d });
    t += d;
  });
  return { ev: ev, len: t };
}
var SONGS = {
  over: { bpm: 140, tracks: [
    { w: 'square', v: 0.07, s: 'C5:2 E5:1 G5:1 A5:2 G5:2 E5:1 G5:1 C6:2 B5:1 A5:1 G5:2 F5:2 A5:1 F5:1 E5:2 C5:2 D5:1 E5:1 F5:1 D5:1 G5:4 ' +
      'C5:2 E5:1 G5:1 A5:2 G5:2 E5:1 G5:1 C6:2 D6:1 C6:1 A5:2 G5:2 E5:1 C5:1 D5:2 G4:2 C5:6 R:2' },
    { w: 'triangle', v: 0.2, s: 'C3:2 G3:2 C3:2 G3:2 A2:2 E3:2 A2:2 E3:2 F2:2 C3:2 F2:2 C3:2 G2:2 D3:2 G2:2 D3:2 ' +
      'C3:2 G3:2 C3:2 G3:2 A2:2 E3:2 A2:2 E3:2 G2:2 D3:2 G2:2 D3:2 C3:2 G3:2 C3:4' },
    { w: 'noise', v: 0.03, s: 'R:1 x:1 R:1 x:1 R:1 x:1 R:1 x:1 R:1 x:1 R:1 x:1 R:1 x:1 R:1 x:1 R:1 x:1 R:1 x:1 R:1 x:1 R:1 x:1 R:1 x:1 R:1 x:1 R:1 x:1 R:1 x:1 ' +
      'R:1 x:1 R:1 x:1 R:1 x:1 R:1 x:1 R:1 x:1 R:1 x:1 R:1 x:1 R:1 x:1 R:1 x:1 R:1 x:1 R:1 x:1 R:1 x:1 R:1 x:1 R:1 x:1 R:1 x:1 R:1 x:1' }
  ] },
  selva: { bpm: 150, tracks: [
    { w: 'square', v: 0.07, s: 'A4:1 C5:1 E5:1 A5:1 G5:2 E5:2 D5:1 E5:1 G5:2 E5:2 D5:2 C5:1 D5:1 E5:2 A4:2 C5:2 B4:2 G4:2 A4:4 ' +
      'A4:1 C5:1 E5:1 A5:1 G5:2 E5:2 D5:1 E5:1 G5:2 A5:2 B5:2 C6:1 B5:1 A5:2 E5:2 G5:2 E5:4 R:4' },
    { w: 'triangle', v: 0.2, s: 'A2:2 E3:2 A2:2 E3:2 F2:2 C3:2 F2:2 C3:2 C3:2 G3:2 C3:2 G3:2 E2:2 B2:2 E2:2 B2:2 ' +
      'A2:2 E3:2 A2:2 E3:2 F2:2 C3:2 G2:2 D3:2 A2:2 E3:2 A2:2 E3:2 E2:2 B2:2 E2:4' },
    { w: 'noise', v: 0.035, s: 'x:1 R:1 x:1 x:1 R:1 x:1 x:1 R:1 x:1 R:1 x:1 x:1 R:1 x:1 x:1 R:1 x:1 R:1 x:1 x:1 R:1 x:1 x:1 R:1 x:1 R:1 x:1 x:1 R:1 x:1 x:1 R:1' }
  ] },
  jefe: { bpm: 172, tracks: [
    { w: 'square', v: 0.07, s: 'A4:1 A4:1 C5:1 A4:1 D#5:1 D5:1 C5:1 A4:1 A4:1 A4:1 C5:1 A4:1 E5:2 D5:2 F5:1 E5:1 D#5:1 D5:1 C5:1 B4:1 A4:1 G#4:1 A4:4 E4:4' },
    { w: 'sawtooth', v: 0.06, s: 'A2:1 A3:1 A2:1 A3:1 A2:1 A3:1 A2:1 A3:1 A2:1 A3:1 A2:1 A3:1 A2:1 A3:1 A2:1 A3:1 F2:1 F3:1 F2:1 F3:1 F2:1 F3:1 F2:1 F3:1 E2:1 E3:1 E2:1 E3:1 E2:1 E3:1 E2:1 E3:1' },
    { w: 'noise', v: 0.04, s: 'x:1 R:1 x:1 R:1 x:1 R:1 x:1 x:1 x:1 R:1 x:1 R:1 x:1 R:1 x:1 x:1 x:1 R:1 x:1 R:1 x:1 R:1 x:1 x:1 x:1 R:1 x:1 R:1 x:1 x:1 x:1 x:1' }
  ] },
  victoria: { bpm: 132, tracks: [
    { w: 'square', v: 0.08, s: 'C5:1 E5:1 G5:1 C6:3 A5:1 B5:1 C6:2 G5:2 E5:2 G5:2 F5:1 A5:1 C6:2 B5:1 A5:1 G5:2 F5:1 E5:1 D5:2 G5:2 C6:6 R:2' },
    { w: 'triangle', v: 0.2, s: 'C3:2 G3:2 C3:2 G3:2 C3:2 G3:2 C3:2 E3:2 F2:2 C3:2 F2:2 C3:2 G2:2 D3:2 G2:2 B2:2 C3:2 G3:2 C3:4' }
  ] },
  gol: { bpm: 160, once: true, tracks: [
    { w: 'square', v: 0.09, s: 'G4:1 C5:1 E5:1 G5:1 C6:1 E6:1 G6:3 E6:3 G#4:1 C5:1 D#5:1 G#5:1 C6:1 D#6:1 G#6:3 D#6:3 A#4:1 D5:1 F5:1 A#5:1 D6:1 F6:1 A#6:3 A#6:1 A#6:1 A#6:1 C7:6' },
    { w: 'triangle', v: 0.2, s: 'C3:6 G3:6 G#2:6 D#3:6 A#2:6 F3:3 F3:1 F3:1 F3:1 C3:6' }
  ] }
};

var audio = {
  ac: null, master: null, muted: false, timer: null, mGain: null, cur: null, want: null,
  unlock: function () {
    if (this.ac) { if (this.ac.state === 'suspended') this.ac.resume(); return; }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { this.ac = new AC(); } catch (e) { return; }
    this.master = this.ac.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(this.ac.destination);
    var len = this.ac.sampleRate;
    this.noiseBuf = this.ac.createBuffer(1, len, this.ac.sampleRate);
    var d = this.noiseBuf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    if (this.want) { var w = this.want; this.want = null; this.play(w); }
  },
  toggleMute: function () {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
  },
  tone: function (f, dur, type, vol, when, slide, dest) {
    if (!this.ac) return;
    var ac = this.ac, t = when || ac.currentTime;
    var o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.setValueAtTime(vol, t + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || this.master);
    o.start(t); o.stop(t + dur + 0.03);
  },
  noise: function (dur, vol, when, dest, hp) {
    if (!this.ac) return;
    var ac = this.ac, t = when || ac.currentTime;
    var s = ac.createBufferSource(), g = ac.createGain(), f = ac.createBiquadFilter();
    s.buffer = this.noiseBuf; f.type = 'highpass'; f.frequency.value = hp || 1000;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest || this.master);
    s.start(t); s.stop(t + dur + 0.02);
  },
  seq: function (notes, step, type, vol) {
    if (!this.ac) return;
    var t = this.ac.currentTime, self = this;
    notes.forEach(function (n, i) { if (n) self.tone(freq(n), step * 1.1, type || 'square', vol || 0.12, t + i * step); });
  },
  sfx: function (n) {
    if (!this.ac) return;
    switch (n) {
      case 'jump': this.tone(240, 0.16, 'square', 0.1, 0, 640); break;
      case 'coin': this.seq(['B5', 'E6', 'E6', 'E6'], 0.06, 'square', 0.1); break;
      case 'stomp': this.tone(500, 0.1, 'square', 0.14, 0, 120); this.noise(0.08, 0.1, 0, null, 600); break;
      case 'bump': this.tone(140, 0.09, 'triangle', 0.3); break;
      case 'break': this.noise(0.3, 0.25, 0, null, 300); this.tone(90, 0.15, 'square', 0.1, 0, 40); break;
      case 'appear': this.tone(260, 0.35, 'square', 0.1, 0, 780); break;
      case 'power': this.seq(['C5', 'G4', 'C5', 'E5', 'G5', 'C6', 'G5', 'E6', 'G6', 'C7'], 0.045, 'square', 0.1); break;
      case 'hurt': this.tone(700, 0.4, 'square', 0.12, 0, 120); break;
      case 'die': this.seq(['B4', 'F5', null, 'F5', 'F5', 'E5', 'D5', 'C5', 'E4', null, 'C4'], 0.11, 'square', 0.12); break;
      case 'oneup': this.seq(['E6', 'G6', 'E7', 'C7', 'D7', 'G7'], 0.08, 'square', 0.1); break;
      case 'kick': this.noise(0.12, 0.3, 0, null, 200); this.tone(160, 0.12, 'triangle', 0.4, 0, 60); break;
      case 'bosshit': this.noise(0.3, 0.3, 0, null, 200); this.tone(300, 0.3, 'sawtooth', 0.12, 0, 60); break;
      case 'thud': this.noise(0.25, 0.3, 0, null, 80); this.tone(70, 0.25, 'triangle', 0.4, 0, 35); break;
      case 'throw': this.noise(0.1, 0.12, 0, null, 3000); this.tone(900, 0.1, 'square', 0.05, 0, 300); break;
      case 'laugh':
        for (var i = 0; i < 4; i++) { this.tone(330 - i * 30, 0.1, 'sawtooth', 0.1, this.ac.currentTime + i * 0.16, 200 - i * 20); }
        break;
      case 'splash': this.noise(0.6, 0.3, 0, null, 500); break;
      case 'pause': this.seq(['E5', 'C5', 'E5', 'C5'], 0.07, 'square', 0.1); break;
      case 'select': this.tone(880, 0.06, 'square', 0.08); break;
      case 'tick': this.tone(1400, 0.03, 'square', 0.05); break;
      case 'hurry': this.seq(['E6', 'C6', 'E6', 'C6', 'E6', 'C6'], 0.08, 'square', 0.08); break;
      case 'over': this.seq(['C5', null, 'G4', null, 'E4', 'A4', 'B4', 'A4', 'G#4', 'A#4', 'G#4', 'G4', 'F4', 'G4'], 0.13, 'square', 0.1); break;
    }
  },
  play: function (name) {
    if (this.cur === name && this.timer) return;
    this.stop();
    if (!this.ac) { this.want = name; return; }
    this.cur = name;
    var song = SONGS[name], self = this;
    var g = this.ac.createGain(); g.connect(this.master); this.mGain = g;
    var spb = 60 / song.bpm / 2;
    var tracks = song.tracks.map(function (tr) { var p = parseTrack(tr.s); return { w: tr.w, v: tr.v, ev: p.ev, len: p.len }; });
    var len = Math.max.apply(null, tracks.map(function (t) { return t.len; })) * spb;
    var next = this.ac.currentTime + 0.08, played = false;
    function sched() {
      while (next < self.ac.currentTime + 1.2) {
        if (song.once && played) return;
        tracks.forEach(function (tr) {
          tr.ev.forEach(function (e) {
            if (e.noise) self.noise(e.d * spb * 0.4, tr.v, next + e.t * spb, g, 6000);
            else self.tone(e.f, e.d * spb * 0.92, tr.w, tr.v, next + e.t * spb, 0, g);
          });
        });
        next += len; played = true;
      }
    }
    sched();
    this.timer = setInterval(sched, 250);
  },
  stop: function () {
    if (this.timer) clearInterval(this.timer);
    this.timer = null; this.cur = null; this.want = null;
    if (this.mGain) { try { this.mGain.disconnect(); } catch (e) { } this.mGain = null; }
  }
};

// ---------------------------------------------------------------- tiles
var EMPTY = 0, GROUND = 1, BRICK = 2, QCOIN = 3, QPOW = 4, USED = 5, HARD = 6, PLANK = 7, SPIKE = 8, COIN = 10, BRIDGE = 11;
function isSolid(t) { return t === GROUND || t === BRICK || t === QCOIN || t === QPOW || t === USED || t === HARD || t === BRIDGE; }

var THEMES = {
  playa: { bg: 'bg_playa', style: 'sand', water: ['#139bd6', '#8ee9f7'], top: ['#f8dc9e', '#e7b866', '#c48a40'],
    dirt: ['#7a4220', '#5f3218', '#93582f'], rock: ['#6c6c7a', '#a5a5b5'], spike: ['#2c1e46', '#8a6ac0'], music: 'over' },
  selva: { bg: 'bg_selva', style: 'grass', water: ['#16b3aa', '#a2f4ea'], top: ['#8ee04a', '#4cb02c', '#2a7a1c'],
    dirt: ['#6a3a1c', '#542c14', '#84502a'], rock: ['#76766c', '#acac9c'], spike: ['#1e4410', '#7aaa2a'], music: 'selva' },
  nacaome: { bg: 'bg_nacaome', style: 'cobble', water: ['#2f86da', '#9fd2ff'], top: ['#f4cd84', '#dcab5c', '#9c6a2c'],
    dirt: ['#8c3e1e', '#70301a', '#b0613a'], rock: ['#b26a3c', '#d99060'], spike: ['#2e6a2a', '#7ac04a'], music: 'over' },
  jefe: { bg: 'bg_nacaome', style: 'stone', water: ['#1d4c8e', '#6aa0e6'], top: ['#a2a2b0', '#7c7c8c', '#4c4c5a'],
    dirt: ['#4a4a58', '#3a3a46', '#5c5c6a'], rock: ['#5c5c6a', '#8a8a9a'], spike: ['#3a1010', '#c04040'], music: 'jefe', dusk: true }
};

function genTiles(th) {
  var out = { top: [], fill: [] }, v, c, g, r, i, x, y;
  for (v = 0; v < 3; v++) {
    // relleno de tierra
    c = mkCanvas(T, T); g = c[1]; r = seeded(97 + v * 31);
    R(g, 0, 0, T, T, th.dirt[0]);
    for (i = 0; i < 10; i++) R(g, (r() * 8 | 0) * 4, (r() * 8 | 0) * 4, 4, 4, r() < 0.5 ? th.dirt[1] : th.dirt[2]);
    for (i = 0; i < 2; i++) {
      x = (r() * 6 | 0) * 4 + 2; y = (r() * 6 | 0) * 4 + 2;
      R(g, x, y, 8, 6, th.rock[0]); R(g, x + 2, y, 4, 2, th.rock[1]); R(g, x, y + 6, 8, 2, th.dirt[1]);
    }
    out.fill.push(c[0]);
    // superficie
    var cc = mkCanvas(T, T); g = cc[1]; g.drawImage(c[0], 0, 0); r = seeded(11 + v * 53);
    if (th.style === 'sand') {
      R(g, 0, 0, T, 20, th.top[1]); R(g, 0, 0, T, 4, th.top[0]);
      for (i = 0; i < 6; i++) R(g, (r() * 8 | 0) * 4, 4 + (r() * 4 | 0) * 4, 4, 2, th.top[2]);
      for (x = 0; x < T; x += 4) { var h = 20 + (r() * 3 | 0) * 4; R(g, x, 20, 4, h - 20, th.top[1]); R(g, x, h, 4, 4, th.top[2]); }
    } else if (th.style === 'grass') {
      R(g, 0, 0, T, 10, th.top[1]); R(g, 0, 0, T, 4, th.top[0]);
      for (x = 0; x < T; x += 4) { var gh = 10 + (r() * 3 | 0) * 4; R(g, x, 10, 4, gh - 10, th.top[1]); R(g, x, gh, 4, 2, th.top[2]); }
      for (i = 0; i < 3; i++) R(g, (r() * 8 | 0) * 4, 0, 2, 4, th.top[2]);
    } else if (th.style === 'cobble') {
      R(g, 0, 0, T, 24, th.top[1]);
      for (y = 0; y < 24; y += 8) {
        R(g, 0, y + 6, T, 2, th.top[2]);
        var off = (y / 8) % 2 ? 6 : 0;
        for (x = off; x < T + 12; x += 12) { R(g, x, y, 2, 6, th.top[2]); R(g, x + 2, y, 8, 2, th.top[0]); }
      }
    } else {
      R(g, 0, 0, T, T, th.top[1]);
      for (y = 0; y < T; y += 8) {
        R(g, 0, y + 6, T, 2, th.top[2]);
        var o2 = (y / 8) % 2 ? 8 : 0;
        for (x = o2; x < T + 16; x += 16) { R(g, x, y, 2, 6, th.top[2]); R(g, x + 2, y, 12, 2, th.top[0]); }
      }
    }
    out.top.push(cc[0]);
  }
  // ladrillo
  c = mkCanvas(T, T); g = c[1];
  R(g, 0, 0, T, T, '#3a1606');
  for (y = 0; y < T; y += 8) {
    var o = (y / 8) % 2 ? 8 : 0;
    for (x = -8 + o; x < T; x += 16) { R(g, x + 2, y + 2, 14, 6, '#c45e26'); R(g, x + 2, y + 2, 14, 2, '#ec9050'); }
  }
  out.brick = c[0];
  // bloque ? (3 cuadros de brillo)
  var Q = ['..XXXX..', '.XX..XX.', '.XX..XX.', '.....XX.', '....XX..', '...XX...', '...XX...', '........', '...XX...', '...XX...'];
  out.q = [];
  ['#f8d040', '#f0a820', '#d88a10'].forEach(function (rim) {
    var qc = mkCanvas(T, T), qg = qc[1];
    R(qg, 0, 0, T, T, '#5a2a00'); R(qg, 2, 2, T - 4, T - 4, rim); R(qg, 4, 4, T - 8, T - 8, '#f0a020');
    R(qg, 4, 4, 2, 2, '#5a2a00'); R(qg, T - 6, 4, 2, 2, '#5a2a00'); R(qg, 4, T - 6, 2, 2, '#5a2a00'); R(qg, T - 6, T - 6, 2, 2, '#5a2a00');
    pattern(qg, 9, 7, Q, { X: '#7a3a00' }, 2); pattern(qg, 8, 6, Q, { X: '#fff6d0' }, 2);
    out.q.push(qc[0]);
  });
  c = mkCanvas(T, T); g = c[1];
  R(g, 0, 0, T, T, '#3a1a06'); R(g, 2, 2, T - 4, T - 4, '#8a5428');
  R(g, 4, 4, 2, 2, '#3a1a06'); R(g, T - 6, 4, 2, 2, '#3a1a06'); R(g, 4, T - 6, 2, 2, '#3a1a06'); R(g, T - 6, T - 6, 2, 2, '#3a1a06');
  out.used = c[0];
  c = mkCanvas(T, T); g = c[1];
  R(g, 0, 0, T, T, '#4a4a56'); R(g, 0, 0, T - 2, T - 2, '#d4d4e0'); R(g, 2, 2, T - 4, T - 4, '#9a9aaa');
  R(g, 6, 6, T - 12, T - 12, '#8a8a9a'); R(g, 6, 6, T - 12, 2, '#b0b0c0');
  out.hard = c[0];
  // tabla (one-way) y puente
  c = mkCanvas(T, T); g = c[1];
  R(g, 0, 0, T, 12, '#5a2c0c'); R(g, 0, 0, T, 10, '#b06a2c'); R(g, 0, 0, T, 2, '#e09a50');
  R(g, 15, 0, 2, 10, '#5a2c0c'); R(g, 4, 4, 2, 2, '#3a1a06'); R(g, 26, 4, 2, 2, '#3a1a06');
  R(g, 6, 12, 2, 8, '#c8a060'); R(g, 24, 12, 2, 8, '#c8a060');
  out.plank = c[0];
  c = mkCanvas(T, T); g = c[1];
  R(g, 0, 0, T, 16, '#3a1a06'); R(g, 0, 0, T, 14, '#9a5a24'); R(g, 0, 0, T, 2, '#d08a48');
  R(g, 7, 0, 2, 14, '#3a1a06'); R(g, 23, 0, 2, 14, '#3a1a06');
  for (x = 0; x < T; x += 8) { R(g, x, 16, 4, 4, '#777'); R(g, x + 2, 20, 4, 4, '#999'); }
  out.bridge = c[0];
  // pinchos / erizos
  c = mkCanvas(T, T); g = c[1];
  for (i = 0; i < 2; i++) {
    var bx = i * 16;
    for (y = 0; y < 16; y += 2) { var w2 = Math.floor(y / 2) * 2; R(g, bx + 8 - w2 / 2, 16 + y, w2 || 2, 2, th.spike[0]); }
    R(g, bx + 7, 16, 2, 6, th.spike[1]);
  }
  R(g, 0, 28, T, 4, th.spike[0]);
  out.spike = c[0];
  return out;
}

// ---------------------------------------------------------------- niveles
var CH = { B: BRICK, '?': QCOIN, M: QPOW, X: HARD, '=': PLANK, '^': SPIKE, o: COIN, '-': BRIDGE };
function newLevel(w) {
  var t = []; for (var y = 0; y < ROWS; y++) { t.push([]); for (var x = 0; x < w; x++) t[y].push(EMPTY); }
  return { w: w, t: t, ents: [], plats: [], goal: 0, check: 0 };
}
function gr(L, a, b, top) { top = top === undefined ? 12 : top; for (var x = a; x <= b; x++) for (var y = top; y < ROWS; y++) L.t[y][x] = GROUND; }
function put(L, x, y, s) { for (var i = 0; i < s.length; i++) { var v = CH[s[i]]; if (v !== undefined) L.t[y][x + i] = v; } }
function col(L, x, top, bottom) { bottom = bottom === undefined ? 11 : bottom; for (var y = top; y <= bottom; y++) L.t[y][x] = HARD; }
function stairs(L, x, n, dir, base) { base = base === undefined ? 11 : base; for (var i = 0; i < n; i++) { var h = dir > 0 ? i + 1 : n - i; col(L, x + i, base - h + 1, base); } }
function en(L, type, x, row) { L.ents.push({ type: type, x: x, row: row === undefined ? 11 : row }); }
function plat(L, x, row, w, axis, range, speed, phase) { L.plats.push({ bx: x * T, by: row * T, w: w * T, h: 14, axis: axis, range: range * T, speed: speed, phase: phase || 0 }); }

function build11() {
  var L = newLevel(190);
  gr(L, 0, 38);
  put(L, 14, 8, '?'); put(L, 18, 8, 'B?B?B'); put(L, 20, 4, 'M');
  en(L, 'coco', 24); col(L, 27, 10); en(L, 'coco', 32); en(L, 'coco', 34); put(L, 31, 7, 'ooo');
  gr(L, 42, 70);
  put(L, 45, 8, 'BBB'); put(L, 47, 4, '?B?'); en(L, 'coco', 52); en(L, 'coco', 54);
  put(L, 57, 10, 'ooo'); col(L, 66, 9); en(L, 'coco', 69);
  gr(L, 74, 110);
  put(L, 78, 8, 'B?B'); col(L, 84, 10); put(L, 86, 7, 'oooo'); col(L, 90, 9); en(L, 'coco', 92); en(L, 'coco', 94);
  put(L, 96, 8, 'BBBB?BBB'); put(L, 99, 4, 'oo'); en(L, 'coco', 100);
  plat(L, 113, 10, 3, 'x', 2, 0.025); put(L, 113, 6, 'ooo');
  gr(L, 118, 127); stairs(L, 124, 4, 1); gr(L, 130, 150); stairs(L, 130, 4, -1);
  en(L, 'coco', 138); en(L, 'coco', 140); en(L, 'rodante', 148);
  put(L, 142, 8, 'B?B'); put(L, 142, 5, 'ooo');
  gr(L, 154, 189); en(L, 'coco', 158); en(L, 'coco', 160); put(L, 162, 8, '?');
  stairs(L, 168, 8, 1); col(L, 176, 4);
  L.goal = 182; L.check = 96;
  return L;
}
function build12() {
  var L = newLevel(200);
  gr(L, 0, 22); put(L, 9, 8, '?B?'); put(L, 10, 4, 'oo'); en(L, 'coco', 15);
  stairs(L, 19, 3, 1); gr(L, 22, 30, 9);
  put(L, 31, 9, '=============='); en(L, 'coco', 36, 8); en(L, 'coco', 41, 8); put(L, 33, 5, 'oooo');
  gr(L, 45, 52, 9); put(L, 48, 5, 'M');
  gr(L, 53, 75); stairs(L, 53, 3, -1);
  put(L, 60, 8, 'B?BB'); put(L, 61, 4, 'oooo'); en(L, 'rodante', 64); en(L, 'coco', 68);
  plat(L, 78, 9, 2, 'y', 2, 0.03); plat(L, 81, 7, 2, 'y', 2, 0.03, Math.PI);
  gr(L, 84, 110); en(L, 'coco', 88); en(L, 'coco', 90); en(L, 'coco', 92); col(L, 96, 9); put(L, 99, 8, '?'); put(L, 102, 8, 'BMB');
 
  gr(L, 114, 125, 10); en(L, 'coco', 118, 9); put(L, 116, 6, 'B?B'); put(L, 120, 5, 'ooo');
  gr(L, 130, 150); en(L, 'coco', 142); en(L, 'rodante', 147); put(L, 140, 8, 'oooo');
  put(L, 151, 10, '===='); put(L, 158, 9, '==='); put(L, 163, 10, '====');
  put(L, 159, 6, 'oo');
  gr(L, 167, 199); en(L, 'coco', 172); en(L, 'coco', 174);
  stairs(L, 180, 6, 1); col(L, 186, 6);
  L.goal = 192; L.check = 100;
  return L;
}
function build13() {
  var L = newLevel(200);
  gr(L, 0, 30); put(L, 8, 8, 'B?B'); en(L, 'coco', 14); en(L, 'coco', 16);
  put(L, 17, 8, 'XXXX'); put(L, 17, 4, 'oooo'); col(L, 24, 10); col(L, 27, 9);
  gr(L, 33, 60); stairs(L, 38, 3, 1);
  put(L, 45, 8, 'XXXXXX'); en(L, 'coco', 48, 7); put(L, 46, 4, '?M?'); en(L, 'rodante', 56);
  plat(L, 62, 10, 2, 'y', 3, 0.025);
  gr(L, 67, 95); en(L, 'coco', 78); en(L, 'coco', 80); en(L, 'rodante', 86);
  put(L, 82, 8, 'B?B?B'); col(L, 90, 10); col(L, 93, 9);
  gr(L, 99, 130); en(L, 'coco', 104); en(L, 'coco', 106); en(L, 'coco', 108);
  put(L, 110, 8, '====='); put(L, 110, 6, 'ooooo'); en(L, 'rodante', 120);
  plat(L, 132, 10, 3, 'x', 1.5, 0.03); plat(L, 136, 8, 3, 'x', 1.5, 0.03, Math.PI);
  gr(L, 141, 199); en(L, 'coco', 146); en(L, 'coco', 148); en(L, 'coco', 150); en(L, 'coco', 152);
  put(L, 155, 8, '?B?B?'); stairs(L, 165, 4, 1); stairs(L, 169, 4, -1); en(L, 'rodante', 178);
  stairs(L, 182, 6, 1); col(L, 188, 6);
  L.goal = 194; L.check = 99;
  return L;
}
function build14() {
  var L = newLevel(72);
  gr(L, 0, 16); en(L, 'coco', 9); stairs(L, 12, 3, 1);
  gr(L, 15, 30, 9); put(L, 20, 5, 'M'); put(L, 24, 5, '?'); en(L, 'rodante', 27, 8);
  put(L, 31, 9, '-----------------------'); put(L, 34, 5, 'M');
  gr(L, 54, 71, 9);
  L.arena = { lock: 30 * T, trigger: 32 * T, minX: 40 * T, maxX: 51 * T };
  L.trophy = 63;
  return L;
}

var LEVELS = [
  { id: '1-1', name: 'PLAYA DE LA CEIBA', theme: 'playa', build: build11 },
  { id: '1-2', name: 'SELVA CATRACHA', theme: 'selva', build: build12 },
  { id: '1-3', name: 'NACAOME, VALLE', theme: 'nacaome', build: build13 },
  { id: '1-4', name: '¡EL PIRATA!', theme: 'jefe', build: build14 }
];

// ---------------------------------------------------------------- estado
var G = { state: 'loading', t: 0, level: 0, lives: 3, score: 0, coins: 0, time: 300, top: 0, menu: 0, shake: 0, freeze: 0, checkpoint: false };
try { G.top = +localStorage.getItem('sjb_top') || 0; } catch (e) { }
function saveTop() { if (G.score > G.top) { G.top = G.score; try { localStorage.setItem('sjb_top', G.top); } catch (e) { } } }

var L, TH, TILES = {}, P, cam = { x: 0 }, enemies, items, parts, pops, plats, shots, boss, bumps, goalBall, kickT;
function setState(s) { G.state = s; G.t = 0; }

function startLevel() {
  var def = LEVELS[G.level];
  L = def.build(); TH = THEMES[def.theme];
  if (!TILES[def.theme]) TILES[def.theme] = genTiles(TH);
  enemies = L.ents.map(function (e) {
    return { type: e.type, x: e.x * T - 2, y: (e.row + 1) * T - 40, w: 36, h: 40, vx: e.type === 'rodante' ? -2.3 : -1, vy: 0, alive: true, dead: null, dt: 0, active: false, rot: 0 };
  });
  plats = L.plats.map(function (p) { return { bx: p.bx, by: p.by, x: p.bx, y: p.by, w: p.w, h: p.h, axis: p.axis, range: p.range, speed: p.speed, phase: p.phase, dx: 0, dy: 0 }; });
  items = []; parts = []; pops = []; shots = []; bumps = []; goalBall = null; kickT = 0;
  var sx = (G.checkpoint && L.check ? L.check : 3) * T;
  P = { x: sx, y: 0, w: 28, h: 40, vx: 0, vy: 0, dir: 1, big: !!G.big, onGround: false, inv: 0, dead: false, anim: 0, coyote: 0, jbuf: 0, plat: null, auto: false, stompChain: 0 };
  setBig(P.big);
  P.y = groundBelow(P.x + P.w / 2, true) - P.h;
  cam.x = clamp(P.x - W * 0.35, 0, L.w * T - W);
  G.time = 300; G.timeTick = 0; G.locked = false; G.bossDone = false; G.golT = 0; G.netShake = 0; G.dialog = 0; G.paused = false; G.endT = 0;
  boss = null;
  if (L.arena) {
    boss = { x: 48 * T, y: 9 * T - 104, w: 60, h: 104, vx: 0, vy: 0, face: -1, walk: -1, hp: 3, inv: 0, state: 'wait', jumpT: 200, throwT: 150, onGround: true, rot: 0, t: 0, flash: 0 };
  }
  audio.play(TH.music);
  setState('play');
}
function groundBelow(px, onlyGround) {
  var tx = Math.floor(px / T);
  for (var y = 0; y < ROWS; y++) { var t = tile(tx, y); if (onlyGround ? t === GROUND : isSolid(t)) return y * T; }
  return 12 * T;
}
function setBig(b) {
  var bottom = P.y + P.h;
  P.big = b; P.w = b ? 34 : 28; P.h = b ? 54 : 40;
  P.y = bottom - P.h;
}
function tile(tx, ty) {
  if (tx < 0 || tx >= L.w) return HARD;
  if (ty < 0 || ty >= ROWS) return EMPTY;
  return L.t[ty][tx];
}
function setTile(tx, ty, v) { if (tx >= 0 && tx < L.w && ty >= 0 && ty < ROWS) L.t[ty][tx] = v; }

function addScore(n, x, y) { G.score += n; if (x !== undefined) pops.push({ x: x, y: y, s: '' + n, life: 50 }); }
function addCoin(x, y) {
  G.coins++; addScore(200); audio.sfx('coin');
  if (G.coins >= 100) { G.coins -= 100; G.lives++; audio.sfx('oneup'); pops.push({ x: P.x, y: P.y - 10, s: '1UP', life: 60 }); }
}

// ---------------------------------------------------------------- fisica generica
// mueve un cuerpo contra el mapa; devuelve {wall, land, head:[tx,ty]}
function moveBody(b, oneway) {
  var res = { wall: false, land: false, head: null }, tx, ty, i;
  b.x += b.vx;
  var t0 = Math.floor(b.y / T), t1 = Math.floor((b.y + b.h - 1) / T);
  if (b.vx > 0) {
    tx = Math.floor((b.x + b.w) / T);
    for (ty = t0; ty <= t1; ty++) if (isSolid(tile(tx, ty))) { b.x = tx * T - b.w; res.wall = true; break; }
  } else if (b.vx < 0) {
    tx = Math.floor(b.x / T);
    for (ty = t0; ty <= t1; ty++) if (isSolid(tile(tx, ty))) { b.x = (tx + 1) * T; res.wall = true; break; }
  }
  var prevBottom = b.y + b.h;
  b.y += b.vy;
  var l = Math.floor(b.x / T), r = Math.floor((b.x + b.w - 1) / T);
  if (b.vy >= 0) {
    ty = Math.floor((b.y + b.h) / T);
    for (tx = l; tx <= r; tx++) {
      var t = tile(tx, ty);
      if (isSolid(t) || (oneway && t === PLANK && prevBottom <= ty * T + 1)) { b.y = ty * T - b.h; b.vy = 0; res.land = true; break; }
    }
  } else {
    ty = Math.floor(b.y / T);
    var best = null, bd = 1e9, cx = b.x + b.w / 2;
    for (tx = l; tx <= r; tx++) if (isSolid(tile(tx, ty))) { var d = Math.abs(tx * T + T / 2 - cx); if (d < bd) { bd = d; best = tx; } }
    if (best !== null) {
      // correccion de esquina
      var ov = best * T + T / 2 < cx ? (best + 1) * T - b.x : b.x + b.w - best * T;
      if (ov < 9 && r !== l && !isSolid(tile(best * T + T / 2 < cx ? best + 1 : best - 1, ty))) {
        b.x += best * T + T / 2 < cx ? ov : -ov;
      } else { b.y = (ty + 1) * T; b.vy = 1; res.head = [best, ty]; }
    }
  }
  return res;
}

function bumpBlock(tx, ty) {
  var t = tile(tx, ty);
  if (t === QCOIN) {
    setTile(tx, ty, USED); bumps.push({ tx: tx, ty: ty, t: 10 });
    parts.push({ kind: 'coin', x: tx * T + 8, y: ty * T - 24, vx: 0, vy: -9, g: 0.5, life: 30 });
    addCoin(); pops.push({ x: tx * T, y: ty * T - 40, s: '200', life: 40 });
  } else if (t === QPOW) {
    setTile(tx, ty, USED); bumps.push({ tx: tx, ty: ty, t: 10 });
    items.push({ type: 'balon', x: tx * T + 4, y: ty * T, w: 24, h: 24, vx: 0, vy: 0, rise: 32, dir: 1 });
    audio.sfx('appear');
  } else if (t === BRICK) {
    if (P.big) {
      setTile(tx, ty, EMPTY); audio.sfx('break'); addScore(50);
      for (var i = 0; i < 4; i++) parts.push({ kind: 'brick', x: tx * T + (i % 2) * 16, y: ty * T + (i < 2 ? 0 : 16), vx: (i % 2 ? 2.5 : -2.5), vy: i < 2 ? -9 : -6, g: 0.5, life: 80, rot: 0 });
    } else { bumps.push({ tx: tx, ty: ty, t: 10 }); audio.sfx('bump'); }
  } else audio.sfx('bump');
  // mata enemigos encima del bloque
  enemies.forEach(function (e) {
    if (e.alive && !e.dead && Math.abs(e.y + e.h - ty * T) < 4 && e.x + e.w > tx * T && e.x < tx * T + T) killEnemy(e, 'flip');
  });
  // monedas encima
  if (tile(tx, ty - 1) === COIN) { setTile(tx, ty - 1, EMPTY); addCoin(); }
}

function killEnemy(e, how) {
  e.dead = how; e.dt = 0;
  if (how === 'flip') { e.vy = -7; e.vx = P.x < e.x ? 2 : -2; audio.sfx('stomp'); addScore(100, e.x, e.y); }
}

function hurtPlayer() {
  if (P.inv > 0 || P.dead || G.state !== 'play') return;
  if (P.big) { setBig(false); P.inv = 120; G.freeze = 30; audio.sfx('hurt'); }
  else killPlayer();
}
function killPlayer() {
  if (P.dead) return;
  P.dead = true; P.vx = 0; P.vy = -11; G.big = false;
  audio.stop(); audio.sfx('die');
  setState('dying');
}

// ---------------------------------------------------------------- update juego
function updatePlay() {
  if (G.freeze > 0) { G.freeze--; return; }
  var i, e;
  // plataformas moviles
  plats.forEach(function (p) {
    p.phase += p.speed;
    var nx = p.bx + (p.axis === 'x' ? Math.sin(p.phase) * p.range : 0);
    var ny = p.by + (p.axis === 'y' ? Math.sin(p.phase) * p.range : 0);
    p.dx = nx - p.x; p.dy = ny - p.y; p.x = nx; p.y = ny;
  });

  updatePlayer();
  if (G.state !== 'play' && G.state !== 'goal') return;

  // tiempo
  if (G.state === 'play' && !P.auto) {
    if (++G.timeTick >= 24) {
      G.timeTick = 0; G.time--;
      if (G.time === 100) audio.sfx('hurry');
      if (G.time <= 0) { G.time = 0; killPlayer(); return; }
    }
  }

  // enemigos
  for (i = 0; i < enemies.length; i++) {
    e = enemies[i];
    if (!e.alive) continue;
    if (!e.active) { if (e.x < cam.x + W + 64) e.active = true; else continue; }
    if (e.dead === 'squash') { if (++e.dt > 30) e.alive = false; continue; }
    if (e.dead === 'flip') { e.vy += 0.5; e.x += e.vx; e.y += e.vy; e.rot += 0.2; if (e.y > H + 60) e.alive = false; continue; }
    e.vy = Math.min(e.vy + 0.5, 10);
    var r = moveBody(e, true);
    if (r.wall) e.vx = -e.vx;
    if (e.type === 'rodante') e.rot += e.vx * 0.08;
    if (e.y > H + 60) { e.alive = false; continue; }
    for (var j = i + 1; j < enemies.length; j++) {
      var o = enemies[j];
      if (o.alive && !o.dead && o.active && overlap(e, o)) { e.vx = -e.vx; o.vx = -o.vx; e.x += e.vx * 2; o.x += o.vx * 2; }
    }
    // contacto con jugador
    if (!P.dead && overlap(P, e)) {
      if (P.vy > 0 && P.y + P.h - P.vy <= e.y + 18) {
        e.dead = 'squash'; e.dt = 0; audio.sfx('stomp');
        P.vy = K.jump() ? -11 : -7.5;
        P.stompChain++;
        var pts = [100, 200, 400, 800, 1000, 2000, 4000, 5000][Math.min(P.stompChain - 1, 7)];
        addScore(pts, e.x, e.y - 10);
      } else if (overlap(P, { x: e.x + 9, y: e.y + 12, w: e.w - 18, h: e.h - 12 })) hurtPlayer(); // zona de dano reducida
    }
  }
  // items
  for (i = items.length - 1; i >= 0; i--) {
    var it = items[i];
    if (it.rise > 0) { it.y -= 1; it.rise--; if (it.rise === 0) it.vx = 1.8; continue; }
    it.vy = Math.min(it.vy + 0.5, 10);
    var rr = moveBody(it, true);
    if (rr.wall) it.vx = -it.vx;
    if (it.y > H + 50) { items.splice(i, 1); continue; }
    if (overlap(P, it)) {
      items.splice(i, 1);
      addScore(1000, it.x, it.y);
      audio.sfx('power');
      if (!P.big) { setBig(true); G.freeze = 40; P.growT = 40; }
    }
  }
  // particulas
  for (i = parts.length - 1; i >= 0; i--) {
    var p = parts[i]; p.vy += p.g; p.x += p.vx; p.y += p.vy; p.life--;
    if (p.rot !== undefined) p.rot += 0.3;
    if (p.life <= 0) parts.splice(i, 1);
  }
  for (i = pops.length - 1; i >= 0; i--) { pops[i].y -= 0.8; if (--pops[i].life <= 0) pops.splice(i, 1); }
  for (i = bumps.length - 1; i >= 0; i--) if (--bumps[i].t <= 0) bumps.splice(i, 1);

  if (boss) updateBoss();
  updateShots();

  // camara
  if (G.locked) {
    cam.x = Math.min(L.arena.lock, cam.x + 6);
  } else {
    var target = P.x + P.w / 2 - W * 0.42;
    if (target > cam.x) cam.x = target;
    else if (target < cam.x - 120) cam.x = target + 120;
    cam.x = clamp(cam.x, 0, L.w * T - W);
  }
  if (G.shake > 0) G.shake--;

  // checkpoint
  if (L.check && P.x > L.check * T) G.checkpoint = true;

  // meta (porteria)
  if (G.state === 'play' && L.goal && P.x + P.w > (L.goal - 2) * T && !P.dead) {
    setState('goal'); P.auto = true; audio.stop();
    goalBall = { x: P.x + P.w + 4, y: groundBelow(P.x) - 20, vx: 0, vy: 0, rot: 0, in: false };
    kickT = 0;
  }
  // trofeo
  if (L.trophy && G.bossDone && P.x + P.w > L.trophy * T && !P.dead && G.state === 'play') {
    saveTop(); audio.play('victoria'); setState('victory');
  }
}

function updatePlayer() {
  if (P.dead) return;
  if (P.inv > 0) P.inv--;
  if (P.growT > 0) P.growT--;
  var left = K.left(), right = K.right(), run = K.run(), jumpP = K.jumpP(), jumpH = K.jump();
  if (G.dialog > 0) { left = right = run = jumpP = jumpH = false; }
  if (P.auto) {
    left = false; jumpP = false; jumpH = false; run = false;
    right = G.state === 'goal' && P.x + P.w < (L.goal - 1) * T - 4 && !kickT;
  }
  // llevar sobre plataforma
  if (P.plat) {
    P.x += P.plat.dx; P.y += P.plat.dy;
    if (P.x + P.w < P.plat.x || P.x > P.plat.x + P.plat.w) P.plat = null;
  }
  var max = run ? 5.2 : 3.2;
  var acc = P.onGround ? 0.3 : 0.2;
  var limit = Math.max(max, Math.abs(P.vx) - 0.15); // al soltar correr se frena poco a poco
  if (left && !right) { P.vx -= acc * (P.vx > 0 && P.onGround ? 2 : 1); P.dir = -1; }
  else if (right && !left) { P.vx += acc * (P.vx < 0 && P.onGround ? 2 : 1); P.dir = 1; }
  else { P.vx *= P.onGround ? 0.82 : 0.97; if (Math.abs(P.vx) < 0.1) P.vx = 0; }
  if (Math.abs(P.vx) > limit) P.vx = Math.sign(P.vx) * limit;
  if (P.auto && G.state === 'goal' && !right) P.vx *= 0.7;

  if (jumpP) P.jbuf = 7;
  if (P.jbuf > 0) P.jbuf--;
  if (P.onGround) P.coyote = 6; else if (P.coyote > 0) P.coyote--;
  if (P.jbuf > 0 && P.coyote > 0) {
    P.vy = -(10 + Math.abs(P.vx) * 0.22); P.onGround = false; P.coyote = 0; P.jbuf = 0; P.plat = null;
    audio.sfx('jump');
  }
  P.vy += (P.vy < 0 && jumpH) ? 0.36 : 0.85;
  if (P.vy > 12) P.vy = 12;

  var wasGround = P.onGround;
  var prevBottom = P.y + P.h;
  var r = moveBody(P, true);
  if (r.wall) P.vx = 0;
  P.onGround = r.land;
  if (r.head) bumpBlock(r.head[0], r.head[1]);
  // plataformas
  if (P.vy >= 0) {
    for (var i = 0; i < plats.length; i++) {
      var p = plats[i];
      if (P.x + P.w > p.x && P.x < p.x + p.w && prevBottom <= p.y + Math.max(0, p.dy) + 2 && P.y + P.h >= p.y) {
        P.y = p.y - P.h; P.vy = 0; P.onGround = true; P.plat = p; break;
      }
    }
  }
  if (!P.onGround) P.plat = null;
  if (P.onGround) P.stompChain = 0;
  if (P.onGround && !wasGround && Math.abs(P.vx) < 0.5) P.land = 6;
  if (P.land > 0) P.land--;
  // limites de camara
  if (P.x < cam.x) { P.x = cam.x; if (P.vx < 0) P.vx = 0; }
  if (G.locked && P.x + P.w > cam.x + W) { P.x = cam.x + W - P.w; P.vx = 0; }
  P.anim += Math.abs(P.vx) * 0.12;

  // monedas y pinchos
  var l = Math.floor(P.x / T), rr = Math.floor((P.x + P.w - 1) / T), t0 = Math.floor(P.y / T), t1 = Math.floor((P.y + P.h - 1) / T);
  for (var tx = l; tx <= rr; tx++) for (var ty = t0; ty <= t1; ty++) {
    var t = tile(tx, ty);
    if (t === COIN) { setTile(tx, ty, EMPTY); addCoin(); }
    else if (t === SPIKE && P.y + P.h > ty * T + 14) hurtPlayer();
  }
  if (P.y > ROWS * T + 20) killPlayer();
}

// ---------------------------------------------------------------- jefe pirata
function updateBoss() {
  var b = boss;
  b.t++;
  if (!G.locked && !G.bossDone && P.x > L.arena.trigger) {
    G.locked = true; audio.stop(); audio.sfx('laugh');
    G.dialog = 170; b.state = 'intro';
  }
  if (G.dialog > 0) { G.dialog--; if (G.dialog === 0) { b.state = 'fight'; audio.play('jefe'); } }
  if (b.state === 'dead') {
    b.vy += 0.4; b.y += b.vy; b.x += b.vx; b.rot += 0.08;
    if (b.y > H - 60 && !b.splashed) {
      b.splashed = true; audio.sfx('splash');
      for (var s = 0; s < 24; s++) parts.push({ kind: 'drop', x: b.x + b.w / 2, y: H - 40, vx: rnd(-4, 4), vy: rnd(-10, -4), g: 0.4, life: 50 });
    }
    if (b.y > H + 200 && !G.bossDone) {
      G.bossDone = true; G.locked = false; audio.play('victoria');
      pops.push({ x: P.x - 60, y: P.y - 40, s: '¡PIRATA DERROTADO!', life: 160 });
    }
    return;
  }
  if (b.state === 'wait' || b.state === 'intro') { b.face = P.x < b.x ? -1 : 1; return; }

  var phase = 3 - b.hp; // 0,1,2
  if (b.inv > 0) b.inv--;
  b.face = P.x + P.w / 2 < b.x + b.w / 2 ? -1 : 1;
  if (b.retreat > 0) { b.retreat--; b.vx = 3.5; }
  else {
    if (Math.random() < 0.006) b.walk = -b.walk;
    b.vx = b.walk * (0.6 + phase * 0.25);
  }
  if (b.x < L.arena.minX) b.walk = 1;
  if (b.x > L.arena.maxX) { b.walk = -1; b.x = L.arena.maxX; }
  b.vy = Math.min(b.vy + 0.45, 12);
  var wasG = b.onGround;
  var r = moveBody(b, false);
  b.onGround = r.land;
  if (b.onGround && !wasG) { G.shake = 8; audio.sfx('thud'); }
  if (--b.jumpT <= 0 && b.onGround) { b.vy = -(8 + phase * 0.5); b.jumpT = rnd(180, 280) - phase * 20; }
  if (--b.throwT <= 0) {
    var n = phase === 2 ? 2 : 1;
    for (var k = 0; k < n; k++) bossThrow(b, phase, k);
    b.throwT = rnd(140, 210) - phase * 15;
  }
  // contacto
  if (!P.dead && b.inv <= 0 && overlap(P, b)) {
    // cabeza generosa para pisarlo; cuerpo con zona de dano reducida
    if (P.vy > 0 && P.y + P.h - P.vy <= b.y + 40) {
      b.hp--; b.inv = 90; b.flash = 90; audio.sfx('bosshit'); G.shake = 10;
      addScore(2000, b.x, b.y - 10);
      P.vy = -11; P.vx = -5; P.x = Math.min(P.x, b.x - P.w + 10);
      b.retreat = 40;
      if (b.hp <= 0) {
        b.state = 'dead'; b.vy = -9; b.vx = 1.5; addScore(5000, b.x, b.y - 30);
        shots.length = 0; audio.stop(); audio.sfx('bosshit');
      }
    } else if (overlap(P, { x: b.x + 12, y: b.y + 24, w: b.w - 24, h: b.h - 24 })) hurtPlayer();
  } else if (!P.dead && b.inv > 0 && overlap(P, b) && !(P.vy > 0)) {
    // durante invulnerabilidad empuja sin hacer dano
    P.vx = P.x < b.x ? -3 : 3;
  }
}
function bossThrow(b, phase, k) {
  audio.sfx('throw');
  var dir = b.face, gy = 9 * T;
  var sx = b.x + b.w / 2 + dir * 30, sy = b.y + 40;
  var sword = phase === 2 && (Math.random() < 0.4 || k > 0);
  if (sword) {
    shots.push({ kind: 'espada', x: sx, y: sy - 20, vx: dir * rnd(2, 3), vy: -rnd(7, 8.5), g: 0.28, r: 12, rot: 0, delay: k * 30 });
  } else {
    var high = Math.random() < 0.45;
    shots.push({ kind: 'bala', x: sx, y: high ? gy - 78 : gy - 16, vx: dir * (2.4 + phase * 0.3), vy: 0, g: 0, r: 10, rot: 0, delay: k * 30 });
  }
}
function updateShots() {
  for (var i = shots.length - 1; i >= 0; i--) {
    var s = shots[i];
    if (s.delay > 0) { s.delay--; continue; }
    s.vy += s.g; s.x += s.vx; s.y += s.vy; s.rot += 0.35 * Math.sign(s.vx || 1);
    if (s.x < cam.x - 60 || s.x > cam.x + W + 60 || s.y > H + 40) { shots.splice(i, 1); continue; }
    var hb = { x: s.x - s.r * 0.55, y: s.y - s.r * 0.55, w: s.r * 1.1, h: s.r * 1.1 };
    if (!P.dead && overlap(P, hb)) hurtPlayer();
  }
}

// ---------------------------------------------------------------- meta / gol
function updateGoal() {
  updatePlay();
  if (!goalBall) return;
  var b = goalBall;
  var gx = L.goal * T;
  if (!kickT && P.x + P.w >= gx - T - 6) { kickT = 1; b.vx = 9; b.vy = -5; audio.sfx('kick'); P.vx = 0; }
  if (!kickT) { b.x = P.x + P.w + 2; b.rot += P.vx * 0.12; }
  if (kickT) {
    kickT++;
    if (!b.in) {
      b.vy += 0.3; b.x += b.vx; b.y += b.vy; b.rot += 0.4;
      var gy = groundBelow(gx) ;
      if (b.y > gy - 20) { b.y = gy - 20; b.vy *= -0.4; }
      if (b.x > gx + 50) { b.in = true; b.vx = 0; audio.play('gol'); G.netShake = 30; kickT = 2; G.golT = 0; }
    } else {
      b.vy += 0.4; b.y = Math.min(b.y + b.vy, groundBelow(gx) - 20);
      G.golT++;
      if (G.netShake > 0) G.netShake--;
      if (G.golT > 120 && G.time > 0) {
        var n = Math.min(G.time, 3); G.time -= n; G.score += n * 50;
        if (G.t % 4 === 0) audio.sfx('tick');
      }
      if (G.golT > 120 && G.time <= 0) {
        if (!G.endT) G.endT = 1; else G.endT++;
        if (G.endT > 100) {
          G.endT = 0; G.big = P.big; G.checkpoint = false; G.level++;
          saveTop(); setState('card');
        }
      }
    }
  }
}

// ---------------------------------------------------------------- dibujo de objetos
function drawCoin(x, y, f) {
  var w = [20, 14, 6, 14][Math.floor(f / 8) % 4];
  var cx = x + 16;
  R(ctx, cx - w / 2, y + 4, w, 24, '#7a3a00');
  R(ctx, cx - w / 2 + 2, y + 6, w - 4, 20, '#f8c820');
  if (w > 8) { R(ctx, cx - w / 2 + 4, y + 8, 2, 14, '#fff6c0'); R(ctx, cx + w / 2 - 6, y + 10, 2, 12, '#d08a10'); }
}
function drawBall(x, y, r, rot, gold) {
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(rot || 0);
  disc(ctx, 0, 0, r + 2, '#000', 2);
  disc(ctx, 0, 0, r, gold ? '#f8d040' : '#ffffff', 2);
  var c = gold ? '#1050c0' : '#202020';
  R(ctx, -4, -4, 8, 8, c); R(ctx, -r + 2, -2, 4, 6, c); R(ctx, r - 6, -2, 4, 6, c); R(ctx, -2, r - 6, 4, 4, c); R(ctx, -2, -r + 2, 4, 4, c);
  ctx.restore();
}
function drawGoal(gx, gy) {
  var sh = G.netShake ? Math.sin(G.t * 1.2) * 3 : 0;
  // red
  ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 2;
  ctx.beginPath();
  for (var i = 0; i <= 6; i++) { var yy = gy - 104 + i * 17; ctx.moveTo(gx + 6, yy); ctx.lineTo(gx + 86 + sh * (i / 6), Math.min(gy, yy + 10)); }
  for (i = 0; i <= 5; i++) { var xx = gx + 6 + i * 16; ctx.moveTo(xx, gy - 104); ctx.lineTo(xx + (i / 5) * 12 + sh, gy); }
  ctx.stroke();
  ctx.beginPath(); ctx.moveTo(gx + 78, gy - 104); ctx.lineTo(gx + 96 + sh, gy); ctx.strokeStyle = '#ddd'; ctx.lineWidth = 4; ctx.stroke();
  // postes
  R(ctx, gx, gy - 108, 8, 108, '#000'); R(ctx, gx + 2, gy - 106, 4, 106, '#fff');
  R(ctx, gx, gy - 108, 82, 8, '#000'); R(ctx, gx + 2, gy - 106, 78, 4, '#fff');
  // bandera de esquina con logo
  var fx = gx - 70;
  R(ctx, fx, gy - 150, 4, 150, '#ddd');
  R(ctx, fx + 4, gy - 150, 46, 30, '#1050c0'); R(ctx, fx + 4, gy - 140, 46, 10, '#fff');
  if (IMG.logoV.width) ctx.drawImage(IMG.logoV, fx + 14, gy - 152, 34, 34);
}
function drawTrophy(x, y, s) {
  s = s || 1;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  var Gd = '#f8c820', Dk = '#a86a00', Lt = '#fff6b0';
  R(ctx, -20, -8, 40, 8, '#6a3a10'); R(ctx, -14, -16, 28, 8, Dk);
  R(ctx, -4, -30, 8, 14, Gd); R(ctx, -10, -34, 20, 4, Dk);
  R(ctx, -22, -70, 44, 36, Gd); R(ctx, -18, -66, 6, 28, Lt); R(ctx, 12, -66, 6, 30, Dk);
  R(ctx, -32, -66, 10, 6, Gd); R(ctx, -34, -62, 6, 18, Gd); R(ctx, -30, -46, 8, 6, Gd);
  R(ctx, 22, -66, 10, 6, Gd); R(ctx, 28, -62, 6, 18, Gd); R(ctx, 22, -46, 8, 6, Gd);
  R(ctx, -24, -72, 48, 4, Lt);
  disc(ctx, 0, -52, 7, '#1050c0', 2);
  ctx.restore();
}
function drawPlane(x, y, s, flip, ang) {
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(ang || 0); if (flip) ctx.scale(-1, 1); ctx.scale(s, s);
  // ala trasera y cola
  R(ctx, -40, -22, 8, 16, '#1050c0'); R(ctx, -38, -20, 4, 12, '#3a8af0');
  R(ctx, -44, -4, 16, 4, '#1050c0');
  // fuselaje
  R(ctx, -38, -8, 70, 18, '#0a1a40'); R(ctx, -36, -6, 66, 14, '#ffffff'); R(ctx, -36, 0, 66, 4, '#1a6ae0');
  R(ctx, 30, -4, 6, 10, '#ffffff'); R(ctx, 36, -2, 4, 6, '#c0c0c0');
  // ventanas
  for (var i = 0; i < 4; i++) R(ctx, -24 + i * 10, -4, 4, 3, '#5ac8ff');
  // ala
  R(ctx, -8, 4, 26, 6, '#0a1a40'); R(ctx, -6, 4, 22, 4, '#2a7af0');
  // helice
  var ph = (G.t % 6) < 3;
  R(ctx, 40, ph ? -12 : -4, 3, ph ? 12 : 12, '#333'); R(ctx, 40, ph ? 2 : -14, 3, 10, '#999');
  // jaiba montada
  var rider = jaibaImg(false, 'derecha');
  if (rider.width) ctx.drawImage(rider, -4, -36, 20, 29);
  ctx.restore();
}

function drawPlayer() {
  if (P.inv > 0 && Math.floor(P.inv / 3) % 2 === 0 && !P.dead) return;
  var big = P.big;
  if (P.growT > 0) big = Math.floor(P.growT / 5) % 2 === 0;
  var side = P.dir < 0 ? 'izquierda' : 'derecha';
  var view = side, bob = 0, rot = 0, sy = 1;
  if (P.dead || P.growT > 0) view = 'frente';
  else if (G.state === 'goal' && G.golT > 0) {
    // celebra el gol de frente, dando saltitos
    view = Math.floor(G.golT / 12) % 2 ? 'frente' : 'frente2';
    bob = -Math.abs(Math.sin(G.golT * 0.15)) * 14;
  }
  else if (G.dialog > 0) view = side;
  else if (!P.onGround) { sy = P.vy < 0 ? 1.06 : 0.97; rot = P.dir * 0.06; }
  else if (Math.abs(P.vx) > 0.3) { bob = Math.abs(Math.sin(P.anim)) * -4; rot = Math.sin(P.anim) * 0.07; sy = 1 - Math.abs(Math.cos(P.anim)) * 0.04; }
  else if (keys.ArrowDown || keys.KeyS) view = 'espalda';
  else view = Math.floor(G.t / 50) % 4 === 3 ? 'frente2' : 'frente';
  if (P.land > 0) sy = 0.9;
  drawJaiba(big, view, P.x + P.w / 2, P.y + P.h + 2 + bob, 1, rot, sy);
}
function drawCoco(e) {
  var img = IMG.coco;
  if (e.dead === 'squash') { sprite(img, e.x - 3, e.y + 24, 42, 18); return; }
  if (e.dead === 'flip') { sprite(img, e.x - 3, e.y - 2, 42, 44, false, Math.PI + e.rot * 0.2); return; }
  if (e.type === 'rodante') {
    sprite(img, e.x - 3, e.y - 2, 42, 44, false, e.rot);
    return;
  }
  var step = Math.floor(G.t / 10) % 2;
  sprite(img, e.x - 3, e.y - 4 + (step ? 1 : 0), 42, 44, e.vx > 0 ? step === 0 : step === 1);
}
function drawBoss() {
  var b = boss;
  if (b.flash > 0) { b.flash--; if (Math.floor(b.flash / 4) % 2 === 0) return; }
  var flip = b.face > 0;
  var cx = b.x + b.w / 2;
  var dx = flip ? cx - 51 : cx - 75;
  var dy = b.y + b.h - 128;
  if (b.state === 'dead') { sprite(IMG.pirata, dx, dy, 126, 130, flip, b.rot); return; }
  var breathe = Math.sin(b.t * 0.1) * 2;
  sprite(IMG.pirata, dx, dy + breathe, 126, 130 - breathe, flip);
}
function drawShot(s) {
  if (s.delay > 0) return;
  if (s.kind === 'bala') {
    disc(ctx, s.x, s.y, s.r + 2, '#000', 2); disc(ctx, s.x, s.y, s.r, '#3a3a44', 2); R(ctx, s.x - 5, s.y - 6, 4, 4, '#9a9aaa');
    R(ctx, s.x - s.vx * 3 - 3, s.y - 2, 4, 4, 'rgba(255,160,40,0.8)');
  } else {
    ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot);
    R(ctx, -3, -16, 6, 22, '#000'); R(ctx, -2, -15, 4, 20, '#e8e8f0'); R(ctx, -2, -15, 2, 20, '#ffffff');
    R(ctx, -8, 6, 16, 4, '#f0b020'); R(ctx, -2, 10, 4, 8, '#6a3a10');
    ctx.restore();
  }
}

function drawBackground(theme, camx) {
  var img = IMG[theme.bg];
  var off = (camx * 0.25) % (W * 2);
  for (var i = -1; i < 3; i++) {
    var x = Math.round(i * W - off);
    if (x > W || x + W < 0) continue;
    if (i % 2 === 0) ctx.drawImage(img, x, 0, W, H);
    else { ctx.save(); ctx.translate(x + W, 0); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0, W, H); ctx.restore(); }
  }
  if (theme.dusk) {
    var gr2 = ctx.createLinearGradient(0, 0, 0, H);
    gr2.addColorStop(0, 'rgba(60,10,70,0.55)'); gr2.addColorStop(1, 'rgba(200,60,20,0.35)');
    ctx.fillStyle = gr2; ctx.fillRect(0, 0, W, H);
  }
}

function drawWorld() {
  var tiles = TILES[LEVELS[G.level].theme];
  drawBackground(TH, cam.x);
  var sx = G.shake ? rnd(-4, 4) : 0, sy = G.shake ? rnd(-3, 3) : 0;
  ctx.save();
  ctx.translate(-Math.round(cam.x) + Math.round(sx), Math.round(sy));
  var c0 = Math.floor(cam.x / T) - 1, c1 = c0 + Math.ceil(W / T) + 2;
  // agua en los huecos
  for (var x = c0; x <= c1; x++) {
    if (x < 0 || x >= L.w) continue;
    if (tile(x, 13) === EMPTY) {
      R(ctx, x * T, H - 34, T, 34, TH.water[0]);
      var wv = Math.round(Math.sin((x * T + G.t * 2) * 0.05) * 2);
      R(ctx, x * T, H - 36 + wv, T, 4, TH.water[1]);
      if ((x + Math.floor(G.t / 20)) % 3 === 0) R(ctx, x * T + 8, H - 24, 10, 2, TH.water[1]);
    }
  }
  items.forEach(function (it) { if (it.rise > 0) drawBall(it.x + 12, it.y + 12, 12, 0, true); });
  // tiles
  for (var ty = 0; ty < ROWS; ty++) for (x = c0; x <= c1; x++) {
    var t = tile(x, ty); if (t === EMPTY || x < 0 || x >= L.w) continue;
    var px = x * T, py = ty * T, v = (x * 7 + ty * 13) % 3;
    for (var b = 0; b < bumps.length; b++) if (bumps[b].tx === x && bumps[b].ty === ty) py -= Math.sin((10 - bumps[b].t) / 10 * Math.PI) * 10;
    switch (t) {
      case GROUND: ctx.drawImage(tile(x, ty - 1) === GROUND ? tiles.fill[v] : tiles.top[v], px, py); break;
      case BRICK: ctx.drawImage(tiles.brick, px, py); break;
      case QCOIN: case QPOW: ctx.drawImage(tiles.q[[0, 0, 1, 2, 1][Math.floor(G.t / 8) % 5]], px, py); break;
      case USED: ctx.drawImage(tiles.used, px, py); break;
      case HARD: ctx.drawImage(tiles.hard, px, py); break;
      case PLANK: ctx.drawImage(tiles.plank, px, py); break;
      case BRIDGE: ctx.drawImage(tiles.bridge, px, py); break;
      case SPIKE: ctx.drawImage(tiles.spike, px, py); break;
      case COIN: drawCoin(px, py, G.t); break;
    }
  }
  // cadenas del puente del jefe
  if (L.arena) {
    ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 3; ctx.beginPath();
    ctx.moveTo(31 * T, 9 * T - 26); ctx.quadraticCurveTo(42.5 * T, 9 * T - 6, 54 * T, 9 * T - 26); ctx.stroke();
    for (x = 31; x <= 54; x += 3) R(ctx, x * T - 2, 9 * T - 30, 4, 30, '#5a3a1a');
  }
  // plataformas
  plats.forEach(function (p) {
    for (var i = 0; i < p.w; i += T) ctx.drawImage(tiles.plank, Math.round(p.x + i), Math.round(p.y));
    R(ctx, Math.round(p.x), Math.round(p.y) + 10, p.w, 2, '#3a1a06');
  });
  if (L.goal) drawGoal(L.goal * T, groundBelow(L.goal * T + 16));
  if (L.trophy) {
    var ty2 = groundBelow(L.trophy * T);
    drawTrophy(L.trophy * T + 16, ty2 + Math.sin(G.t * 0.08) * 3 - 4, 1);
    if (G.bossDone && G.t % 30 < 20) text('¡COPA!', L.trophy * T - 10, ty2 - 110, 12, '#ffe040');
  }
  items.forEach(function (it) { if (!(it.rise > 0)) drawBall(it.x + 12, it.y + 12, 12, it.x * 0.08, true); });
  enemies.forEach(function (e) { if (e.alive && e.active) drawCoco(e); });
  if (boss) drawBoss();
  if (!P.dead || G.state === 'dying') drawPlayer();
  if (goalBall) drawBall(goalBall.x, goalBall.y, 10, goalBall.rot);
  shots.forEach(drawShot);
  parts.forEach(function (p) {
    if (p.kind === 'coin') drawCoin(p.x - 8, p.y, G.t * 3);
    else if (p.kind === 'brick') { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); R(ctx, -6, -6, 12, 12, '#3a1606'); R(ctx, -5, -5, 10, 10, '#c45e26'); ctx.restore(); }
    else if (p.kind === 'drop') R(ctx, p.x, p.y, 6, 6, TH.water[1]);
    else if (p.kind === 'fw') R(ctx, p.x, p.y, 4, 4, p.c);
  });
  pops.forEach(function (p) { text(p.s, p.x, p.y, 10, '#fff'); });
  ctx.restore();
}

function drawHUD() {
  var s = ('000000' + G.score).slice(-6);
  text('JAIBA', 32, 14, 14); text(s, 32, 34, 14);
  drawCoin(196, 26, G.t); text('x' + ('0' + G.coins).slice(-2), 230, 34, 14);
  text('MUNDO', 380, 14, 14); text(LEVELS[G.level].id, 400, 34, 14);
  text('TIEMPO', 590, 14, 14); text(('000' + G.time).slice(-3), 620, 34, 14, G.time <= 100 ? '#ff6060' : '#fff');
  if (audio.muted) text('MUTE', 700, 60, 8, '#aaa');
  if (boss && G.locked && boss.state !== 'dead') {
    if (IMG.logoP.width) ctx.drawImage(IMG.logoP, 228, 62, 38, 37);
    R(ctx, 272, 74, 200, 18, '#000');
    for (var i = 0; i < 3; i++) R(ctx, 276 + i * 65, 78, 61, 10, i < boss.hp ? '#e02020' : '#401010');
    text('PIRATA', 482, 76, 12, '#fff');
  }
}

function drawDialog() {
  var a = Math.min(1, (170 - G.dialog) / 20);
  ctx.save(); ctx.globalAlpha = a;
  R(ctx, 120, 300, 528, 104, '#000'); R(ctx, 124, 304, 520, 96, '#1a0a0a'); R(ctx, 124, 304, 520, 4, '#e02020');
  if (IMG.logoP.width) ctx.drawImage(IMG.logoP, 136, 312, 82, 80);
  text('CAPITÁN PIRATA:', 232, 318, 12, '#ff5050');
  text('¡JA, JA, JA! ESTE', 232, 342, 12, '#fff');
  text('CAMPEONATO ES MÍO, JAIBA!', 232, 364, 12, '#fff');
  ctx.restore();
}

// ---------------------------------------------------------------- pantallas
var titleT = 0;
var titleCocos = [{ x: 520, d: -1 }, { x: 640, d: -1 }];
function drawTitle() {
  var tiles = TILES.playa || (TILES.playa = genTiles(THEMES.playa));
  drawBackground(THEMES.playa, titleT * 0.6);
  for (var x = 0; x < W / T + 1; x++) { ctx.drawImage(tiles.top[x % 3], x * T, 12 * T); ctx.drawImage(tiles.fill[(x + 1) % 3], x * T, 13 * T); }
  // panel del titulo
  var px = 104, py = 34, pw = 560, ph = 188;
  R(ctx, px - 4, py - 4, pw + 8, ph + 8, '#000');
  R(ctx, px, py, pw, ph, '#c4581c'); R(ctx, px + 4, py + 4, pw - 8, ph - 8, '#e8822e');
  R(ctx, px + 4, py + 4, pw - 8, 4, '#ffb070');
  [[px + 10, py + 10], [px + pw - 18, py + 10], [px + 10, py + ph - 18], [px + pw - 18, py + ph - 18]].forEach(function (c) { R(ctx, c[0], c[1], 8, 8, '#7a2a00'); R(ctx, c[0], c[1], 4, 4, '#ffd0a0'); });
  outlined('SUPER', W / 2, py + 22, 22, '#ffe040', '#7a2a00', 2);
  outlined('JAIBA BRAVA', W / 2, py + 62, 44, '#2a8cff', '#ffffff', 3);
  outlined('EL CAMINO A SER CAMPEÓN', W / 2, py + 132, 16, '#ffffff', '#0a3a9a', 2);
  if (IMG.logoV.width) ctx.drawImage(IMG.logoV, px + pw - 74, py + ph - 70, 60, 60);
  // jaiba y cocos
  var jb = Math.abs(Math.sin(titleT * 0.05)) * -6;
  drawJaiba(true, Math.floor(titleT / 60) % 4 === 3 ? 'frente2' : 'frente', 140, 12 * T + jb);
  titleCocos.forEach(function (c) {
    var st = Math.floor(titleT / 10) % 2;
    sprite(IMG.coco, c.x, 12 * T - 44, 42, 44, c.d > 0 ? !st : !!st);
  });
  // menu
  var opts = ['1 JUGADOR', 'CONTROLES'];
  opts.forEach(function (o, i) {
    text(o, W / 2 - 80, 250 + i * 34, 18, '#fff');
    if (G.menu === i) {
      var bx = W / 2 - 116, by = 250 + i * 34;
      drawJaiba(false, 'derecha', bx + 12, by + 22, 0.6);
    }
  });
  text('TOP- ' + ('000000' + G.top).slice(-6), W / 2, 330, 14, '#fff', 'center');
  if (titleT % 60 < 40) text('PRESIONA ENTER', W / 2, 356, 10, '#ffe040', 'center');
}
function updateTitle() {
  titleT++;
  titleCocos.forEach(function (c) { c.x += c.d * 0.6; if (c.x < 420) c.d = 1; if (c.x > 720) c.d = -1; });
  if (K.upP() || K.downP()) { G.menu = 1 - G.menu; audio.sfx('select'); }
  if (K.okP()) {
    audio.unlock();
    if (G.menu === 0) {
      G.level = 0; G.lives = 3; G.score = 0; G.coins = 0; G.big = false; G.checkpoint = false;
      audio.sfx('coin'); setState('intro'); audio.play('over');
    } else { audio.sfx('select'); setState('controls'); }
  }
}
function drawControls() {
  R(ctx, 0, 0, W, H, '#000');
  outlined('CONTROLES', W / 2, 40, 28, '#2a8cff', '#fff', 2);
  var rows = [
    ['MOVER', '← →  o  A D'],
    ['SALTAR', 'ESPACIO / Z / ↑'],
    ['CORRER', 'SHIFT / X'],
    ['PAUSA', 'P / ESC'],
    ['SONIDO', 'M'],
    ['CELULAR', 'BOTONES EN PANTALLA']
  ];
  rows.forEach(function (r, i) { text(r[0], 150, 120 + i * 36, 14, '#ffe040'); text(r[1], 340, 120 + i * 36, 14, '#fff'); });
  text('SALTA SOBRE LOS COCOS PARA VENCERLOS.', W / 2, 344, 10, '#aaf', 'center');
  text('AL PIRATA: ¡3 GOLPES EN LA CABEZA!', W / 2, 364, 10, '#faa', 'center');
  if (G.t % 60 < 40) text('ENTER PARA VOLVER', W / 2, 398, 10, '#fff', 'center');
}

// intro: avion de La Ceiba a Nacaome
var PATH = [[337, 110], [328, 123], [317, 131], [299, 140], [288, 149], [282, 170], [276, 188], [264, 209], [248, 225], [234, 255], [220, 264], [204, 276], [196, 299]];
var PATH_LEN = (function () { var s = 0; for (var i = 1; i < PATH.length; i++) s += Math.hypot(PATH[i][0] - PATH[i - 1][0], PATH[i][1] - PATH[i - 1][1]); return s; })();
function pathAt(u) {
  var d = u * PATH_LEN;
  for (var i = 1; i < PATH.length; i++) {
    var a = PATH[i - 1], b = PATH[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (d <= l) { var k = d / l; return { x: a[0] + (b[0] - a[0]) * k, y: a[1] + (b[1] - a[1]) * k, ang: Math.atan2(b[1] - a[1], b[0] - a[0]) }; }
    d -= l;
  }
  var e = PATH[PATH.length - 1]; return { x: e[0], y: e[1], ang: 2 };
}
var STOPS = [
  { u: 0.02, id: '1-1', name: 'PLAYA DE LA CEIBA', bg: 'bg_playa' },
  { u: 0.42, id: '1-2', name: 'SELVA CATRACHA', bg: 'bg_selva' },
  { u: 0.8, id: '1-3', name: 'NACAOME, VALLE', bg: 'bg_nacaome' },
  { u: 0.99, id: '1-4', name: '¡JEFE PIRATA!', bg: null }
];
var INTRO_FLY = 460;
function updateIntro() {
  if (K.okP() && G.t > 10) { G.t = INTRO_FLY + 200; }
  if (G.t > INTRO_FLY + 130) setState('card');
}
function drawIntro() {
  ctx.drawImage(IMG.mapa, 0, 0, W, H);
  var u = Math.min(1, G.t / INTRO_FLY);
  var ue = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
  // ruta recorrida
  for (var k = 0; k <= ue; k += 0.035) { var q = pathAt(k); R(ctx, q.x - 3, q.y - 3, 6, 6, '#000'); R(ctx, q.x - 2, q.y - 2, 4, 4, '#ffe040'); }
  // paradas
  STOPS.forEach(function (s, i) {
    var q = pathAt(s.u), on = ue >= s.u;
    var pulse = on ? Math.sin(G.t * 0.2) * 2 : 0;
    disc(ctx, q.x + (i % 2 ? -14 : 14), q.y, 9 + pulse, '#000', 2);
    disc(ctx, q.x + (i % 2 ? -14 : 14), q.y, 7 + pulse, on ? (i === 3 ? '#e02020' : '#2a8cff') : '#777', 2);
  });
  // panel de niveles
  R(ctx, 548, 56, 212, 344, 'rgba(0,0,0,0.72)');
  text('NIVELES', 654, 64, 10, '#ffe040', 'center');
  STOPS.forEach(function (s, i) {
    var on = ue >= s.u, y = 84 + i * 78;
    var slide = on ? 0 : 200;
    ctx.save(); ctx.globalAlpha = on ? 1 : 0.25;
    R(ctx, 556 + slide * 0, y, 100, 58, '#fff');
    if (s.bg) ctx.drawImage(IMG[s.bg], 558, y + 2, 96, 54);
    else { R(ctx, 558, y + 2, 96, 54, '#2a0a10'); if (IMG.logoP.width) ctx.drawImage(IMG.logoP, 584, y + 4, 50, 50); }
    text(s.id, 664, y + 6, 12, '#ffe040');
    var words = s.name.split(' ');
    var line1 = words.slice(0, Math.ceil(words.length / 2)).join(' '), line2 = words.slice(Math.ceil(words.length / 2)).join(' ');
    text(line1, 664, y + 26, 7, '#fff'); text(line2, 664, y + 38, 7, '#fff');
    ctx.restore();
  });
  // avion
  var p = pathAt(ue);
  var sc = 0.8 + Math.sin(u * Math.PI) * 0.5;
  var flip = Math.cos(p.ang) < 0;
  var ang = flip ? Math.atan2(Math.sin(p.ang), -Math.cos(p.ang)) * -1 : p.ang;
  // sombra
  disc(ctx, p.x + 16, p.y + 24, 8 * sc, 'rgba(0,0,0,0.3)', 2);
  drawPlane(p.x, p.y - 10 - Math.sin(u * Math.PI) * 20, sc, flip, ang * 0.5);
  // textos
  R(ctx, 0, 0, W, 40, 'rgba(0,0,0,0.75)');
  text('DE LA CEIBA A NACAOME, VALLE', W / 2, 14, 14, '#fff', 'center');
  if (G.t > INTRO_FLY) {
    var a = Math.min(1, (G.t - INTRO_FLY) / 20);
    ctx.save(); ctx.globalAlpha = a;
    R(ctx, 60, 170, 470, 70, 'rgba(0,0,0,0.8)');
    outlined('¡RUMBO AL', 295, 182, 16, '#ffe040', '#7a2a00', 2);
    outlined('CAMPEONATO!', 295, 208, 20, '#2a8cff', '#fff', 2);
    ctx.restore();
  }
  if (G.t % 60 < 40) text('ENTER: SALTAR', 20, 410, 8, '#fff');
}

function drawCard() {
  R(ctx, 0, 0, W, H, '#000');
  var d = LEVELS[G.level];
  text('MUNDO ' + d.id, W / 2, 120, 24, '#fff', 'center');
  text(d.name, W / 2, 162, 14, '#ffe040', 'center');
  drawJaiba(!!G.big, 'frente', W / 2 - 42, 272);
  text('x  ' + G.lives, W / 2 + 4, 232, 18, '#fff');
  if (G.level === 3 && IMG.logoP.width) { text('VS', W / 2, 300, 14, '#ff4040', 'center'); ctx.drawImage(IMG.logoP, W / 2 - 32, 324, 64, 62); }
  else if (IMG.logoV.width) ctx.drawImage(IMG.logoV, W / 2 - 30, 320, 60, 60);
  drawHUDmini();
}
function drawHUDmini() {
  text('JAIBA ' + ('000000' + G.score).slice(-6), 32, 14, 12);
  drawCoin(300, 2, 0); text('x' + ('0' + G.coins).slice(-2), 334, 14, 12);
}
function drawGameOver() {
  R(ctx, 0, 0, W, H, '#000');
  text('GAME OVER', W / 2, 190, 28, '#fff', 'center');
  text('PUNTOS ' + G.score, W / 2, 240, 12, '#ffe040', 'center');
}
var fireworks = [];
function drawVictory() {
  var gr3 = ctx.createLinearGradient(0, 0, 0, H);
  gr3.addColorStop(0, '#020a30'); gr3.addColorStop(1, '#0a3a9a');
  ctx.fillStyle = gr3; ctx.fillRect(0, 0, W, H);
  if (G.t % 25 === 0 && G.fwT !== G.t) {
    G.fwT = G.t;
    var cx = rnd(80, W - 80), cy = rnd(40, 200), c = ['#ffe040', '#2a8cff', '#ffffff', '#40e0ff', '#ff6060'][Math.floor(rnd(0, 5))];
    for (var i = 0; i < 28; i++) { var a = i / 28 * Math.PI * 2; fireworks.push({ x: cx, y: cy, vx: Math.cos(a) * rnd(2, 4), vy: Math.sin(a) * rnd(2, 4), life: 60, c: c }); }
    audio.noise(0.3, 0.08, 0, null, 400);
  }
  for (i = fireworks.length - 1; i >= 0; i--) {
    var f = fireworks[i]; f.x += f.vx; f.y += f.vy; f.vy += 0.06; f.vx *= 0.98; if (--f.life <= 0) { fireworks.splice(i, 1); continue; }
    R(ctx, f.x, f.y, 4, 4, f.c);
  }
  var tiles = TILES.jefe || TILES.playa;
  for (var x = 0; x < W / T + 1; x++) { ctx.drawImage(tiles.top[x % 3], x * T, 12 * T); ctx.drawImage(tiles.fill[x % 3], x * T, 13 * T); }
  if (IMG.logoV.width) ctx.drawImage(IMG.logoV, 40, 150, 140, 140);
  drawTrophy(W / 2, 384, 1.6);
  var jy = Math.abs(Math.sin(G.t * 0.1)) * -40;
  drawJaiba(true, 'frente', W / 2 + 100, 384 + jy);
  drawJaiba(true, 'frente2', W / 2 - 100, 384 + Math.abs(Math.sin(G.t * 0.1 + 1.5)) * -40);
  outlined('¡JAIBA BRAVA', W / 2, 40, 30, '#ffe040', '#7a2a00', 3);
  outlined('ES CAMPEÓN!', W / 2, 82, 30, '#2a8cff', '#ffffff', 3);
  text('EL CAMINO A SER CAMPEÓN: COMPLETADO', W / 2, 134, 10, '#fff', 'center');
  text('PUNTOS ' + ('000000' + G.score).slice(-6), W - 40, 170, 12, '#fff', 'right');
  text('MONEDAS x' + G.coins, W - 40, 192, 12, '#ffe040', 'right');
  if (G.t > 120 && G.t % 60 < 40) text('ENTER: MENÚ', W - 40, 230, 10, '#fff', 'right');
}

// ---------------------------------------------------------------- bucle principal
function step() {
  G.t++;
  if (pressed.KeyM) audio.toggleMute();
  switch (G.state) {
    case 'title': updateTitle(); break;
    case 'controls': if (K.okP() || pressed.Escape) setState('title'); break;
    case 'intro': updateIntro(); break;
    case 'card':
      if (G.t === 1) audio.stop();
      if (G.t > 150) startLevel();
      break;
    case 'play':
      if (pressed.KeyP || pressed.Escape || pressed.Enter) { G.paused = !G.paused; audio.sfx('pause'); if (audio.mGain) audio.mGain.gain.value = G.paused ? 0 : 1; }
      if (!G.paused) updatePlay();
      break;
    case 'goal': updateGoal(); break;
    case 'dying':
      if (G.t > 30) { P.vy += 0.5; P.y += P.vy; }
      if (G.t > 170) {
        G.lives--;
        if (G.lives <= 0) { saveTop(); audio.sfx('over'); setState('gameover'); }
        else setState('card');
      }
      break;
    case 'gameover': if (G.t > 220) { setState('title'); audio.play('over'); } break;
    case 'victory':
      if (G.t > 120 && K.okP()) { setState('title'); audio.play('over'); }
      break;
  }
  pressed = {};
}
function draw() {
  ctx.imageSmoothingEnabled = false;
  switch (G.state) {
    case 'loading': R(ctx, 0, 0, W, H, '#000'); text('CARGANDO...', W / 2, H / 2 - 8, 14, '#fff', 'center'); break;
    case 'title': drawTitle(); break;
    case 'controls': drawControls(); break;
    case 'intro': drawIntro(); break;
    case 'card': drawCard(); break;
    case 'play': case 'goal': case 'dying':
      drawWorld(); drawHUD();
      if (G.dialog > 0) drawDialog();
      if (G.state === 'goal' && G.golT > 0) {
        var s = 30 + Math.sin(G.t * 0.3) * 4;
        outlined('¡GOOOL!', W / 2, 150, Math.round(s), '#ffe040', '#0a3a9a', 3);
      }
      if (G.paused) { R(ctx, 0, 0, W, H, 'rgba(0,0,0,0.5)'); text('PAUSA', W / 2, H / 2 - 12, 24, '#fff', 'center'); }
      break;
    case 'gameover': drawGameOver(); break;
    case 'victory': drawVictory(); break;
  }
}
var last = 0, acc = 0, STEP = 1000 / 60;
function frame(ts) {
  if (!last) last = ts;
  acc += Math.min(100, ts - last); last = ts;
  var n = 0;
  requestAnimationFrame(frame);
  try {
    while (acc >= STEP && n < 5) { step(); acc -= STEP; n++; }
    draw();
  } catch (e) { if (window.console) console.error(e); }
}

loadAssets(function () {
  var go = function () {
    // ?nivel=N salta directo a un nivel (1-4) para practicar
    var m = /[?&]nivel=(\d)/.exec(location.search || '');
    if (m && +m[1] >= 1 && +m[1] <= LEVELS.length) { G.level = +m[1] - 1; setState('card'); }
    else { setState('title'); audio.play('over'); }
  };
  if (document.fonts && document.fonts.load) {
    var done = false, fin = function () { if (!done) { done = true; go(); } };
    document.fonts.load('16px "Press Start 2P"').then(fin, fin);
    setTimeout(fin, 2500);
  } else go();
});
requestAnimationFrame(frame);
// ?debug expone el estado para pruebas automaticas
if (/[?&]debug/.test(location.search || '')) {
  window.__sjb = { G: G, step: step, draw: draw, keys: function () { return keys; },
    setKey: function (c, v) { if (v && !keys[c]) pressed[c] = true; keys[c] = v; },
    get P() { return P; }, get boss() { return boss; } };
}
})();
