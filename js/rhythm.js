'use strict';
// "The heart has forgotten how." Four valves, D F J K, and a song that speeds up.

const Rhythm = (() => {
  const LANES = [428, 560, 720, 852];
  const HIT_Y = 610, APPROACH = 1.45;
  const KEYS = { d: 0, f: 1, j: 2, k: 3, arrowleft: 0, arrowdown: 1, arrowup: 2, arrowright: 3, '1': 0, '2': 1, '3': 2, '4': 3 };
  const SECTIONS = [
    { bpm: 60, beats: 8, step: 1, say: 'Lub. And then wait. And then dub.' },
    { bpm: 84, beats: 16, step: 1, dbl: 4, say: 'Again. Remember it. Again.' },
    { bpm: 112, beats: 24, step: 0.5, rest: 0.4, say: 'It has noticed what is missing.' },
    { bpm: 138, beats: 32, step: 0.5, rest: 0.22, chord: 8, say: 'DON’T STOP DON’T STOP DON’T' },
    { bpm: 60, beats: 8, step: 1, chord: 8, say: 'There. There it is. Slowly, now.' },
  ];
  const BASS = [45, 41, 48, 43];

  function buildChart() {
    const R = rng(4111);
    const notes = [], beats = [], says = [];
    let t = 0, last = 1, n = 0;
    SECTIONS.forEach(sec => {
      const spb = 60 / sec.bpm;
      says.push({ t, text: sec.say });
      for (let b = 0; b < sec.beats; b++) beats.push({ t: t + b * spb, bpm: sec.bpm, i: b, sec });
      for (let b = 0; b < sec.beats; b += sec.step) {
        if (sec.rest && R() < sec.rest && b % 1 !== 0) continue;
        let lane;
        if (sec.bpm === 60) lane = (b % 2) * 3 === 3 ? 2 : 1;
        else { do lane = (R() * 4) | 0; while (lane === last); }
        last = lane;
        const at = t + b * spb;
        notes.push({ t: at, lane, n: n++ });
        if (sec.chord && b % sec.chord === 0) notes.push({ t: at, lane: 3 - lane, n: n++ });
        if (sec.dbl && b % sec.dbl === 3 && b + 0.5 < sec.beats) notes.push({ t: at + spb / 2, lane: (lane + 2) % 4, n: n++ });
      }
      t += sec.beats * spb;
    });
    return { notes, beats, says, length: t };
  }

  function scheduleSong(bus, t0, beats) {
    beats.forEach(b => {
      const at = t0 + b.t;
      const v = b.bpm >= 112 ? 0.9 : 0.72;
      Snd.tone(64, { to: 36, d: 0.2, v, t: at, bus });
      Snd.tone(54, { to: 32, d: 0.17, v: v * 0.6, t: at + 60 / b.bpm * 0.28, bus });
      if ((b.i % 4) === 0) {
        const m = BASS[(b.i / 4) % 4 | 0];
        Snd.tone(Snd.midi(m), { type: 'sawtooth', a: 0.05, d: 4 * 60 / b.bpm, v: 0.09, t: at, bus });
        [12, 15, 19].forEach(iv => Snd.tone(Snd.midi(m + iv), { type: 'triangle', a: 0.12, d: 4 * 60 / b.bpm, v: 0.035, t: at, bus }));
      }
      if (b.bpm >= 112) Snd.noise({ ft: 'highpass', f: 7000, d: 0.04, v: 0.12, t: at + 30 / b.bpm, bus });
    });
  }

  function play(opts) {
    return new Promise(resolve => {
      const chart = buildChart();
      const bus = Snd.makeBus();
      const t0 = Snd.now() + 3;
      if (Snd.ready) scheduleSong(bus, t0, chart.beats);
      const heart = Art.scene('heart');
      const missLoss = opts.easy ? 3.5 : 7;
      const hitWindow = opts.easy ? 0.17 : 0.13;
      let life = opts.easy ? 80 : 62, done = false, hits = 0, misses = 0, pulse = 0, ending = 0;
      let feedback = { text: '', t: -9, col: C.paper };
      const press = [-9, -9, -9, -9];
      const ecg = new Array(180).fill(0);
      let ecgKick = 0, sayIdx = -1, sayAt = -9;
      const notes = chart.notes;
      let melody = 0;

      const clock = () => Snd.now() - t0 - Snd.latency();

      function judge(lane) {
        const t = clock();
        press[lane] = t;
        let best = null, bestD = 9;
        for (const n of notes) {
          if (n.done || n.lane !== lane) continue;
          const d = Math.abs(n.t - t);
          if (d < bestD) { bestD = d; best = n; }
          if (n.t > t + 0.4) break;
        }
        if (!best || bestD > hitWindow) return;
        best.done = true;
        best.hitAt = t;
        hits++;
        ecgKick = 1;
        const m = Snd.LULLABY[melody++ % Snd.LULLABY.length];
        Snd.tone(Snd.midi(m), { type: 'triangle', d: 0.55, v: 0.28, rev: true, bus: bus || undefined });
        if (bestD < hitWindow * 0.45) { life = Math.min(100, life + 2.2); feedback = { text: 'clean', t, col: C.paper }; } else { life = Math.min(100, life + 1); feedback = { text: 'close', t, col: '#9f9683' }; }
      }

      function miss(n, t) {
        n.done = true; n.missed = true; misses++;
        life -= missLoss;
        feedback = { text: 'lost', t, col: C.red };
        Snd.sfx('groan');
        if (Game.addSplat) Game.addSplat(1);
      }

      function finish(ok) {
        if (done) return;
        done = true;
        Game.setOverlay(null);
        if (!ok) { Snd.killBus(bus); }
        else if (bus) setTimeout(() => Snd.killBus(bus), 400);
        resolve({ ok, hits, misses });
      }

      const overlay = {
        key(k) { const l = KEYS[k]; if (l !== undefined) judge(l); },
        pointer(x) {
          let b = 0, bd = 1e9;
          LANES.forEach((lx, i) => { const d = Math.abs(lx - x); if (d < bd) { bd = d; b = i; } });
          judge(b);
        },
        draw(g, t) {
          const now = clock();
          if (Game.autoRhythm) notes.forEach(n => { if (!n.done && now >= n.t - 0.01) judge(n.lane); });
          for (const n of notes) {
            if (n.done) continue;
            if (now - n.t > hitWindow) miss(n, now); else if (n.t > now) break;
          }
          g.fillStyle = C.black; g.fillRect(0, 0, W, H);

          let spb = 1, lastBeat = -9;
          for (const b of chart.beats) { if (b.t <= now) { lastBeat = b.t; spb = 60 / b.bpm; } else break; }
          pulse = now >= 0 ? Math.max(0, 1 - (now - lastBeat) / (spb * 0.55)) : 0;

          const sc = 0.82 + pulse * 0.06 + (100 - life) * 0.0006;
          const fr = heart.frames[(t * 7 | 0) % 3];
          g.save();
          g.globalAlpha = 0.58;
          g.translate(640, 390); g.scale(sc, sc); g.translate(-640, -390);
          g.drawImage(fr, 0, 0, W, H);
          heart.def.top(g, t, () => Math.random() - 0.5);
          g.restore();

          LANES.forEach((x, i) => {
            g.strokeStyle = 'rgba(221,212,194,.26)';
            g.lineWidth = 1.5;
            g.beginPath();
            for (let y = 0; y <= HIT_Y; y += 20) { const wob = Math.sin(y * 0.02 + i + t) * 2.4; y ? g.lineTo(x + wob, y) : g.moveTo(x + wob, y); }
            g.stroke();
          });

          for (const n of notes) {
            if (n.t - now > APPROACH) break;
            if (n.hitAt !== undefined) {
              const a = 1 - (now - n.hitAt) / 0.22;
              if (a > 0) { g.strokeStyle = `rgba(221,212,194,${a})`; g.lineWidth = 4; g.beginPath(); g.arc(LANES[n.lane], HIT_Y, 34 + (1 - a) * 36, 0, 7); g.stroke(); }
              continue;
            }
            if (n.missed) continue;
            const y = HIT_Y - ((n.t - now) / APPROACH) * (HIT_Y + 40);
            drop(g, LANES[n.lane], y, 21, C.red);
          }

          const labels = ['D', 'F', 'J', 'K'];
          LANES.forEach((x, i) => {
            const a = Math.max(0, 1 - (now - press[i]) / 0.14);
            g.strokeStyle = C.paper; g.lineWidth = 3.5;
            g.fillStyle = `rgba(196,15,24,${a * 0.85})`;
            g.beginPath(); g.arc(x, HIT_Y, 32, 0, 7); g.fill(); g.stroke();
            g.fillStyle = C.paper; g.font = "700 25px 'Courier New', monospace"; g.textAlign = 'center';
            g.fillText(labels[i], x, HIT_Y + 9);
          });

          // ECG
          ecg.shift();
          ecgKick *= 0.6;
          const beatWave = pulse > 0.82 ? (pulse - 0.82) * 180 * (t * 60 % 2 > 1 ? -1 : 1) : 0;
          ecg.push(beatWave * (life / 100) + ecgKick * 22 * Math.sin(t * 90) + (Math.random() - 0.5) * 1.6);
          g.strokeStyle = life < 30 ? C.red : C.paper; g.lineWidth = 2.4; g.lineJoin = 'round';
          g.beginPath();
          ecg.forEach((v, i) => { const x = 240 + i * 4.44, y = 66 - v; i ? g.lineTo(x, y) : g.moveTo(x, y); });
          g.stroke();
          g.fillStyle = '#1e1716'; g.fillRect(240, 108, 800, 6);
          g.fillStyle = life < 30 ? C.red : C.paper; g.fillRect(240, 108, 8 * clamp(life, 0, 100), 6);

          while (sayIdx + 1 < chart.says.length && chart.says[sayIdx + 1].t <= now) { sayIdx++; sayAt = t; }
          if (sayIdx >= 0 && t - sayAt < 3.6) {
            g.globalAlpha = Math.min(1, (3.6 - (t - sayAt)) * 2);
            g.fillStyle = C.paper; g.textAlign = 'center';
            g.font = "italic 30px 'Iowan Old Style', Palatino, Georgia, serif";
            g.fillText(chart.says[sayIdx].text, 640, 168);
            g.globalAlpha = 1;
          }
          if (now < 0) {
            g.fillStyle = C.paper; g.textAlign = 'center';
            g.font = "italic 33px 'Iowan Old Style', Palatino, Georgia, serif";
            g.fillText(opts.line, 640, 280);
            g.font = "700 25px 'Courier New', monospace";
            g.fillText('Press D  F  J  K as the blood reaches each valve.  Or tap the valves.', 640, 330);
            g.font = "700 72px 'Courier New', monospace";
            g.fillStyle = C.red;
            g.fillText(String(Math.ceil(-now)), 640, 430);
          }
          if (now - feedback.t < 0.3) {
            g.fillStyle = feedback.col; g.textAlign = 'center';
            g.font = "italic 42px 'Iowan Old Style', Palatino, Georgia, serif";
            g.fillText(feedback.text, 640, 520);
          }
          if (life < 30) {
            g.fillStyle = `rgba(150,8,14,${0.2 + 0.14 * Math.sin(t * 10)})`;
            g.fillRect(0, 0, W, H);
          }

          if (life <= 0) { finish(false); return; }
          if (now > chart.length + 0.9) finish(true);
        },
      };
      Game.setOverlay(overlay);
    });
  }

  return { play };
})();
