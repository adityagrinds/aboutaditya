/* =====================================================================
   NOX · the black panther that lives on this site
   A hand-rigged SVG leopard. The legs are inverse-kinematic: each paw is
   planted on the ground and the body travels over it, so nothing slides.
   Walk (lateral sequence) blends into a rotary gallop with a flexing spine.
   When he stops he sits, lies down, stretches, grooms, pounces, chases a
   firefly or dribbles a ball. No images, no libraries.
   Tap him for his ID card; he can be sent away and called back.
   ===================================================================== */
(() => {
  if (matchMedia('(pointer: coarse)').matches) return;          // no cursor to follow on touch screens
  const KEY = 'nox:away';
  const NS = 'http://www.w3.org/2000/svg';
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mouse = { x: innerWidth / 2, y: innerHeight / 2, moved: 0 };
  addEventListener('pointermove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.moved = performance.now(); }, { passive: true });

  const backBtn = document.getElementById('noxBack');
  // while NOX is away, his face waits in the top bar; tapping it opens his card with "Bring him back"
  const dock = document.createElement('button');
  dock.type = 'button'; dock.className = 'nox-dock'; dock.hidden = true;
  dock.setAttribute('aria-label', 'NOX is away. Open his card to bring him back');
  dock.dataset.cursor = 'NOX';
  dock.innerHTML = '<span class="nox-dock__face" aria-hidden="true"></span><i class="nox-dock__dot" aria-hidden="true"></i>';
  const navSlot = document.querySelector('.nav__resume');
  if (navSlot) navSlot.before(dock); else document.body.append(dock);
  const showBack = (on) => {
    if (backBtn) backBtn.hidden = !on;
    if (on) { dock.hidden = false; requestAnimationFrame(() => requestAnimationFrame(() => dock.classList.add('is-on'))); }
    else { dock.classList.remove('is-on'); setTimeout(() => { if (!dock.classList.contains('is-on')) dock.hidden = true; }, 400); }
  };

  /* ---------------- anatomy (svg units, cat faces +x) ---------------- */
  const W = 108, H = 57, VB_W = 160, VB_H = 84, S = W / VB_W;   // px per svg unit
  const G = 79;                                                    // ground line
  const CX = 82, CY = 50;                                          // the body pivots around here
  // the torso art is drawn 4 units higher than its path coordinates (taller legs); joints below are in drawn space
  const LIFT = 4, HIP = [54, 36], SHO = [110, 36], NECK = [121, 24], TAIL0 = [48, 36];
  const SLIM = 0.93;                                               // compact the body a little: a leopard, not a dachshund
  const BONE = { thigh: 18, shin: 18, meta: 13, arm: 17, fore: 21 };
  // leopard side profile: round haunch, a dip at the loin, shoulder hump, deep chest, tucked waist
  const TORSO = 'M46 44 C42 38 44 31 52 29 C60 27 68 30 78 31 C88 32 96 28 104 25 C110 23 116 22 121 24 L126 33 C124 40 120 47 116 52 C112 56 104 57 98 55 C90 53 82 52 76 53 C70 54 64 54 60 52 C54 51 49 49 46 44 Z';
  const legMk = (k, side) => `<g class="nox__leg ${side}" data-leg="${k}">${'<path class="nox__bone"/>'.repeat(5)}<path class="nox__legfur"/>${k === 'fn' ? '<ellipse class="nox__pad" rx="1.9" ry="1"/>' : ''}</g>`;

  const svgMarkup = `
  <svg class="nox__svg" viewBox="0 0 ${VB_W} ${VB_H}" aria-hidden="true">
    <defs>
      <linearGradient id="noxFur" gradientUnits="userSpaceOnUse" x1="0" y1="20" x2="0" y2="58"><stop offset="0" stop-color="#34343d"/><stop offset=".45" stop-color="#19191e"/><stop offset="1" stop-color="#09090b"/></linearGradient>
      <linearGradient id="noxLimb" gradientUnits="userSpaceOnUse" x1="0" y1="34" x2="0" y2="80"><stop offset="0" stop-color="#1d1d23"/><stop offset="1" stop-color="#0c0c0f"/></linearGradient>
      <radialGradient id="noxEye" cx="40%" cy="40%" r="70%"><stop offset="0" stop-color="#f2f7a8"/><stop offset=".55" stop-color="#b9d35a"/><stop offset="1" stop-color="#5d7a24"/></radialGradient>
      <pattern id="noxRos" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(18)"><circle cx="4" cy="4" r="2" fill="none" stroke="#000" stroke-width=".9"/></pattern>
      <filter id="noxFuzz" x="-10%" y="-20%" width="120%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="2" seed="7"/><feDisplacementMap in="SourceGraphic" scale="0.9" xChannelSelector="R" yChannelSelector="G"/></filter>
      <clipPath id="noxClipH" clipPathUnits="userSpaceOnUse"><rect x="-200" y="-200" width="${CX + 201.5}" height="500"/></clipPath>
      <clipPath id="noxClipF" clipPathUnits="userSpaceOnUse"><rect x="${CX - 1.5}" y="-200" width="400" height="500"/></clipPath>
    </defs>
    <ellipse class="nox__shadow" cx="84" cy="${G + 1.5}" rx="34" ry="3"/>
    ${legMk('hf', 'far')}${legMk('ff', 'far')}
    <g class="nox__half" data-half="h"><g class="nox__rig"><g transform="translate(0 -${LIFT})">
      <path class="nox__tail" d=""/>
      <path class="nox__hair nox__tailhair" d=""/>
      <g class="nox__torso" clip-path="url(#noxClipH)">
        <g class="nox__body" filter="url(#noxFuzz)"><path class="fur" d="${TORSO}"/></g>
        <path class="nox__ros" d="${TORSO}"/>
        <path class="nox__rim" d="M50 30 C60 27 68 30 78 31 C88 32 96 28 104 25 C110 23 116 22 121 24"/>
      </g>
    </g></g></g>
    <g class="nox__half" data-half="f"><g class="nox__rig"><g transform="translate(0 -${LIFT})"><g class="nox__torso nox__torso--f" clip-path="url(#noxClipF)"></g></g></g></g>
    ${legMk('hn', 'near')}
    <g class="nox__head">
      <g filter="url(#noxFuzz)">
        <path class="fur" d="M-2 -9 L0.5 -18 L6.5 -11 Z"/>
        <path class="fur" d="M-6 -8 C0 -13.5 12 -12.5 17 -6.5 C19.6 -3.6 23 -1.6 24.4 1.8 C25.2 5 22.4 7.2 18.4 7.4 C14 9.4 6 9.6 0 7.6 C-5.4 5.6 -8.2 0.6 -6 -8 Z"/>
        <path class="fur" d="M5 -11.5 L9.4 -17.6 L12.4 -8.6 Z"/>
      </g>
      <path d="M6.6 -11.6 L9.2 -15.6 L11 -9.8 Z" fill="#3a2630"/>
      <path d="M14 1.4 C17 3.4 20.6 4 24 3 C23 6.4 20 7.4 17 7.4 C14.4 7.6 12 6 14 1.4 Z" fill="#202027"/>
      <path d="M22.6 -0.4 L25.2 0.8 L23.6 2.6 Z" fill="#55505c"/>
      <path class="nox__mouth" d="M23 3.6 Q20.6 7.8 16.2 6.6 Q19.4 5.8 23 3.6 Z" fill="#6b2833" opacity="0"/>
      <path d="M23.4 3.2 Q22.4 5.4 19.6 5.8" stroke="#55505c" stroke-width=".6" fill="none" stroke-linecap="round"/>
      <path class="nox__whisk" d="M18 4 L30 1.6 M18 5.4 L29.6 6.8 M17.4 6.4 L27.6 10.2"/>
      <path d="M8.4 -5.8 Q12.4 -8 16 -5.2" stroke="#4a4a54" stroke-width=".7" fill="none" stroke-linecap="round"/>
      <g class="nox__eye"><path d="M8.6 -3.8 Q12.4 -6.8 16 -3.8 Q12.4 -1.4 8.6 -3.8 Z" fill="url(#noxEye)"/><ellipse class="nox__pupil" cx="12.4" cy="-3.9" rx=".8" ry="1.75"/><circle class="nox__glint" cx="13.2" cy="-4.8" r=".45"/></g>
    </g>
    ${legMk('fn', 'near')}
  </svg>`;

  /* ---------------- poses ---------------- */
  // rot: body pitch (+ = nose down), by: body drop, hx/fx: where the hind/front paws rest relative to hip/shoulder,
  // hflat/fflat: hock / forearm lying on the ground, tailA/tailC: tail base angle and curl per joint (deg)
  const POSES = {
    stand: { rot: 0, by: 0, hx: -4, hflat: 0, fx: 2, fflat: 0, tailA: 128, tailC: 8, head: 3 },
    sit: { rot: -32, by: 19, hx: 14, hflat: 1, fx: 3, fflat: 0, tailA: 62, tailC: -15, head: 4 },
    lie: { rot: 0, by: 21, hx: 13, hflat: 1, fx: 17, fflat: 1, tailA: 178, tailC: -5, head: 4 },
    bow: { rot: 14, by: 8, hx: -5, hflat: 0, fx: 17, fflat: 0.7, tailA: 228, tailC: 9, head: 0 },
    crouch: { rot: 4, by: 13, hx: 4, hflat: 0.6, fx: 8, fflat: 0.3, tailA: 172, tailC: 2, head: 0 },
  };

  /* ---------------- math ---------------- */
  const TAU = Math.PI * 2;
  const lerp = (a, b, t) => a + (b - a) * t;
  const f1 = (v) => v.toFixed(1);
  // two-bone IK: the middle joint for a chain from (ax,ay) to (bx,by). bend -1 = joint ahead (knee), +1 = behind (elbow)
  const ik = (ax, ay, bx, by, l1, l2, bend) => {
    const dx = bx - ax, dy = by - ay;
    const d = Math.min(l1 + l2 - 0.01, Math.max(Math.abs(l1 - l2) + 0.01, Math.hypot(dx, dy)));
    const th = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
    const a = Math.atan2(dy, dx) + bend * th;
    return [ax + Math.cos(a) * l1, ay + Math.sin(a) * l1];
  };
  const reach = (j, t, l) => { const dx = t[0] - j[0], dy = t[1] - j[1], d = Math.hypot(dx, dy) || 1; return [j[0] + dx / d * l, j[1] + dy / d * l]; };
  // a tapered bone with round ends
  const cap = (a, wa, b, wb) => {
    let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 0.001; dx /= l; dy /= l;
    const nx = -dy, ny = dx;
    return `M${f1(a[0] + nx * wa)} ${f1(a[1] + ny * wa)}L${f1(b[0] + nx * wb)} ${f1(b[1] + ny * wb)}A${f1(wb)} ${f1(wb)} 0 0 0 ${f1(b[0] - nx * wb)} ${f1(b[1] - ny * wb)}L${f1(a[0] - nx * wa)} ${f1(a[1] - ny * wa)}A${f1(wa)} ${f1(wa)} 0 0 0 ${f1(a[0] + nx * wa)} ${f1(a[1] + ny * wa)}Z`;
  };
  // short fur strands along both edges of a bone, swept down the limb
  const furBone = (a, wa, b, wb, n) => {
    let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 0.001; dx /= l; dy /= l;
    const nx = -dy, ny = dx; let d = '';
    for (let i = 0; i < n * 2; i++) {
      const t = ((i >> 1) + 0.5) / n, side = i & 1 ? 1 : -1, w = wa + (wb - wa) * t - 0.4, len = 1 + ((i * 37) % 10) * 0.07;
      const px = a[0] + (b[0] - a[0]) * t + nx * side * w, py = a[1] + (b[1] - a[1]) * t + ny * side * w;
      d += `M${f1(px)} ${f1(py)}l${f1((nx * side * 0.55 + dx * 0.85) * len)} ${f1((ny * side * 0.55 + dy * 0.85) * len)}`;
    }
    return d;
  };

  /* ---------------- fur ---------------- */
  // Seeded, so NOX looks the same on every visit.
  const seeded = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const rnd = seeded(2026);
  const TAIL_HAIR = [];
  for (let seg = 0; seg < 7; seg++) {
    const n = seg < 5 ? 7 : 11;                                    // a fuller tuft at the tip
    for (let k = 0; k < n; k++) TAIL_HAIR.push({ seg, t: rnd(), side: k % 2 ? 1 : -1, len: (seg < 5 ? 0.7 : 1.4) + rnd() * (seg < 5 ? 1.1 : 1.8) });
  }
  const FUR = {
    body: { step: 0.4, len: [0.8, 2.1], root: 0.9, flow: [-1.3, 0.25], lite: 0.55, inner: 95 },
    head: { step: 0.38, len: [0.5, 1.4], root: 0.7, flow: [-0.9, 0.15], lite: 0.45, inner: 40 },
  };
  // Torso and head get short strands along their edges (pointing out, swept back) and a sprinkle of
  // lighter strands along the back for that glossy black-cat sheen.
  function growFur(root) {
    const parts = [
      ...[...root.querySelectorAll('.nox__body .fur')].map((p) => [p, FUR.body]),
      ...[...root.querySelectorAll('.nox__head .fur')].map((p) => [p, FUR.head]),
    ];
    const pt = new DOMPoint();
    const inside = (el, x, y) => { pt.x = x; pt.y = y; return el.isPointInFill(pt); };
    for (const [path, o] of parts) {
      const others = [...path.parentNode.children].filter((e) => e !== path && e.classList.contains('fur'));
      const covered = (x, y) => others.some((e) => inside(e, x, y));
      let dk = '', lt = '';
      const L = path.getTotalLength();
      for (let s = 0; s < L; s += o.step * (0.8 + rnd() * 0.4)) {
        const p = path.getPointAtLength(s), a = path.getPointAtLength(Math.max(0, s - 0.5)), b = path.getPointAtLength(Math.min(L, s + 0.5));
        let tx = b.x - a.x, ty = b.y - a.y; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
        let nx = -ty, ny = tx;
        if (inside(path, p.x + nx * 0.7, p.y + ny * 0.7)) { nx = -nx; ny = -ny; }
        if (covered(p.x, p.y)) continue;
        const len = o.len[0] + rnd() * (o.len[1] - o.len[0]);
        let hx = nx + o.flow[0] + (rnd() - 0.5) * 0.5, hy = ny + o.flow[1] + (rnd() - 0.5) * 0.5;
        const hl = Math.hypot(hx, hy) || 1; hx /= hl; hy /= hl;
        const rx = p.x - nx * o.root, ry = p.y - ny * o.root, ex = p.x + hx * len, ey = p.y + hy * len;
        const seg = `M${f1(rx)} ${f1(ry)}Q${f1(p.x + hx * len * 0.45 + nx * 0.35)} ${f1(p.y + hy * len * 0.45 + ny * 0.35)} ${f1(ex)} ${f1(ey)}`;
        if (ny < -0.3 && rnd() < o.lite) lt += seg; else dk += seg;
      }
      if (o.inner) {
        const bb = path.getBBox();
        for (let n = 0, tries = 0; n < o.inner && tries < o.inner * 10; tries++) {
          const x = bb.x + rnd() * bb.width, y = bb.y + rnd() * bb.height;
          if ((y - bb.y) / bb.height > 0.4 || !inside(path, x, y) || covered(x, y)) continue;
          n++;
          const len = 2 + rnd() * 2.6;
          let hx = o.flow[0], hy = o.flow[1] + (rnd() - 0.5) * 0.4;
          const hl = Math.hypot(hx, hy) || 1; hx /= hl; hy /= hl;
          lt += `M${f1(x)} ${f1(y)}l${f1(hx * len)} ${f1(hy * len)}`;
        }
      }
      const mk = (d, cls) => { if (!d) return; const h = document.createElementNS(NS, 'path'); h.setAttribute('class', cls); h.setAttribute('d', d); return h; };
      path.after(...[mk(dk, 'nox__hair'), mk(lt, 'nox__hair lite')].filter(Boolean));
    }
  }

  /* ---------------- the card ---------------- */
  // A field-guide plate: a real photo up top, then the specimen notes. Numbers count up as it opens.
  const cardMarkup = `
    <article class="nox-card__inner">
      <figure class="nox-card__photo">
        <img src="assets/nox/nox-photo.webp" alt="A black leopard looking straight at the camera" width="1320" height="900" decoding="async">
        <i class="nox-card__eye" style="--x:43%;--y:35.6%"></i><i class="nox-card__eye" style="--x:61.6%;--y:34.6%"></i>
        <span class="nox-card__glare" aria-hidden="true"></span>
        <figcaption class="nox-card__plate"><span>Plate&nbsp;N&ordm;&nbsp;001</span><span>Resident of this site</span></figcaption>
      </figure>
      <button class="nox-card__x" type="button" aria-label="Close" data-nox-close data-cursor="Close"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>

      <div class="nox-card__body">
        <p class="nox-card__latin nox-in" style="--i:0"><i>Panthera pardus</i> &middot; melanistic</p>
        <h3 class="nox-card__name nox-in" style="--i:1">Nox</h3>
        <p class="nox-card__role nox-in" style="--i:2">Small cat. Big ego. Zero chill.</p>
        <p class="nox-card__lead nox-in" style="--i:3">Guards this portfolio. Follows your cursor, sits when you stop, and shoots hoops when he gets bored.</p>

        <dl class="nox-card__specs nox-in" style="--i:4">
          <div><dt>Top speed</dt><dd><b data-count="58">0</b><small>km/h</small></dd></div>
          <div><dt>Naps</dt><dd><b data-count="18">0</b><small>hrs / day</small></dd></div>
          <div><dt>Bite</dt><dd><b>Bluff</b><small>mostly</small></dd></div>
        </dl>

        <div class="nox-card__actions nox-in" style="--i:5">
          <button class="nox-card__keep" type="button" data-nox-close data-cursor="Stay">Keep him</button>
          <button class="nox-card__remove" type="button" data-nox-remove data-cursor="Bye">Send him home</button>
        </div>
        <button class="nox-card__play nox-in" style="--i:6" type="button" data-nox-play data-cursor="Play">
          <span class="nox-card__play-art" aria-hidden="true"></span>
          <span class="nox-card__play-txt"><small>Mini game &middot; Night Hunt</small><b>Play with him</b><em>Catch the moonfall in the jungle</em></span>
          <span class="nox-card__play-go" aria-hidden="true">&rarr;</span>
        </button>
        <p class="nox-card__foot nox-in" style="--i:7"><span>Miss him? <b>Wake NOX</b> in the footer</span><a href="https://commons.wikimedia.org/wiki/File:Black_leopard,_Padmaja_Naidu_Himalayan_Zoological_Park.jpg" target="_blank" rel="noopener">Photo: A. Panda, CC BY-SA</a></p>
      </div>
    </article>`;
  const iconMarkup = `<svg id="noxHeadIcon" width="0" height="0" style="position:absolute" aria-hidden="true"></svg>`;

  let alive = null;   // the running instance, or null

  function start(opts = {}) {
    if (alive) return;
    new Image().src = 'assets/nox/nox-photo.webp';               // warm the cache so the card opens sharp
    showBack(false);
    alive = spawn(opts);
  }

  // One panther. The site pet follows the cursor; with opts.game it is driven by the game instead.
  function spawn(opts = {}) {
    const GAME = opts.game || null;
    let dead = false;
    const root = document.createElement('div');
    root.className = GAME ? 'panther nox nox--game' : 'panther nox';
    if (!GAME) {
      root.setAttribute('role', 'button');
      root.setAttribute('aria-label', 'NOX, the site pet. Tap to meet it.');
      root.tabIndex = 0;
      root.dataset.cursor = 'Tap me';
    } else root.setAttribute('aria-hidden', 'true');
    root.innerHTML = svgMarkup;
    const bubble = document.createElement('div'); bubble.className = 'nox-bubble'; bubble.setAttribute('aria-hidden', 'true');
    const ball = document.createElement('div'); ball.className = 'nox-ball'; ball.setAttribute('aria-hidden', 'true');
    ball.innerHTML = `<i class="nox-ball__shadow"></i><svg class="nox-ball__b" viewBox="0 0 40 40"><defs><radialGradient id="noxBall" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#ffb36b"/><stop offset=".55" stop-color="#e8661c"/><stop offset="1" stop-color="#9c3a0a"/></radialGradient></defs><circle cx="20" cy="20" r="19" fill="url(#noxBall)"/><g fill="none" stroke="#2a1206" stroke-width="1.6"><path d="M1 20 H39"/><path d="M20 1 V39"/><path d="M7 6 C14 13 14 27 7 34"/><path d="M33 6 C26 13 26 27 33 34"/></g></svg>`;
    const fly = document.createElement('i'); fly.className = 'nox-fly'; fly.setAttribute('aria-hidden', 'true');
    if (!document.getElementById('noxHeadIcon')) document.body.insertAdjacentHTML('beforeend', iconMarkup);
    if (GAME) [bubble, ball, fly].forEach((el) => el.classList.add('nox-gamebit'));
    (opts.host || document.body).append(root, bubble, ball, fly);
    if (opts.z) [root, bubble, ball, fly].forEach((el, i) => { el.style.zIndex = opts.z + (i ? 1 : 0); });

    const $ = (s) => root.querySelector(s);
    const rigs = root.querySelectorAll('.nox__rig'), halves = root.querySelectorAll('.nox__half'), head = $('.nox__head'), tail = $('.nox__tail'), shadow = $('.nox__shadow');
    const pupil = $('.nox__pupil'), glint = $('.nox__glint'), mouth = $('.nox__mouth'), eye = $('.nox__eye');
    const tailHair = $('.nox__tailhair');
    const legs = {};
    root.querySelectorAll('.nox__leg').forEach((g) => { legs[g.dataset.leg] = { bones: [...g.querySelectorAll('.nox__bone')], fur: g.querySelector('.nox__legfur'), pad: g.querySelector('.nox__pad') }; });
    growFur(root);
    // the front half is the same torso (with its fur) clipped to the other side of the waist
    root.querySelector('.nox__torso--f').append(...[...root.querySelector('.nox__torso').children].map((n) => n.cloneNode(true)));

    /* ---- state ---- */
    let x = mouse.x - 90, y = mouse.y + 80, dir = 1, face = 1, heading = 0, speed = 0, depth = GAME ? GAME.scale : 1;
    // facing per body part: the head turns first, then the shoulders, and the hips follow last
    let fHd = 1, fF = 1, fH = 1, foldY = 0;
    let lastHi = -99, wantHi = false, leapT = -1;
    if (GAME) { x = GAME.startX; y = GAME.groundY(); }
    let phase = 0, run = 0, gaitBlend = 0, gaitL = 20, gaitDuty = 0.6, idleFor = 0, prep = 0, state = 'idle';
    let hovered = false, last = performance.now(), raf = 0, act = null, nextAct = 1.2, greeted = false, tAll = 0, shut = false;
    const P = { ...POSES.stand };                                  // the live pose, eased toward a target pose
    const blank = () => ({ fnw: 0, fnx: 0, fny: 0, head: 0, headY: 0, tail: 0, mouth: 0, eye: 1, rot: 0, by: 0, look: null });
    let fx = blank();                                              // per-frame extras from the current act
    const J = { sho: [...SHO], head: [...NECK] };                  // last frame's joints, for the ball and the eyes
    const ballSt = { on: false, x: 0, vy: 0, h: 0, spin: 0, vx: 0, mode: '' };
    let exitDir = 0;
    if (opts.enter) {
      // coming back: he gallops in from the right edge, near where his face sat in the top bar
      x = innerWidth + 90; y = Math.min(innerHeight - 40, Math.max(140, mouse.y + 66));
      dir = -1; face = fHd = fF = fH = -1; heading = Math.PI; speed = 260; run = 1; gaitBlend = 1; state = 'chase'; greeted = true;
    }
    const flySt = { on: false, x: 0, y: 0, o: 0 };

    /* ---- helpers ---- */
    const say = (text, ms = 1800) => {
      bubble.textContent = text; bubble.classList.add('is-on');
      clearTimeout(say.t); say.t = setTimeout(() => bubble.classList.remove('is-on'), ms);
    };
    const toScreen = (sx, sy) => [x + face * (sx - 80) * S * depth, y + (sy - G) * S * depth];

    /* ---- one frame of the body ---- */
    function draw(t) {
      const g = gaitBlend, A = run, cyc = phase;
      // rotary gallop: the back stretches long when the legs reach out and bunches up when they gather under
      const flex = Math.cos(TAU * (cyc - 0.38)) * g * A;
      const rot = P.rot + fx.rot + A * (g * -2.6 * Math.sin(TAU * (cyc - 0.62)) + (1 - g) * 0.5 * Math.sin(2 * TAU * cyc));
      const by = P.by + fx.by + A * (g * (-1.4 - 1.8 * Math.cos(TAU * (cyc - 0.38))) + (1 - g) * -0.6 * Math.cos(2 * TAU * cyc));
      const sx = SLIM * (1 + 0.075 * flex), sy = 1 - 0.03 * flex;
      const c = Math.cos(rot * Math.PI / 180), s = Math.sin(rot * Math.PI / 180);
      const T = (px, py) => { const x1 = (px - CX) * sx, y1 = (py - CY) * sy; return [CX + x1 * c - y1 * s, CY + x1 * s + y1 * c + by]; };
      const rigT = `translate(0 ${f1(by)}) rotate(${rot.toFixed(2)} ${CX} ${CY}) translate(${CX} ${CY}) scale(${sx.toFixed(3)} ${sy.toFixed(3)}) translate(-${CX} -${CY})`;
      rigs.forEach((r) => r.setAttribute('transform', rigT));
      // the turn: each half mirrors around the middle on its own schedule, so mid-turn the body folds into a U
      const cl = (f) => Math.sign(f || 1) * Math.max(0.1, Math.abs(f));
      const sH = cl(fH), sF = cl(fF);
      foldY = (1 - Math.sign(sF) * Math.sign(sH) * Math.min(1, Math.abs(sF * sH))) * 1.6;
      halves[0].setAttribute('transform', `translate(80 0) scale(${sH.toFixed(3)} 1) translate(-80 0)`);
      halves[1].setAttribute('transform', `translate(80 ${f1(foldY)}) scale(${sF.toFixed(3)} 1) translate(-80 0)`);

      // legs: walk = lateral sequence, gallop = rotary; the offsets blend between the two
      const off = { hn: 0, fn: lerp(0.25, 0.55, g), hf: lerp(0.5, 0.1, g), ff: lerp(0.75, 0.45, g) };
      for (const k of ['hf', 'ff', 'hn', 'fn']) {
        const hind = k[0] === 'h', far = k[1] === 'f', L = legs[k];
        const piv = hind ? T(HIP[0] + (far ? 3 : 0), HIP[1] - (far ? 1 : 0)) : T(SHO[0] + (far ? 3 : 0), SHO[1] - (far ? 1 : 0));
        // where the paw rests in the current pose
        const restX = piv[0] + (hind ? P.hx : P.fx) + (far ? 2 : 0);
        // where the paw is in the gait cycle: planted and sliding back under the body, then lifted and swung forward
        const p = (((cyc + off[k]) % 1) + 1) % 1, n = piv[0] + (hind ? -4 : 2);
        let gx, gy, sw = 0;
        if (p < gaitDuty) { gx = n + gaitL * (0.5 - p / gaitDuty); gy = G; }
        else { const u = (p - gaitDuty) / (1 - gaitDuty), e = u * u * (3 - 2 * u); sw = Math.sin(Math.PI * u); gx = n + gaitL * (e - 0.5); gy = G - (hind ? 6 + 5 * g : 7 + 6 * g) * sw; }
        let footX = lerp(restX, gx, A), footY = lerp(G, gy, A); sw *= A;
        if (k === 'fn' && fx.fnw > 0) { footX = lerp(footX, piv[0] + fx.fnx, fx.fnw); footY = lerp(footY, fx.fny, fx.fnw); }
        let d = '';
        const b = L.bones;
        const fl = hind ? sH : sF, yo = hind ? 0 : foldY;
        const Mp = (q) => [80 + (q[0] - 80) * fl, q[1] + yo];
        if (hind) {
          // three bones: thigh, shin, and the long cat foot standing on its toes (hock off the ground)
          let mx = lerp(-4.5, -12, P.hflat) - 4 * sw, my = lerp(-11, -1.2, P.hflat) + 3 * sw;
          const ml = Math.hypot(mx, my); mx = mx / ml * BONE.meta; my = my / ml * BONE.meta;
          const knee = ik(piv[0], piv[1], footX + mx, footY + my, BONE.thigh, BONE.shin, -1);
          const hock = reach(knee, [footX + mx, footY + my], BONE.shin);
          const foot = [hock[0] - mx, hock[1] - my];
          const [pA, kA, hA, fA, tA] = [piv, knee, hock, foot, [foot[0] + 3.4, foot[1] + 0.2]].map(Mp);
          b[0].setAttribute('d', cap(pA, 7.4, kA, 3.6));
          b[1].setAttribute('d', cap(kA, 3.2, hA, 2.1));
          b[2].setAttribute('d', cap(hA, 2.1, fA, 1.9));
          b[3].setAttribute('d', cap(fA, 2, tA, 1.9));
          if (!far) d = furBone(pA, 7.4, kA, 3.6, 5) + furBone(kA, 3.2, hA, 2.1, 4);
        } else {
          // shoulder blade, upper arm, forearm, and a paw that curls back while it swings
          let wx = lerp(-1.2, -6.5, P.fflat), wy = lerp(-6, -1.4, P.fflat);
          if (sw) { const a = 1.25 * sw, cs = Math.cos(a), sn = Math.sin(a); [wx, wy] = [wx * cs - wy * sn, wx * sn + wy * cs]; }
          const elbow = ik(piv[0], piv[1], footX + wx, footY + wy, BONE.arm, BONE.fore, 1);
          const wrist = reach(elbow, [footX + wx, footY + wy], BONE.fore);
          const foot = [wrist[0] - wx, wrist[1] - wy];
          const dev = (Math.atan2(elbow[1] - piv[1], elbow[0] - piv[0]) - Math.PI / 2) * 0.45, cs = Math.cos(dev), sn = Math.sin(dev);
          const top = [piv[0] + (-3 * cs + 11 * sn), piv[1] + (-3 * sn - 11 * cs)];
          const [tpA, pA, eA, wA, fA, toA] = [top, piv, elbow, wrist, foot, [foot[0] + 3.2, foot[1] + 0.2]].map(Mp);
          b[0].setAttribute('d', far ? '' : cap(tpA, 4.2, pA, 5.6));
          b[1].setAttribute('d', cap(pA, 5.4, eA, 3.2));
          b[2].setAttribute('d', cap(eA, 3, wA, 2.2));
          b[3].setAttribute('d', cap(wA, 2.2, fA, 2));
          b[4].setAttribute('d', cap(fA, 2, toA, 1.9));
          if (!far) { d = furBone(pA, 5.4, eA, 3.2, 4) + furBone(eA, 3, wA, 2.2, 4); J.sho = piv; }
          if (L.pad) { const pd = Mp([foot[0] + 1.6, foot[1] + 1.2]); L.pad.setAttribute('cx', f1(pd[0])); L.pad.setAttribute('cy', f1(pd[1])); L.pad.setAttribute('opacity', (fx.fnw * 0.9).toFixed(2)); }
        }
        L.fur.setAttribute('d', d);
      }

      // head stays level while the body rocks; a walking panther carries it low
      const hp = T(NECK[0], NECK[1]); J.head = hp;
      const hr = P.head + fx.head - rot * 0.8 + A * g * 2.2 * Math.sin(TAU * (cyc - 0.1)) + A * (1 - g) * 5;
      // the head rides on the front half but turns on its own (it leads the turn)
      head.setAttribute('transform', `translate(${f1(80 + (hp[0] - 80) * sF)} ${f1(hp[1] + foldY + fx.headY + A * (1 - g) * 1.5)}) scale(${cl(fHd).toFixed(3)} 1) rotate(${hr.toFixed(2)}) scale(.92)`);

      drawTail(t, A);
      mouth.setAttribute('opacity', fx.mouth.toFixed(2));
      eye.style.transform = `scaleY(${shut ? 0.1 : fx.eye.toFixed(2)})`;
      shadow.setAttribute('cx', f1(80 + ((T(HIP[0], 0)[0] - 80) * sH + (T(SHO[0], 0)[0] - 80) * sF) / 2 + 2 * sF));
      shadow.setAttribute('rx', f1(30 + 3 * flex - Math.max(0, -by) * 0.6));

      if (!GAME) depth = 0.9 + 0.14 * Math.min(1, Math.max(0, y / innerHeight));           // higher on screen = a little further away
      root.style.transform = `translate3d(${f1(x - W / 2)}px, ${f1(y - G * S)}px, 0) scale(${depth.toFixed(3)})`;
      bubble.style.transform = `translate3d(${f1(x + dir * 26 * depth)}px, ${f1(y - (H + 4 - P.by * S * 0.6) * depth)}px, 0) translate(-50%, -100%)`;
    }

    function drawTail(t, A) {
      // 7 joints that lag behind each other; hangs in a J when standing, streams out when running
      const base = lerp(P.tailA, 172, A) + fx.tail, curl = lerp(P.tailC, -1.5, A);
      let px = TAIL0[0], py = TAIL0[1], a = base * Math.PI / 180;
      let d = `M${f1(px)} ${f1(py)}`;
      const pts = [];
      for (let i = 0; i < 7; i++) {
        const wave = Math.sin(t * lerp(1.4, 7, A) - i * 0.55) * lerp(4, 6, A) * Math.PI / 180;
        a += curl * Math.PI / 180 + wave;
        px += Math.cos(a) * 5.8; py += Math.sin(a) * 5.8;
        pts.push([px, py]);
      }
      for (let i = 0; i < pts.length - 1; i++) {
        const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
        d += ` Q${f1(x1)} ${f1(y1)} ${f1((x1 + x2) / 2)} ${f1((y1 + y2) / 2)}`;
      }
      tail.setAttribute('d', d);
      const all = [TAIL0, ...pts];
      let h = '';
      for (const hr of TAIL_HAIR) {
        const i = Math.min(all.length - 2, hr.seg), [x1, y1] = all[i], [x2, y2] = all[i + 1];
        let tx = x2 - x1, ty = y2 - y1; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
        const nx = -ty * hr.side, ny = tx * hr.side;
        const qx = x1 + (x2 - x1) * hr.t + nx * 1.5, qy = y1 + (y2 - y1) * hr.t + ny * 1.5;
        h += `M${f1(qx - nx * 1.2)} ${f1(qy - ny * 1.2)}L${f1(qx + (nx * 0.45 + tx * 0.9) * hr.len)} ${f1(qy + (ny * 0.45 + ty * 0.9) * hr.len)}`;
      }
      tailHair.setAttribute('d', h);
    }

    const look = () => {
      const [ex, ey] = toScreen(J.head[0] + 11, J.head[1] - 4);
      const tx = fx.look ? fx.look[0] : mouse.x, ty = fx.look ? fx.look[1] : mouse.y;
      const dx = tx - ex, dy = ty - ey, dd = Math.hypot(dx, dy) || 1, k = Math.min(1, dd / 40);
      const cx = 12.4 + (dx / dd) * 1.3 * k * Math.sign(fHd || 1), cy = -3.9 + (dy / dd) * 0.6 * k;
      pupil.setAttribute('cx', cx.toFixed(2)); pupil.setAttribute('cy', cy.toFixed(2));
      glint.setAttribute('cx', (cx + 0.8).toFixed(2)); glint.setAttribute('cy', (cy - 0.9).toFixed(2));
    };

    /* ---- idle acts ---- */
    // each act picks a pose (it may change over time) and adds small per-frame extras on top
    const ease = (v) => v * v * (3 - 2 * v);
    const wiggle = (t) => Math.sin(t * 34) * 1.6;                 // the butt wiggle before a pounce
    const ACTS = {
      hi: { dur: 2.6, pose: 'sit', enter: () => say(['Hi there! 👋', 'Hello! 👋', 'Hey you 👋'][Math.floor(Math.random() * 3)], 2200),
        f: (t, e) => ({ fnw: e, fnx: 19, fny: 20 + Math.sin(t * 13) * 4, head: -6 * e, tail: 10 * e }) },
      groom: { dur: 3.4, pose: 'sit',
        f: (t, e) => ({ fnw: e, fnx: 15, fny: 37 + Math.sin(t * 12) * 1.5, head: (26 + Math.sin(t * 12) * 5) * e, headY: 2 * e, eye: 1 - 0.6 * e }) },
      yawn: { dur: 2.4, pose: 'sit',
        f: (t) => { const m = Math.sin(Math.min(1, t / 2.2) * Math.PI); return { head: -18 * m, mouth: Math.max(0, m * 1.5 - 0.5), eye: 1 - 0.7 * m, tail: 12 * m }; } },
      look: { dur: 2.8, pose: 'sit', f: (t, e) => ({ head: Math.sin(t * 2.2) * 12 * e, tail: Math.sin(t * 2) * 8 * e }) },
      stretch: { dur: 3.4, pose: (t) => (t < 2.5 ? 'bow' : 'stand'),
        f: (t) => { const m = Math.sin(Math.min(1, Math.max(0, (t - 0.5) / 1.7)) * Math.PI); return { mouth: m * 0.9, eye: 1 - 0.6 * m, head: -8 * m }; } },
      loaf: { dur: 8, pose: 'lie',
        f: (t, e) => { const z = Math.min(1, Math.max(0, (t - 1.5) / 1.5)); if (t > 3 && !act.said) { act.said = 1; say('z z z', 2200); } return { eye: 1 - 0.8 * z * e, head: 6 * z * e, tail: Math.sin(t * 1.3) * 6 }; } },
      pounce: { dur: 3, lock: true, pose: (t) => (t < 1.5 ? 'crouch' : t < 2 ? 'stand' : t < 2.5 ? 'crouch' : 'sit'),
        f: (t, e, dt) => {
          const o = { tail: Math.sin(t * 16) * 5 };
          if (t > 0.6 && t < 1.5) o.rot = wiggle(t);
          if (t >= 1.5 && t < 2) { const u = (t - 1.5) / 0.5, s = Math.sin(Math.PI * u); o.by = -16 * s; o.rot = lerp(-10, 8, u); o.fnw = s; o.fnx = 20; o.fny = 52 - 16 * s; x += dir * 150 * dt; }
          return o;
        } },
      fly: { dur: 6.2, lock: true, pose: (t) => (t < 3.4 ? 'sit' : t < 4.4 ? 'crouch' : t < 5 ? 'stand' : 'sit'),
        enter: () => { Object.assign(flySt, { on: true, o: 0 }); fly.classList.add('is-on'); },
        end: () => { flySt.on = false; fly.classList.remove('is-on'); },
        f: (t, e, dt) => {
          if (t < 4.6) { flySt.x = x + dir * (34 + 22 * Math.sin(t * 1.7)); flySt.y = y - 58 + 16 * Math.sin(t * 2.9) + 7 * Math.sin(t * 5.3); }
          else { flySt.y -= 170 * dt; flySt.x += dir * 70 * dt; }
          const o = { look: [flySt.x, flySt.y], tail: t > 2 ? Math.sin(t * 18) * 4 : 0 };
          if (t > 3.6 && t < 4.4) o.rot = wiggle(t);
          if (t >= 4.4 && t < 5) { const u = (t - 4.4) / 0.6, s = Math.sin(Math.PI * u); o.by = -20 * s; o.rot = -14 * s; o.fnw = s; o.fnx = 18; o.fny = 14; }
          return o;
        } },
      ball: { dur: 7.2, pose: 'stand', enter: () => { say('Wanna play? 🏀', 1600); dropBall(); }, end: () => endBall(), f: (t, e) => dribble(t, e) },
    };
    const pick = () => { const k = ['ball', 'groom', 'hi', 'yawn', 'look', 'stretch', 'loaf', 'pounce', 'fly', 'stretch', 'pounce', 'fly']; return k[Math.floor(Math.random() * k.length)]; };
    const endAct = () => { if (act && ACTS[act.name].end) ACTS[act.name].end(); act = null; fx = blank(); };

    /* ---- basketball ---- */
    const GROUND = () => y + 1;
    const pawX = () => toScreen(J.sho[0] + 15, 0)[0];
    function dropBall() {
      Object.assign(ballSt, { on: true, x: pawX(), vy: 0, h: 170, spin: 0, vx: 0, mode: 'drop' });
      ball.classList.add('is-on');
    }
    function dribble(t, e) {
      // stand, then the front paw pats the ball down every half-second; at the end, swat it away
      const lookAt = [ballSt.x, GROUND() - ballSt.h - 7];
      if (t < 1.4) return { look: lookAt, head: 10 * e };
      if (t < 6) {
        ballSt.mode = 'dribble';
        const cyc = ((t - 1.4) / 0.56) % 1, down = cyc < 0.5 ? cyc / 0.5 : 1 - (cyc - 0.5) / 0.5;
        ballSt.h = 16 * (1 - down);
        ballSt.x = pawX();
        return { fnw: e, fnx: 15, fny: G - (ballSt.h + 14) / (S * depth) - 1, head: 14, look: lookAt, tail: Math.sin(t * 6) * 10 };
      }
      if (ballSt.mode !== 'away') { ballSt.mode = 'away'; ballSt.vx = dir * 260; ballSt.vy = -160; }
      return { look: lookAt, tail: 16 * e };
    }
    function stepBall(dt) {
      if (!ballSt.on) return;
      if (ballSt.mode === 'drop') {
        ballSt.vy += 1500 * dt; ballSt.h -= ballSt.vy * dt;
        if (ballSt.h <= 0) { ballSt.h = 0; ballSt.vy = -ballSt.vy * 0.55; if (Math.abs(ballSt.vy) < 120) ballSt.vy = 0; }
        ballSt.x = pawX();
      } else if (ballSt.mode === 'away') {
        ballSt.vy += 900 * dt; ballSt.h -= ballSt.vy * dt;
        if (ballSt.h <= 0) { ballSt.h = 0; ballSt.vy = -ballSt.vy * 0.5; }
        ballSt.x += ballSt.vx * dt; ballSt.vx *= 1 - dt * 0.6;
        ballSt.spin += ballSt.vx * dt * 3;
        if (Math.abs(ballSt.x - x) > 260) endBall();
      }
      if (ballSt.mode === 'dribble') ballSt.spin += 90 * dt * dir;
      ball.style.transform = `translate3d(${f1(ballSt.x - 7)}px, ${f1(GROUND() - 14)}px, 0)`;
      ball.style.setProperty('--h', `${f1(-ballSt.h)}px`);
      ball.style.setProperty('--sq', ballSt.h < 2 ? 0.86 : 1);
      ball.style.setProperty('--spin', `${ballSt.spin.toFixed(0)}deg`);
      ball.style.setProperty('--sh', (0.35 - Math.min(1, ballSt.h / 80) * 0.25).toFixed(2));
    }
    function endBall() { ballSt.on = false; ball.classList.remove('is-on'); }
    function stepFly() {
      if (!flySt.on) return;
      fly.style.transform = `translate3d(${f1(flySt.x - 3)}px, ${f1(flySt.y - 3)}px, 0)`;
    }

    // gait: stride length and duty factor set the step rate so planted paws never slide
    function gaitStep(dt) {
      run += (Math.min(1, speed / 60) - run) * Math.min(1, dt * 6);
      gaitBlend += ((speed > 200 ? 1 : 0) - gaitBlend) * Math.min(1, dt * 3);
      const vb = speed / (S * depth);
      gaitDuty = lerp(0.62, 0.34, gaitBlend);
      gaitL = lerp(Math.min(30, 8 + vb * 0.13), Math.min(46, 14 + vb * 0.06), gaitBlend);
      phase += dt * Math.max(0.6, vb * gaitDuty / gaitL);
    }

    /* ---- main loop ---- */
    function loop(now) {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000); last = now; tAll += dt;
      if (!GAME && document.documentElement.classList.contains('nox-playing')) return;   // resting while the game is open
      if (GAME) { gameStep(dt); return; }
      const side = mouse.x >= x ? -1 : 1;
      const tx = mouse.x + side * 82, ty = mouse.y + 66;
      const dx = tx - x, dy = ty - y, dist = Math.hypot(dx, dy);
      const still = now - mouse.moved > 240;
      const locked = act && ACTS[act.name].lock;
      let pose = 'stand';

      if (state === 'idle' && still && !hovered && dist > 24 && !locked && !document.documentElement.classList.contains('has-dialog')) {
        endAct();
        state = 'prep'; prep = dist > 170 ? 0.26 : 0.08; dir = dx > 0 ? 1 : -1;
        heading = Math.atan2(dy * 0.3, dir); speed = 0;
      }
      if (state === 'exit') {
        // leaving: turn toward the nearest side, pick up speed and gallop off the screen
        const goal = exitDir > 0 ? 0 : Math.PI;
        let diff = goal - heading; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        heading += Math.max(-6 * dt, Math.min(6 * dt, diff));
        const align = Math.max(0, Math.cos(diff));
        speed += (380 * (0.2 + 0.8 * align) - speed) * Math.min(1, dt * 2.4);
        x += Math.cos(heading) * speed * dt; y += Math.sin(heading) * speed * dt;
        if (Math.abs(Math.cos(heading)) > 0.3) dir = Math.cos(heading) > 0 ? 1 : -1;
        gaitStep(dt);
        if (x < -140 || x > innerWidth + 140) { inst.stop(); return; }
      } else if (state === 'prep') {
        // gather the hind legs for half a beat, then go
        pose = 'crouch'; prep -= dt;
        if (prep <= 0) state = 'chase';
      } else if (state === 'chase') {
        // a real cat steers: it has a heading that turns at a limited rate, and it slows down to turn hard
        const top = dist > 340 ? 360 : 200;
        const goal = Math.atan2(dy, dx);
        let diff = goal - heading; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        const turnRate = 3 + 7 * (1 - Math.min(1, speed / 300));
        heading += Math.max(-turnRate * dt, Math.min(turnRate * dt, diff));
        const align = Math.max(0, Math.cos(diff));
        const want = hovered ? 0 : top * Math.min(1, dist / 110) * (0.15 + 0.85 * align * align);
        speed += (want - speed) * Math.min(1, dt * (want > speed ? 2.6 : 5));
        x += Math.cos(heading) * speed * dt; y += Math.sin(heading) * speed * dt;
        if (dist < 8) { x += dx * Math.min(1, dt * 5); y += dy * Math.min(1, dt * 5); }
        const hc = Math.cos(heading);
        if (Math.abs(hc) > 0.3 && speed > 12) dir = hc > 0 ? 1 : -1;
        gaitStep(dt);
        if ((dist < 4 && speed < 45) || (hovered && speed < 10)) {
          state = 'idle'; speed = 0; idleFor = 0; dir = mouse.x >= x ? 1 : -1;
          // every time you stop, he turns to you and says hello (not more than once every few seconds), then plays
          wantHi = tAll - lastHi > 6; nextAct = wantHi ? 0.2 : 1.2;
        }
      } else {
        // idle: let the stride settle, sit down, then pick something to do
        idleFor += dt;
        run *= 1 - Math.min(1, dt * 8);
        pose = idleFor > 0.9 ? 'sit' : 'stand';
        if (!act && idleFor > (wantHi ? 0.9 : 1.4)) {
          nextAct -= dt;
          if (nextAct <= 0 && !calm) {
            const name = wantHi || !greeted ? 'hi' : pick(); greeted = true;
            if (name === 'hi') { wantHi = false; lastHi = tAll; }
            act = { name, t: 0 }; if (ACTS[name].enter) ACTS[name].enter();
          }
        }
        if (act) {
          const A = ACTS[act.name];
          act.t += dt;
          pose = typeof A.pose === 'function' ? A.pose(act.t) : A.pose;
          const e = ease(Math.max(0, Math.min(1, act.t / 0.4, (A.dur - act.t) / 0.45)));
          fx = Object.assign(blank(), A.f(act.t, e, dt) || {});
          if (act.t >= A.dur) { endAct(); nextAct = 2.5 + Math.random() * 3.5; }
        }
      }
      // ease the body toward the pose (faster while running)
      const target = POSES[pose], k = Math.min(1, dt * (state === 'chase' || state === 'exit' ? 8 : 5));
      for (const key in target) P[key] += (target[key] - P[key]) * k;
      turn(dt);
      stepBall(dt); stepFly();
      draw(tAll);
      look();
    }

    // the staged turn: head first; shoulders start once the head is halfway round; hips once the shoulders are
    function turn(dt) {
      fHd += (dir - fHd) * Math.min(1, dt * 11);
      if (fHd * dir > -0.2) fF += (dir - fF) * Math.min(1, dt * 7);
      if (fF * dir > 0.25) fH += (dir - fH) * Math.min(1, dt * 5.5);
      face = fF;
    }

    // game mode: run along the ground toward the player's target, brake to turn, leap on demand
    function gameStep(dt) {
      y = GAME.groundY();
      const dx = GAME.targetX() - x, want = Math.min(GAME.top || 950, Math.abs(dx) * 5.5), wdir = dx > 0 ? 1 : -1;
      if (Math.abs(dx) > 12 && wdir !== dir && speed < 90) dir = wdir;             // turn only once slowed down
      const goal = Math.abs(dx) > 6 && wdir === dir ? want : 0;
      speed += (goal - speed) * Math.min(1, dt * (goal > speed ? 4.5 : 9));
      x += dir * speed * dt;
      heading = dir > 0 ? 0 : Math.PI;
      gaitStep(dt);
      if (speed < 12) { run *= 1 - Math.min(1, dt * 8); idleFor += dt; } else idleFor = 0;
      fx = blank();
      let pose = idleFor > 2.5 ? 'sit' : 'stand';
      if (leapT >= 0) {
        leapT += dt; const u = leapT / 0.62;
        if (u >= 1) leapT = -1;
        else { const sN = Math.sin(Math.PI * u); fx.by = -44 * sN; fx.rot = lerp(-12, 9, u); fx.fnw = sN; fx.fnx = 22; fx.fny = 26 - 30 * sN; fx.tail = 20 * sN; pose = 'stand'; idleFor = 0; }
      }
      if (GAME.look) fx.look = GAME.look();
      const target = POSES[pose], k = Math.min(1, dt * 8);
      for (const key in target) P[key] += (target[key] - P[key]) * k;
      turn(dt);
      draw(tAll);
      look();
    }

    /* ---- blinking ---- */
    const blink = () => {
      if (dead) return;
      shut = true; setTimeout(() => { shut = false; }, 140);
      blink.t = setTimeout(blink, 2400 + Math.random() * 3400);
    };
    blink.t = setTimeout(blink, 2600);

    /* ---- interaction ---- */
    if (!GAME) {
      root.addEventListener('pointerenter', () => { hovered = true; });
      root.addEventListener('pointerleave', () => { hovered = false; });
      const open = () => openCard(root);
      root.addEventListener('click', open);
      root.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    }

    draw(0);
    requestAnimationFrame(() => root.classList.add('is-on'));
    raf = requestAnimationFrame(loop);
    if (!calm && !GAME) setTimeout(() => say(opts.enter ? 'I’m back! 😼' : 'Hi! I’m NOX 👋', 2000), opts.enter ? 700 : 900);
    if (!GAME) lastHi = 0.9;

    const inst = {
      root, say,
      stop() {
        dead = true;
        cancelAnimationFrame(raf); clearTimeout(blink.t); clearTimeout(say.t);
        root.remove(); bubble.remove(); ball.remove(); fly.remove();
        if (alive === inst) alive = null;
      },
      // game helpers
      leap() { if (leapT < 0) leapT = 0; },
      get airborne() { return leapT >= 0; },
      get x() { return x; },
      get dir() { return dir; },
      mouth() { return toScreen(J.head[0] + 21, J.head[1] + 4 + (leapT >= 0 ? 0 : 0)); },
      leave() {
        endAct(); hovered = false;
        say('Bye! 👋', 1500);
        exitDir = x < innerWidth / 2 ? -1 : 1;
        if (state !== 'chase') { heading = dir > 0 ? 0 : Math.PI; speed = 40; }
        state = 'exit';
        root.style.pointerEvents = 'none';
      },
    };
    return inst;
  }
  window.NoxPet = { spawn };

  /* ---------------- the ID card ---------------- */
  let card = null;
  function openCard(from, away = false) {
    if (card) return;
    card = document.createElement('div');
    card.className = 'nox-card';
    card.setAttribute('role', 'dialog'); card.setAttribute('aria-modal', 'true'); card.setAttribute('aria-label', 'About NOX, the site pet');
    card.innerHTML = `<div class="nox-card__veil" data-nox-close></div>${cardMarkup}`;
    if (away) {
      card.classList.add('is-away');
      card.querySelector('.nox-card__lead').textContent = 'Out on patrol right now. Call him back and he’ll come running.';
      card.querySelector('.nox-card__actions').innerHTML = '<button class="nox-card__keep" type="button" data-nox-return data-cursor="Call">Bring him back</button><button class="nox-card__remove nox-card__later" type="button" data-nox-close data-cursor="Later">Not now</button>';
      card.querySelector('.nox-card__foot span').innerHTML = 'Status: <b>away</b>';
    }
    document.body.appendChild(card);
    const inner = card.querySelector('.nox-card__inner');
    const r = from.getBoundingClientRect();
    inner.style.setProperty('--ox', `${r.left + r.width / 2}px`);
    inner.style.setProperty('--oy', `${r.top + r.height / 2}px`);
    // grow out of the panther
    const box = inner.getBoundingClientRect();
    inner.style.transformOrigin = `${r.left + r.width / 2 - box.left}px ${r.top + r.height / 2 - box.top}px`;
    requestAnimationFrame(() => card.classList.add('is-open'));
    document.documentElement.classList.add('nox-carded');
    const opened = card; setTimeout(() => { if (card === opened) opened.classList.add('is-settled'); }, 1800);   // after the entrance, the tilt follows the cursor directly
    if (alive) alive.say('That’s me! 😼', 1600);
    card.querySelector('.nox-card__keep').focus({ preventScroll: true });
    card.addEventListener('click', (e) => {
      if (e.target.closest('[data-nox-close]')) closeCard();
      if (e.target.closest('[data-nox-remove]')) { localStorage.setItem(KEY, '1'); closeCard(); if (alive) alive.leave(); setTimeout(() => showBack(true), 1200); }
      const play = e.target.closest('[data-nox-play]');
      if (play && window.NoxPlay) { const r = play.getBoundingClientRect(); closeCard(); setTimeout(() => window.NoxPlay.open({ x: r.left + r.width / 2, y: r.top + r.height / 2 }), 120); }
      if (e.target.closest('[data-nox-return]')) { localStorage.removeItem(KEY); closeCard(); showBack(false); setTimeout(() => start({ enter: true }), 380); }
    });
    addEventListener('keydown', escClose, true);

    // numbers count up once the plate has landed
    card.querySelectorAll('[data-count]').forEach((b) => {
      const to = +b.dataset.count, t0 = performance.now() + 450;
      const step = (now) => {
        const k = Math.min(1, Math.max(0, (now - t0) / 1100)), e = 1 - Math.pow(1 - k, 3);
        b.textContent = Math.round(to * e);
        if (k < 1 && card) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });

    // the plate tilts toward the cursor, a soft glare follows it, the photo drifts the other way.
    // The loop only runs while the values are still moving.
    if (!calm) {
      const tgt = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
      let spin = 0;
      const tick = () => {
        cur.x += (tgt.x - cur.x) * 0.12; cur.y += (tgt.y - cur.y) * 0.12;
        inner.style.setProperty('--tx', cur.x.toFixed(4)); inner.style.setProperty('--ty', cur.y.toFixed(4));
        spin = Math.abs(tgt.x - cur.x) + Math.abs(tgt.y - cur.y) > 0.001 ? requestAnimationFrame(tick) : 0;
      };
      const kick = () => { if (!spin) spin = requestAnimationFrame(tick); };
      inner.addEventListener('pointermove', (e) => {
        const b = inner.getBoundingClientRect();
        tgt.x = (e.clientX - b.left) / b.width - 0.5; tgt.y = (e.clientY - b.top) / b.height - 0.5; kick();
      });
      inner.addEventListener('pointerleave', () => { tgt.x = tgt.y = 0; kick(); });
    }
  }
  function escClose(e) { if (e.key === 'Escape' && card) { e.stopPropagation(); closeCard(); } }
  function closeCard() {
    if (!card) return;
    const c = card; card = null;
    removeEventListener('keydown', escClose, true);
    c.classList.remove('is-open', 'is-settled'); c.classList.add('is-closing'); document.documentElement.classList.remove('nox-carded');
    setTimeout(() => c.remove(), 450);
  }

  /* ---------------- boot ---------------- */
  if (backBtn) backBtn.addEventListener('click', () => { localStorage.removeItem(KEY); start({ enter: true }); });
  dock.addEventListener('click', () => openCard(dock, true));
  if (localStorage.getItem(KEY) === '1') showBack(true);
  else {
    // wait for the first mouse move so NOX appears next to the cursor
    const first = () => { removeEventListener('pointermove', first); setTimeout(start, 300); };
    addEventListener('pointermove', first, { passive: true });
  }
})();
