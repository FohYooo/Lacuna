'use strict';
// The visual novel runtime: rendering, input, script execution, saves.

const Game = (() => {
  const $ = s => document.querySelector(s);
  const el = {
    game: $('#game'), box: $('#box'), who: $('#who'), txt: $('#txt'), cue: $('#cue'), choices: $('#choices'),
    card: $('#card'), ledger: $('#ledger'), hold: $('#hold'), bar: $('#hold i'), menu: $('#menu'), endings: $('#endings'),
    endlist: $('#endlist'), warn: $('#warn'), vol: $('#vol'), reduced: $('#reduced'),
  };
  const cv = $('#stage');
  cv.width = W * S; cv.height = H * S;
  const ctx = cv.getContext('2d');

  // ---- persistent data ----
  const KEY = 'lacuna.save.v1';
  let store = { endings: [], fries: [], easy: false, reduced: false, vol: 80 };
  try { store = Object.assign(store, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* no storage available */ }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { /* no storage available */ } }

  // ---- state ----
  let V = {}, checkpoint = null, token = 0;
  let scene = null, ch = null, overlay = null, scareS = null;
  let fadeA = 1, shakeAmt = 0, redA = 0, redTarget = 0, ff = false, advance = null, holding = false, inMenu = true;
  let toast = null;

  const stain = mkc(W, H), sg = stain.getContext('2d');
  let drips = [];

  const grain = mkc(256, 256);
  (() => {
    const g = grain.getContext('2d'), d = g.createImageData(256, 256);
    for (let i = 0; i < d.data.length; i += 4) {
      const v = Math.random() * 255;
      d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
      d.data[i + 3] = 26;
    }
    g.putImageData(d, 0, 0);
  })();
  const vignette = mkc(W, H);
  (() => {
    const g = vignette.getContext('2d');
    const gr = g.createRadialGradient(640, 340, 280, 640, 360, 800);
    gr.addColorStop(0, 'rgba(0,0,0,0)');
    gr.addColorStop(1, 'rgba(0,0,0,.82)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  })();

  function resize() {
    const ww = window.innerWidth, wh = window.innerHeight;
    const w = Math.min(ww, wh * 16 / 9), h = w * 9 / 16;
    el.game.style.width = w + 'px';
    el.game.style.height = h + 'px';
    document.documentElement.style.setProperty('--u', (w / 1280) + 'px');
  }
  window.addEventListener('resize', resize);
  resize();

  const sleep = s => new Promise(r => setTimeout(r, s * 1000));
  const showBox = on => el.box.classList.toggle('hidden', !on);

  function shake(a) { shakeAmt = Math.max(shakeAmt, store.reduced ? a * 0.4 : a); }

  function addSplat(count, big) {
    const R = Math.random;
    for (let i = 0; i < count; i++) {
      splat(sg, R() * W, R() * H * 0.8, big ? 40 + R() * 130 : 18 + R() * 60, R, R() < 0.3 ? C.redD : C.red);
      if (R() < 0.55) drips.push({ x: R() * W, y: R() * 240, len: 0, max: 80 + R() * 380, w: 2 + R() * 6, v: 0.8 + R() * 2.6 });
    }
  }
  function clearBlood() { sg.clearRect(0, 0, W, H); drips = []; }
  function fadeBlood(a) {
    sg.save(); sg.globalCompositeOperation = 'destination-out'; sg.fillStyle = `rgba(0,0,0,${a})`; sg.fillRect(0, 0, W, H); sg.restore();
  }

  function fade(to, dur) {
    return new Promise(res => {
      if (ff) dur = Math.min(dur, 0.06);
      const from = fadeA, t0 = performance.now();
      const step = () => {
        const k = clamp((performance.now() - t0) / (dur * 1000), 0, 1);
        fadeA = lerp(from, to, k);
        if (k < 1) setTimeout(step, 16); else res();
      };
      step();
    });
  }

  function clearChoices() { el.choices.innerHTML = ''; }

  function waitClick() {
    if (ff) return sleep(0.03);
    return new Promise(res => { advance = res; });
  }

  function typeText(text) {
    return new Promise(res => {
      if (ff) { el.txt.textContent = text; res(); return; }
      let i = 0;
      const iv = setInterval(() => {
        i += 2;
        el.txt.textContent = text.slice(0, i);
        if (i >= text.length) { clearInterval(iv); advance = null; res(); }
      }, 30);
      advance = () => { clearInterval(iv); el.txt.textContent = text; res(); };
    });
  }

  async function line(who, text) {
    if (typeof text === 'function') text = text(V);
    el.who.textContent = who || '';
    showBox(true);
    el.cue.classList.remove('on');
    await typeText(text);
    el.cue.classList.add('on');
    await waitClick();
    el.cue.classList.remove('on');
  }

  function doScare(name, dur) {
    return new Promise(res => {
      const wasShown = !el.box.classList.contains('hidden');
      showBox(false);
      Snd.sfx('scare');
      shake(52);
      scareS = { img: Art.scareImg(name), t0: performance.now() / 1000, dur: dur || 0.95, res: () => { if (wasShown) showBox(true); res(); } };
    });
  }

  function doChoice(st) {
    return new Promise(res => {
      const opts = st.opts.filter(o => !o.only || o.only(V));
      el.choices.innerHTML = '';
      let idleTimer = null;
      opts.forEach((o, i) => {
        const b = document.createElement('button');
        b.className = 'choice' + (o.secret ? ' secret' : '');
        b.innerHTML = `<small>${i + 1}</small>`;
        b.appendChild(document.createTextNode(o.text));
        b.onclick = ev => {
          ev.stopPropagation();
          clearTimeout(idleTimer);
          clearChoices();
          window.__pick = null;
          res(o);
        };
        el.choices.appendChild(b);
      });
      window.__pick = i => { const b = el.choices.children[i]; if (b) b.click(); };
      if (st.idle && !V.idled) {
        idleTimer = setTimeout(async () => { V.idled = true; await doScare(st.idle.scare); }, st.idle.after * 1000);
      }
    });
  }

  function doHold(lines) {
    return new Promise(res => {
      el.hold.classList.add('on');
      showBox(true);
      el.who.textContent = '';
      const total = 17 * 1000 * (ff ? 0.02 : 1);
      let prog = 0, last = performance.now(), idx = -1, nextCut = 0, wasHolding = false;
      const iv = setInterval(() => {
        const nowt = performance.now(), dt = nowt - last;
        last = nowt;
        const active = holding || ff || Game.autoRhythm;
        if (active) {
          prog = Math.min(total, prog + dt);
          nextCut -= dt;
          if (nextCut <= 0) {
            Snd.sfx(Math.random() < 0.5 ? 'cut' : 'wet');
            shake(10);
            addSplat(1);
            nextCut = 800 + Math.random() * 900;
          }
        } else if (wasHolding) {
          Snd.sfx('groan');
          shake(30);
        }
        wasHolding = active;
        const li = Math.min(lines.length - 1, Math.floor((prog / total) * lines.length));
        if (li !== idx) { idx = li; el.txt.textContent = lines[li]; }
        if (!active && prog < total) el.who.textContent = 'KEEP STILL';
        else el.who.textContent = '';
        el.bar.style.width = (prog / total * 100) + '%';
        if (prog >= total) {
          clearInterval(iv);
          el.hold.classList.remove('on');
          el.who.textContent = '';
          showBox(false);
          addSplat(10, true);
          shake(40);
          res();
        }
      }, 40);
    });
  }

  async function doCard(title, sub, cls) {
    showBox(false);
    el.card.className = 'on' + (cls ? ' ' + cls : '');
    el.card.querySelector('h2').textContent = title;
    el.card.querySelector('p').textContent = sub || '';
  }

  async function endScreen(id, title, text, kind) {
    if (!store.endings.includes(id)) store.endings.push(id);
    if (id === 'flat') store.easy = true;
    save();
    clearChoices();
    showBox(false);
    if (kind === 'death') { Snd.music(null); await sleep(0.35); }
    await doCard(title, text, kind === 'death' ? 'dead' : '');
    await sleep(ff ? 0.05 : 1.0);
    const buttons = [];
    if (kind === 'death') buttons.push({ text: 'Wake up again', fn: () => retry() });
    else {
      const found = store.fries.length;
      const hint = found < 3 ? `  (Something small and yellow was left behind: ${found} of 3.)` : '';
      el.card.querySelector('p').textContent = text + hint;
    }
    buttons.push({ text: 'Leave the hospital', fn: () => toMenu() });
    el.choices.innerHTML = '';
    el.choices.style.bottom = '9%';
    buttons.forEach(b => {
      const x = document.createElement('button');
      x.className = 'choice';
      x.textContent = b.text;
      x.onclick = ev => { ev.stopPropagation(); el.choices.style.bottom = ''; clearChoices(); el.card.className = ''; b.fn(); };
      el.choices.appendChild(x);
    });
    window.__pick = i => { const b = el.choices.children[i]; if (b) b.click(); };
    return 'end';
  }

  function retry() {
    const cp = checkpoint || { node: 'intro', vars: fresh() };
    V = JSON.parse(cp.vars ? JSON.stringify(cp.vars) : '{}');
    clearBlood(); redTarget = 0;
    run(cp.node);
  }

  function fresh() { return { memory: 'lake', ines: 0, cal: 0, romance: null, visits: 0 }; }

  async function exec(st) {
    switch (st.t) {
      case 'n': return void await line('', st.text);
      case 'say':
        if (ch && st.expr !== undefined) ch.expr = st.expr;
        else if (ch && st.expr === undefined) ch.expr = ch.baseExpr;
        return void await line(st.who, st.text);
      case 'bg': {
        if (!st.cut && scene && scene.name === st.name) return;
        if (!st.cut) await fade(1, 0.3);
        fadeBlood(0.4);
        ch = null;
        scene = Art.scene(st.name);
        if (!st.cut) await fade(0, 0.5); else fadeA = 0;
        return;
      }
      case 'show': {
        const o = Art.char(st.name);
        ch = { o, expr: st.expr || null, baseExpr: st.expr || null, x: st.x || 860, a: 0 };
        return;
      }
      case 'hide': ch = null; return;
      case 'music': Snd.music(st.name); return;
      case 'sfx': Snd.sfx(st.name); return;
      case 'scare': return void await doScare(st.name, st.dur);
      case 'blood': addSplat(st.count, st.big); return;
      case 'clearblood': clearBlood(); return;
      case 'shake': shake(st.a); return;
      case 'wait': await sleep(ff ? 0.02 : st.s); return;
      case 'red': redTarget = st.a; return;
      case 'cp': checkpoint = { node: st.node, vars: JSON.parse(JSON.stringify(V)) }; return;
      case 'set': st.fn(V); return;
      case 'go': return { go: st.node };
      case 'if': {
        const arr = st.test(V) ? st.a : st.b;
        if (arr) for (const s of arr) { const r = await exec(s); if (r) return r; }
        return;
      }
      case 'black': {
        showBox(false);
        ch = null;
        await fade(1, 0.15);
        Snd.sfx('heart');
        await sleep(ff ? 0.05 : st.s);
        scene = Art.scene('black');
        fadeA = 0;
        return;
      }
      case 'choice': {
        const o = await doChoice(st);
        if (o.set) o.set(V);
        if (o.steps) for (const s of o.steps) { const r = await exec(s); if (r) return r; }
        if (o.go) return { go: o.go };
        return;
      }
      case 'ledger': {
        showBox(false);
        el.ledger.innerHTML = '';
        el.ledger.classList.add('on');
        for (const l of st.lines) {
          const text = typeof l === 'function' ? l(V) : l;
          const d = document.createElement('div');
          d.innerHTML = text;
          el.ledger.appendChild(d);
          Snd.sfx('page');
          await waitClick();
        }
        el.ledger.classList.remove('on');
        return;
      }
      case 'hold': return void await doHold(st.lines);
      case 'rhythm': {
        Snd.music(null);
        showBox(false);
        const who = V.romance === 'ines' ? 'Ines has her hands on your chest. She is counting out loud.'
          : V.romance === 'cal' ? 'Cal has his hands on your chest. He is swearing at you, steadily.'
            : 'No one is coming. The heart will have to remember by itself.';
        const r = await Rhythm.play({ easy: store.easy, line: who });
        if (!r.ok) return { go: st.fail };
        return;
      }
      case 'chase': showBox(false); await Clown.play(); Snd.music(null, 0.05); return;
      case 'death': return endScreen(st.id, st.title, st.text, 'death');
      case 'ending': return endScreen(st.id, st.title, st.text, 'ending');
      default: throw new Error('unknown step ' + st.t);
    }
  }

  async function run(start) {
    const my = ++token;
    let node = start;
    inMenu = false;
    clearChoices();
    el.card.className = '';
    while (node) {
      const steps = STORY[node];
      if (!steps) throw new Error('missing node ' + node);
      let next = null;
      for (const st of steps) {
        if (my !== token) return;
        const r = await exec(st);
        if (my !== token) return;
        if (r === 'end') return;
        if (r && r.go) { next = r.go; break; }
      }
      node = next;
    }
  }

  function begin() {
    Snd.init();
    el.menu.classList.remove('on');
    V = fresh();
    checkpoint = null;
    clearBlood();
    redTarget = 0;
    run('intro');
  }

  function toMenu() {
    token++;
    inMenu = true;
    showBox(false);
    clearChoices();
    el.card.className = '';
    ch = null;
    overlay = null;
    clearBlood();
    redTarget = 0;
    scene = Art.scene('heart');
    fadeA = 0;
    Snd.music('wind');
    el.menu.classList.add('on');
  }

  function renderEndings() {
    el.endlist.innerHTML = '';
    ENDINGS.forEach(e => {
      const has = store.endings.includes(e.id);
      const d = document.createElement('div');
      if (!has) { d.className = 'k'; d.textContent = e.kind === 'secret' ? '? ? ?' : e.kind === 'death' ? 'Unknown cause' : 'Not yet discharged'; } else { d.className = e.kind === 'death' ? 'd' : e.kind === 'secret' ? 's' : ''; d.textContent = e.title; }
      el.endlist.appendChild(d);
    });
  }

  // ---- input ----
  function tryFry(lx, ly) {
    if (!scene || !scene.def.fry || overlay) return false;
    const f = scene.def.fry;
    if (store.fries.includes(f.id)) return false;
    if (Math.hypot(lx - f.x, ly - f.y) > 36) return false;
    store.fries.push(f.id);
    save();
    Snd.sfx('honk');
    toast = { text: `something small and yellow  ${store.fries.length} / 3`, t0: performance.now() / 1000 };
    return true;
  }

  el.game.addEventListener('pointerdown', ev => {
    if (ev.target.closest('button,input,label')) return;
    Snd.init();
    const r = el.game.getBoundingClientRect();
    const lx = (ev.clientX - r.left) / r.width * W, ly = (ev.clientY - r.top) / r.height * H;
    if (overlay) { if (overlay.pointer) overlay.pointer(lx, ly); return; }
    if (tryFry(lx, ly)) return;
    holding = true;
    if (advance) { const f = advance; advance = null; f(); }
  });
  window.addEventListener('pointerup', () => { holding = false; });
  window.addEventListener('blur', () => { holding = false; ff = false; });

  window.addEventListener('keydown', ev => {
    const k = ev.key.toLowerCase();
    if (k === 'tab' || k === 'control') { ev.preventDefault(); ff = true; if (advance) { const f = advance; advance = null; f(); } return; }
    if (overlay && overlay.key) { if (!ev.repeat) overlay.key(k); if (k === ' ') ev.preventDefault(); return; }
    if (k === ' ' || k === 'enter') {
      if (ev.target.tagName === 'BUTTON') ev.target.blur();
      ev.preventDefault();
      holding = true;
      if (!ev.repeat && advance) { const f = advance; advance = null; f(); }
    }
    if (/^[1-5]$/.test(k) && el.choices.children.length && window.__pick) window.__pick(+k - 1);
  });
  window.addEventListener('keyup', ev => {
    const k = ev.key.toLowerCase();
    if (k === 'tab' || k === 'control') ff = false;
    if (k === ' ' || k === 'enter') holding = false;
  });

  // ---- render ----
  function drawFry(g, f, t) {
    if (store.fries.includes(f.id)) return;
    g.save();
    g.translate(f.x, f.y); g.rotate(f.rot);
    g.fillStyle = C.yellow;
    if (Math.sin(t * 1.4) > 0.94) { g.shadowColor = C.yellow; g.shadowBlur = 16; }
    g.fillRect(-21, -4, 42, 8);
    g.restore();
  }

  function frame(ms) {
    requestAnimationFrame(frame);
    const t = ms / 1000;
    const boil = (t * 7 | 0) % 3;
    shakeAmt *= 0.86;
    if (shakeAmt < 0.1) shakeAmt = 0;
    redA += (redTarget - redA) * 0.05;
    const R = rng(boil + 1);
    const j = a => (R() - 0.5) * a * 2;

    ctx.setTransform(S, 0, 0, S, 0, 0);
    ctx.fillStyle = C.black;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate((Math.random() - 0.5) * shakeAmt, (Math.random() - 0.5) * shakeAmt);

    if (overlay) {
      overlay.draw(ctx, t);
    } else if (scene) {
      ctx.drawImage(scene.frames[boil], 0, 0, W, H);
      if (scene.def.top) scene.def.top(ctx, t, j);
      if (ch) {
        ch.a = Math.min(1, ch.a + 0.08);
        ctx.save();
        ctx.globalAlpha = ch.a;
        ctx.translate(ch.x - 320, Math.sin(t * 1.1) * 3);
        ctx.drawImage(ch.o.frames[boil], 0, 0, 640, 720);
        if (ch.o.def.top) ch.o.def.top(ctx, t, j, ch.expr);
        ctx.restore();
      }
      if (scene.def.fry) drawFry(ctx, scene.def.fry, t);
    }

    // grow drips
    sg.fillStyle = C.red;
    drips = drips.filter(d => {
      const step = d.v;
      sg.beginPath();
      sg.ellipse(d.x, d.y + d.len, d.w, d.w * 1.5, 0, 0, 7);
      sg.fill();
      d.len += step;
      return d.len < d.max;
    });
    ctx.drawImage(stain, 0, 0, W, H);
    ctx.restore();

    if (redA > 0.005) { ctx.fillStyle = `rgba(150,10,16,${redA})`; ctx.fillRect(0, 0, W, H); }

    ctx.save();
    const gx = Math.random() * 256 | 0, gy = Math.random() * 256 | 0;
    ctx.translate(-gx, -gy);
    ctx.fillStyle = ctx.createPattern(grain, 'repeat');
    ctx.fillRect(0, 0, W + 256, H + 256);
    ctx.restore();
    ctx.drawImage(vignette, 0, 0, W, H);

    if (toast) {
      const e = performance.now() / 1000 - toast.t0;
      if (e > 2.6) toast = null;
      else {
        ctx.globalAlpha = Math.min(1, 2.6 - e);
        ctx.fillStyle = C.yellow;
        ctx.textAlign = 'center';
        ctx.font = "italic 26px 'Iowan Old Style', Palatino, Georgia, serif";
        ctx.fillText(toast.text, 640, 60);
        ctx.globalAlpha = 1;
      }
    }

    if (fadeA > 0.002) { ctx.fillStyle = `rgba(0,0,0,${fadeA})`; ctx.fillRect(0, 0, W, H); }

    if (scareS) {
      const e = performance.now() / 1000 - scareS.t0;
      if (e >= scareS.dur) {
        const r = scareS.res;
        scareS = null;
        r();
      } else {
        const z = 1.06 + e * 0.32;
        const jx = (Math.random() - 0.5) * 26, jy = (Math.random() - 0.5) * 26;
        ctx.save();
        ctx.translate(640 + jx, 360 + jy); ctx.scale(z, z); ctx.translate(-640, -360);
        ctx.drawImage(scareS.img, 0, 0, W, H);
        ctx.restore();
        if (e < 0.06 && !store.reduced) { ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H); }
        if (scareS.dur - e < 0.12) { ctx.fillStyle = `rgba(0,0,0,${1 - (scareS.dur - e) / 0.12})`; ctx.fillRect(0, 0, W, H); }
      }
    }
  }

  // ---- menu wiring ----
  $('#wgo').onclick = () => { Snd.init(); el.warn.classList.remove('on'); toMenu(); };
  $('#mstart').onclick = begin;
  $('#mend').onclick = () => { renderEndings(); el.menu.classList.remove('on'); el.endings.classList.add('on'); };
  $('#mback').onclick = () => { el.endings.classList.remove('on'); el.menu.classList.add('on'); };
  el.vol.value = store.vol;
  el.reduced.checked = store.reduced;
  Snd.setVolume(store.vol / 100);
  el.vol.oninput = () => { store.vol = +el.vol.value; Snd.setVolume(store.vol / 100); save(); };
  el.reduced.onchange = () => { store.reduced = el.reduced.checked; save(); };

  scene = Art.scene('heart');
  fadeA = 0;
  el.warn.classList.add('on');
  ['sister', 'eight', 'doctor', 'hall'].forEach(n => Art.scareImg(n));
  requestAnimationFrame(frame);

  return {
    setOverlay(o) { overlay = o; },
    shake, addSplat,
    friesFound: () => store.fries.length,
    autoRhythm: false,
    // Playtest hooks.
    debug: {
      jump(node, vars) { el.warn.classList.remove('on'); el.menu.classList.remove('on'); clearBlood(); V = Object.assign(fresh(), vars || {}); run(node); },
      setFF(v) { ff = v; },
      store: () => store,
      vars: () => V,
      click() { if (advance) { const f = advance; advance = null; f(); } },
      reset() { store.endings = []; store.fries = []; store.easy = false; save(); },
    },
  };
})();
