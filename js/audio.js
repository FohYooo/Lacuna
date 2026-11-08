'use strict';
// All sound is synthesised at runtime.

const Snd = (() => {
  let ac = null, master, bus, rev, noiseBuf, track = null, volume = 0.8;

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    master = ac.createGain();
    master.gain.value = volume;
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -9; comp.ratio.value = 8; comp.attack.value = 0.002; comp.release.value = 0.16;
    master.connect(comp); comp.connect(ac.destination);
    bus = ac.createGain(); bus.connect(master);

    const len = ac.sampleRate * 3.2;
    const ir = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    rev = ac.createConvolver(); rev.buffer = ir;
    const wet = ac.createGain(); wet.gain.value = 0.42;
    rev.connect(wet); wet.connect(master);

    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  }

  const now = () => (ac && ac.state === 'running' ? ac.currentTime : performance.now() / 1000);
  const latency = () => (ac ? (ac.outputLatency || ac.baseLatency || 0) : 0);

  function setVolume(v) { volume = v; if (master) master.gain.setTargetAtTime(v, ac.currentTime, 0.02); }

  function env(gainNode, t, a, peak, d) {
    gainNode.gain.setValueAtTime(0.0001, t);
    gainNode.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  function tone(f, o = {}) {
    if (!ac) return;
    const t = o.t || ac.currentTime;
    const os = ac.createOscillator(), g = ac.createGain();
    os.type = o.type || 'sine';
    os.frequency.setValueAtTime(f, t);
    if (o.to) os.frequency.exponentialRampToValueAtTime(o.to, t + (o.a || 0.01) + (o.d || 0.3));
    env(g, t, o.a || 0.01, o.v === undefined ? 0.3 : o.v, o.d || 0.3);
    os.connect(g);
    g.connect(o.bus || bus);
    if (o.rev) g.connect(rev);
    os.start(t);
    os.stop(t + (o.a || 0.01) + (o.d || 0.3) + 0.05);
  }

  function noise(o = {}) {
    if (!ac) return;
    const t = o.t || ac.currentTime;
    const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = ac.createBiquadFilter(); f.type = o.ft || 'bandpass';
    f.frequency.setValueAtTime(o.f || 1200, t);
    if (o.fto) f.frequency.exponentialRampToValueAtTime(o.fto, t + (o.a || 0.01) + (o.d || 0.3));
    f.Q.value = o.q || 1;
    const g = ac.createGain();
    env(g, t, o.a || 0.005, o.v === undefined ? 0.3 : o.v, o.d || 0.3);
    s.connect(f); f.connect(g); g.connect(o.bus || bus);
    if (o.rev) g.connect(rev);
    s.start(t, Math.random());
    s.stop(t + (o.a || 0.005) + (o.d || 0.3) + 0.05);
  }

  const midi = m => 440 * Math.pow(2, (m - 69) / 12);

  const SFX = {
    heart(t) { tone(62, { to: 38, d: 0.2, v: 0.75, t }); tone(52, { to: 34, d: 0.2, v: 0.5, t: (t || ac.currentTime) + 0.26 }); },
    thud() { tone(70, { to: 30, d: 0.35, v: 0.8 }); noise({ f: 300, d: 0.12, v: 0.3 }); },
    ding() { [1320, 1980].forEach(f => tone(f, { d: 1.6, v: 0.12, rev: true })); },
    scissors() { [0, 0.18].forEach(dt => { const t = ac.currentTime + dt; noise({ f: 5200, q: 8, d: 0.05, v: 0.5, t }); tone(2400, { type: 'square', d: 0.03, v: 0.08, t }); }); },
    clink() { [2300, 3420, 5130].forEach((f, i) => tone(f, { d: 0.5 - i * 0.1, v: 0.14, rev: true })); },
    cut() { noise({ ft: 'lowpass', f: 1500, fto: 340, d: 0.42, v: 0.5, a: 0.03 }); noise({ f: 3800, q: 5, d: 0.14, v: 0.14 }); },
    wet() { for (let i = 0; i < 5; i++) noise({ ft: 'lowpass', f: 360 + Math.random() * 500, d: 0.08, v: 0.5, t: ac.currentTime + i * 0.09 + Math.random() * 0.03 }); },
    sizzle() { noise({ ft: 'highpass', f: 4200, a: 0.03, d: 2.2, v: 0.32 }); },
    groan() { tone(112, { type: 'sawtooth', to: 72, a: 0.1, d: 0.9, v: 0.16 }); },
    knock() { [0, 0.24, 0.48].forEach(dt => { const t = ac.currentTime + dt; tone(150, { to: 66, d: 0.1, v: 0.7, t, rev: true }); noise({ f: 620, d: 0.04, v: 0.3, t }); }); },
    drawer() { noise({ f: 340, q: 3, a: 0.2, d: 0.9, v: 0.4, rev: true }); tone(88, { d: 0.25, v: 0.6, t: ac.currentTime + 1.05 }); },
    phone() { [0, 0.45].forEach(dt => [440, 480].forEach(f => tone(f, { type: 'triangle', a: 0.02, d: 0.34, v: 0.1, t: ac.currentTime + dt }))); },
    page() { noise({ ft: 'highpass', f: 2400, a: 0.04, d: 0.2, v: 0.14 }); },
    pen() { for (let i = 0; i < 9; i++) noise({ f: 3200 + Math.random() * 1600, q: 4, d: 0.05, v: 0.12, t: ac.currentTime + i * 0.085 }); },
    glass() { [3100, 4700].forEach(f => tone(f, { d: 0.9, v: 0.05, rev: true })); },
    honk(t, pitch) {
      const p = pitch || 1, s = t || ac.currentTime;
      tone(330 * p, { type: 'square', to: 262 * p, d: 0.16, v: 0.34, t: s, a: 0.006 });
      tone(415 * p, { type: 'square', to: 330 * p, d: 0.16, v: 0.24, t: s, a: 0.006 });
    },
    flatline() { tone(988, { type: 'sine', a: 0.02, d: 4.4, v: 0.3 }); },
    scare() {
      const t = ac.currentTime;
      [233, 247, 277, 311, 466, 622, 740, 932].forEach(f => tone(f * (0.98 + Math.random() * 0.04), { type: 'sawtooth', a: 0.004, d: 1.05, v: 0.3, to: f * 0.72 }));
      noise({ ft: 'highpass', f: 900, a: 0.002, d: 0.9, v: 1 });
      tone(90, { to: 30, a: 0.002, d: 0.6, v: 1 });
      tone(2960, { type: 'square', to: 1250, a: 0.01, d: 0.7, v: 0.14, t: t + 0.04 });
    },
  };

  function sfx(name, ...args) { if (ac && SFX[name]) SFX[name](...args); }

  // ---- Looping beds ----
  function drones(g, list) {
    const nodes = [];
    list.forEach(d => {
      const o = ac.createOscillator(), l = ac.createGain(), f = ac.createBiquadFilter();
      o.type = d.type || 'sawtooth';
      o.frequency.value = d.f;
      o.detune.value = d.detune || 0;
      f.type = 'lowpass'; f.frequency.value = d.cut || 320;
      l.gain.value = d.v;
      o.connect(f); f.connect(l); l.connect(g);
      if (d.rev) l.connect(rev);
      o.start();
      nodes.push(o);
    });
    return nodes;
  }

  function wind(g, cut, v) {
    const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = cut; f.Q.value = 1.4;
    const lfo = ac.createOscillator(), lg = ac.createGain();
    lfo.frequency.value = 0.09; lg.gain.value = cut * 0.5;
    lfo.connect(lg); lg.connect(f.frequency);
    const l = ac.createGain(); l.gain.value = v;
    s.connect(f); f.connect(l); l.connect(g);
    s.start(); lfo.start();
    return [s, lfo];
  }

  const LULLABY = [69, 72, 76, 74, 72, 69, 67, 69, 72, 71, 67, 64];

  function arp(g, ms, cb) {
    let i = 0;
    return setInterval(() => cb(g, i++), ms);
  }

  const TRACKS = {
    wind(g) { return { nodes: wind(g, 520, 0.2), timers: [] }; },
    ward(g) {
      const nodes = [...drones(g, [{ f: 55, v: 0.13, cut: 240 }, { f: 55.5, v: 0.12, cut: 240 }, { f: 82.5, v: 0.06, cut: 280 }]), ...wind(g, 340, 0.08)];
      const timers = [arp(g, 2200, () => { sfx('heart'); }), arp(g, 7300, () => tone(1760 + Math.random() * 900, { d: 2.2, v: 0.025, rev: true, bus: g }))];
      return { nodes, timers };
    },
    corridor(g) {
      const nodes = drones(g, [{ f: 120, v: 0.05, cut: 1800 }, { f: 240.6, v: 0.018, cut: 3200 }, { f: 49, v: 0.15, cut: 200 }, { f: 73.8, v: 0.06, cut: 220 }]);
      const timers = [arp(g, 5100, () => noise({ f: 180, d: 0.5, v: 0.22, rev: true, bus: g }))];
      return { nodes, timers };
    },
    chapel(g) {
      const nodes = drones(g, [{ f: 110, v: 0.05, cut: 700, type: 'triangle', rev: true }, { f: 164.8, v: 0.04, cut: 800, type: 'triangle', rev: true }, { f: 220.6, v: 0.03, cut: 900, type: 'triangle', rev: true }]);
      const timers = [arp(g, 860, (b, i) => tone(midi(LULLABY[i % LULLABY.length]), { type: 'triangle', d: 1.4, v: 0.075, rev: true, bus: b }))];
      return { nodes, timers };
    },
    morgue(g) {
      const nodes = [...drones(g, [{ f: 60, v: 0.05, cut: 360 }, { f: 120.5, v: 0.03, cut: 420 }]), ...wind(g, 240, 0.06)];
      const timers = [
        arp(g, 2600, () => tone(1050 + Math.random() * 300, { to: 500, d: 0.09, v: 0.08, rev: true, bus: g })),
        arp(g, 1450, (b, i) => { const m = LULLABY[(i * 3) % LULLABY.length] - 24; tone(midi(m), { type: 'triangle', d: 1.5, v: 0.13, bus: b, rev: true }); }),
      ];
      return { nodes, timers };
    },
    theatre(g) {
      const nodes = drones(g, [{ f: 41, v: 0.22, cut: 180 }, { f: 311.1, v: 0.018, cut: 2200, rev: true }, { f: 329.6, v: 0.018, cut: 2200, rev: true }, { f: 349.2, v: 0.014, cut: 2400, rev: true }, { f: 3136, v: 0.003, cut: 5000, type: 'sine' }]);
      const timers = [arp(g, 1200, () => sfx('heart'))];
      return { nodes, timers };
    },
    jars(g) {
      const nodes = drones(g, [{ f: 73.4, v: 0.1, cut: 200 }, { f: 73.9, v: 0.09, cut: 200 }]);
      const timers = [arp(g, 1900, () => tone(1200 + Math.random() * 3000, { d: 2.5, v: 0.018, rev: true, bus: g }))];
      return { nodes, timers };
    },
    lullaby(g) {
      const nodes = drones(g, [{ f: 110, v: 0.05, cut: 600, type: 'triangle', rev: true }]);
      const timers = [arp(g, 1050, (b, i) => {
        const m = LULLABY[i % LULLABY.length];
        tone(midi(m), { type: 'sine', d: 2.2, v: 0.12, rev: true, bus: b });
        if (i % 4 === 0) tone(midi(m - 24), { type: 'triangle', d: 3, v: 0.11, rev: true, bus: b });
      })];
      return { nodes, timers };
    },
    lot(g) {
      const nodes = [...drones(g, [{ f: 60, v: 0.05, cut: 2400 }]), ...wind(g, 640, 0.1)];
      return { nodes, timers: [] };
    },
    calliope(g) {
      const scale = [72, 76, 79, 84, 83, 79, 76, 75, 74, 77, 81, 86, 84, 81, 77, 73];
      let beat = 0;
      const timers = [arp(g, 118, (b) => {
        const m = scale[beat % scale.length];
        tone(midi(m), { type: 'square', d: 0.1, v: 0.08, bus: b });
        tone(midi(m + 0.32), { type: 'sawtooth', d: 0.1, v: 0.05, bus: b });
        if (beat % 4 === 0) tone(midi(36 + (beat % 16 < 8 ? 0 : 5)), { type: 'triangle', d: 0.14, v: 0.42, bus: b });
        if (beat % 4 === 2) tone(midi(60 + (beat % 16 < 8 ? 3 : 8)), { type: 'square', d: 0.08, v: 0.08, bus: b });
        beat++;
      })];
      return { nodes: [], timers };
    },
  };

  function stopTrack(tr, fade) {
    if (!tr) return;
    tr.timers.forEach(clearInterval);
    tr.g.gain.setTargetAtTime(0, ac.currentTime, fade / 3);
    setTimeout(() => { tr.nodes.forEach(n => { try { n.stop(); } catch (e) { /* already stopped */ } }); tr.g.disconnect(); }, fade * 1000 + 300);
  }

  function music(name, fade = 1.2) {
    if (!ac) return;
    if (track && track.name === name) return;
    stopTrack(track, fade);
    track = null;
    if (!name || !TRACKS[name]) return;
    const g = ac.createGain();
    g.gain.value = 0.0001;
    g.gain.setTargetAtTime(1, ac.currentTime, fade / 3);
    g.connect(bus);
    const made = TRACKS[name](g);
    track = Object.assign(made, { name, g });
  }

  // A gain bus for the rhythm game so it can be silenced if the heart gives out.
  function makeBus() {
    if (!ac) return null;
    const g = ac.createGain(); g.connect(master);
    return g;
  }
  function killBus(g) {
    if (!g) return;
    g.gain.setTargetAtTime(0, ac.currentTime, 0.05);
    setTimeout(() => g.disconnect(), 400);
  }

  return { init, now, latency, setVolume, tone, noise, midi, sfx, music, makeBus, killBus, LULLABY, get ready() { return !!ac; } };
})();
