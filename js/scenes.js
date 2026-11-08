'use strict';
// Every location, character and scare face, as greyscale paintings plus a live vector layer.

const Art = (() => {
  const scenes = {}, chars = {}, scareDefs = {};

  // ---------- body parts ----------
  function torso(g, cx, ty, w, v0, v1) {
    g.beginPath();
    g.moveTo(cx - w, 720);
    g.bezierCurveTo(cx - w, ty + 80, cx - w * 0.55, ty + 22, cx - 62, ty);
    g.lineTo(cx + 62, ty);
    g.bezierCurveTo(cx + w * 0.55, ty + 22, cx + w, ty + 80, cx + w, 720);
    g.closePath();
    g.fillStyle = P.linear(g, cx - w, 0, cx + w, 0, [[0, v0], [1, v1]]);
    g.fill();
  }
  function neck(g, cx, y0, y1, hw, v0, v1) {
    g.fillStyle = P.linear(g, cx - hw, 0, cx + hw, 0, [[0, v0], [1, v1]]);
    g.fillRect(cx - hw, y0, hw * 2, y1 - y0);
  }
  function headPath(g, h) {
    const { rx, ry } = h;
    g.beginPath();
    g.moveTo(-rx, -ry * 0.22);
    g.bezierCurveTo(-rx, -ry * 1.08, rx, -ry * 1.08, rx, -ry * 0.22);
    g.bezierCurveTo(rx, ry * 0.5, rx * 0.34, ry, 0, ry);
    g.bezierCurveTo(-rx * 0.34, ry, -rx, ry * 0.5, -rx, -ry * 0.22);
    g.closePath();
  }
  function head(g, h, v0, v1) {
    g.save();
    g.translate(h.x, h.y);
    g.rotate(h.tilt || 0);
    headPath(g, h);
    g.fillStyle = P.linear(g, -h.rx, -h.ry * 0.4, h.rx, h.ry * 0.4, [[0, v0], [0.55, (v0 + v1) * 0.56], [1, v1]]);
    g.fill();
    g.clip();
    // sockets and the long nose shadow
    P.ell(g, -h.rx * 0.42, -h.ry * 0.16, h.rx * 0.34, h.ry * 0.11, 0, 0.42);
    P.ell(g, h.rx * 0.42, -h.ry * 0.16, h.rx * 0.34, h.ry * 0.11, 0, 0.5);
    P.poly(g, [[h.rx * 0.02, -h.ry * 0.2], [h.rx * 0.17, h.ry * 0.3], [h.rx * 0.02, h.ry * 0.36]], 0, 0.42);
    P.ell(g, 0, h.ry * 0.62, h.rx * 0.34, h.ry * 0.05, 0, 0.3);
    g.restore();
  }
  function onHead(g, h, fn) {
    g.save(); g.translate(h.x, h.y); g.rotate(h.tilt || 0); fn(); g.restore();
  }
  function almond(g, x, y, w, h, rot, col) {
    g.save(); g.translate(x, y); g.rotate(rot || 0);
    g.beginPath();
    g.moveTo(-w, 0);
    g.quadraticCurveTo(0, -h * 1.5, w, 0);
    g.quadraticCurveTo(0, h * 1.5, -w, 0);
    g.closePath();
    g.fillStyle = col;
    g.fill();
    g.restore();
  }
  function ln(g, pts, w, col) {
    g.lineWidth = w; g.strokeStyle = col; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath();
    pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
    g.stroke();
  }
  function curve(g, x0, y0, cx, cy, x1, y1, w, col) {
    g.lineWidth = w; g.strokeStyle = col; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(cx, cy, x1, y1); g.stroke();
  }
  function stitches(g, pts, j, col, gap = 15, len = 8) {
    ln(g, pts, 1.8, col);
    for (let i = 0; i < pts.length - 1; i++) {
      const [a, b] = [pts[i], pts[i + 1]];
      const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const nx = -(b[1] - a[1]) / d, ny = (b[0] - a[0]) / d;
      for (let s = 0; s < d; s += gap) {
        const x = a[0] + (b[0] - a[0]) * s / d, y = a[1] + (b[1] - a[1]) * s / d;
        ln(g, [[x - nx * len + j(1), y - ny * len + j(1)], [x + nx * len + j(1), y + ny * len + j(1)]], 1.6, col);
      }
    }
  }

  // ---------- locations ----------
  function bed(g, x, y, w, body) {
    const h = w * 0.42;
    P.rect(g, x, y - h * 0.55, 5, h * 1.5, 0.45);
    P.rect(g, x + w - 5, y - h * 0.55, 5, h * 1.5, 0.45);
    P.line(g, x, y - h * 0.55, x + w, y - h * 0.55, 4, 0.5);
    P.rect(g, x + 2, y, w - 4, h * 0.6, 0.52);
    P.ell(g, x + w * 0.5, y - h * 0.02, w * 0.2, h * 0.16, 0.8);
    if (body) P.ell(g, x + w * 0.5, y + h * 0.24, w * 0.34, h * 0.28, 0.72);
    P.rect(g, x + 2, y + h * 0.6, w - 4, 4, 0.2);
    P.line(g, x + 6, y + h * 0.6, x + 6, y + h * 0.98, 3, 0.35);
    P.line(g, x + w - 6, y + h * 0.6, x + w - 6, y + h * 0.98, 3, 0.35);
  }

  scenes.ward = {
    gray(g) {
      P.vgrad(g, 0, 0, W, 440, [[0, 0.05], [1, 0.19]]);
      P.vgrad(g, 0, 440, W, 280, [[0, 0.2], [1, 0.03]]);
      [150, 565, 980].forEach(x => {
        P.arch(g, x, 64, 150, 310, P.linear(g, 0, 64, 0, 374, [[0, 0.98], [1, 0.62]]));
        for (let i = 1; i < 3; i++) P.rect(g, x + i * 50 - 3, 64, 6, 310, 0.02);
        for (let i = 1; i < 5; i++) P.rect(g, x, 64 + i * 66, 150, 5, 0.02);
        P.glow(g, x + 75, 220, 300, 0.32);
        P.poly(g, [[x, 470], [x + 150, 470], [x + 280, 720], [x - 40, 720]], 0.6, 0.45);
      });
      [55, 405, 765, 1085].forEach((x, i) => bed(g, x, 400, 150, i !== 2));
      P.poly(g, [[0, 720], [0, 628], [330, 596], [640, 640], [980, 590], [1280, 630], [1280, 720]], 0.34);
      P.rect(g, 120, 548, 13, 172, 0.14);
      P.rect(g, 1147, 548, 13, 172, 0.14);
      P.rect(g, 120, 548, 1040, 12, 0.2);
    },
    top(g) {
      g.fillStyle = C.paper; g.beginPath(); g.arc(640, 40, 24, 0, 7); g.fill();
      ln(g, [[640, 40], [650, 30]], 3, C.black);
      ln(g, [[640, 40], [649, 58]], 2, C.black);
      ln(g, [[1000, 620], [1020, 630]], 2.2, C.redD);
    },
  };

  scenes.corridor = {
    fry: { id: 'corridor', x: 958, y: 490, rot: 0.25 },
    gray(g) {
      P.fill(g, 0.03);
      const fx0 = 560, fx1 = 720, fy0 = 268, fy1 = 402;
      P.poly(g, [[0, 720], [W, 720], [fx1, fy1], [fx0, fy1]], P.linear(g, 0, 720, 0, fy1, [[0, 0.1], [0.75, 0.3], [1, 0.62]]));
      P.poly(g, [[0, 0], [W, 0], [fx1, fy0], [fx0, fy0]], P.linear(g, 0, 0, 0, fy0, [[0, 0.09], [1, 0.3]]));
      P.poly(g, [[0, 0], [fx0, fy0], [fx0, fy1], [0, 720]], P.linear(g, 0, 0, fx0, 0, [[0, 0.1], [1, 0.46]]));
      P.poly(g, [[W, 0], [fx1, fy0], [fx1, fy1], [W, 720]], P.linear(g, W, 0, fx1, 0, [[0, 0.07], [1, 0.42]]));
      // lift at the far end
      P.rect(g, fx0, fy0, 160, fy1 - fy0, 0.72);
      P.rect(g, 638, fy0, 4, fy1 - fy0, 0.02);
      P.rect(g, fx0, fy0, 160, 8, 0.2);
      // doors
      const K = [0.16, 0.3, 0.46, 0.6, 0.72, 0.8];
      for (let i = 0; i < K.length; i += 2) {
        [0, 1].forEach(side => {
          const a = K[i], b = K[i + 1];
          const x0 = side ? lerp(W, fx1, a) : lerp(0, fx0, a), x1 = side ? lerp(W, fx1, b) : lerp(0, fx0, b);
          const t0 = lerp(0, fy0, a) + (1 - a) * 60, t1 = lerp(0, fy0, b) + (1 - b) * 60;
          P.poly(g, [[x0, t0], [x1, t1], [x1, lerp(720, fy1, b)], [x0, lerp(720, fy1, a)]], 0.05);
          const wy0 = lerp(t0, lerp(720, fy1, a), 0.14), wy1 = lerp(t1, lerp(720, fy1, b), 0.14);
          const wh0 = lerp(0, 90, 1 - a), wh1 = lerp(0, 90, 1 - b);
          P.poly(g, [[lerp(x0, x1, 0.25), wy0], [lerp(x0, x1, 0.75), wy1], [lerp(x0, x1, 0.75), wy1 + wh1], [lerp(x0, x1, 0.25), wy0 + wh0]], 0.34);
        });
      }
      // tube lights
      [0.12, 0.35, 0.55, 0.72, 0.85].forEach(k => {
        const y = lerp(4, fy0, k), hw = lerp(120, 12, k), h = lerp(16, 2, k);
        P.rect(g, 640 - hw, y, hw * 2, h, 0.99);
        P.glow(g, 640, y, lerp(420, 60, k), 0.3);
        P.glow(g, 640, lerp(716, fy1, k), lerp(360, 70, k), 0.22);
      });
      // wall phone
      P.rect(g, 118, 288, 74, 118, 0.42);
      P.rect(g, 131, 303, 48, 52, 0.17);
      P.ell(g, 155, 330, 16, 16, 0.65);
      P.rect(g, 100, 296, 16, 100, 0.72);
      // wheelchair, abandoned
      P.ell(g, 930, 590, 68, 68, 0.03);
      P.ell(g, 930, 590, 62, 62, 0.42);
      P.ell(g, 930, 590, 54, 54, 0.04);
      P.rect(g, 906, 454, 8, 136, 0.5);
      P.rect(g, 906, 500, 106, 10, 0.5);
      P.rect(g, 1006, 440, 8, 142, 0.5);
      P.line(g, 930, 590, 994, 590, 3, 0.42);
      P.line(g, 930, 590, 930, 530, 3, 0.42);
      P.ell(g, 1035, 636, 20, 20, 0.34);
      P.ell(g, 1035, 636, 14, 14, 0.04);
    },
    top(g, t) {
      if (Math.sin(t * 13) + Math.sin(t * 29.3) > 1.62) { g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(0, 0, W, H); }
    },
  };

  scenes.closet = {
    gray(g) {
      P.fill(g, 0.02);
      for (let s = 0; s < 4; s++) {
        const y = 100 + s * 148;
        P.rect(g, 90, y + 114, 1040, 12, 0.14);
        for (let i = 0; i < 8; i++) P.rect(g, 104 + i * 128, y + 40 + (i % 3) * 8, 118, 74 - (i % 3) * 8, 0.13 + (i % 4) * 0.035);
      }
      for (let i = 0; i < 10; i++) {
        const y = 60 + i * 66;
        P.poly(g, [[W, y], [W, y + 18], [40, y + 150], [40, y + 112]], 0.9, 0.5);
      }
    },
  };

  scenes.chapel = {
    fry: { id: 'chapel', x: 205, y: 484, rot: -0.3 },
    gray(g) {
      P.vgrad(g, 0, 0, W, 470, [[0, 0.03], [1, 0.1]]);
      P.vgrad(g, 0, 470, W, 250, [[0, 0.16], [1, 0.03]]);
      // lancet window
      g.beginPath();
      g.moveTo(490, 450); g.lineTo(490, 210);
      g.quadraticCurveTo(500, 90, 640, 20);
      g.quadraticCurveTo(780, 90, 790, 210);
      g.lineTo(790, 450); g.closePath();
      g.fillStyle = gray(0.82); g.fill();
      for (let i = 1; i < 6; i++) P.rect(g, 490 + i * 50 - 2, 20, 4, 440, 0.04);
      for (let i = 0; i < 8; i++) P.rect(g, 490, 90 + i * 52, 300, 4, 0.04);
      // the saint, cut out
      P.ell(g, 640, 150, 44, 52, 0.01);
      P.poly(g, [[586, 450], [604, 216], [676, 216], [694, 450]], 0.01);
      P.glow(g, 640, 240, 470, 0.26);
      P.poly(g, [[490, 460], [790, 460], [1000, 720], [280, 720]], 0.7, 0.3);
      // pews
      for (let i = 0; i < 4; i++) {
        const y = 490 + i * 56, sh = 0.9 + i * 0.3;
        [[0, 470 - i * 56], [810 + i * 56, 470 - i * 56]].forEach(([x, w]) => {
          P.rect(g, x, y, w, 58 * sh, 0.05);
          P.rect(g, x, y, w, 8 * sh, 0.5);
        });
      }
      // candle rack
      P.rect(g, 134, 404, 228, 12, 0.3);
      P.rect(g, 142, 416, 10, 96, 0.3);
      P.rect(g, 344, 416, 10, 96, 0.3);
      for (let i = 0; i < 9; i++) {
        const x = 148 + i * 25;
        P.rect(g, x, 372 + (i % 3) * 8, 8, 34 - (i % 3) * 8, 0.85);
        P.glow(g, x + 4, 360 + (i % 3) * 8, 44, 0.65);
      }
      // collection plate
      P.rect(g, 1016, 512, 88, 12, 0.55);
      P.ell(g, 1060, 509, 58, 16, 0.5);
      P.ell(g, 1060, 507, 44, 10, 0.16);
      P.rect(g, 1052, 524, 16, 190, 0.3);
    },
    top(g, t) {
      const a = 0.42 + 0.08 * Math.sin(t * 1.2);
      g.fillStyle = `rgba(196,15,24,${a})`;
      for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 8; j++) {
          if ((i * 3 + j * 5) % 4 > 1) continue;
          const x = 490 + i * 50, y = 90 + j * 52;
          if (x > 585 && x < 690) continue;
          g.fillRect(x + 3, y + 5, 45, 45);
        }
      }
    },
  };

  scenes.morgue = {
    fry: { id: 'morgue', x: 92, y: 470, rot: 0.5 },
    gray(g) {
      P.vgrad(g, 0, 0, W, 500, [[0, 0.06], [1, 0.16]]);
      P.vgrad(g, 0, 500, W, 220, [[0, 0.22], [1, 0.05]]);
      for (let i = 0; i < 16; i++) P.line(g, 0, 500 + i * i * 1.1, W, 500 + i * i * 1.1, 1, 0);
      for (let i = -12; i < 13; i++) P.line(g, 640 + i * 54, 500, 640 + i * 150, 720, 1, 0);
      let n = 1;
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 5; c++) {
          const x = 170 + c * 190, y = 118 + r * 124;
          P.rect(g, x, y, 176, 110, P.linear(g, x, y, x, y + 110, [[0, 0.62], [1, 0.3]]));
          P.rect(g, x + 6, y + 6, 164, 98, 0.18);
          P.rect(g, x + 10, y + 10, 156, 90, 0.46);
          P.rect(g, x + 70, y + 72, 36, 10, 0.08);
          P.rect(g, x + 64, y + 26, 48, 22, 0.86);
          n++;
        }
      }
      P.shade(g, 0, 300, 480, 0.75);
      P.shade(g, W, 300, 480, 0.75);
      P.glow(g, 640, 76, 460, 0.33);
      P.ell(g, 640, 76, 20, 26, 1);
      P.rect(g, 637, 0, 6, 54, 0.3);
      P.ell(g, 640, 640, 42, 12, 0.02);
      // slab
      P.poly(g, [[110, 610], [560, 610], [610, 720], [40, 720]], 0.66);
      P.poly(g, [[140, 620], [520, 620], [560, 720], [90, 720]], 0.82);
      P.ell(g, 200, 620, 54, 30, 0.9);
    },
    top(g) {
      g.font = "700 15px 'Courier New', monospace"; g.textAlign = 'center'; g.fillStyle = C.black;
      let n = 1;
      for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) { g.fillText(String(n++), 258 + c * 190, 124 + r * 124 + 37); }
      g.fillStyle = C.red;
      g.fillRect(660, 349, 150, 4);
      g.fillRect(712, 349, 5, 34);
      g.fillRect(760, 349, 3, 18);
    },
  };

  scenes.theatre = {
    gray(g) {
      P.fill(g, 0.03);
      // gallery of the dead, in tiers
      const R = rng(19);
      for (let row = 0; row < 4; row++) {
        const y = 90 + row * 118, sc = 0.72 + row * 0.2;
        [[10, 335], [945, 1275]].forEach(([a, b]) => {
          P.rect(g, a - 20, y + 58 * sc, b - a + 40, 10, 0.3);
          for (let x = a + 26; x < b; x += 68 * sc) {
            const dx = (R() - 0.5) * 8, v = 0.46 + R() * 0.28;
            P.ell(g, x + dx, y + 66 * sc, 32 * sc, 40 * sc, v * 0.45);
            P.ell(g, x + dx, y + 8 * sc, 19 * sc, 28 * sc, v);
            P.ell(g, x + dx - 7 * sc, y + 3 * sc, 4.5 * sc, 7 * sc, 0.02);
            P.ell(g, x + dx + 7 * sc, y + 3 * sc, 4.5 * sc, 7 * sc, 0.02);
            P.ell(g, x + dx, y + 22 * sc, 4 * sc, 3 * sc, 0.02);
          }
        });
      }
      // lamp
      P.glow(g, 640, 200, 640, 0.48);
      P.ell(g, 640, 200, 236, 188, 0.4);
      P.ell(g, 640, 200, 216, 170, 0.08);
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + 0.4;
        const x = 640 + Math.cos(a) * 132, y = 200 + Math.sin(a) * 104;
        P.ell(g, x, y, 46, 38, 1);
        P.glow(g, x, y, 92, 0.7);
      }
      P.ell(g, 640, 200, 44, 34, 1);
      P.rect(g, 630, 0, 20, 24, 0.5);
      // your own body under the sheet
      P.poly(g, [[520, 470], [760, 470], [900, 720], [380, 720]], P.linear(g, 0, 470, 0, 720, [[0, 0.78], [1, 0.5]]));
      P.ell(g, 590, 470, 30, 42, 0.86);
      P.ell(g, 690, 470, 30, 42, 0.86);
      // tray
      P.poly(g, [[930, 610], [1200, 610], [1260, 720], [880, 720]], 0.5);
      for (let i = 0; i < 6; i++) P.line(g, 960 + i * 42, 628, 950 + i * 50, 702, 4, 0.92);
    },
  };

  scenes.jars = {
    gray(g) {
      P.fill(g, 0.04);
      const R = rng(77);
      for (let r = 0; r < 4; r++) {
        const y = 22 + r * 138;
        for (let c = 0; c < 12; c++) {
          const x = 24 + c * 104, h = 86 + R() * 26, top = y + 116 - h;
          P.rect(g, x, top, 84, h, P.linear(g, x, 0, x + 84, 0, [[0, 0.58], [0.3, 0.3], [1, 0.1]]));
          P.rect(g, x - 2, top - 10, 88, 12, 0.72);
          const k = R();
          if (k < 0.3) P.ell(g, x + 42, top + h * 0.56, 28, 34, 0.75);
          else if (k < 0.6) { P.ell(g, x + 30, top + h * 0.5, 15, 28, 0.8); P.ell(g, x + 54, top + h * 0.6, 16, 24, 0.68); }
          else if (k < 0.8) { P.ell(g, x + 42, top + h * 0.5, 22, 22, 0.9); P.ell(g, x + 42, top + h * 0.5, 9, 9, 0.02); }
          else P.rect(g, x + 28, top + 16, 26, h - 26, 0.7);
          P.rect(g, x + 16, top + h - 26, 52, 18, 0.86);
        }
        P.rect(g, 0, y + 116, W, 12, 0.36);
      }
      P.shade(g, 0, 340, 640, 0.8);
      P.shade(g, W, 340, 640, 0.8);
      P.glow(g, 640, 300, 460, 0.22);
      P.poly(g, [[0, 720], [130, 590], [1150, 590], [W, 720]], 0.2);
      P.poly(g, [[430, 690], [480, 606], [800, 606], [850, 690]], 0.88);
      P.line(g, 640, 606, 640, 690, 3, 0.1);
    },
  };

  function mirrorFace(g) {
    const h = { x: 640, y: 330, rx: 108, ry: 176, tilt: 0.02 };
    torso(g, 640, 540, 190, 0.45, 0.1);
    neck(g, 640, 450, 560, 48, 0.62, 0.15);
    head(g, h, 0.9, 0.22);
    return h;
  }
  function mirrorBase(g) {
    P.fill(g, 0.02);
    P.ell(g, 640, 350, 290, 346, 0.48);
    P.ell(g, 640, 350, 266, 324, 0.08);
    g.save();
    g.beginPath(); g.ellipse(640, 350, 262, 320, 0, 0, 7); g.clip();
    P.glow(g, 460, 150, 420, 0.3);
    mirrorFace(g);
    g.restore();
  }
  function mirrorEyes(g) {
    almond(g, 594, 300, 34, 13, -0.06, C.black);
    almond(g, 686, 300, 34, 13, 0.06, C.black);
    g.fillStyle = C.paper;
    g.beginPath(); g.arc(590, 298, 3.4, 0, 7); g.arc(682, 298, 3.4, 0, 7); g.fill();
    ln(g, [[556, 266], [594, 256], [628, 268]], 3, C.black);
    ln(g, [[652, 268], [686, 256], [724, 266]], 3, C.black);
    ln(g, [[596, 438], [640, 448], [684, 438]], 3, C.black);
  }
  scenes.mirror = { gray: mirrorBase, top(g) { mirrorEyes(g); } };
  scenes.mirror_seams = {
    gray: mirrorBase,
    top(g, t, j) {
      mirrorEyes(g);
      stitches(g, [[532, 280], [594, 326], [640, 318], [690, 330], [748, 278]], j, C.red);
      stitches(g, [[640, 172], [628, 238], [646, 318], [634, 410], [642, 505]], j, C.red);
      stitches(g, [[552, 398], [600, 470], [660, 512], [714, 470], [734, 396]], j, C.red);
      stitches(g, [[592, 556], [640, 574], [690, 556]], j, C.red);
    },
  };

  scenes.lot = {
    fry: null,
    gray(g) {
      P.vgrad(g, 0, 0, W, 410, [[0, 0.01], [1, 0.09]]);
      P.poly(g, [[0, 720], [W, 720], [W, 410], [0, 410]], P.linear(g, 0, 410, 0, 720, [[0, 0.17], [1, 0.05]]));
      for (let i = 0; i < 7; i++) {
        const k = i / 7;
        P.poly(g, [[640 + (-450 + k * 300) * 0.04, 412], [640 + (-430 + k * 300) * 0.04, 412], [640 + (-430 + k * 300) * 2.8, 720], [640 + (-450 + k * 300) * 2.8, 720]], 0.5, 0.6);
      }
      for (const [x, y, s] of [[180, 410, 1], [1100, 410, 1], [420, 412, 0.5], [860, 412, 0.5]]) {
        P.rect(g, x - 3 * s, y - 300 * s, 6 * s, 300 * s, 0.34);
        P.rect(g, x - 30 * s, y - 304 * s, 60 * s, 8 * s, 0.9);
        P.poly(g, [[x - 26 * s, y - 296 * s], [x + 26 * s, y - 296 * s], [x + 190 * s, y + 120 * s], [x - 190 * s, y + 120 * s]], 0.78, 0.2);
      }
      // drive-thru speaker post
      P.rect(g, 1006, 480, 16, 240, 0.34);
      P.rect(g, 946, 404, 136, 150, 0.38);
      P.rect(g, 958, 416, 112, 126, 0.08);
      for (let i = 0; i < 7; i++) P.rect(g, 970, 428 + i * 15, 88, 5, 0.42);
      P.rect(g, 636, 150, 8, 262, 0.3);
    },
    top(g, t) {
      const a = 0.82 + (Math.sin(t * 31) > 0.86 ? -0.5 : 0);
      g.save();
      g.globalAlpha = a;
      g.shadowColor = C.yellow; g.shadowBlur = 42;
      g.fillStyle = C.yellow;
      g.fillRect(508, 62, 264, 102);
      g.shadowBlur = 0;
      g.fillStyle = C.black;
      g.font = "900 44px Impact, 'Arial Black', sans-serif"; g.textAlign = 'center';
      g.fillText('YUM-YUM', 640, 112);
      g.font = "700 18px 'Arial Black', sans-serif";
      g.fillText('ALL ARE FED', 640, 148);
      g.restore();
    },
  };

  scenes.dawn = {
    gray(g) {
      P.vgrad(g, 0, 0, W, 400, [[0, 0.3], [0.7, 0.76], [1, 0.96]]);
      P.ell(g, 640, 398, 120, 120, 1);
      P.glow(g, 640, 390, 520, 0.42);
      P.vgrad(g, 0, 400, W, 320, [[0, 0.66], [1, 0.14]]);
      for (let i = 0; i < 14; i++) P.rect(g, 640 - 150 + i * 8, 412 + i * i * 1.45, 300 - i * 16, 3 + i * 0.8, 1);
      P.poly(g, [[0, 400], [0, 340], [180, 370], [340, 356], [520, 394], [520, 400]], 0.1);
      P.poly(g, [[W, 400], [W, 330], [1090, 372], [940, 352], [760, 396], [760, 400]], 0.1);
      P.poly(g, [[0, 720], [0, 584], [240, 720]], 0.02);
    },
  };

  scenes.cottage = {
    gray(g) {
      P.vgrad(g, 0, 0, W, H, [[0, 0.04], [1, 0.09]]);
      P.rect(g, 420, 90, 300, 330, 0.5);
      P.rect(g, 432, 102, 276, 306, 0.12);
      P.rect(g, 566, 102, 8, 306, 0.5);
      P.rect(g, 432, 250, 276, 8, 0.5);
      P.ell(g, 636, 170, 30, 30, 0.96);
      P.glow(g, 636, 170, 300, 0.2);
      P.poly(g, [[60, 720], [220, 470], [1060, 470], [1220, 720]], 0.44);
      P.poly(g, [[260, 480], [540, 480], [510, 590], [190, 590]], 0.82);
      P.ell(g, 480, 500, 88, 36, 0.3);
      P.ell(g, 700, 560, 300, 74, 0.56);
    },
  };

  scenes.white = {
    gray(g) { P.fill(g, 0.98); P.shade(g, 640, 360, 300, 0.02); },
  };
  scenes.black = { gray(g) { P.fill(g, 0); } };

  function heartPaint(g) {
    P.fill(g, 0.015);
    P.glow(g, 640, 350, 480, 0.1);
    // great vessels
    const v = (x, y0, x1, y1, w, a, b) => {
      g.lineCap = 'butt';
      g.lineWidth = w;
      g.strokeStyle = P.linear(g, x - w, 0, x + w, 0, [[0, a], [1, b]]);
      g.beginPath(); g.moveTo(x, y0); g.bezierCurveTo(x, y0 - 90, x1, y1 + 70, x1, y1); g.stroke();
      g.lineCap = 'round';
    };
    v(668, 250, 780, 30, 66, 0.88, 0.24);
    v(600, 250, 508, 26, 58, 0.78, 0.2);
    v(720, 240, 900, 110, 34, 0.74, 0.2);
    v(560, 240, 380, 118, 30, 0.7, 0.16);
    // body
    g.beginPath();
    g.moveTo(560, 214);
    g.bezierCurveTo(420, 190, 372, 310, 420, 420);
    g.bezierCurveTo(460, 520, 580, 610, 672, 674);
    g.bezierCurveTo(780, 560, 900, 470, 892, 330);
    g.bezierCurveTo(884, 220, 780, 186, 690, 216);
    g.closePath();
    g.fillStyle = P.linear(g, 380, 200, 900, 640, [[0, 1], [0.42, 0.68], [1, 0.08]]);
    g.fill();
    g.save(); g.clip();
    P.shade(g, 840, 520, 340, 0.75);
    g.lineWidth = 12; g.strokeStyle = gray(0.04, 0.7);
    g.beginPath(); g.moveTo(640, 216); g.bezierCurveTo(590, 340, 700, 480, 668, 668); g.stroke();
    g.lineWidth = 5; g.strokeStyle = gray(0.96, 0.8);
    g.beginPath(); g.moveTo(628, 214); g.bezierCurveTo(578, 340, 688, 480, 656, 668); g.stroke();
    g.restore();
  }
  scenes.heart = {
    gray: heartPaint,
    top(g, t, j) {
      stitches(g, [[470, 300], [540, 360], [612, 346], [690, 410], [810, 400]], j, C.red, 18, 10);
      stitches(g, [[510, 480], [600, 500], [650, 570]], j, C.red, 18, 10);
    },
  };

  // ---------- characters (640x720 bust, transparent) ----------
  chars.ines = {
    gray(g) {
      const h = (this.h = { x: 320, y: 262, rx: 88, ry: 150, tilt: -0.07 });
      P.ell(g, 318, 262, 134, 172, 0.06);
      P.ell(g, 230, 210, 44, 90, 0.2);
      torso(g, 320, 490, 268, 0.92, 0.3);
      P.poly(g, [[258, 498], [382, 498], [352, 610], [288, 610]], 0.08);
      neck(g, 320, 370, 520, 40, 0.74, 0.14);
      P.poly(g, [[272, 494], [320, 568], [368, 494], [400, 510], [320, 620], [240, 510]], 1);
      head(g, h, 0.92, 0.3);
      onHead(g, h, () => {
        P.poly(g, [[-96, -96], [-74, -176], [76, -176], [96, -96], [50, -110], [-48, -112]], 1);
        P.rect(g, -76, -124, 152, 11, 0.5);
      });
    },
    top(g, t, j, ex) {
      const h = this.h;
      onHead(g, h, () => {
        const sad = ex === 'sad', sm = ex === 'smile';
        const y = -22 + (sad ? 2 : 0);
        almond(g, -40, y, 27, 9.5, -0.08, C.black);
        almond(g, 40, y, 27, 9.5, 0.08, C.black);
        g.fillStyle = C.paper; g.beginPath(); g.arc(-44, y - 2, 2.6, 0, 7); g.arc(36, y - 2, 2.6, 0, 7); g.fill();
        const b = sad ? 12 : 0;
        ln(g, [[-72 + j(1), -44 + b], [-44, -56], [-14 + j(1), -46 - b * 0.7]], 2.8, C.black);
        ln(g, [[14 + j(1), -46 - b * 0.7], [44, -56], [72 + j(1), -44 + b]], 2.8, C.black);
        ln(g, [[1, -32], [10 + j(0.7), 44], [-6 + j(0.7), 52]], 2.1, C.black);
        const m = 94;
        g.fillStyle = C.red;
        g.beginPath();
        g.moveTo(-26, m + (sm ? -4 : sad ? 3 : 0));
        g.quadraticCurveTo(-9, m - 10, 0, m - 5);
        g.quadraticCurveTo(9, m - 10, 26, m + (sm ? -4 : sad ? 3 : 0));
        g.quadraticCurveTo(0, m + 13, -26, m + (sm ? -4 : sad ? 3 : 0));
        g.fill();
        if (sad) { g.fillStyle = C.paper; g.fillRect(-46, y + 9, 2, 22 + Math.sin(t) * 5); }
      });
      // red suture ring at the throat, knotted: her one ornament
      ln(g, [[280 + j(1), 480], [320, 490], [360 + j(1), 480]], 1.7, C.red);
    },
  };

  chars.cal = {
    gray(g) {
      const h = (this.h = { x: 320, y: 266, rx: 98, ry: 158, tilt: 0.08 });
      const R = rng(5);
      for (let i = 0; i < 22; i++) {
        const a = -Math.PI * (i / 21), r = 116 + R() * 42;
        P.ell(g, 320 + Math.cos(a) * r, 244 + Math.sin(a) * r * 1.18, 30 + R() * 16, 42 + R() * 26, 0.08 + R() * 0.12, 1, a);
      }
      torso(g, 320, 500, 290, 0.34, 0.05);
      P.poly(g, [[174, 720], [216, 556], [424, 556], [466, 720]], P.linear(g, 174, 0, 466, 0, [[0, 0.62], [1, 0.1]]));
      P.rect(g, 212, 508, 16, 56, 0.5);
      P.rect(g, 412, 508, 16, 56, 0.2);
      neck(g, 320, 380, 524, 50, 0.7, 0.1);
      head(g, h, 0.86, 0.2);
      onHead(g, h, () => { P.ell(g, 8, 96, 86, 66, 0, 0.26); });
    },
    top(g, t, j, ex) {
      const h = this.h;
      onHead(g, h, () => {
        const sad = ex === 'sad', sm = ex === 'smile';
        almond(g, -42, -22, 28, 8, -0.05, C.black);
        almond(g, 42, -22, 28, 8, 0.05, C.black);
        g.fillStyle = C.paper; g.beginPath(); g.arc(-46, -24, 2.3, 0, 7); g.arc(38, -24, 2.3, 0, 7); g.fill();
        ln(g, [[-78, -46 + (sad ? 8 : 0)], [-44, -56], [-14, -42 - (sad ? 6 : 0)]], 5, C.black);
        ln(g, [[14, -42 - (sad ? 6 : 0)], [44, -56], [78, -46 + (sad ? 8 : 0)]], 5, C.black);
        ln(g, [[32, -74], [46, -36]], 2.2, C.paper);
        ln(g, [[2, -32], [12, 46], [-8, 54]], 2.4, C.black);
        const y = 100;
        ln(g, [[-34, y + (sm ? -5 : sad ? 5 : 0)], [0, y + (sm ? 5 : 0)], [34, y + (sm ? -7 : sad ? 5 : 0)]], 3.4, C.black);
        if (!sad) {
          ln(g, [[26, y + 1], [78, y + 12]], 7, C.paper);
          g.fillStyle = C.red; g.beginPath(); g.arc(80, y + 13, 4.6, 0, 7); g.fill();
          g.strokeStyle = 'rgba(221,212,194,.5)'; g.lineWidth = 2; g.beginPath();
          let x = 84, yy = y + 6; g.moveTo(x, yy);
          for (let i = 0; i < 9; i++) { yy -= 22; x += Math.sin(t * 1.3 + i * 0.8) * 11; g.lineTo(x, yy); }
          g.stroke();
        }
      });
    },
  };

  chars.doctor = {
    gray(g) {
      const h = (this.h = { x: 320, y: 246, rx: 92, ry: 170, tilt: 0 });
      torso(g, 320, 464, 300, 0.74, 0.12);
      P.rect(g, 310, 500, 8, 220, 0.04);
      neck(g, 320, 372, 500, 42, 0.7, 0.2);
      head(g, h, 0.78, 0.18);
      onHead(g, h, () => {
        P.poly(g, [[-106, -44], [-90, -192], [90, -192], [106, -44], [60, -82], [-60, -82]], 0.9);
        P.poly(g, [[-98, 12], [98, 12], [78, 166], [-78, 166]], P.linear(g, -98, 0, 98, 0, [[0, 1], [1, 0.38]]));
        for (let i = 0; i < 4; i++) P.line(g, -86, 42 + i * 30, 86, 42 + i * 30, 2, 0.32);
        P.ell(g, 0, -110, 56, 56, 0.55);
        P.ell(g, 0, -110, 47, 47, 1);
      });
      P.glow(g, 320, 136, 170, 0.46);
    },
    top(g, t, j, ex) {
      onHead(g, this.h, () => {
        g.fillStyle = C.black;
        g.beginPath(); g.arc(-40, -22, 28, 0, 7); g.arc(40, -22, 28, 0, 7); g.fill();
        g.strokeStyle = C.paper; g.lineWidth = 3;
        g.beginPath(); g.arc(-40, -22, 28, 0, 7); g.moveTo(68, -22); g.arc(40, -22, 28, 0, 7); g.moveTo(-12, -22); g.lineTo(12, -22); g.stroke();
        g.fillStyle = C.paper;
        const s = 4 + Math.sin(t * 3) * 0.6;
        g.beginPath(); g.arc(-40, -22, s, 0, 7); g.arc(40, -22, s, 0, 7); g.fill();
      });
      if (!this.s) {
        const R = rng(3), c = mkc(640, 720), gg = c.getContext('2d');
        for (let i = 0; i < 7; i++) splat(gg, 170 + R() * 300, 500 + R() * 200, 12 + R() * 24, R);
        splat(gg, 390, 372, 14, R);
        this.s = c;
      }
      g.drawImage(this.s, 0, 0);
    },
  };

  chars.sister = {
    gray(g) {
      const h = (this.h = { x: 320, y: 270, rx: 86, ry: 146, tilt: 0.05 });
      P.ell(g, 320, 300, 196, 280, 0.04);
      P.poly(g, [[120, 720], [150, 200], [320, 44], [490, 200], [520, 720]], 0.06);
      P.ell(g, 320, 262, 124, 184, 0.98);
      head(g, h, 0.97, 0.42);
      P.ell(g, 320, 500, 90, 34, 0.9);
    },
    top(g, t, j, ex) {
      onHead(g, this.h, () => {
        P.ell(g, -40, -22, 30, 11, 0.02);
        P.ell(g, 40, -22, 30, 11, 0.02);
        for (let i = -3; i <= 3; i++) {
          ln(g, [[-40 + i * 9 + j(1), -36 + j(1)], [-40 + i * 9 + j(1), -9 + j(1)]], 2, C.red);
          ln(g, [[40 + i * 9 + j(1), -36 + j(1)], [40 + i * 9 + j(1), -9 + j(1)]], 2, C.red);
        }
        ln(g, [[-1, -28], [8, 46], [-6, 52]], 2.1, C.black);
        ln(g, [[-34, 98], [0, 90], [34, 98]], 3, C.black);
      });
    },
  };

  chars.eight = {
    gray(g) {
      const h = (this.h = { x: 320, y: 270, rx: 104, ry: 168, tilt: -0.14 });
      torso(g, 320, 498, 250, 0.6, 0.06);
      neck(g, 320, 390, 520, 44, 0.66, 0.1);
      head(g, h, 0.92, 0.18);
      onHead(g, h, () => {
        P.poly(g, [[-104, -70], [8, -130], [20, 8], [-98, 22]], 0.4, 0.8);
        P.poly(g, [[20, 8], [104, -20], [78, 118], [12, 148]], 0.72, 0.75);
        P.ell(g, -44, -28, 34, 40, 0);
        P.ell(g, 44, -28, 34, 40, 0);
        P.ell(g, 0, 92, 62, 38, 0);
      });
    },
    top(g, t, j) {
      onHead(g, this.h, () => {
        stitches(g, [[-104, -70], [8, -130]], j, C.red, 16, 7);
        stitches(g, [[8, -130], [20, 8], [-98, 22]], j, C.red, 16, 7);
        stitches(g, [[20, 8], [104, -20]], j, C.red, 16, 7);
        stitches(g, [[12, 148], [20, 8]], j, C.red, 16, 7);
        for (let i = -5; i <= 5; i++) {
          g.fillStyle = C.paper;
          g.fillRect(i * 10.5 - 4, 62, 8, 15);
          g.fillRect(i * 10.5 - 4, 108, 8, 15);
        }
        g.fillStyle = C.red;
        g.fillRect(-46, 12, 5, 130);
        g.fillRect(42, 12, 5, 90);
      });
    },
  };

  // ---------- jump scare faces ----------
  function bigMouth(g, x, y, rx, ry) {
    g.fillStyle = C.black;
    g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill();
    const n = 15;
    g.fillStyle = C.paper;
    for (let i = 0; i < n; i++) {
      const k = i / (n - 1), px = x - rx * 0.86 + k * rx * 1.72;
      const yt = y - ry * Math.sqrt(Math.max(0, 1 - Math.pow((px - x) / rx, 2)));
      g.beginPath(); g.moveTo(px - rx * 0.058, yt); g.lineTo(px + rx * 0.058, yt); g.lineTo(px, yt + ry * 0.34); g.fill();
      g.beginPath(); g.moveTo(px - rx * 0.058, 2 * y - yt); g.lineTo(px + rx * 0.058, 2 * y - yt); g.lineTo(px, 2 * y - yt - ry * 0.3); g.fill();
    }
    const R = rng(x | 0);
    g.fillStyle = C.red;
    for (let i = 0; i < 9; i++) g.fillRect(x - rx + R() * rx * 2, y + ry * 0.3, 6 + R() * 8, 90 + R() * 240);
  }
  scareDefs.sister = {
    from: 'sister', sc: 3.3, ox: 640 - 320 * 3.3, oy: -520,
    extra(g) { bigMouth(g, 640, 500, 270, 165); },
  };
  scareDefs.eight = { from: 'eight', sc: 3.2, ox: 640 - 320 * 3.2, oy: -500, extra() {} };
  scareDefs.doctor = {
    from: 'doctor', sc: 3.4, ox: 640 - 320 * 3.4, oy: -560,
    extra(g) { const R = rng(11); for (let i = 0; i < 6; i++) splat(g, 200 + R() * 900, 420 + R() * 260, 30 + R() * 50, R); },
  };
  scareDefs.hall = {
    from: 'eight', sc: 1.05, ox: 640 - 320 * 1.05, oy: 22,
    extra() {},
    bg(g) { P.fill(g, 0); P.glow(g, 640, 300, 420, 0.32); },
  };

  // ---------- caches ----------
  const cache = new Map();
  function touch(k, v) {
    cache.delete(k); cache.set(k, v);
    if (cache.size > 9) cache.delete(cache.keys().next().value);
    return v;
  }
  function scene(name) {
    const k = 's:' + name;
    if (cache.has(k)) return touch(k, cache.get(k));
    const def = scenes[name];
    const frames = engraveFrames(g => def.gray(g), W, H, 3, { seed: name.length * 7 + 3 });
    return touch(k, { name, frames, def });
  }
  function char(name) {
    const k = 'c:' + name;
    if (cache.has(k)) return touch(k, cache.get(k));
    const def = chars[name];
    const frames = engraveFrames(g => def.gray(g), 640, 720, 3, { transparent: true, seed: name.length * 13 + 1, cell: 2.5 });
    return touch(k, { name, frames, def });
  }
  const scareCache = {};
  function scareImg(name) {
    if (scareCache[name]) return scareCache[name];
    const d = scareDefs[name];
    const c = chars[d.from];
    if (!c.h) c.gray(mkc(10, 10).getContext('2d'));
    const frame = engraveFrames(g => {
      P.fill(g, 0);
      if (d.bg) d.bg(g);
      g.save(); g.translate(d.ox, d.oy); g.scale(d.sc, d.sc);
      c.gray(g);
      g.restore();
    }, W, H, 1, { seed: 99, density: 1.5, gamma: 0.9 })[0];
    const g = frame.getContext('2d');
    g.save();
    g.save(); g.translate(d.ox, d.oy); g.scale(d.sc, d.sc);
    c.top(g, 1, () => 0, 'scare');
    g.restore();
    d.extra(g);
    g.restore();
    return (scareCache[name] = frame);
  }
  function addScare(name, canvas) { scareCache[name] = canvas; }

  return { scene, char, scareImg, addScare, scenes, chars, torso, neck, head, onHead, almond, ln, stitches, bigMouth };
})();
