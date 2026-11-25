/* =====================================================================
   NOX'S ARCADE · opens from NOX's card (window.NoxPlay.open)
   A menu with two games; Play starts straight away.
   - Eyes in the Dark (memory): eyes open on a grid for a moment; tap
     where they were before the timer runs out. Red eyes are traps.
     3 lives; a wrong tap or running out of time costs one.
   - Mind Trick (focus): a colour word in the wrong ink. Tap the INK or
     the WORD, whichever the rule says; the rule flips without warning.
     40 seconds, streaks multiply points, a wrong tap costs 3 seconds.
   Each game keeps the player's best score in this browser.
   ===================================================================== */
(() => {
  const html = document.documentElement;
  const coarse = matchMedia('(pointer: coarse)').matches;
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
  };
  const rand = (n) => Math.floor(Math.random() * n);
  const pick = (a) => a[rand(a.length)];
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const buzz = (ms) => { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* not supported */ } };
  const bestOf = (g) => +(store.get(`nox:best:${g}`) || 0);

  /* ---------------- the games ---------------- */
  const GAMES = {
    eyes: {
      name: 'Eyes in the Dark', brand: 'Eyes in the <em>Dark</em>', kind: 'Memory &middot; against the clock',
      desc: 'Eyes open in the dark for a moment. Remember them, then find them before the timer runs out.',
      verdict: (lv) => lv >= 10 ? 'Nox bows to you. That memory is scary good.' : lv >= 7 ? 'Sharp and quick. Nox is a little worried now.' : lv >= 4 ? 'Nice run. The traps get sneakier from here.' : 'Warm-up done. The next run is the real one.',
    },
    trick: {
      name: 'Mind Trick', brand: 'Mind <em>Trick</em>', kind: 'Focus &middot; 40 seconds',
      desc: 'A colour word in the wrong ink. Tap the ink or the word, as the rule says. It flips.',
      verdict: (n) => n >= 40 ? 'Unshakeable. Your brain ignores nothing.' : n >= 28 ? 'Fast and focused. Nox is impressed.' : n >= 16 ? 'Solid. The flips got you a few times.' : 'Tricky, right? Your brain wants to read the word.',
    },
  };

  /* ---------------- sound: tiny synth blips, no files ---------------- */
  const Sfx = (() => {
    let ctx = null, on = store.get('nox:sound') !== '0';
    const ac = () => {
      if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    };
    function tone(f, d = 0.12, type = 'sine', vol = 0.06, slideTo = 0, delay = 0) {
      if (!on) return;
      const c = ac(); if (!c) return;
      const t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + d);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + d + 0.03);
    }
    return {
      get on() { return on; },
      toggle() { on = !on; store.set('nox:sound', on ? '1' : '0'); if (on) tone(660, 0.08, 'triangle'); return on; },
      hit(n = 0) { const f = 620 * Math.pow(1.055, Math.min(n, 14)); tone(f, 0.12, 'triangle', 0.06); tone(f * 1.5, 0.16, 'sine', 0.03, 0, 0.045); },
      miss() { tone(200, 0.3, 'sawtooth', 0.035, 95); tone(150, 0.3, 'triangle', 0.05, 80); },
      tick() { tone(1046, 0.05, 'triangle', 0.035); },
      go() { tone(660, 0.1, 'triangle', 0.05); tone(990, 0.2, 'triangle', 0.05, 0, 0.09); },
      flip() { tone(320, 0.2, 'sine', 0.05, 960); },
      show() { tone(180, 0.4, 'sine', 0.035, 240); },
      level() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 'triangle', 0.045, 0, i * 0.07)); },
      over() { [392, 330, 262].forEach((f, i) => tone(f, 0.32, 'triangle', 0.045, 0, i * 0.15)); },
    };
  })();

  /* ---------------- markup ---------------- */
  const paw = '<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="16" rx="5.2" ry="4.4"/><ellipse cx="5.6" cy="10.4" rx="2.1" ry="2.7"/><ellipse cx="9.6" cy="6.6" rx="2.1" ry="2.8"/><ellipse cx="14.4" cy="6.6" rx="2.1" ry="2.8"/><ellipse cx="18.4" cy="10.4" rx="2.1" ry="2.7"/></svg>';
  const eye = (tx) => `<g transform="translate(${tx} 0)${tx ? ' scale(-1 1) translate(-26 0)' : ''}"><path class="gm__iris" d="M2 17 C6 8 17 6 25 11 C21 19 10 22 2 17 Z"/><ellipse class="gm__pupil" cx="14.2" cy="13.8" rx="1.7" ry="5"/><circle class="gm__glint" cx="17" cy="11" r="1.1"/></g>`;
  const eyesSvg = `<svg class="gm__eyes" viewBox="0 0 60 28" aria-hidden="true">${eye(0)}${eye(34)}</svg>`;
  const COLORS = [
    { k: 'gold', name: 'Gold', hex: '#f0b85a' },
    { k: 'red', name: 'Red', hex: '#ff5a4a' },
    { k: 'green', name: 'Green', hex: '#7fd36a' },
    { k: 'blue', name: 'Blue', hex: '#62b4ff' },
  ];
  const card = (g, i) => `
    <article class="gm__card" data-card="${g}" style="--i:${i}" tabindex="0" role="button" aria-label="Play ${GAMES[g].name}" data-cursor="Play">
      <div class="gm__prev gm__prev--${g}" aria-hidden="true">${g === 'eyes'
        ? `<div class="gm__pgrid">${Array.from({ length: 9 }, () => `<span class="gm__pcell">${eyesSvg}</span>`).join('')}</div>`
        : '<span class="gm__pword" data-pword>BLUE</span><span class="gm__prule" data-prule>Tap the <b>INK</b></span>'}</div>
      <div class="gm__cbody">
        <p class="np__mono gm__ckind">${GAMES[g].kind}</p>
        <h3 class="gm__cname">${GAMES[g].brand}</h3>
        <p class="gm__cdesc">${GAMES[g].desc}</p>
        <div class="gm__crow"><span class="np__mono">Your best <b data-mybest="${g}">&ndash;</b></span><span class="gm__play">Play <i aria-hidden="true">&rarr;</i></span></div>
      </div>
    </article>`;
  const markup = `
    <div class="np__bg"><img src="assets/nox/jungle.webp" alt="" decoding="async"></div>
    <canvas class="gm__flies" aria-hidden="true"></canvas>
    <div class="np__shade" aria-hidden="true"></div>
    <header class="np__hud gm__hud">
      <div class="np__brand"><span class="np__mono">Nox&rsquo;s arcade</span><b data-brand>Play with <em>Nox</em></b></div>
      <div class="np__score gm__score" aria-live="polite"><span class="np__mono" data-lvl></span><b data-score>0</b><i class="np__combo" data-combo></i></div>
      <div class="np__right">
        <div class="np__lives" data-lives aria-label="3 lives">${paw}${paw}${paw}</div>
        <button class="np__x gm__snd" type="button" data-sound aria-label="Sound" data-cursor="Sound"><svg viewBox="0 0 24 24" aria-hidden="true"><path class="gm__spk" d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path class="gm__wave" d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.8 7.8 0 0 1 0 11"/><path class="gm__mute" d="M16 9.5l5 5M21 9.5l-5 5"/></svg></button>
        <button class="np__x" type="button" data-np-close aria-label="Close the games" data-cursor="Close"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      </div>
    </header>

    <section class="gm__menu" data-screen="menu">
      <p class="np__mono gm__kick">Two quick games &middot; beat your best</p>
      <h2 class="gm__title">Pick a <em>game.</em></h2>
      <div class="gm__cards">${card('eyes', 0)}${card('trick', 1)}</div>
    </section>

    <main class="gm__stage" data-stage="eyes" aria-label="Eyes in the Dark">
      <p class="gm__status" data-status aria-live="polite"></p>
      <div class="gm__timer gm__etimer" aria-hidden="true"><i data-ebar></i></div>
      <div class="gm__gridwrap"><div class="gm__grid" data-grid></div><div class="gm__banner" data-banner aria-hidden="true"></div></div>
      <div class="gm__dots" data-dots aria-hidden="true"></div>
      <p class="gm__say" data-say></p>
    </main>

    <main class="gm__stage gm__trick" data-stage="trick" aria-label="Mind Trick">
      <div class="gm__timer" aria-hidden="true"><i data-bar></i></div>
      <p class="gm__rule" data-rule aria-live="polite"></p>
      <div class="gm__wcard" data-wcard><span class="gm__word" data-word></span></div>
      <div class="gm__streak" data-streak aria-hidden="true">${'<i></i>'.repeat(10)}<b data-mult>&times;1</b></div>
      <div class="gm__opts" data-opts></div>
      <p class="gm__say" data-say></p>
    </main>

    <div class="gm__count" data-count aria-hidden="true"></div>

    <section class="gm__over" data-screen="over" hidden>
      <p class="np__mono gm__kick" data-overkick>Game over</p>
      <div class="gm__final"><b data-final>0</b><span>points</span></div>
      <p class="gm__verdict" data-verdict></p>
      <p class="np__mono gm__bestline" data-bestline></p>
      <div class="gm__actions">
        <button class="np__btn np__btn--fill" type="button" data-again data-cursor="Again">Play again <span aria-hidden="true">&rarr;</span></button>
        <button class="np__btn" type="button" data-menu data-cursor="Games">All games</button>
      </div>
    </section>
    <div class="gm__toast" data-toast role="status"></div>

    <a class="np__credit" href="https://commons.wikimedia.org/wiki/File:Tropical_rainforest_in_Sangha_Trinational.jpg" target="_blank" rel="noopener">Forest photo: JosepMGracia, CC BY-SA 4.0</a>`;

  /* ---------------- open / close ---------------- */
  let game = null;
  window.NoxPlay = { open(from) { if (!game) game = build(from); } };

  function build(from) {
    const root = document.createElement('div');
    root.className = 'np gm';
    root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'Nox’s arcade');
    root.setAttribute('data-lenis-prevent', '');
    root.innerHTML = markup;
    root.style.setProperty('--ox', `${from ? from.x : innerWidth / 2}px`);
    root.style.setProperty('--oy', `${from ? from.y : innerHeight / 2}px`);
    document.body.append(root);
    const prevFocus = document.activeElement;
    html.classList.add('nox-playing');
    const prevOverflow = html.style.overflow; html.style.overflow = 'hidden';
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-open')));

    const $ = (s, el = root) => el.querySelector(s), $$ = (s, el = root) => [...el.querySelectorAll(s)];
    const scoreEl = $('[data-score]'), lvlEl = $('[data-lvl]'), livesEl = $('[data-lives]'), comboEl = $('[data-combo]');
    const toastEl = $('[data-toast]');

    let closing = false, timers = [];
    let current = 'eyes', score = 0, shown = 0, engine = null;
    const later = (fn, ms) => { const t = setTimeout(() => { if (!closing) fn(); }, ms); timers.push(t); return t; };
    const stopRun = () => { timers.forEach(clearTimeout); timers = []; if (engine) engine.stop(); };

    /* ---- small shared effects ---- */
    function setScore(v) {
      score = v;
      // the number rolls up to the new value instead of jumping
      const from = shown, t0 = performance.now(), dur = 380;
      cancelAnimationFrame(setScore.raf);
      const step = (now) => {
        const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
        shown = Math.round(from + (score - from) * e); scoreEl.textContent = shown;
        if (k < 1) setScore.raf = requestAnimationFrame(step);
      };
      setScore.raf = requestAnimationFrame(step);
      scoreEl.classList.remove('is-bump'); void scoreEl.offsetWidth; scoreEl.classList.add('is-bump');
    }
    const resetScore = () => { cancelAnimationFrame(setScore.raf); score = 0; shown = 0; scoreEl.textContent = '0'; };
    const sayIn = (stage) => (t) => { const el = $('[data-say]', stage); el.classList.remove('is-on'); void el.offsetWidth; el.textContent = t; el.classList.add('is-on'); };
    function floatAt(el, text, cls = '') {
      const f = document.createElement('span'); f.className = `gm__float ${cls}`; f.textContent = text;
      el.append(f); setTimeout(() => f.remove(), 900);
    }
    function ripple(el, cls = '') {
      const r = document.createElement('span'); r.className = `gm__ripple ${cls}`;
      el.append(r); setTimeout(() => r.remove(), 700);
    }
    const shake = (el) => { if (calm) return; el.classList.remove('is-shake'); void el.offsetWidth; el.classList.add('is-shake'); };
    function toast(t) { toastEl.textContent = t; toastEl.classList.add('is-on'); clearTimeout(toast.t); toast.t = setTimeout(() => toastEl.classList.remove('is-on'), 2000); }

    /* ---- fireflies drifting through the scene (one small canvas) ---- */
    const fc = $('.gm__flies'), fx = fc.getContext('2d');
    const DPR = Math.min(1.5, devicePixelRatio || 1);
    let FW = 0, FH = 0, fliesRaf = 0;
    const sizeFlies = () => { FW = innerWidth; FH = innerHeight; fc.width = FW * DPR; fc.height = FH * DPR; fx.setTransform(DPR, 0, 0, DPR, 0, 0); };
    sizeFlies(); addEventListener('resize', sizeFlies);
    const spr = (() => { const c = document.createElement('canvas'); c.width = c.height = 40; const g = c.getContext('2d'); const gr = g.createRadialGradient(20, 20, 0, 20, 20, 20); gr.addColorStop(0, 'rgba(255,246,200,1)'); gr.addColorStop(0.18, 'rgba(240,214,120,.8)'); gr.addColorStop(1, 'rgba(240,200,90,0)'); g.fillStyle = gr; g.fillRect(0, 0, 40, 40); return c; })();
    const flies = Array.from({ length: calm ? 0 : (coarse ? 14 : 24) }, () => ({ x: Math.random() * innerWidth, y: Math.random() * innerHeight, a: Math.random() * 6.28, s: 6 + Math.random() * 14, ph: Math.random() * 6.28, r: 5 + Math.random() * 9 }));
    let lastF = performance.now();
    function fliesLoop(now) {
      fliesRaf = requestAnimationFrame(fliesLoop);
      const dt = Math.min(0.05, (now - lastF) / 1000); lastF = now;
      if (document.hidden) return;
      fx.clearRect(0, 0, FW, FH);
      fx.globalCompositeOperation = 'lighter';
      for (const f of flies) {
        f.a += (Math.random() - 0.5) * 1.6 * dt; f.ph += dt * (0.8 + f.r * 0.08);
        f.x += Math.cos(f.a) * f.s * dt; f.y += Math.sin(f.a) * f.s * dt * 0.7;
        if (f.x < -20) f.x = FW + 20; if (f.x > FW + 20) f.x = -20; if (f.y < -20) f.y = FH + 20; if (f.y > FH + 20) f.y = -20;
        const glow = Math.pow(Math.max(0, Math.sin(f.ph)), 3);
        if (glow < 0.02) continue;
        fx.globalAlpha = glow * 0.85;
        fx.drawImage(spr, f.x - f.r, f.y - f.r, f.r * 2, f.r * 2);
      }
      fx.globalAlpha = 1; fx.globalCompositeOperation = 'source-over';
    }
    if (flies.length) fliesRaf = requestAnimationFrame(fliesLoop);

    /* ---- screens: 'menu' | 'over' | null (playing) ---- */
    function setScreen(name) {
      root.classList.toggle('is-menu', name === 'menu');
      root.classList.toggle('is-over', name === 'over');
      root.classList.toggle('is-playing', !name);
      $$('[data-screen]').forEach((el) => { el.hidden = el.dataset.screen !== name; });
      if (name === 'menu') { $('[data-brand]').innerHTML = 'Play with <em>Nox</em>'; renderBests(); startPreviews(); }
      else stopPreviews();
    }
    function renderBests() { ['eyes', 'trick'].forEach((g) => { $(`[data-mybest="${g}"]`).textContent = bestOf(g) || '–'; }); }

    /* ---- menu previews: a tiny live demo inside each card ---- */
    let prevT = 0;
    function startPreviews() {
      stopPreviews();
      if (calm) return;
      const cells = $$('.gm__pcell'), word = $('[data-pword]'), rule = $('[data-prule]');
      let k = 0;
      const step = () => {
        cells.forEach((c) => c.classList.remove('is-show'));
        shuffle(cells.slice()).slice(0, 2 + (k % 2)).forEach((c) => c.classList.add('is-show'));
        const w = pick(COLORS), ink = pick(COLORS.filter((c) => c !== w));
        word.textContent = w.name.toUpperCase(); word.style.color = ink.hex;
        word.classList.remove('is-in'); void word.offsetWidth; word.classList.add('is-in');
        if (k % 3 === 2) rule.innerHTML = rule.textContent.includes('INK') ? 'Tap the <b>WORD</b>' : 'Tap the <b>INK</b>';
        k++;
      };
      step(); prevT = setInterval(step, 1300);
    }
    function stopPreviews() { clearInterval(prevT); }

    /* ---- countdown: 3, 2, 1, Go ---- */
    function countdown(done) {
      const el = $('[data-count]');
      let n = 3;
      const step = () => {
        el.textContent = n > 0 ? n : 'Go';
        el.classList.remove('is-on'); void el.offsetWidth; el.classList.add('is-on');
        if (n > 0) Sfx.tick(); else Sfx.go();
        if (n-- > 0) later(step, 620); else later(done, 380);
      };
      if (calm) { done(); return; }
      step();
    }

    /* ================= GAME 1 · Eyes in the Dark ================= */
    function eyesGame() {
      const stage = $('[data-stage="eyes"]'), grid = $('[data-grid]', stage), statusEl = $('[data-status]', stage);
      const dotsEl = $('[data-dots]', stage), banner = $('[data-banner]', stage), say = sayIn(stage);
      const ebar = $('[data-ebar]', stage), etimer = $('.gm__etimer', stage);
      const EYES = [3, 4, 4, 5, 6, 6, 7, 8, 8, 9, 10, 11];
      const spec = (lv) => {
        const n = lv <= 2 ? 3 : lv <= 5 ? 4 : lv <= 9 ? 5 : 6;
        const eyes = Math.min(n * n - 4, EYES[lv - 1] || 11 + (lv - 12));
        // time to find them all: generous at first, tighter every level
        const limit = Math.max(1400 + eyes * 550, (2200 + eyes * 900) * Math.pow(0.95, lv - 1));
        return { n, eyes, traps: lv >= 8 ? 2 : lv >= 4 ? 1 : 0, show: Math.max(1100, (1200 + eyes * 210) * Math.pow(0.965, lv - 1)), limit };
      };
      let level = 1, lives = 3, cells = [], targets = new Set(), traps = new Set(), found = 0, firstTry = true, phase = 'off', fresh = true;
      let traf = 0, tStart = 0, tLimit = 1, lastSec = 99;
      const hud = () => {
        lvlEl.textContent = `Level ${level}`;
        livesEl.querySelectorAll('svg').forEach((s, i) => s.classList.toggle('is-lost', i >= lives));
        livesEl.setAttribute('aria-label', `${lives} ${lives === 1 ? 'life' : 'lives'}`);
      };
      function makeCells(n) {
        grid.textContent = ''; grid.style.setProperty('--n', n);
        cells = Array.from({ length: n * n }, (_, i) => {
          const b = document.createElement('button');
          b.type = 'button'; b.className = 'gm__cell'; b.dataset.i = i; b.setAttribute('aria-label', `Spot ${i + 1}`);
          b.style.setProperty('--d', `${((i % n) + Math.floor(i / n)) * 35}ms`);
          b.innerHTML = `<span class="gm__glow"></span>${eyesSvg}`;
          grid.append(b);
          return b;
        });
        grid.classList.remove('is-in', 'is-out'); void grid.offsetWidth; grid.classList.add('is-in');
      }
      function showBanner(big, small) {
        banner.innerHTML = `<b>${big}</b><span>${small}</span>`;
        banner.classList.remove('is-on'); void banner.offsetWidth; banner.classList.add('is-on');
      }
      /* the recall clock: a bar that drains; the last seconds tick */
      function clockStart(ms) {
        tLimit = ms; tStart = performance.now(); lastSec = 99;
        etimer.classList.add('is-on'); ebar.classList.remove('is-low');
        cancelAnimationFrame(traf);
        const step = (now) => {
          if (phase !== 'recall') return;
          const left = Math.max(0, tLimit - (now - tStart)), k = left / tLimit;
          ebar.style.transform = `scaleX(${k})`;
          ebar.classList.toggle('is-low', k < 0.3);
          const s = Math.ceil(left / 1000);
          statusEl.querySelector('[data-secs]') && (statusEl.querySelector('[data-secs]').textContent = `${(left / 1000).toFixed(1)}s`);
          if (s <= 2 && s < lastSec && s > 0) Sfx.tick();
          lastSec = s;
          if (left <= 0) { timeUp(); return; }
          traf = requestAnimationFrame(step);
        };
        traf = requestAnimationFrame(step);
      }
      const clockLeft = () => Math.max(0, tLimit - (performance.now() - tStart));
      function clockStop() { cancelAnimationFrame(traf); }
      function round() {
        const L = spec(level), resize = cells.length !== L.n * L.n;
        phase = 'intro'; grid.classList.add('is-locked'); hud(); clockStop();
        statusEl.innerHTML = '&nbsp;';
        ebar.style.transform = 'scaleX(1)'; ebar.classList.remove('is-low'); etimer.classList.remove('is-on');
        let wait = 0;
        if (fresh) {
          // a new level: a short title card over the board
          const note = level === 1 ? 'Find them before time runs out' : level === 4 ? 'Red eyes are traps now' : resize ? 'The jungle grows' : `${L.eyes} pairs of eyes · ${(L.limit / 1000).toFixed(1)}s`;
          showBanner(`Level ${level}`, note); wait = 950;
          if (resize && cells.length) { grid.classList.add('is-out'); later(() => makeCells(L.n), 260); }
          else if (resize) makeCells(L.n);
          else cells.forEach((c) => { c.className = 'gm__cell'; });
        } else cells.forEach((c) => { c.className = 'gm__cell'; });
        fresh = false;
        later(() => {
          const idx = shuffle([...cells.keys()]);
          targets = new Set(idx.slice(0, L.eyes)); traps = new Set(idx.slice(L.eyes, L.eyes + L.traps));
          found = 0; dotsEl.innerHTML = '<span></span>'.repeat(L.eyes);
          statusEl.innerHTML = `<b>Watch.</b> ${L.eyes} eyes${L.traps ? ` &middot; ${L.traps} trap${L.traps > 1 ? 's' : ''}` : ''}`;
          // each pair looks somewhere slightly different
          [...targets, ...traps].forEach((i) => {
            const c = cells[i];
            c.style.setProperty('--lx', `${(Math.random() * 3 - 1.5).toFixed(2)}px`);
            c.style.setProperty('--ly', `${(Math.random() * 1.6 - 0.8).toFixed(2)}px`);
            c.style.setProperty('--sd', `${rand(140)}ms`);
            c.classList.add('is-show'); if (traps.has(i)) c.classList.add('is-trap');
          });
          Sfx.show();
          later(() => {
            cells.forEach((c) => { if (c.classList.contains('is-show')) c.classList.add('is-blink'); });
            later(() => {
              cells.forEach((c) => c.classList.remove('is-show', 'is-blink', 'is-trap'));
              phase = 'recall'; grid.classList.remove('is-locked');
              statusEl.innerHTML = `<b>Go!</b> Find ${L.eyes} eyes &middot; <span class="gm__secs" data-secs></span>`;
              clockStart(L.limit);
            }, 200);
          }, L.show + 140);
        }, wait + 250);
      }
      function lose(cell, why) {
        // a wrong tap, a trap, or the clock ran out
        phase = 'result'; clockStop(); grid.classList.add('is-locked'); firstTry = false;
        lives--; hud(); Sfx.miss(); buzz(90);
        if (cell) { cell.classList.add('is-miss'); ripple(cell, 'is-bad'); }
        targets.forEach((t) => { if (!cells[t].classList.contains('is-hit')) cells[t].classList.add('is-reveal'); });
        shake(grid);
        if (lives <= 0) { statusEl.innerHTML = '<b>Out of lives.</b>'; say(why === 'time' ? 'Too slow 😼' : 'Gotcha 😼'); later(() => gameOver(level), 1500); return; }
        const msg = { time: '<b>Time&rsquo;s up.</b> Same level again', trap: '<b>That was a trap.</b> Same level again', empty: '<b>Nothing there.</b> Same level again' };
        statusEl.innerHTML = msg[why];
        say(why === 'time' ? pick(['Faster! ⏱', 'Too slow 😼', 'Tick tock…']) : why === 'trap' ? pick(['Red means no 😾', 'Caught you!', 'Trap! 😾']) : pick(['Close… not quite.', 'Nope, empty.', 'Look again 👀']));
        later(round, 1800);
      }
      function timeUp() { if (phase === 'recall') lose(null, 'time'); }
      function tap(i) {
        if (phase !== 'recall' || !cells[i]) return;
        const c = cells[i];
        if (c.classList.contains('is-hit')) return;
        const L = spec(level);
        if (targets.has(i)) {
          found++; setScore(score + 10);
          c.classList.add('is-hit'); ripple(c); floatAt(c, '+10'); Sfx.hit(found);
          const d = dotsEl.children[found - 1]; if (d) d.classList.add('is-on');
          if (found < L.eyes) return;
          // cleared: a level bonus, doubled on the first try, plus a speed bonus for time left
          phase = 'result'; const leftMs = clockLeft(); clockStop(); grid.classList.add('is-locked', 'is-clear');
          const speed = Math.round(leftMs / 100);
          const bonus = level * 5 * (firstTry ? 2 : 1) + speed;
          statusEl.innerHTML = `<b>Cleared.</b> ${(leftMs / 1000).toFixed(1)}s to spare`;
          later(() => { setScore(score + bonus); Sfx.level(); }, 250);
          say((firstTry ? pick(['Perfect. I’m impressed 😼', 'Sharp eyes!', 'Not bad, human.', 'Flawless 🐾']) : 'Got them all') + `  +${bonus}`);
          later(() => { grid.classList.remove('is-clear'); level++; firstTry = true; fresh = true; round(); }, 1250);
          return;
        }
        lose(c, traps.has(i) ? 'trap' : 'empty');
        if (traps.has(i)) c.classList.add('is-show', 'is-trap');
      }
      grid.onclick = (e) => { const c = e.target.closest('.gm__cell'); if (c) tap(+c.dataset.i); };
      return {
        start() {
          level = 1; lives = 3; firstTry = true; fresh = true; phase = 'off';
          cells = []; grid.textContent = ''; dotsEl.textContent = ''; statusEl.innerHTML = '&nbsp;'; $('[data-say]', stage).textContent = '';
          hud(); round();
        },
        stop() { phase = 'off'; clockStop(); },
        key(k) { if (/^[1-9]$/.test(k) && cells.length === 9) tap(+k - 1); },
      };
    }

    /* ================= GAME 2 · Mind Trick ================= */
    function trickGame() {
      const stage = $('[data-stage="trick"]'), say = sayIn(stage);
      const bar = $('[data-bar]', stage), ruleEl = $('[data-rule]', stage), wordEl = $('[data-word]', stage), opts = $('[data-opts]', stage), wcard = $('[data-wcard]', stage);
      const streakEl = $('[data-streak]', stage), multEl = $('[data-mult]', stage);
      const TOTAL = 40;
      let tLeft = TOTAL, streak = 0, hits = 0, rule = 'ink', ruleLeft = 6, item = null, order = COLORS.slice(), live = false, last = 0, lock = false, lastSec = 99, raf = 0;
      const elapsed = () => TOTAL - tLeft;
      const mult = () => (streak >= 10 ? 3 : streak >= 5 ? 2 : 1);
      function hudTime() {
        const s = Math.max(0, Math.ceil(tLeft));
        lvlEl.textContent = `Time 0:${String(s).padStart(2, '0')}`;
        if (live && s <= 5 && s < lastSec && s > 0) Sfx.tick();
        lastSec = s;
      }
      function hudStreak() {
        const m = mult();
        [...streakEl.querySelectorAll('i')].forEach((d, i) => d.classList.toggle('is-on', i < Math.min(streak, 10)));
        streakEl.dataset.m = m; multEl.textContent = `×${m}`;
        comboEl.textContent = `×${m}`; comboEl.classList.toggle('is-on', m > 1);
      }
      function showRule(changed) {
        ruleEl.innerHTML = rule === 'ink' ? 'Tap the <b>INK colour</b>' : 'Tap the <b>WORD</b>';
        ruleEl.dataset.rule = rule; wcard.dataset.rule = rule;
        if (changed) { ruleEl.classList.remove('is-flip'); void ruleEl.offsetWidth; ruleEl.classList.add('is-flip'); Sfx.flip(); }
      }
      function next() {
        // the rule holds for a few cards, then flips (the first cards are always "ink")
        let changed = false;
        if (--ruleLeft <= 0) { rule = rule === 'ink' ? 'word' : 'ink'; ruleLeft = 2 + rand(4); changed = true; }
        const w = rand(4);
        let ink = rand(4);
        if (Math.random() < 0.82) while (ink === w) ink = rand(4);   // mostly mismatched, sometimes the same to keep you honest
        item = { word: COLORS[w].k, ink: COLORS[ink].k };
        wordEl.textContent = COLORS[w].name.toUpperCase();
        wordEl.style.color = COLORS[ink].hex;
        wordEl.classList.remove('is-in'); void wordEl.offsetWidth; wordEl.classList.add('is-in');
        // after 20 s the buttons reshuffle every card, and their labels are written in the wrong ink too
        const hard = elapsed() >= 20;
        if (hard) shuffle(order); else order = COLORS.slice();
        opts.innerHTML = order.map((c, i) => {
          const fake = hard ? pick(COLORS.filter((x) => x.k !== c.k)).hex : '';
          return `<button type="button" class="gm__opt" data-k="${c.k}" style="--c:${c.hex}" data-cursor="${c.name}"><i></i><span${fake ? ` style="color:${fake}"` : ''}>${c.name}</span><kbd>${i + 1}</kbd></button>`;
        }).join('');
        showRule(changed);
        if (changed) say(pick(['Flip! 🔄', 'Rule changed 👀', 'Careful now 😼']));
      }
      function answer(k, btn) {
        if (!live || lock) return;
        const want = rule === 'ink' ? item.ink : item.word;
        if (k === want) {
          streak++; hits++;
          const pts = 10 * mult(); setScore(score + pts); Sfx.hit(streak);
          if (btn) { ripple(btn); btn.classList.add('is-good'); }
          wcard.classList.remove('is-good'); void wcard.offsetWidth; wcard.classList.add('is-good');
          floatAt(wcard, `+${pts}`);
          if (streak === 5 || streak === 10) { say(streak === 5 ? 'Streak ×2 🔥' : 'Streak ×3 🔥🔥'); Sfx.level(); }
          hudStreak();
          lock = true; later(() => { lock = false; next(); }, 110);
        } else {
          streak = 0; tLeft -= 3; hudStreak(); hudTime(); Sfx.miss(); buzz(70);
          if (btn) { btn.classList.add('is-wrong'); ripple(btn, 'is-bad'); }
          floatAt(wcard, '−3s', 'is-bad'); shake(wcard);
          say(rule === 'ink' ? 'The INK, not the word 😾' : 'The WORD, not the ink 😾');
          lock = true; later(() => { lock = false; next(); }, 420);
        }
      }
      function tick(now) {
        if (!live) return;
        const dt = Math.min(0.1, (now - last) / 1000); last = now;
        tLeft -= dt;
        bar.style.transform = `scaleX(${Math.max(0, tLeft / TOTAL)})`;
        bar.classList.toggle('is-low', tLeft < 8);
        hudTime();
        if (tLeft <= 0) {
          live = false; opts.querySelectorAll('button').forEach((b) => (b.disabled = true));
          say('Time! ⏱'); later(() => gameOver(hits), 1100); return;
        }
        raf = requestAnimationFrame(tick);
      }
      opts.onclick = (e) => { const b = e.target.closest('.gm__opt'); if (b) answer(b.dataset.k, b); };
      return {
        prep() {
          tLeft = TOTAL; streak = 0; hits = 0; rule = 'ink'; lock = false; lastSec = 99;
          $('[data-say]', stage).textContent = ''; bar.style.transform = 'scaleX(1)'; bar.classList.remove('is-low');
          hudStreak(); hudTime();
          ruleLeft = 7; next(); opts.querySelectorAll('button').forEach((b) => (b.disabled = true));
        },
        start() {
          opts.querySelectorAll('button').forEach((b) => (b.disabled = false));
          live = true; last = performance.now(); raf = requestAnimationFrame(tick);
        },
        stop() { live = false; cancelAnimationFrame(raf); },
        key(k) { if (/^[1-4]$/.test(k)) { const b = opts.children[+k - 1]; if (b) answer(b.dataset.k, b); } },
      };
    }

    const engines = { eyes: eyesGame(), trick: trickGame() };

    /* ---- game flow ---- */
    function play(g) {
      stopRun();
      current = g; root.dataset.game = g;
      $('[data-brand]').innerHTML = GAMES[g].brand;
      resetScore(); comboEl.classList.remove('is-on');
      engine = engines[g];
      setScreen(null);
      if (g === 'trick') engine.prep();
      countdown(() => engine.start());
    }
    function gameOver(level) {
      if (engine) engine.stop();
      Sfx.over();
      const g = current, G = GAMES[g], best = bestOf(g), isBest = score > best;
      if (isBest) store.set(`nox:best:${g}`, score);
      $('[data-overkick]').textContent = isBest && best > 0 ? `New personal best · ${G.name}` : G.name;
      $('[data-verdict]').textContent = G.verdict(level);
      $('[data-bestline]').textContent = isBest ? (best > 0 ? `Previous best ${best}` : 'Your first score. Now beat it.') : `Your best ${best}`;
      comboEl.classList.remove('is-on');
      setScreen('over');
      // the big number counts up
      const fin = $('[data-final]'), t0 = performance.now();
      const roll = (now) => { const k = Math.min(1, (now - t0) / 900), e = 1 - Math.pow(1 - k, 3); fin.textContent = Math.round(score * e); if (k < 1 && !closing) requestAnimationFrame(roll); };
      requestAnimationFrame(roll);
      setTimeout(() => { const b = $('[data-again]'); if (b && !closing && !coarse) b.focus({ preventScroll: true }); }, 500);
    }

    /* ---- input ---- */
    root.addEventListener('click', (e) => {
      const t = e.target;
      if (t.closest('[data-np-close]')) { close(); return; }
      const c = t.closest('[data-card]'); if (c) { play(c.dataset.card); return; }
      if (t.closest('[data-again]')) { play(current); return; }
      if (t.closest('[data-menu]')) { stopRun(); setScreen('menu'); return; }
      if (t.closest('[data-sound]')) { const on = Sfx.toggle(); root.classList.toggle('is-muted', !on); toast(on ? 'Sound on' : 'Sound off'); }
    });
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
      if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-card]')) { e.preventDefault(); play(e.target.dataset.card); return; }
      if (root.classList.contains('is-playing') && engine) engine.key(e.key);
    };
    addEventListener('keydown', onKey, true);

    function close() {
      if (closing) return; closing = true; stopRun(); stopPreviews();
      root.classList.remove('is-open'); root.classList.add('is-closing');
      removeEventListener('keydown', onKey, true); removeEventListener('resize', sizeFlies);
      setTimeout(() => {
        cancelAnimationFrame(fliesRaf); root.remove();
        html.classList.remove('nox-playing'); html.style.overflow = prevOverflow;
        if (prevFocus && prevFocus.focus) prevFocus.focus({ preventScroll: true });
        game = null;
      }, 820);
    }

    root.classList.toggle('is-muted', !Sfx.on);
    setScreen('menu');
    return { close };
  }
})();
