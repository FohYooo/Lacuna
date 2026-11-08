'use strict';
// MISTER YUM-YUM: an original fast-food mascot who should not be able to run this fast.

const Clown = (() => {
  // pose: 0..1 through one stride. Painted in greyscale, then engraved, then given its colour.
  function paint(g, p) {
    const sw = Math.sin(p * Math.PI * 2), bob = Math.abs(Math.cos(p * Math.PI * 2)) * 22;
    g.save();
    g.translate(0, -bob);
    // legs: the leading knee is raised at the viewer
    [[-1, sw], [1, -sw]].forEach(([side, s]) => {
      const lift = Math.max(0, s), hip = 320 + side * 56, footY = 620 - lift * 150, footX = 320 + side * (112 + lift * 30);
      g.lineCap = 'round';
      g.lineWidth = 60;
      g.strokeStyle = P.linear(g, hip - 60, 0, hip + 60, 0, [[0, 0.82], [1, 0.26]]);
      g.beginPath(); g.moveTo(hip, 420); g.quadraticCurveTo(hip + side * 44, 520 - lift * 60, footX, footY - 40); g.stroke();
      const sz = 1 + lift * 0.75;
      P.ell(g, footX, footY, 96 * sz, 62 * sz, 0.1);
      P.ell(g, footX - 22 * sz, footY - 18 * sz, 42 * sz, 22 * sz, 0.8);
    });
    // body, striped, stopping at the waist so the legs can show
    g.save();
    g.beginPath(); g.rect(100, 200, 440, 268); g.clip();
    Art.torso(g, 320, 236, 190, 0.92, 0.3);
    for (let i = 0; i < 6; i++) P.rect(g, 130, 248 + i * 42, 380, 21, 0.04, 0.78);
    g.restore();
    // arms pumping
    [[-1, -sw], [1, sw]].forEach(([side, s]) => {
      const sx = 320 + side * 150, hx = 320 + side * (232 - s * 34), hy = 346 - s * 150;
      g.lineCap = 'round';
      g.lineWidth = 46;
      g.strokeStyle = gray(side < 0 ? 0.85 : 0.62);
      g.beginPath(); g.moveTo(sx, 268); g.quadraticCurveTo(320 + side * 262, 310, hx, hy); g.stroke();
      P.ell(g, hx, hy, 56, 60, 0.98);
      for (let i = -1; i <= 2; i++) P.ell(g, hx + i * 26, hy - 48, 13, 28, 0.95);
    });
    // head
    P.ell(g, 320, 134, 138, 126, 0.98);
    P.shade(g, 412, 180, 150, 0.55);
    g.restore();
  }

  function finish(g, p) {
    const bob = Math.abs(Math.cos(p * Math.PI * 2)) * 22;
    g.save();
    g.translate(0, -bob);
    const cx = 320, cy = 134;
    // sickly yellow hair: the only yellow thing in the building
    g.fillStyle = C.yellow;
    [-1, 1].forEach(s => {
      for (let i = 0; i < 6; i++) {
        const a = -0.9 + i * 0.42;
        g.beginPath();
        g.ellipse(cx + s * (128 + Math.cos(a) * 44), cy + Math.sin(a) * 92, 52, 34, a * s, 0, 7);
        g.fill();
        g.strokeStyle = C.black; g.lineWidth = 2.4;
        g.beginPath();
        g.arc(cx + s * (128 + Math.cos(a) * 44), cy + Math.sin(a) * 92, 19, a, a + 3.6);
        g.stroke();
      }
    });
    g.fillStyle = C.black;
    g.beginPath(); g.ellipse(cx - 56, cy - 34, 38, 44, 0.16, 0, 7); g.ellipse(cx + 56, cy - 34, 38, 44, -0.16, 0, 7); g.fill();
    g.fillStyle = C.paper;
    g.beginPath(); g.arc(cx - 52, cy - 30, 9, 0, 7); g.arc(cx + 52, cy - 30, 9, 0, 7); g.fill();
    g.fillStyle = C.black;
    g.beginPath(); g.arc(cx - 52, cy - 30, 3.4, 0, 7); g.arc(cx + 52, cy - 30, 3.4, 0, 7); g.fill();
    g.fillStyle = C.red;
    g.beginPath(); g.moveTo(cx - 118, cy + 18); g.quadraticCurveTo(cx, cy + 40, cx + 118, cy + 18); g.quadraticCurveTo(cx + 98, cy + 128, cx, cy + 132); g.quadraticCurveTo(cx - 98, cy + 128, cx - 118, cy + 18); g.fill();
    g.fillStyle = C.black;
    g.beginPath(); g.moveTo(cx - 96, cy + 34); g.quadraticCurveTo(cx, cy + 52, cx + 96, cy + 34); g.quadraticCurveTo(cx + 82, cy + 114, cx, cy + 118); g.quadraticCurveTo(cx - 82, cy + 114, cx - 96, cy + 34); g.fill();
    g.fillStyle = C.paper;
    for (let i = -6; i <= 6; i++) {
      const x = cx + i * 13.5, top = cy + 44 - Math.abs(i) * 0.7;
      g.fillRect(x - 5, top, 10, 22);
      g.fillRect(x - 5, cy + 112 - Math.abs(i) * 2.4 - 18, 10, 18);
    }
    g.fillStyle = C.red;
    g.beginPath(); g.arc(cx, cy + 2, 32, 0, 7); g.fill();
    g.fillStyle = 'rgba(221,212,194,.7)';
    g.beginPath(); g.arc(cx - 10, cy - 8, 8, 0, 7); g.fill();
    const R = rng(8);
    for (let i = 0; i < 4; i++) splat(g, 200 + R() * 240, 280 + R() * 160, 12 + R() * 20, R);
    // paper hat
    g.fillStyle = C.paper;
    g.beginPath(); g.moveTo(cx - 80, cy - 112); g.lineTo(cx + 80, cy - 112); g.lineTo(cx + 62, cy - 172); g.lineTo(cx - 62, cy - 172); g.fill();
    g.fillStyle = C.red;
    g.font = "900 34px Impact, 'Arial Black', sans-serif"; g.textAlign = 'center';
    g.fillText('YUM', cx, cy - 126);
    g.restore();
  }

  function frames() {
    return [0, 0.25, 0.5, 0.75].map(p => {
      const f = engraveFrames(g => paint(g, p), 640, 720, 1, { transparent: true, seed: 23, cell: 2.6 })[0];
      const g = f.getContext('2d');
      g.save(); finish(g, p); g.restore();
      return f;
    });
  }

  function scareFace() {
    const SC = 2.5;
    const full = engraveFrames(g => {
      P.fill(g, 0);
      g.save(); g.translate(640 - 320 * SC, 372 - 175 * SC); g.scale(SC, SC); paint(g, 0.25); g.restore();
    }, W, H, 1, { seed: 44, density: 1.4, gamma: 0.85 })[0];
    const g = full.getContext('2d');
    g.save(); g.translate(640 - 320 * SC, 372 - 175 * SC); g.scale(SC, SC); finish(g, 0.25); g.restore();
    return full;
  }

  function play() {
    return new Promise(resolve => {
      const run = frames();
      const lot = Art.scene('lot');
      const t0 = performance.now() / 1000;
      Art.addScare('clown', scareFace());
      Snd.music('calliope', 0.2);
      let dist = 1, stride = 0, lastStep = -1, mash = 0, lastMash = 0, sway = 0, done = false;
      const overlay = {
        key(k) { if (k === ' ' || k === 'enter') { mash = Math.min(1, mash + 0.14); lastMash = performance.now() / 1000; sway = -sway + (Math.random() < 0.5 ? 16 : -16); } },
        pointer() { this.key(' '); },
        draw(g, t) {
          const now = performance.now() / 1000 - t0;
          const dt = 1 / 60;
          if (Game.autoRhythm) this.key(' ');
          mash *= 0.975;
          const closing = lerp(0.145, 0.08, mash) + Math.pow(1 - dist, 2) * 0.16;
          dist -= closing * dt;
          stride += dt * (3.3 + (1 - dist) * 2.4);
          const step = Math.floor(stride * 2);
          if (step !== lastStep) {
            lastStep = step;
            Snd.sfx('honk', 0, 1 + (1 - dist) * 0.45 + (step % 2) * 0.1);
            Game.shake(4 + (1 - dist) * 18);
          }
          const camBob = Math.sin(now * 13) * (4 + mash * 12);
          g.save();
          g.translate(sway * 0.3, camBob);
          g.scale(1.07, 1.07); g.translate(-45, -25);
          g.drawImage(lot.frames[(t * 7 | 0) % 3], 0, 0, W, H);
          lot.def.top(g, t);
          g.restore();

          const sc = 0.14 + Math.pow(1 - dist, 2.2) * 3.2;
          const f = run[Math.floor(stride * 4) % 4];
          const x = 640 + Math.sin(now * 2.4) * 110 * dist + sway * 0.4;
          const y = 420 + (1 - dist) * 44;
          g.drawImage(f, x - 320 * sc, y - 430 * sc, 640 * sc, 720 * sc);

          g.fillStyle = `rgba(0,0,0,${0.15 + mash * 0.2})`; g.fillRect(0, 0, W, H);
          g.textAlign = 'center'; g.fillStyle = C.paper;
          g.font = "900 62px Impact, 'Arial Black', sans-serif";
          g.fillText(now % 0.5 < 0.26 ? 'RUN' : 'RUN.', 640, 654);
          g.font = "700 23px 'Courier New', monospace";
          g.fillText('MASH SPACE OR TAP', 640, 690);
          if (dist <= 0 && !done) {
            done = true;
            Game.setOverlay(null);
            resolve();
          }
        },
      };
      Game.setOverlay(overlay);
    });
  }

  return { play };
})();
