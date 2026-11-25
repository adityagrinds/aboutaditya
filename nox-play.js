/* =====================================================================
   NIGHT HUNT · play with NOX
   Opens from NOX's card. A moonlit rainforest (a real photo, graded to
   night) with light shafts, drifting mist, fireflies, falling leaves and
   swaying foreground plants drawn on two canvases. The big panther is the
   same rig as the site pet (pet.js → NoxPet.spawn) driven by the game.
   Catch gold orbs (+1), moon orbs (+5); embers burn; miss gold, lose a life.
   ===================================================================== */
(() => {
  const coarse = matchMedia('(pointer: coarse)').matches;        // touch: tap/drag to move, a Leap button to jump
  const BEST = 'nox:best';
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const html = document.documentElement;
  let game = null;

  const paw = '<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="16" rx="5.2" ry="4.4"/><ellipse cx="5.6" cy="10.4" rx="2.1" ry="2.7"/><ellipse cx="9.6" cy="6.6" rx="2.1" ry="2.8"/><ellipse cx="14.4" cy="6.6" rx="2.1" ry="2.8"/><ellipse cx="18.4" cy="10.4" rx="2.1" ry="2.7"/></svg>';
  const markup = `
    <div class="np__bg"><img src="assets/nox/jungle.webp" alt="" decoding="async"></div>
    <canvas class="np__fx" aria-hidden="true"></canvas>
    <canvas class="np__fg" aria-hidden="true"></canvas>
    <div class="np__shade" aria-hidden="true"></div>
    <header class="np__hud">
      <div class="np__brand"><span class="np__mono">Plate N&ordm; 002</span><b>Night <em>Hunt</em></b></div>
      <div class="np__score" aria-live="polite"><span class="np__mono">Score</span><b data-score>0</b><i class="np__combo" data-combo></i></div>
      <div class="np__right">
        <div class="np__lives" data-lives aria-label="3 lives">${paw}${paw}${paw}</div>
        <button class="np__x" type="button" data-np-close aria-label="Close the game" data-cursor="Close"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      </div>
    </header>

    <section class="np__panel" data-panel="start">
      <p class="np__mono np__kick">Panthera pardus &middot; after dark</p>
      <h2 class="np__title">Catch the <em>moonfall.</em></h2>
      <p class="np__lead">Golden orbs drift down through the canopy. Keep Nox under them, leap for the high ones, and stay clear of the embers.</p>
      <dl class="np__legend">
        <div><i class="np__orb np__orb--gold"></i><dt>Gold</dt><dd>+1</dd></div>
        <div><i class="np__orb np__orb--moon"></i><dt>Moon</dt><dd>+5</dd></div>
        <div><i class="np__orb np__orb--ember"></i><dt>Ember</dt><dd>&minus;1 life</dd></div>
      </dl>
      <div class="np__keys"><span><kbd>Mouse</kbd> or <kbd>&larr;</kbd><kbd>&rarr;</kbd> to move</span><span><kbd>Click</kbd> or <kbd>Space</kbd> to leap</span></div>
      <div class="np__actions">
        <button class="np__btn np__btn--fill" type="button" data-np-start data-cursor="Hunt">Start the hunt <span aria-hidden="true">&rarr;</span></button>
        <span class="np__mono np__best">Best <b data-best>0</b></span>
      </div>
    </section>

    <section class="np__panel" data-panel="over" hidden>
      <p class="np__mono np__kick">Hunt over</p>
      <h2 class="np__title"><b data-final>0</b> <em>points.</em></h2>
      <p class="np__lead" data-verdict></p>
      <div class="np__actions">
        <button class="np__btn np__btn--fill" type="button" data-np-start data-cursor="Again">Hunt again <span aria-hidden="true">&rarr;</span></button>
        <button class="np__btn" type="button" data-np-close data-cursor="Back">Back to the site</button>
        <span class="np__mono np__best">Best <b data-best>0</b></span>
      </div>
    </section>

    <button class="np__leap" type="button" data-np-leap aria-label="Leap">Leap</button>
    <div class="np__count" data-count aria-hidden="true"></div>
    <a class="np__credit" href="https://commons.wikimedia.org/wiki/File:Tropical_rainforest_in_Sangha_Trinational.jpg" target="_blank" rel="noopener">Forest photo: JosepMGracia, CC BY-SA 4.0</a>`;

  /* ---------------- sprites (drawn once) ---------------- */
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h); return [c, c.getContext('2d')]; };
  function glow(r, stops) {
    const [c, g] = mk(r * 2, r * 2);
    const gr = g.createRadialGradient(r, r, 0, r, r, r);
    stops.forEach(([o, col]) => gr.addColorStop(o, col));
    g.fillStyle = gr; g.fillRect(0, 0, r * 2, r * 2);
    return c;
  }
  function mistBlob(w, h) {
    const [c, g] = mk(w, h);
    for (let i = 0; i < 9; i++) {
      // every blob stays fully inside the sprite, so no gradient is cut off into a visible edge
      const r = h * (0.3 + Math.random() * 0.18), y = h / 2 + (Math.random() - 0.5) * (h - 2 * r), x = r + Math.random() * (w - 2 * r);
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(190,220,214,0.10)'); gr.addColorStop(1, 'rgba(190,220,214,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    }
    return c;
  }
  // a single tropical leaf: pointed oval, midrib, a few side veins; dark with a cool moonlit edge
  function leafPath(g, L, Wd) {
    g.beginPath(); g.moveTo(0, 0);
    g.bezierCurveTo(L * 0.25, -Wd, L * 0.75, -Wd * 0.85, L, 0);
    g.bezierCurveTo(L * 0.75, Wd * 0.85, L * 0.25, Wd, 0, 0);
  }
  function drawLeaf(g, L, Wd, fill, edge) {
    leafPath(g, L, Wd); g.fillStyle = fill; g.fill();
    g.save(); leafPath(g, L, Wd); g.clip();
    g.strokeStyle = edge; g.lineWidth = Math.max(1, Wd * 0.08); g.globalAlpha = 0.7;
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(L * 0.5, -Wd * 0.08, L, 0); g.stroke();
    g.globalAlpha = 0.18; g.lineWidth = Math.max(0.6, Wd * 0.04);
    for (let i = 1; i < 7; i++) { const x = L * i / 7; g.beginPath(); g.moveTo(x, 0); g.quadraticCurveTo(x + L * 0.06, -Wd * 0.5, x + L * 0.12, -Wd * 0.85); g.moveTo(x, 0); g.quadraticCurveTo(x + L * 0.06, Wd * 0.5, x + L * 0.12, Wd * 0.85); g.stroke(); }
    g.restore();
    g.save(); leafPath(g, L, Wd); g.strokeStyle = edge; g.globalAlpha = 0.5; g.lineWidth = 1.2; g.stroke(); g.restore();
  }
  // a palm-like frond: a curving stem with leaflets on both sides
  function frond(len, droop, n, leafL, seed) {
    const pad = leafL * 1.2;
    const [c, g] = mk(len + pad * 2, len * 0.9 + pad * 2);
    const ox = pad, oy = pad + len * 0.2;
    let rs = seed; const r = () => ((rs = (rs * 16807) % 2147483647) / 2147483647);
    const P = (t) => [ox + len * t, oy + droop * len * t * t];
    const T = (t) => { const a = P(Math.max(0, t - 0.01)), b = P(Math.min(1, t + 0.01)); return Math.atan2(b[1] - a[1], b[0] - a[0]); };
    for (let i = n; i >= 1; i--) {
      const t = i / (n + 1), [x, y] = P(t), a = T(t), L = leafL * (0.45 + 0.75 * Math.sin(Math.PI * Math.min(1, t * 1.15)));
      for (const side of [-1, 1]) {
        g.save(); g.translate(x, y); g.rotate(a + side * (0.75 - 0.35 * t) + (r() - 0.5) * 0.12 + side * 0.15 * droop);
        drawLeaf(g, L, L * 0.13, side > 0 ? '#020504' : '#040a08', side > 0 ? '#0c1c18' : '#16302a');
        g.restore();
      }
    }
    g.strokeStyle = '#0d1d18'; g.lineWidth = Math.max(2, len * 0.012); g.lineCap = 'round';
    g.beginPath(); g.moveTo(ox, oy); for (let t = 0; t <= 1.001; t += 0.05) { const [x, y] = P(t); g.lineTo(x, y); } g.stroke();
    return { c, ax: ox, ay: oy };
  }
  // a broad leaf on a short stalk (banana / philodendron)
  function broad(L, seed) {
    const pad = L * 0.2;
    const [c, g] = mk(L + pad * 2, L * 0.9 + pad * 2);
    const ox = pad, oy = L * 0.45 + pad;
    g.translate(ox, oy);
    g.strokeStyle = '#0c1a16'; g.lineWidth = L * 0.025; g.lineCap = 'round';
    g.beginPath(); g.moveTo(0, 0); g.lineTo(L * 0.18, -L * 0.02); g.stroke();
    g.translate(L * 0.16, -L * 0.02); g.rotate(-0.05 + (seed % 7) * 0.01);
    drawLeaf(g, L * 0.82, L * 0.24, '#030806', '#142a24');
    return { c, ax: ox, ay: oy };
  }
  // foreground plants sit far in front of the focus plane, so they are drawn soft (like a real lens would)
  function soften(sp, px) {
    const [c, g] = mk(sp.c.width + px * 4, sp.c.height + px * 4);
    g.filter = `blur(${px}px)`; g.drawImage(sp.c, px * 2, px * 2);
    return { c, ax: sp.ax + px * 2, ay: sp.ay + px * 2 };
  }
  function vine(len, seed) {
    const [c, g] = mk(len * 0.35, len + 20);
    const cx = len * 0.17;
    g.strokeStyle = '#0b1814'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(cx, 0);
    for (let y = 0; y <= len; y += 8) g.lineTo(cx + Math.sin(y * 0.02 + seed) * len * 0.04, y);
    g.stroke();
    for (let y = 30; y < len; y += 26 + (seed % 5) * 3) {
      const x = cx + Math.sin(y * 0.02 + seed) * len * 0.04, side = (y / 26) % 2 < 1 ? 1 : -1;
      g.save(); g.translate(x, y); g.rotate(side * 0.9 + 0.5); drawLeaf(g, 22 + (y % 13), 7, '#050c09', '#1f3c35'); g.restore();
    }
    return { c, ax: cx, ay: 0 };
  }

  /* ---------------- open / close ---------------- */
  function open(from) {
    if (game) return;
    game = build(from);
  }
  window.NoxPlay = { open };

  function build(from) {
    const root = document.createElement('div');
    root.className = 'np';
    root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'Night Hunt: a mini game with Nox the panther');
    root.setAttribute('data-lenis-prevent', '');
    root.innerHTML = markup;
    root.style.setProperty('--ox', `${from ? from.x : innerWidth / 2}px`);
    root.style.setProperty('--oy', `${from ? from.y : innerHeight / 2}px`);
    document.body.append(root);
    const prevFocus = document.activeElement;
    html.classList.add('nox-playing');
    const prevOverflow = html.style.overflow; html.style.overflow = 'hidden';
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-open')));

    const $ = (s) => root.querySelector(s), $$ = (s) => root.querySelectorAll(s);
    const fxC = $('.np__fx'), fgC = $('.np__fg'), fx = fxC.getContext('2d'), fg = fgC.getContext('2d');
    const bgImg = $('.np__bg img'), shade = $('.np__shade');
    const scoreEl = $('[data-score]'), comboEl = $('[data-combo]'), livesEl = $('[data-lives]'), countEl = $('[data-count]');
    const panels = { start: $('[data-panel="start"]'), over: $('[data-panel="over"]') };
    const best = () => +(localStorage.getItem(BEST) || 0);
    $$('[data-best]').forEach((b) => { b.textContent = best(); });

    /* ---- sizing ---- */
    let W = 0, H = 0, U = 1, DPR = 1, groundY = 0, scale = 3;
    let sprites = null;
    function size() {
      W = innerWidth; H = innerHeight; DPR = Math.min(1.5, devicePixelRatio || 1); U = Math.min(W, H * 1.4) / 900;
      for (const c of [fxC, fgC]) { c.width = W * DPR; c.height = H * DPR; c.style.width = W + 'px'; c.style.height = H + 'px'; }
      fx.setTransform(DPR, 0, 0, DPR, 0, 0); fg.setTransform(DPR, 0, 0, DPR, 0, 0);
      groundY = H * 0.87;
      // big on a laptop, still fitting on a phone (portrait phones are narrow, landscape ones are short)
      scale = Math.max(1.45, Math.min(4.6, W / 320, H / 185));
      buildSprites();
    }
    function buildSprites() {
      const u = U;
      sprites = {
        gold: glow(46 * u, [[0, 'rgba(255,248,220,1)'], [0.16, 'rgba(255,214,130,0.95)'], [0.32, 'rgba(233,182,106,0.45)'], [1, 'rgba(233,182,106,0)']]),
        moon: glow(62 * u, [[0, 'rgba(255,255,255,1)'], [0.14, 'rgba(226,244,255,0.95)'], [0.34, 'rgba(160,210,235,0.4)'], [1, 'rgba(160,210,235,0)']]),
        ember: glow(44 * u, [[0, 'rgba(255,236,200,1)'], [0.16, 'rgba(255,120,60,0.95)'], [0.36, 'rgba(220,50,20,0.4)'], [1, 'rgba(200,40,10,0)']]),
        fly: glow(10 * u, [[0, 'rgba(255,240,170,1)'], [0.3, 'rgba(240,210,110,0.6)'], [1, 'rgba(240,200,90,0)']]),
        mist: mistBlob(900 * u, 260 * u),
        spark: glow(8 * u, [[0, 'rgba(255,250,230,1)'], [0.4, 'rgba(255,210,130,0.7)'], [1, 'rgba(255,200,120,0)']]),
        plants: [
          { s: soften(frond(440 * u, 0.55, 15, 130 * u, 7), 3), x: -60 * u, y: H * 0.12, rot: 0.32, amp: 0.035, f: 0.7 },
          { s: soften(broad(280 * u, 3), 3.5), x: -50 * u, y: H * 0.62, rot: -0.35, amp: 0.05, f: 0.9 },
          { s: soften(frond(330 * u, 0.4, 12, 95 * u, 11), 2.5), x: -30 * u, y: H * 0.99, rot: -0.75, amp: 0.04, f: 0.8 },
          { s: soften(frond(420 * u, 0.55, 15, 120 * u, 23), 3), x: W + 60 * u, y: H * 0.18, rot: Math.PI - 0.3, amp: 0.035, f: 0.65, flip: true },
          { s: soften(broad(260 * u, 9), 3.5), x: W + 50 * u, y: H * 0.72, rot: Math.PI + 0.4, amp: 0.05, f: 1, flip: true },
          { s: soften(frond(310 * u, 0.4, 11, 90 * u, 31), 2.5), x: W + 30 * u, y: H * 1.0, rot: Math.PI + 0.8, amp: 0.04, f: 0.75, flip: true },
          { s: vine(H * 0.42, 2), x: W * 0.2, y: -6, rot: 0, amp: 0.025, f: 0.5, hang: true },
          { s: vine(H * 0.3, 5), x: W * 0.74, y: -6, rot: 0, amp: 0.03, f: 0.6, hang: true },
          { s: vine(H * 0.22, 8), x: W * 0.57, y: -6, rot: 0, amp: 0.03, f: 0.55, hang: true },
        ],
      };
      grass = []; for (let x = -10; x < W + 10; x += 5 * U) grass.push({ x: x + Math.random() * 4 * U, h: (14 + Math.random() * (Math.random() < 0.12 ? 70 : 38)) * U, lean: (Math.random() - 0.5) * 0.5, p: Math.random() * 6, c: Math.random() });
    }
    let grass = [];

    /* ---- ambience ---- */
    const rays = Array.from({ length: 5 }, (_, i) => ({ x: 0.18 + i * 0.17 + Math.random() * 0.06, w: 70 + Math.random() * 110, a: 0.035 + Math.random() * 0.04, p: Math.random() * 6, s: 0.15 + Math.random() * 0.2 }));
    const flies = Array.from({ length: 34 }, () => ({ x: Math.random(), y: 0.25 + Math.random() * 0.62, vx: 0, vy: 0, p: Math.random() * 10, w: 0.6 + Math.random() * 1.4 }));
    const leaves = Array.from({ length: 9 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 6, vr: (Math.random() - 0.5) * 2, s: 0.6 + Math.random() * 0.8, p: Math.random() * 6 }));
    const mists = [{ y: 0.72, sp: 9, o: 0.0, a: 0.9 }, { y: 0.8, sp: -6, o: 0.5, a: 1 }, { y: 0.6, sp: 4, o: 0.25, a: 0.55 }];

    /* ---- the panther ---- */
    const ctl = { mouseX: innerWidth / 2, mouseY: innerHeight / 2, target: innerWidth / 2, keyL: false, keyR: false, lastKey: -9 };
    size();
    const nox = window.NoxPet.spawn({
      host: root, z: 4,
      game: { scale, startX: W * 0.5, groundY: () => groundY, targetX: () => Math.max(80, Math.min(W - 80, ctl.target)), top: 980 * (scale / 3), look: () => lookAt() },
    });
    nox.root.style.pointerEvents = 'none';

    /* ---- game state ---- */
    let mode = 'start', t = 0, playT = 0, spawnIn = 1, lives = 3, score = 0, combo = 0, shake = 0, flash = 0, flashCol = '255,80,40', last = performance.now(), raf = 0, closing = false;
    const orbs = [], parts = [], texts = [];
    const lookAt = () => {
      let best = null, bd = 1e9;
      for (const o of orbs) { if (o.dead) continue; const d = groundY - o.y; if (d > 0 && d < bd) { bd = d; best = o; } }
      return best ? [best.x, best.y] : [ctl.mouseX, ctl.mouseY];
    };
    function setPanel(name) {
      for (const k in panels) { const p = panels[k]; if (k === name) { p.hidden = false; requestAnimationFrame(() => p.classList.add('is-on')); } else { p.classList.remove('is-on'); setTimeout(() => { if (!p.classList.contains('is-on')) p.hidden = true; }, 450); } }
    }
    function renderLives() {
      [...livesEl.children].forEach((s, i) => s.classList.toggle('is-lost', i >= lives));
      livesEl.setAttribute('aria-label', `${lives} ${lives === 1 ? 'life' : 'lives'}`);
    }
    function setScore(v, bump) {
      score = v; scoreEl.textContent = score;
      if (bump) { scoreEl.classList.remove('is-bump'); void scoreEl.offsetWidth; scoreEl.classList.add('is-bump'); }
      const m = mult(); comboEl.textContent = m > 1 ? `×${m}` : ''; comboEl.classList.toggle('is-on', m > 1);
    }
    const mult = () => Math.min(4, 1 + Math.floor(combo / 5));
    function start() {
      orbs.length = 0; parts.length = 0; texts.length = 0;
      lives = 3; combo = 0; playT = 0; spawnIn = 0.9; setScore(0); renderLives();
      setPanel(null); root.classList.add('is-playing');
      mode = 'count'; countdown(3);
    }
    function countdown(n) {
      if (closing) return;
      countEl.textContent = n > 0 ? n : 'Go';
      countEl.classList.remove('is-on'); void countEl.offsetWidth; countEl.classList.add('is-on');
      if (n > 0) setTimeout(() => countdown(n - 1), 650);
      else { mode = 'play'; nox.say('Let’s hunt! 😼', 1300); setTimeout(() => countEl.classList.remove('is-on'), 500); }
    }
    function over() {
      mode = 'over'; root.classList.remove('is-playing');
      const b = Math.max(best(), score); localStorage.setItem(BEST, b);
      $('[data-final]').textContent = score;
      $('[data-verdict]').textContent = score >= 80 ? 'Legend of the jungle. Nox bows to you.' : score >= 40 ? 'Nox is impressed. That was a proper hunt.' : score >= 15 ? 'A decent hunt. Nox wants a rematch.' : 'Nox is still hungry. One more round?';
      $$('[data-best]').forEach((el) => { el.textContent = b; });
      setTimeout(() => setPanel('over'), 600);
      nox.say(score >= 40 ? 'We make a good team 😼' : 'Again? 😼', 2200);
    }

    function spawnOrb() {
      const d = Math.min(1, playT / 80);
      const roll = Math.random();
      const type = roll < 0.07 + d * 0.03 ? 'moon' : roll < 0.07 + (playT > 8 ? 0.13 + d * 0.12 : 0) ? 'ember' : 'gold';
      const r = (type === 'moon' ? 15 : type === 'ember' ? 11 : 12) * U * 1.15;
      const v = (120 + 230 * d + Math.random() * 60) * (H / 820) * (type === 'moon' ? 1.25 : type === 'ember' ? 1.1 : 1);
      orbs.push({ type, r, x: W * (0.1 + Math.random() * 0.8), y: -30, vy: v, sway: (Math.random() - 0.5) * 60 * U, p: Math.random() * 6, trail: [], dead: false });
    }
    function burst(x, y, n, col, sp = 1) {
      for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = (60 + Math.random() * 220) * U * sp; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60 * U, life: 0.6 + Math.random() * 0.5, t: 0, col }); }
    }
    function float(x, y, text, cls) { texts.push({ x, y, text, cls, t: 0 }); }

    /* ---- per-frame ---- */
    function step(now) {
      raf = requestAnimationFrame(step);
      const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
      // controls: keys move the target ahead of the panther; otherwise the mouse sets it
      if (ctl.keyL || ctl.keyR) { ctl.target = nox.x + (ctl.keyR ? 1 : -1) * 260; ctl.lastKey = t; }
      else if (t - ctl.lastKey > 0.25) ctl.target = ctl.mouseX;

      if (mode === 'play') {
        playT += dt; spawnIn -= dt;
        if (spawnIn <= 0) { spawnOrb(); spawnIn = Math.max(0.42, 1.15 - playT * 0.011) * (0.7 + Math.random() * 0.6); }
      }
      const m = nox.mouth(), k = scale / 3;
      for (const o of orbs) {
        if (o.dead) continue;
        o.y += o.vy * dt; o.x += Math.sin(t * 1.6 + o.p) * o.sway * dt;
        o.trail.push([o.x, o.y]); if (o.trail.length > 9) o.trail.shift();
        // the catch zone is around the mouth and front paws
        const dx = o.x - m[0], dy = o.y - m[1];
        if (Math.abs(dx) < 52 * k + o.r && dy > -46 * k - o.r && dy < 42 * k) {
          o.dead = true;
          if (o.type === 'ember') {
            lives--; combo = 0; renderLives(); setScore(score); shake = 14; flash = 1; flashCol = '255,70,30';
            burst(o.x, o.y, 22, '255,120,60', 1.2); float(o.x, o.y - 20, 'Ouch', 'is-bad'); nox.say('Hot! 🔥', 1000);
          } else {
            combo++; const pts = (o.type === 'moon' ? 5 : 1) * mult();
            setScore(score + pts, true);
            burst(o.x, o.y, o.type === 'moon' ? 30 : 16, o.type === 'moon' ? '220,240,255' : '255,214,130', o.type === 'moon' ? 1.4 : 1);
            float(o.x, o.y - 24, `+${pts}`, o.type === 'moon' ? 'is-moon' : '');
            if (o.type === 'moon') { nox.say('Moon orb! ✨', 1100); flash = 0.6; flashCol = '200,230,255'; }
            else if (combo % 5 === 0) nox.say(['Nom! 😼', 'Too easy 😼', 'More! 😼'][Math.floor(Math.random() * 3)], 900);
          }
          continue;
        }
        if (o.y > groundY + 6 * U) {
          o.dead = true;
          burst(o.x, groundY, 8, o.type === 'ember' ? '255,120,60' : '200,220,200', 0.5);
          if (o.type === 'gold' && mode === 'play') { lives--; combo = 0; renderLives(); setScore(score); shake = 9; flash = 0.7; flashCol = '255,80,40'; float(o.x, groundY - 30, 'Missed', 'is-bad'); }
        }
      }
      for (let i = orbs.length - 1; i >= 0; i--) if (orbs[i].dead) orbs.splice(i, 1);
      if (mode === 'play' && lives <= 0) { over(); for (const o of orbs) { o.dead = true; burst(o.x, o.y, 6, '255,214,130', 0.4); } orbs.length = 0; }

      shake *= Math.pow(0.001, dt); flash *= Math.pow(0.02, dt);
      const sx = (Math.random() - 0.5) * shake, sy = (Math.random() - 0.5) * shake;
      root.style.setProperty('--shx', `${sx.toFixed(1)}px`); root.style.setProperty('--shy', `${sy.toFixed(1)}px`);
      shade.style.setProperty('--flash', flash.toFixed(3)); shade.style.setProperty('--fc', flashCol);
      // the photo drifts a little against the cursor for depth
      const px = (ctl.mouseX / W - 0.5), py = (ctl.mouseY / H - 0.5);
      bgImg.style.transform = `translate3d(${(-px * 22).toFixed(1)}px, ${(-py * 12).toFixed(1)}px, 0) scale(1.08)`;
      drawFx(dt); drawFg(px);
    }

    function drawFx(dt) {
      fx.clearRect(0, 0, W, H);
      // moonlight shafts through the canopy
      fx.globalCompositeOperation = 'lighter';
      for (const r of rays) {
        const a = r.a * (0.6 + 0.4 * Math.sin(t * r.s + r.p)), x = r.x * W, w = r.w * U;
        const gr = fx.createLinearGradient(0, 0, 0, H * 0.95);
        gr.addColorStop(0, `rgba(205,232,226,${a})`); gr.addColorStop(0.7, `rgba(205,232,226,${a * 0.35})`); gr.addColorStop(1, 'rgba(205,232,226,0)');
        fx.fillStyle = gr; fx.beginPath();
        fx.moveTo(x - w * 0.3, -10); fx.lineTo(x + w * 0.3, -10); fx.lineTo(x + w * 1.4 + H * 0.22, H); fx.lineTo(x - w * 0.2 + H * 0.22, H); fx.closePath(); fx.fill();
      }
      // fireflies
      for (const f of flies) {
        f.vx += (Math.sin(t * 0.7 * f.w + f.p) * 0.02 - f.vx) * dt; f.vy += (Math.cos(t * 0.5 * f.w + f.p * 2) * 0.012 - f.vy) * dt;
        f.x += f.vx * dt; f.y += f.vy * dt;
        if (f.x < -0.05) f.x = 1.05; if (f.x > 1.05) f.x = -0.05; if (f.y < 0.2) f.vy += 0.01; if (f.y > 0.9) f.vy -= 0.01;
        const a = Math.pow(Math.max(0, Math.sin(t * f.w * 1.3 + f.p)), 3);
        if (a > 0.02) { fx.globalAlpha = a; const s = sprites.fly; fx.drawImage(s, f.x * W - s.width / 2, f.y * H - s.height / 2); }
      }
      fx.globalAlpha = 1;
      // orbs with soft trails
      for (const o of orbs) {
        const s = sprites[o.type], sc = o.r / (12 * U * 1.15);
        o.trail.forEach(([x, y], i) => { fx.globalAlpha = (i / o.trail.length) * 0.25; const w = s.width * sc * 0.55; fx.drawImage(s, x - w / 2, y - w / 2, w, w); });
        const fl = o.type === 'ember' ? 0.85 + Math.random() * 0.3 : 1 + Math.sin(t * 6 + o.p) * 0.06;
        fx.globalAlpha = 1; const w = s.width * sc * fl; fx.drawImage(s, o.x - w / 2, o.y - w / 2, w, w);
      }
      // sparks
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]; p.t += dt; if (p.t > p.life) { parts.splice(i, 1); continue; }
        p.vy += 380 * U * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.98;
        fx.globalAlpha = 1 - p.t / p.life; const w = sprites.spark.width; fx.drawImage(sprites.spark, p.x - w / 2, p.y - w / 2);
      }
      fx.globalAlpha = 1; fx.globalCompositeOperation = 'source-over';
      // drifting mist
      for (const m of mists) {
        const img = sprites.mist, x = (((m.o * W + t * m.sp * U) % (img.width)) + img.width) % img.width;
        fx.globalAlpha = m.a;
        for (let k = -1; k < Math.ceil(W / img.width) + 1; k++) fx.drawImage(img, k * img.width + x - img.width * 0.5, m.y * H - img.height / 2);
      }
      fx.globalAlpha = 1;
      // falling leaves
      for (const l of leaves) {
        l.y += 0.03 * l.s * dt; l.x += Math.sin(t * 0.8 + l.p) * 0.012 * dt; l.r += l.vr * dt;
        if (l.y > 1.05) { l.y = -0.05; l.x = Math.random(); }
        fx.save(); fx.translate(l.x * W, l.y * H); fx.rotate(l.r); fx.scale(1, Math.abs(Math.sin(t * 1.3 + l.p)) * 0.8 + 0.2);
        drawLeaf(fx, 16 * U * l.s, 5 * U * l.s, '#0a1511', '#2c4b43'); fx.restore();
      }
      // floating score text
      for (let i = texts.length - 1; i >= 0; i--) {
        const q = texts[i]; q.t += dt; if (q.t > 1.1) { texts.splice(i, 1); continue; }
        const e = q.t / 1.1;
        fx.globalAlpha = 1 - e * e;
        fx.font = `italic 400 ${Math.round((q.cls === 'is-moon' ? 34 : 26) * U)}px Fraunces, Georgia, serif`;
        fx.textAlign = 'center';
        fx.fillStyle = q.cls === 'is-bad' ? '#ff8a6b' : q.cls === 'is-moon' ? '#e6f4ff' : '#f4cf92';
        fx.fillText(q.text, q.x, q.y - e * 50 * U);
      }
      fx.globalAlpha = 1;
    }

    function drawFg(px) {
      fg.clearRect(0, 0, W, H);
      // plants framing the scene; each sways on its own rhythm, and shifts a touch with the cursor (nearest layer)
      for (const pl of sprites.plants) {
        const s = pl.s, sw = calm ? 0 : Math.sin(t * pl.f + pl.x * 0.01) * pl.amp + Math.sin(t * pl.f * 2.3) * pl.amp * 0.3;
        fg.save(); fg.translate(pl.x + px * 26, pl.y);
        if (pl.hang) { fg.rotate(sw); fg.drawImage(s.c, -s.ax, 0); }
        else { fg.rotate(pl.rot + sw); if (pl.flip) fg.scale(1, -1); fg.drawImage(s.c, -s.ax, -s.ay); }
        fg.restore();
      }
      // the forest floor: a dark band, then grass blades in front of the paws
      const gr = fg.createLinearGradient(0, groundY - 30 * U, 0, H);
      gr.addColorStop(0, 'rgba(3,7,6,0)'); gr.addColorStop(0.35, 'rgba(3,7,6,0.55)'); gr.addColorStop(1, 'rgba(2,4,3,0.95)');
      fg.fillStyle = gr; fg.fillRect(0, groundY - 30 * U, W, H - groundY + 30 * U);
      fg.lineCap = 'round';
      for (let pass = 0; pass < 2; pass++) {
        fg.strokeStyle = pass ? '#0b1a15' : '#040a08'; fg.lineWidth = (pass ? 1.6 : 2.4) * U;
        fg.beginPath();
        for (let i = pass; i < grass.length; i += 2) {
          const b = grass[i], base = groundY + 14 * U + (b.c * 22 * U), sw = calm ? 0 : Math.sin(t * 1.5 + b.x * 0.012 + b.p) * 5 * U;
          fg.moveTo(b.x, H + 4); fg.quadraticCurveTo(b.x + b.lean * 8 * U, base - b.h * 0.5, b.x + b.lean * 16 * U + sw, base - b.h);
        }
        fg.stroke();
      }
    }

    /* ---- input ---- */
    const onMove = (e) => { ctl.mouseX = e.clientX; ctl.mouseY = e.clientY; };
    const onDown = (e) => {
      if (e.target.closest('[data-np-leap]')) { e.preventDefault(); nox.leap(); return; }
      if (e.pointerType === 'touch') { if (!e.target.closest('button, a, .np__panel')) { ctl.mouseX = e.clientX; ctl.mouseY = e.clientY; } return; }
      if (e.button !== 0 || e.target.closest('button, a, .np__panel')) return;
      if (mode === 'play' || mode === 'start' || mode === 'over') nox.leap();
    };
    const onKey = (e) => {
      const down = e.type === 'keydown';
      if (e.key === 'Escape' && down) { e.stopPropagation(); close(); return; }
      if (['ArrowLeft', 'a', 'A'].includes(e.key)) { ctl.keyL = down; e.preventDefault(); }
      if (['ArrowRight', 'd', 'D'].includes(e.key)) { ctl.keyR = down; e.preventDefault(); }
      if (down && [' ', 'ArrowUp', 'w', 'W'].includes(e.key)) { e.preventDefault(); nox.leap(); }
      if (down && e.key === 'Enter' && mode !== 'play' && mode !== 'count' && !(e.target.closest && e.target.closest('button'))) start();
    };
    root.addEventListener('pointermove', onMove);
    root.addEventListener('pointerdown', onDown);
    addEventListener('keydown', onKey, true); addEventListener('keyup', onKey, true);
    addEventListener('resize', size);
    root.addEventListener('click', (e) => {
      if (e.target.closest('[data-np-close]')) close();
      if (e.target.closest('[data-np-start]')) start();
    });

    function close() {
      if (closing) return; closing = true;
      root.classList.remove('is-open'); root.classList.add('is-closing');
      removeEventListener('keydown', onKey, true); removeEventListener('keyup', onKey, true); removeEventListener('resize', size);
      setTimeout(() => {
        cancelAnimationFrame(raf); nox.stop(); root.remove();
        html.classList.remove('nox-playing'); html.style.overflow = prevOverflow;
        if (prevFocus && prevFocus.focus) prevFocus.focus({ preventScroll: true });
        game = null;
      }, 820);
    }

    if (coarse) $('.np__keys').innerHTML = '<span><kbd>Tap</kbd> or <kbd>drag</kbd> to move</span><span><kbd>Leap</kbd> button to jump</span>';
    setPanel('start');
    renderLives();
    setTimeout(() => { if (!closing) nox.say('Hi! Ready to hunt? 😼', 2200); }, 900);
    setTimeout(() => { const b = $('[data-np-start]'); if (b) b.focus({ preventScroll: true }); }, 700);
    raf = requestAnimationFrame(step);
    return { close };
  }
})();
