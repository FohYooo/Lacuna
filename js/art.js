'use strict';
// Scratchboard engine: every picture is painted in greyscale, then converted
// into thousands of short bone-white strokes on black.

const W = 1280, H = 720, S = 1.25;
const C = { paper: '#ddd4c2', black: '#060505', red: '#c40f18', redD: '#7a060c', yellow: '#efbe12' };

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;

function rng(seed) {
  let a = (seed * 2654435761) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mkc(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.round(w);
  c.height = Math.round(h);
  return c;
}

function gray(v, a = 1) {
  const c = Math.round(clamp(v, 0, 1) * 255);
  return `rgba(${c},${c},${c},${a})`;
}

// Greyscale painting helpers (logical coordinates).
const P = {
  fill(g, v) { g.fillStyle = gray(v); g.fillRect(0, 0, W, H); },
  rect(g, x, y, w, h, v, a = 1) { g.fillStyle = gray(v, a); g.fillRect(x, y, w, h); },
  poly(g, pts, v, a = 1) {
    g.beginPath();
    pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
    g.closePath();
    g.fillStyle = typeof v === 'number' ? gray(v, a) : v;
    g.fill();
  },
  ell(g, x, y, rx, ry, v, a = 1, rot = 0) {
    g.beginPath();
    g.ellipse(x, y, rx, ry, rot, 0, 7);
    g.fillStyle = typeof v === 'number' ? gray(v, a) : v;
    g.fill();
  },
  line(g, x0, y0, x1, y1, w, v, a = 1) {
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1);
    g.lineWidth = w; g.strokeStyle = gray(v, a); g.stroke();
  },
  vgrad(g, x, y, w, h, stops) {
    const gr = g.createLinearGradient(0, y, 0, y + h);
    stops.forEach(s => gr.addColorStop(s[0], gray(s[1])));
    g.fillStyle = gr; g.fillRect(x, y, w, h);
  },
  linear(g, x0, y0, x1, y1, stops) {
    const gr = g.createLinearGradient(x0, y0, x1, y1);
    stops.forEach(s => gr.addColorStop(s[0], gray(s[1], s[2] === undefined ? 1 : s[2])));
    return gr;
  },
  glow(g, x, y, r, v, a = 1) {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, gray(v, a));
    gr.addColorStop(1, gray(v, 0));
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = gr;
    g.fillRect(x - r, y - r, r * 2, r * 2);
    g.restore();
  },
  shade(g, x, y, r, a) {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(0,0,0,${a})`);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  },
  arch(g, x, y, w, h, v) {
    g.beginPath();
    g.moveTo(x, y + h);
    g.lineTo(x, y + w / 2);
    g.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0);
    g.lineTo(x + w, y + h);
    g.closePath();
    g.fillStyle = typeof v === 'number' ? gray(v) : v;
    g.fill();
  },
};

// Turn a greyscale buffer into engraved strokes.
function engrave(src, opts) {
  const o = Object.assign({ seed: 1, density: 1, base: -0.85, gamma: 1.3, transparent: false, cell: 3.1, lmin: 5, lmax: 19, ink: C.paper }, opts);
  const sw = src.width, sh = src.height, lw = sw * 2, lh = sh * 2;
  const out = mkc(lw * S, lh * S);
  const g = out.getContext('2d');
  g.scale(S, S);
  if (o.transparent) {
    g.drawImage(src, 0, 0, lw, lh);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = C.black;
    g.fillRect(0, 0, lw, lh);
    g.globalCompositeOperation = 'source-over';
  } else {
    g.fillStyle = C.black;
    g.fillRect(0, 0, lw, lh);
  }
  const d = src.getContext('2d').getImageData(0, 0, sw, sh).data;
  const L = (x, y) => {
    x |= 0; y |= 0;
    if (x < 0) x = 0; else if (x >= sw) x = sw - 1;
    if (y < 0) y = 0; else if (y >= sh) y = sh - 1;
    const i = (y * sw + x) * 4;
    return d[i + 3] < 10 ? -1 : d[i] / 255;
  };
  const R = rng(o.seed);
  const bins = [[], [], []];
  const cell = o.cell / Math.sqrt(o.density);
  for (let y = 0; y < lh; y += cell) {
    for (let x = 0; x < lw; x += cell) {
      const px = x + R() * cell, py = y + R() * cell;
      const sx = px / 2, sy = py / 2;
      const l = L(sx, sy);
      if (l < 0 || R() > Math.pow(l, o.gamma)) continue;
      const gx = Math.max(L(sx + 2, sy), 0) - Math.max(L(sx - 2, sy), 0);
      const gy = Math.max(L(sx, sy + 2), 0) - Math.max(L(sx, sy - 2), 0);
      let a = Math.abs(gx) + Math.abs(gy) > 0.05
        ? Math.atan2(gy, gx) + Math.PI / 2
        : o.base + Math.sin(px * 0.008 + py * 0.012) * 0.4;
      a += (R() - 0.5) * 0.34;
      const len = (o.lmin + R() * (o.lmax - o.lmin)) * (0.55 + 0.6 * l) * 0.5;
      const ca = Math.cos(a) * len, sa = Math.sin(a) * len;
      bins[l < 0.38 ? 0 : l < 0.72 ? 1 : 2].push(px - ca, py - sa, px + ca, py + sa);
    }
  }
  g.strokeStyle = o.ink;
  g.lineCap = 'round';
  [0.7, 1.15, 2.0].forEach((w, b) => {
    g.lineWidth = w;
    g.globalAlpha = [0.72, 0.9, 1][b];
    g.beginPath();
    const a = bins[b];
    for (let i = 0; i < a.length; i += 4) { g.moveTo(a[i], a[i + 1]); g.lineTo(a[i + 2], a[i + 3]); }
    g.stroke();
  });
  g.globalAlpha = 1;
  return out;
}

// Paint a logical w*h picture at half resolution and engrave several "boil" frames.
function engraveFrames(paint, w, h, frames, opts) {
  const buf = mkc(w / 2, h / 2);
  const g = buf.getContext('2d', { willReadFrequently: true });
  g.scale(0.5, 0.5);
  g.lineCap = 'round';
  paint(g);
  const out = [];
  for (let i = 0; i < frames; i++) out.push(engrave(buf, Object.assign({}, opts, { seed: (opts.seed || 7) + i * 31 })));
  return out;
}

// Vector blood.
function splat(g, x, y, r, R, col) {
  g.fillStyle = col || C.red;
  g.beginPath();
  const n = 22;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r * (0.55 + R() * 0.55) * (R() < 0.16 ? 1.5 : 1);
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
    i ? g.lineTo(px, py) : g.moveTo(px, py);
  }
  g.closePath();
  g.fill();
  const drops = 16 + (R() * 16) | 0;
  for (let i = 0; i < drops; i++) {
    const a = R() * 7, d = r * (1 + R() * R() * 3.6), s = (1 - d / (r * 5)) * r * 0.13 * (0.4 + R());
    g.beginPath();
    g.ellipse(x + Math.cos(a) * d, y + Math.sin(a) * d, Math.max(s, 0.6) * 1.5, Math.max(s, 0.6), a, 0, 7);
    g.fill();
  }
}

// A bezier teardrop, used by the rhythm game.
function drop(g, x, y, r, col) {
  g.fillStyle = col || C.red;
  g.beginPath();
  g.moveTo(x, y - r * 1.8);
  g.bezierCurveTo(x + r * 0.5, y - r * 0.8, x + r, y - r * 0.2, x + r, y + r * 0.2);
  g.arc(x, y + r * 0.2, r, 0, Math.PI);
  g.bezierCurveTo(x - r, y - r * 0.2, x - r * 0.5, y - r * 0.8, x, y - r * 1.8);
  g.fill();
}
