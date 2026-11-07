/* =========================================================
   AKG PORTFOLIO ENGINE
   - Three.js particle field that morphs per section
   - Verlet-simulated lamp pull cord that toggles the lights
   - Cinematic preloader + GSAP ScrollTrigger choreography
   ========================================================= */
(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const html = document.documentElement;
  const isTouch = matchMedia('(pointer: coarse)').matches;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGSAP = !!(window.gsap && window.ScrollTrigger);
  const mouse = { x: innerWidth / 2, y: innerHeight / 2, nx: 0, ny: 0 };
  let lightOn = false;
  let scrollVel = 0;

  /* ---------------- text splitting ---------------- */
  function splitChars(el) {
    if (el._chars) return el._chars;
    const text = el.textContent;
    el.textContent = '';
    // group chars into unbreakable words so lines never wrap mid-word
    text.split(/( )/).forEach((part) => {
      if (!part) return;
      if (part === ' ') { el.appendChild(document.createTextNode(' ')); return; }
      const word = document.createElement('span');
      word.className = 'word';
      [...part].forEach((ch) => {
        const s = document.createElement('span');
        s.className = 'char';
        s.setAttribute('aria-hidden', 'true');
        s.textContent = ch;
        word.appendChild(s);
      });
      el.appendChild(word);
    });
    el._chars = $$('.char', el);
    return el._chars;
  }
  function splitWords(root) {
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((w) => {
            if (!w) return;
            if (/^\s+$/.test(w)) frag.appendChild(document.createTextNode(' '));
            else {
              const s = document.createElement('span');
              s.className = 'w';
              s.textContent = w;
              frag.appendChild(s);
            }
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(root);
    return $$('.w', root);
  }

  /* ---------------- sound (synthesized, no files) ---------------- */
  const Sound = (() => {
    let ac;
    const ctx = () => {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
      return ac;
    };
    const noise = (a, secs, shape) => {
      const len = Math.max(1, (a.sampleRate * secs) | 0);
      const buf = a.createBuffer(1, len, a.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, shape);
      const src = a.createBufferSource();
      src.buffer = buf;
      return src;
    };
    return {
      click(on) {
        try {
          const a = ctx(), t = a.currentTime;
          const src = noise(a, 0.045, 7);
          const bp = a.createBiquadFilter();
          bp.type = 'bandpass'; bp.frequency.value = on ? 2400 : 1500; bp.Q.value = 1.1;
          const g = a.createGain(); g.gain.value = 0.55;
          src.connect(bp).connect(g).connect(a.destination);
          src.start(t);
          if (on) {
            const o = a.createOscillator(), og = a.createGain();
            o.type = 'sine'; o.frequency.value = 100;
            og.gain.setValueAtTime(0, t);
            og.gain.linearRampToValueAtTime(0.05, t + 0.08);
            og.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
            o.connect(og).connect(a.destination);
            o.start(t); o.stop(t + 1.2);
          }
        } catch (e) { /* audio unavailable */ }
      },
      tick() {
        try {
          const a = ctx(), t = a.currentTime;
          const src = noise(a, 0.02, 9);
          const hp = a.createBiquadFilter();
          hp.type = 'highpass'; hp.frequency.value = 3200;
          const g = a.createGain(); g.gain.value = 0.7;
          src.connect(hp).connect(g).connect(a.destination);
          src.start(t);
        } catch (e) { /* audio unavailable */ }
      },
      whoosh() {
        try {
          const a = ctx(), t = a.currentTime;
          const src = noise(a, 1.2, 1.2);
          const bp = a.createBiquadFilter();
          bp.type = 'bandpass';
          bp.Q.value = 0.8;
          bp.frequency.setValueAtTime(300, t);
          bp.frequency.exponentialRampToValueAtTime(3200, t + 0.45);
          const g = a.createGain();
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(0.6, t + 0.08);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
          src.connect(bp).connect(g).connect(a.destination);
          src.start(t);
          const o = a.createOscillator(), og = a.createGain();
          o.type = 'sine';
          o.frequency.setValueAtTime(90, t);
          o.frequency.exponentialRampToValueAtTime(40, t + 0.5);
          og.gain.setValueAtTime(0.5, t);
          og.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
          o.connect(og).connect(a.destination);
          o.start(t); o.stop(t + 0.65);
        } catch (e) { /* audio unavailable */ }
      },
    };
  })();

  /* =========================================================
     LUXURY DIVE WATCH (procedural SVG)
     ========================================================= */
  const Watch = (() => {
    const svg = $('#watchSvg');
    if (!svg) return null;
    const CX = 300, CY = 450;
    const pol = (r, deg) => {
      const a = ((deg - 90) * Math.PI) / 180;
      return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
    };
    const f = (n) => n.toFixed(2);
    const rot = (deg) => `rotate(${deg} ${CX} ${CY})`;
    let s = `
    <defs>
      <linearGradient id="wSteel" x1="0" x2="1"><stop offset="0" stop-color="#4a3410"/><stop offset=".1" stop-color="#e8c77a"/><stop offset=".25" stop-color="#a77a2c"/><stop offset=".45" stop-color="#fff0bf"/><stop offset=".6" stop-color="#b58a3a"/><stop offset=".8" stop-color="#f2d68f"/><stop offset="1" stop-color="#4a3410"/></linearGradient>
      <linearGradient id="wBrush" x1="0" x2="1"><stop offset="0" stop-color="#5a4016"/><stop offset=".18" stop-color="#d9b766"/><stop offset=".5" stop-color="#a37a30"/><stop offset=".82" stop-color="#e0c072"/><stop offset="1" stop-color="#553c14"/></linearGradient>
      <linearGradient id="wPolish" x1="0" x2="1"><stop offset="0" stop-color="#7a5a1f"/><stop offset=".3" stop-color="#fff6d2"/><stop offset=".55" stop-color="#c0913c"/><stop offset=".75" stop-color="#fff9e0"/><stop offset="1" stop-color="#6e501a"/></linearGradient>
      <linearGradient id="wPolishV" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5e4318"/><stop offset=".35" stop-color="#fff3c8"/><stop offset=".7" stop-color="#b08332"/><stop offset="1" stop-color="#4d3611"/></linearGradient>
      <radialGradient id="wCase" cx=".36" cy=".28" r=".9"><stop offset="0" stop-color="#fffbe6"/><stop offset=".25" stop-color="#f0d48a"/><stop offset=".6" stop-color="#b48632"/><stop offset="1" stop-color="#4b3410"/></radialGradient>
      <radialGradient id="wBezel" cx=".42" cy=".26" r=".85"><stop offset="0" stop-color="#2f3237"/><stop offset=".5" stop-color="#111215"/><stop offset="1" stop-color="#040405"/></radialGradient>
      <radialGradient id="wDial" cx=".44" cy=".3" r=".85"><stop offset="0" stop-color="#2a2d31"/><stop offset=".5" stop-color="#0d0e10"/><stop offset="1" stop-color="#030304"/></radialGradient>
      <linearGradient id="wHand" x1="0" x2="1"><stop offset="0" stop-color="#8a6a2a"/><stop offset=".48" stop-color="#fff4cf"/><stop offset=".52" stop-color="#e2bf6f"/><stop offset="1" stop-color="#7d5f24"/></linearGradient>
      <radialGradient id="wGlareG"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
      <linearGradient id="wCycG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset=".45" stop-color="#fff" stop-opacity=".04"/><stop offset="1" stop-color="#fff" stop-opacity=".2"/></linearGradient>
      <linearGradient id="wFade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".2" stop-color="#fff" stop-opacity="1"/><stop offset=".8" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <mask id="wMask"><rect x="0" y="0" width="600" height="900" fill="url(#wFade)"/></mask>
      <clipPath id="wCrystal"><circle cx="${CX}" cy="${CY}" r="166"/></clipPath>
      <clipPath id="wCycClip"><rect x="400" y="428" width="48" height="44" rx="11"/></clipPath>
      <filter id="wLume" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="3.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <filter id="wShadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="#000" flood-opacity=".7"/></filter>
      <filter id="wHandShadow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="3" dy="5" stdDeviation="2.5" flood-color="#000" flood-opacity=".75"/></filter>
    </defs>`;

    // bracelet: three-piece links fading into darkness
    let br = '';
    const row = (y, h, sc) => {
      const W = 194 * sc, cw = 66 * sc;
      br += `<rect x="${f(CX - W / 2)}" y="${y}" width="${f(W)}" height="${h}" rx="${f(7 * sc)}" fill="url(#wBrush)"/>`;
      br += `<rect x="${f(CX - cw / 2)}" y="${y + 1.5}" width="${f(cw)}" height="${h - 3}" rx="${f(9 * sc)}" fill="url(#wPolish)"/>`;
      br += `<rect x="${f(CX - cw / 2 - 2)}" y="${y}" width="2" height="${h}" fill="rgba(0,0,0,.5)"/><rect x="${f(CX + cw / 2)}" y="${y}" width="2" height="${h}" fill="rgba(0,0,0,.5)"/>`;
    };
    for (let i = 0; i < 6; i++) row(214 - (i + 1) * 46, 44, 1 - i * 0.035);
    for (let i = 0; i < 6; i++) row(688 + i * 46, 44, 1 - i * 0.035);
    s += `<g mask="url(#wMask)">${br}</g>`;

    // lugs, end links, crown guards, crown
    s += `<rect x="183" y="196" width="234" height="508" rx="50" fill="url(#wSteel)"/>`;
    s += `<path d="M206 205 L394 205 L394 252 Q300 238 206 252 Z" fill="url(#wBrush)"/>`;
    s += `<path d="M206 695 L394 695 L394 648 Q300 662 206 648 Z" fill="url(#wBrush)"/>`;
    s += `<path d="M478 390 C524 396 536 420 536 450 C536 480 524 504 478 510 Z" fill="url(#wSteel)"/>`;
    s += `<rect x="526" y="423" width="32" height="54" rx="7" fill="url(#wPolishV)"/>`;
    for (let y = 427; y <= 473; y += 3.6) s += `<line x1="531" y1="${f(y)}" x2="558" y2="${f(y)}" stroke="rgba(0,0,0,.28)" stroke-width="1"/>`;

    // case + coin-edge bezel
    s += `<circle cx="${CX}" cy="${CY}" r="220" fill="url(#wCase)" filter="url(#wShadow)"/>`;
    s += `<circle cx="${CX}" cy="${CY}" r="219" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="1"/>`;
    s += `<circle cx="${CX}" cy="${CY}" r="211" fill="url(#wPolish)"/>`;
    for (let i = 0; i < 120; i++) {
      const [x1, y1] = pol(204.5, i * 3), [x2, y2] = pol(211, i * 3);
      s += `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="rgba(0,0,0,.45)" stroke-width="1.6"/>`;
    }

    // ceramic bezel insert with graduations
    s += `<circle cx="${CX}" cy="${CY}" r="204" fill="url(#wBezel)"/>`;
    s += `<circle cx="${CX}" cy="${CY}" r="203" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="1"/>`;
    for (let m = 0; m < 60; m++) {
      const d = m * 6;
      if (m === 0) {
        s += `<polygon class="w-plat" points="${CX - 15},${CY - 199} ${CX + 15},${CY - 199} ${CX},${CY - 172}"/>`;
        s += `<circle class="w-lume" cx="${CX}" cy="${CY - 190}" r="5"/>`;
      } else if (m % 10 === 0) {
        s += `<text class="w-plat" x="${CX}" y="${CY - 174}" transform="${rot(d)}" text-anchor="middle" font-size="27" font-weight="500" letter-spacing="-1">${m}</text>`;
      } else if (m % 5 === 0) {
        s += `<rect class="w-plat" x="${CX - 4}" y="${CY - 199}" width="8" height="22" transform="${rot(d)}"/>`;
      } else if (m < 15) {
        s += `<rect class="w-plat" x="${CX - 1.4}" y="${CY - 199}" width="2.8" height="12" transform="${rot(d)}"/>`;
      }
    }

    // rehaut + dial
    s += `<circle cx="${CX}" cy="${CY}" r="168" fill="url(#wSteel)"/>`;
    s += `<circle cx="${CX}" cy="${CY}" r="164" fill="#08090a"/>`;
    s += `<circle cx="${CX}" cy="${CY}" r="162" fill="url(#wDial)"/>`;
    for (let m = 0; m < 60; m++) {
      if (m % 5 === 0) continue;
      s += `<rect x="${CX - 0.8}" y="${CY - 159}" width="1.6" height="7" fill="#d9bd74" opacity=".85" transform="${rot(m * 6)}"/>`;
    }

    // hour markers: lume plots in white-gold surrounds
    for (let h = 0; h < 12; h++) {
      const d = h * 30;
      if (h === 0) s += `<polygon class="w-lume" points="${CX - 17},${CY - 151} ${CX + 17},${CY - 151} ${CX},${CY - 112}" stroke="#f0d27e" stroke-width="2.6" stroke-linejoin="round"/>`;
      else if (h === 3) continue;
      else if (h === 6 || h === 9) s += `<rect class="w-lume" x="${CX - 7.5}" y="${CY - 151}" width="15" height="42" rx="1.5" stroke="#f0d27e" stroke-width="2.6" transform="${rot(d)}"/>`;
      else {
        const [x, y] = pol(132, d);
        s += `<circle class="w-lume" cx="${f(x)}" cy="${f(y)}" r="11.5" stroke="#f0d27e" stroke-width="2.6"/>`;
      }
    }

    // dial printing
    s += `<path d="M303 336 L291 356 L299 356 L294 372 L309 350 L301 350 L307 336 Z" fill="#f0d27e"/>`;
    s += `<text x="${CX}" y="${CY - 56}" text-anchor="middle" font-size="25" fill="#f3d98f" letter-spacing="5" font-family="Instrument Serif, Georgia, serif">AKG</text>`;
    s += `<text x="${CX}" y="${CY - 40}" text-anchor="middle" font-size="8.5" font-weight="600" fill="#e8cd85" letter-spacing="1.6">PERPETUAL ENGINEER</text>`;
    s += `<text x="${CX}" y="${CY - 29}" text-anchor="middle" font-size="6.6" font-weight="500" fill="#c9ad66" letter-spacing="1.2">FULL-STACK · MULTI-AGENT</text>`;
    s += `<text x="${CX}" y="${CY + 64}" text-anchor="middle" font-size="9.5" font-weight="700" fill="#d42b2b" letter-spacing="2.6">LIGHTNING</text>`;
    s += `<text x="${CX}" y="${CY + 78}" text-anchor="middle" font-size="7.6" font-weight="500" fill="#e0c47c" letter-spacing="1.2">1000ft = 300m</text>`;

    // date window at 3
    const day = String(new Date().getDate());
    s += `<rect x="407" y="436" width="34" height="28" rx="2" fill="#f6f4ee" stroke="#f0d27e" stroke-width="2.4"/>`;
    s += `<text x="424" y="457" text-anchor="middle" font-size="19" font-weight="700" fill="#111">${day}</text>`;

    // hands, drawn pointing to 12 and rotated in JS
    const hand = 'fill="url(#wHand)"';
    let hr = `<rect x="${CX - 4}" y="${CY - 62}" width="8" height="80" rx="2" ${hand}/>`;
    hr += `<circle cx="${CX}" cy="${CY - 80}" r="19.5" ${hand}/><circle class="w-lume" cx="${CX}" cy="${CY - 80}" r="15.5"/>`;
    [0, 120, 240].forEach((a) => {
      const r = (a * Math.PI) / 180;
      hr += `<line x1="${CX}" y1="${CY - 80}" x2="${f(CX + 16 * Math.sin(r))}" y2="${f(CY - 80 - 16 * Math.cos(r))}" stroke="#e8cf8a" stroke-width="3.2"/>`;
    });
    hr += `<polygon points="${CX - 6.5},${CY - 98} ${CX + 6.5},${CY - 98} ${CX},${CY - 114}" ${hand}/>`;
    let mn = `<polygon points="${CX - 7},${CY + 28} ${CX + 7},${CY + 28} ${CX + 8},${CY - 30} ${CX + 4.6},${CY - 141} ${CX},${CY - 152} ${CX - 4.6},${CY - 141} ${CX - 8},${CY - 30}" ${hand}/>`;
    mn += `<polygon class="w-lume" points="${CX - 5},${CY - 36} ${CX + 5},${CY - 36} ${CX + 2.8},${CY - 136} ${CX},${CY - 143} ${CX - 2.8},${CY - 136}"/>`;
    let sc = `<rect x="${CX - 1.2}" y="${CY - 158}" width="2.4" height="200" rx="1" ${hand}/>`;
    sc += `<circle cx="${CX}" cy="${CY - 112}" r="8.5" ${hand}/><circle class="w-lume" cx="${CX}" cy="${CY - 112}" r="6.2"/>`;
    sc += `<circle cx="${CX}" cy="${CY + 32}" r="5" ${hand}/>`;
    s += `<g id="wHour" filter="url(#wHandShadow)">${hr}</g>`;
    s += `<g id="wMin" filter="url(#wHandShadow)">${mn}</g>`;
    s += `<g id="wSec" filter="url(#wHandShadow)">${sc}</g>`;
    s += `<circle cx="${CX}" cy="${CY}" r="7.5" fill="url(#wPolish)"/><circle cx="${CX}" cy="${CY}" r="2.4" fill="#6b4e18"/>`;

    // cyclops magnifier over the date
    s += `<g clip-path="url(#wCycClip)"><rect x="400" y="428" width="48" height="44" fill="#f8f6f0"/><text x="424" y="463" text-anchor="middle" font-size="33" font-weight="700" fill="#0d0d0d">${day}</text></g>`;
    s += `<rect x="400" y="428" width="48" height="44" rx="11" fill="url(#wCycG)" stroke="rgba(255,255,255,.55)" stroke-width="1.2"/>`;

    // sapphire crystal reflections
    const [ax, ay] = pol(158, 215), [bx, by] = pol(158, 320);
    s += `<g clip-path="url(#wCrystal)" pointer-events="none">
      <ellipse cx="236" cy="352" rx="170" ry="70" transform="rotate(-38 236 352)" fill="url(#wGlareG)"/>
      <path d="M${f(ax)} ${f(ay)} A158 158 0 0 1 ${f(bx)} ${f(by)}" fill="none" stroke="rgba(255,255,255,.16)" stroke-width="3"/>
    </g>`;

    svg.innerHTML = s;
    const H = $('#wHour', svg), M = $('#wMin', svg), S = $('#wSec', svg);
    const el = $('#watch');
    const set = (h, m, sec) => {
      H.setAttribute('transform', rot(h));
      M.setAttribute('transform', rot(m));
      S.setAttribute('transform', rot(sec));
    };
    // start at 10:10; all three hands sweep clockwise and land together on 12
    const setProgress = (e) => set(305 + 55 * e, 60 + 660 * e, 3600 * e);
    setProgress(0);
    return {
      setProgress,
      lock() { el.classList.add('is-locked'); },
      struck() { el.classList.add('is-struck'); },
    };
  })();

/* =========================================================
     WEBGL PARTICLE FIELD
     ========================================================= */
  const GL = (() => {
    if (!window.THREE) return null;
    const canvas = $('#webgl');
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'high-performance' });
    } catch (e) { return null; }
    const mobile = innerWidth < 768;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(innerWidth, innerHeight);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 100);
    camera.position.z = 9;

    const COUNT = mobile ? 4500 : 9000;
    const shapes = buildShapes(COUNT);
    const pos = new Float32Array(shapes[0]);
    const rand = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) rand[i] = Math.random();

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aRand', new THREE.BufferAttribute(rand, 1));

    const uniforms = {
      uTime: { value: 0 },
      uSize: { value: mobile ? 30 : 38 },
      uPR: { value: renderer.getPixelRatio() },
      uIntro: { value: 0 },
      uOpacity: { value: 0.95 },
      uColorA: { value: new THREE.Color('#ffc46b') },
      uColorB: { value: new THREE.Color('#6f8cff') },
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        uniform float uTime; uniform float uSize; uniform float uPR; uniform float uIntro;
        attribute float aRand;
        varying float vAlpha; varying float vMix;
        void main(){
          vec3 p = position;
          float n = sin(p.x*1.4 + uTime*0.9 + aRand*6.2831)*0.07 + cos(p.y*1.6 + uTime*0.7)*0.07;
          p += normalize(p + vec3(0.0001)) * n;
          vec3 scatter = vec3(aRand - 0.5, fract(aRand*7.31) - 0.5, fract(aRand*3.77) - 0.5) * 46.0;
          float k = smoothstep(0.0, 1.0, clamp(uIntro*1.25 - aRand*0.25, 0.0, 1.0));
          p = mix(scatter, p, k);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = uSize * uPR * (0.35 + aRand*0.9) / -mv.z;
          vAlpha = (0.25 + 0.75*aRand) * (0.4 + 0.6*k);
          vMix = fract(aRand*13.7);
        }`,
      fragmentShader: `
        uniform vec3 uColorA; uniform vec3 uColorB; uniform float uOpacity;
        varying float vAlpha; varying float vMix;
        void main(){
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          float a = smoothstep(0.5, 0.0, d);
          vec3 col = mix(uColorA, uColorB, step(0.72, vMix));
          gl_FragColor = vec4(col, a * vAlpha * uOpacity);
        }`,
    });

    const points = new THREE.Points(geo, material);
    const group = new THREE.Group();
    group.add(points);
    scene.add(group);

    let target = 0;
    let gx = 0;
    let rotY = 0;
    const offX = [2.0, -2.6, 0, 2.6, 0, 0, 0];
    const offScale = [1, 0.9, 1.05, 1, 1, 1.1, 1];

    function setShape(i) { if (i >= 0 && i < shapes.length) target = i; }

    function setLight(on) {
      const A = new THREE.Color(on ? '#ff5a1f' : '#ffc46b');
      const B = new THREE.Color(on ? '#1d1a16' : '#6f8cff');
      material.blending = on ? THREE.NormalBlending : THREE.AdditiveBlending;
      material.needsUpdate = true;
      if (hasGSAP) {
        gsap.to(uniforms.uColorA.value, { r: A.r, g: A.g, b: A.b, duration: 1.2 });
        gsap.to(uniforms.uColorB.value, { r: B.r, g: B.g, b: B.b, duration: 1.2 });
        gsap.to(uniforms.uOpacity, { value: on ? 0.75 : 0.95, duration: 1.2 });
      } else {
        uniforms.uColorA.value.copy(A);
        uniforms.uColorB.value.copy(B);
      }
    }

    const clock = new THREE.Clock();
    function frame() {
      requestAnimationFrame(frame);
      const t = clock.getElapsedTime();
      uniforms.uTime.value = t;
      const tgt = shapes[target];
      for (let i = 0, j = 0; i < COUNT; i++, j += 3) {
        const k = 0.018 + rand[i] * 0.05;
        pos[j] += (tgt[j] - pos[j]) * k;
        pos[j + 1] += (tgt[j + 1] - pos[j + 1]) * k;
        pos[j + 2] += (tgt[j + 2] - pos[j + 2]) * k;
      }
      geo.attributes.position.needsUpdate = true;

      rotY += (reduce ? 0.0005 : 0.0016) + Math.min(Math.abs(scrollVel), 60) * 0.0004;
      group.rotation.y = rotY + mouse.nx * 0.35;
      group.rotation.x += (mouse.ny * 0.22 - group.rotation.x) * 0.05;
      const ox = innerWidth < 900 ? 0 : offX[target];
      gx += (ox - gx) * 0.035;
      group.position.x = gx;
      const s = group.scale.x + (offScale[target] - group.scale.x) * 0.04;
      group.scale.set(s, s, s);
      renderer.render(scene, camera);
    }
    frame();

    addEventListener('resize', () => {
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
    });

    return { uniforms, setShape, setLight };
  })();

  function buildShapes(N) {
    const R = Math.random;
    const g = () => (R() + R() + R() - 1.5) / 1.5;
    const make = (f) => {
      const a = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) {
        const v = f(i, i / N);
        a[i * 3] = v[0]; a[i * 3 + 1] = v[1]; a[i * 3 + 2] = v[2];
      }
      return a;
    };
    const tilt = (v, ax) => {
      const c = Math.cos(ax), s = Math.sin(ax);
      return [v[0], v[1] * c - v[2] * s, v[1] * s + v[2] * c];
    };
    const S = [];
    // 0: sphere with inner core
    S.push(make((i, t) => {
      const phi = Math.acos(1 - 2 * t);
      const th = Math.PI * (1 + Math.sqrt(5)) * i;
      const r = i % 6 === 0 ? 0.6 + R() * 1.4 : 2.4 + g() * 0.05;
      return [r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th)];
    }));
    // 1: DNA double helix
    S.push(make((i, t) => {
      const y = (t - 0.5) * 7.6;
      const a = t * Math.PI * 9;
      const x1 = Math.cos(a) * 1.3, z1 = Math.sin(a) * 1.3;
      if (i % 5 === 0) {
        const k = 1 - 2 * R();
        return tilt([x1 * k, y, z1 * k], 0.25);
      }
      const s = (i % 2) * Math.PI;
      return tilt([Math.cos(a + s) * 1.3 + g() * 0.06, y + g() * 0.05, Math.sin(a + s) * 1.3 + g() * 0.06], 0.25);
    }));
    // 2: torus
    S.push(make(() => {
      const u = R() * Math.PI * 2, v = R() * Math.PI * 2;
      const Rr = 2.4, r = 0.72 + g() * 0.04;
      return tilt([(Rr + r * Math.cos(v)) * Math.cos(u), r * Math.sin(v), (Rr + r * Math.cos(v)) * Math.sin(u)], 1.15);
    }));
    // 3: spiral galaxy
    S.push(make((i) => {
      const arm = i % 4;
      const r = Math.pow(R(), 0.65) * 3.9;
      const a = r * 1.35 + (arm * Math.PI) / 2 + g() * (0.5 / (r + 0.4));
      return tilt([Math.cos(a) * r, g() * 0.18 * (1 - r / 4.2), Math.sin(a) * r], 0.95);
    }));
    // 4: lattice cube
    S.push(make(() => {
      const s = 1.8, gv = [-s, -s / 3, s / 3, s];
      const ax = (R() * 3) | 0;
      const a = gv[(R() * 4) | 0], b = gv[(R() * 4) | 0], c = (R() * 2 - 1) * s;
      return ax === 0 ? [c, a, b] : ax === 1 ? [a, c, b] : [a, b, c];
    }));
    // 5: wave field
    S.push(make(() => {
      const x = (R() * 2 - 1) * 6.5, z = (R() * 2 - 1) * 3.5;
      return [x, Math.sin(x * 1.1) * 0.5 + Math.cos(z * 1.6) * 0.35 - 0.6, z];
    }));
    // 6: torus knot
    S.push(make((i, t) => {
      const a = t * Math.PI * 2;
      const p = 2, q = 3;
      const r = Math.cos(q * a) + 2;
      return [r * Math.cos(p * a) * 0.95 + g() * 0.14, r * Math.sin(p * a) * 0.95 + g() * 0.14, -Math.sin(q * a) * 0.95 + g() * 0.14];
    }));
    return S;
  }

  /* =========================================================
     LAMP + PULL CORD (verlet rope)
     ========================================================= */
  const Lamp = (() => {
    const svg = $('#lampSvg');
    const rope = $('#rope');
    const handle = $('#ropeHandle');
    const head = $('#lampHead');
    if (!svg || !rope || !handle) return null;

    const N = 12, SEG = 14, REST = (N - 1) * SEG;
    const PIVOT = { x: 120, y: -60 };
    const ANCH = { x: 142, y: 176 };
    let angle = 0, angVel = 0;
    let dragging = false, moved = 0, segLen = SEG;
    let downAt = { x: 0, y: 0 }, grabOff = { x: 0, y: 0 }, dragT = { x: 0, y: 0 };
    const pts = [];
    for (let i = 0; i < N; i++) pts.push({ x: ANCH.x, y: ANCH.y + i * SEG, px: ANCH.x, py: ANCH.y + i * SEG });

    const anchor = () => {
      const dx = ANCH.x - PIVOT.x, dy = ANCH.y - PIVOT.y;
      const c = Math.cos(angle), s = Math.sin(angle);
      return { x: PIVOT.x + dx * c - dy * s, y: PIVOT.y + dx * s + dy * c };
    };
    const toSvg = (e) => {
      const pt = svg.createSVGPoint();
      pt.x = e.clientX; pt.y = e.clientY;
      return pt.matrixTransform(svg.getScreenCTM().inverse());
    };

    handle.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      dragging = true;
      moved = 0;
      downAt = toSvg(e);
      const last = pts[N - 1];
      grabOff = { x: last.x - downAt.x, y: last.y - downAt.y };
      dragT = { x: last.x, y: last.y };
      handle.setPointerCapture(e.pointerId);
      document.body.classList.add('is-pulling');
    });
    handle.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const p = toSvg(e);
      moved = Math.max(moved, Math.hypot(p.x - downAt.x, p.y - downAt.y));
      dragT = { x: p.x + grabOff.x, y: p.y + grabOff.y };
    });
    const end = () => {
      if (!dragging) return;
      dragging = false;
      document.body.classList.remove('is-pulling');
      const a = anchor();
      const last = pts[N - 1];
      const d = Math.hypot(last.x - a.x, last.y - a.y);
      if (moved < 6) {
        // a simple click: tug the cord for them
        last.py -= 24;
        setTimeout(() => toggleLight(), 160);
      } else if (d > REST + 34) {
        toggleLight();
      }
    };
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);

    function impulse(v) {
      const c = Math.max(-40, Math.min(40, v));
      for (let i = 1; i < N; i++) pts[i].px -= c * 0.06 * (i / N);
      angVel += c * 0.00004;
    }

    function step() {
      angVel += -angle * 0.01;
      angVel *= 0.975;
      angle += angVel;
      const a = anchor();
      for (let i = 1; i < N; i++) {
        if (dragging && i === N - 1) continue;
        const p = pts[i];
        const vx = (p.x - p.px) * 0.975, vy = (p.y - p.py) * 0.975;
        p.px = p.x; p.py = p.y;
        p.x += vx; p.y += vy + 0.55;
      }
      const p0 = pts[0];
      p0.x = p0.px = a.x; p0.y = p0.py = a.y;

      let wanted = SEG;
      if (dragging) {
        const last = pts[N - 1];
        let tx = dragT.x, ty = dragT.y;
        const dx = tx - a.x, dy = ty - a.y;
        const d = Math.hypot(dx, dy) || 0.001;
        const max = REST + 110;
        if (d > max) { tx = a.x + (dx / d) * max; ty = a.y + (dy / d) * max; }
        last.px = last.x; last.py = last.y;
        last.x = tx; last.y = ty;
        wanted = Math.max(SEG, Math.min(d, max) / (N - 1));
        angVel += (tx - a.x) * 0.0000045;
      }
      segLen += (wanted - segLen) * 0.3;

      for (let it = 0; it < 14; it++) {
        for (let i = 0; i < N - 1; i++) {
          const p1 = pts[i], p2 = pts[i + 1];
          const dx = p2.x - p1.x, dy = p2.y - p1.y;
          const d = Math.hypot(dx, dy) || 0.0001;
          const diff = (d - segLen) / d;
          const p2Locked = dragging && i + 1 === N - 1;
          const f1 = i === 0 ? 0 : p2Locked ? 1 : 0.5;
          const f2 = p2Locked ? 0 : i === 0 ? 1 : 0.5;
          p1.x += dx * diff * f1; p1.y += dy * diff * f1;
          p2.x -= dx * diff * f2; p2.y -= dy * diff * f2;
        }
      }
      angVel += (pts[1].x - a.x) * 0.00002;
    }

    function render() {
      let d = `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
      for (let i = 1; i < N - 1; i++) {
        const xc = (pts[i].x + pts[i + 1].x) / 2, yc = (pts[i].y + pts[i + 1].y) / 2;
        d += ` Q${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)} ${xc.toFixed(1)} ${yc.toFixed(1)}`;
      }
      const last = pts[N - 1], prev = pts[N - 2];
      d += ` L${last.x.toFixed(1)} ${last.y.toFixed(1)}`;
      rope.setAttribute('d', d);
      const rot = (-Math.atan2(last.x - prev.x, last.y - prev.y) * 180) / Math.PI;
      handle.setAttribute('transform', `translate(${last.x.toFixed(1)} ${last.y.toFixed(1)}) rotate(${rot.toFixed(1)})`);
      head.setAttribute('transform', `rotate(${((angle * 180) / Math.PI).toFixed(2)} ${PIVOT.x} ${PIVOT.y})`);
    }

    // settle the rope before first paint
    for (let i = 0; i < 60; i++) step();
    (function loop() { requestAnimationFrame(loop); step(); render(); })();

    return { impulse };
  })();

  /* =========================================================
     LIGHT SWITCH
     ========================================================= */
  const lightText = $('#lightText');
  const lightBtn = $('#lightBtn');
  const hint = $('#lampHint');

  function applyLight(on) {
    html.dataset.light = on ? 'on' : 'off';
    $('meta[name="theme-color"]').setAttribute('content', on ? '#f3ede1' : '#070709');
    if (lightText) lightText.textContent = on ? 'Lights on' : 'Lights off';
    if (lightBtn) lightBtn.setAttribute('aria-pressed', String(on));
    if (GL) GL.setLight(on);
  }
  function toggleLight() {
    lightOn = !lightOn;
    Sound.click(lightOn);
    if (hint) hint.classList.add('is-done');
    const f = $('#flash');
    if (lightOn && hasGSAP && !reduce) {
      gsap.timeline()
        .set(f, { opacity: 0 })
        .to(f, { opacity: 0.7, duration: 0.04 })
        .to(f, { opacity: 0, duration: 0.07 })
        .to(f, { opacity: 0.35, duration: 0.03, delay: 0.05 })
        .to(f, { opacity: 0, duration: 0.1 })
        .add(() => applyLight(true))
        .to(f, { opacity: 0.85, duration: 0.05 })
        .to(f, { opacity: 0, duration: 1.1, ease: 'power2.out' });
    } else {
      applyLight(lightOn);
    }
    if (Lamp) Lamp.impulse(lightOn ? 10 : -10);
  }
  if (lightBtn) lightBtn.addEventListener('click', toggleLight);
  addEventListener('keydown', (e) => {
    if (e.key && e.key.toLowerCase() === 'l' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const tag = (document.activeElement && document.activeElement.tagName) || '';
      if (tag !== 'INPUT' && tag !== 'TEXTAREA') toggleLight();
    }
  });

  /* =========================================================
     POINTER: flashlight veil, cursor, portrait reveal
     ========================================================= */
  let veilQueued = false;
  addEventListener('pointermove', (e) => {
    mouse.x = e.clientX; mouse.y = e.clientY;
    mouse.nx = e.clientX / innerWidth - 0.5;
    mouse.ny = e.clientY / innerHeight - 0.5;
    if (!veilQueued) {
      veilQueued = true;
      requestAnimationFrame(() => {
        html.style.setProperty('--mx', mouse.x + 'px');
        html.style.setProperty('--my', mouse.y + 'px');
        veilQueued = false;
      });
    }
  }, { passive: true });

  if (!isTouch) {
    const cursor = $('.cursor');
    const dot = $('.cursor__dot');
    const ring = $('.cursor__ring');
    const label = $('.cursor__label');
    let rx = mouse.x, ry = mouse.y;
    (function loop() {
      requestAnimationFrame(loop);
      rx += (mouse.x - rx) * 0.17;
      ry += (mouse.y - ry) * 0.17;
      dot.style.transform = `translate(${mouse.x}px, ${mouse.y}px)`;
      ring.style.transform = `translate(${rx}px, ${ry}px)`;
    })();
    document.addEventListener('pointerover', (e) => {
      const t = e.target.closest && e.target.closest('a, button, [data-cursor]');
      cursor.classList.toggle('is-hover', !!t);
      const lbl = t && t.dataset ? t.dataset.cursor : '';
      cursor.classList.toggle('has-label', !!lbl);
      if (lbl) label.textContent = lbl;
    });
    document.addEventListener('pointerleave', () => { cursor.style.opacity = 0; });
    document.addEventListener('pointerenter', () => { cursor.style.opacity = 1; });
  }

  const portrait = $('#portrait');
  if (portrait) {
    const frame = $('.portrait__frame', portrait);
    portrait.addEventListener('pointermove', (e) => {
      const r = frame.getBoundingClientRect();
      frame.style.setProperty('--px', e.clientX - r.left + 'px');
      frame.style.setProperty('--py', e.clientY - r.top + 'px');
    });
  }

  // hero portrait: hover lights it up; on touch screens a tap toggles it
  const heroPhoto = $('#heroPhoto');
  if (heroPhoto && isTouch) heroPhoto.addEventListener('click', () => heroPhoto.classList.toggle('is-lit'));

  /* ---------------- scramble text ---------------- */
  const GLYPHS = '!<>-_\\/[]{}=+*^?#AKG01';
  function scramble(el) {
    const orig = el.dataset.text || (el.dataset.text = el.textContent);
    let f = 0;
    const total = orig.length * 2 + 4;
    cancelAnimationFrame(el._raf);
    const run = () => {
      el.textContent = [...orig].map((c, i) => (i < f / 2 || c === ' ' ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0])).join('');
      f++;
      if (f <= total) el._raf = requestAnimationFrame(run);
      else el.textContent = orig;
    };
    run();
  }
  $$('.scramble').forEach((el) => el.addEventListener('pointerenter', () => scramble(el)));

  /* ---------------- clock ---------------- */
  const clock = $('#clock'), clock2 = $('#clock2');
  const tickClock = () => {
    const now = new Date();
    const full = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata' });
    if (clock) clock.textContent = 'IST ' + full;
    if (clock2) clock2.textContent = 'Local time ' + full.slice(0, 5) + ' IST';
  };
  tickClock();
  setInterval(tickClock, 1000);

  /* =========================================================
     PROJECT VISUALS
     ========================================================= */
  function sangyanViz() {
    const cv = $('#seismo');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const log = $('#agentLog');
    const sevFill = $('#sevFill');
    const sevVal = $('#sevVal');
    let w = 0, h = 0, visible = false, spike = 0, t = 0;
    const resize = () => {
      const dpr = Math.min(devicePixelRatio, 2);
      w = cv.clientWidth; h = cv.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    addEventListener('resize', resize);
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(cv);
    const data = new Array(220).fill(0);
    (function draw() {
      requestAnimationFrame(draw);
      if (!visible) return;
      t++;
      spike *= 0.962;
      data.push((Math.random() - 0.5) * (0.06 + spike * 0.95) + Math.sin(t * 0.07) * 0.015);
      data.shift();
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 22) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      ctx.beginPath();
      data.forEach((d, i) => {
        const x = (i / (data.length - 1)) * w, y = h / 2 + d * h * 0.9;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      const col = spike > 0.3 ? '#ff5a1f' : '#ffb547';
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.6;
      ctx.shadowColor = col;
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;
    })();

    const places = ['Hindu Kush, AF', 'Nepal Himalaya', 'Andaman Sea', 'Kutch, Gujarat', 'Assam, IN', 'Sumatra, ID', 'Uttarakhand, IN', 'Bay of Bengal'];
    const addLine = (agent, cls, msg) => {
      const li = document.createElement('li');
      const time = new Date().toLocaleTimeString('en-GB');
      li.innerHTML = `<span class="t">${time}</span><span class="a ${cls}">${agent}</span><span>${msg}</span>`;
      log.prepend(li);
      while (log.children.length > 7) log.lastChild.remove();
    };
    const ping = (id) => {
      const n = $('#' + id);
      if (!n) return;
      n.classList.add('ping');
      setTimeout(() => n.classList.remove('ping'), 500);
    };
    const event = () => {
      if (!visible && log.children.length) return;
      const quake = Math.random() > 0.3;
      const mag = (3.6 + Math.random() * 3.2).toFixed(1);
      const place = places[(Math.random() * places.length) | 0];
      const sev = quake ? Math.min(0.99, (mag - 3.2) / 3.6 + Math.random() * 0.08) : 0.2 + Math.random() * 0.5;
      spike = quake ? 0.5 + sev * 0.6 : 0.35;
      ping('nodeM');
      addLine('MONITOR', 'a--m', quake ? `quake M${mag} · ${place}` : `storm cell · ${place}`);
      setTimeout(() => {
        ping('nodeA');
        addLine('ANALYZER', 'a--a', `severity index ${sev.toFixed(2)}`);
        sevFill.style.width = sev * 100 + '%';
        sevVal.textContent = sev.toFixed(2);
      }, 650);
      setTimeout(() => {
        ping('nodeR');
        addLine('RESPONDER', 'a--r', sev > 0.6 ? 'ws://dispatch → alert sent' : 'logged · monitoring');
      }, 1300);
    };
    event();
    setInterval(event, 3400);
  }

  function jwtViz() {
    const el = $('#jwtToken');
    if (!el) return;
    const dec = $('#jwtPayload'), hashEl = $('#bcrypt'), status = $('#jwtStatus');
    let visible = false;
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(el);
    const b64 = (o) => btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
    const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const rnd = (n, set) => Array.from({ length: n }, () => set[(Math.random() * set.length) | 0]).join('');
    const header = b64({ alg: 'HS256', typ: 'JWT' });
    const render = () => {
      const iat = Math.floor(Date.now() / 1000);
      const payload = { sub: 'aditya', role: 'admin', iat, exp: iat + 900 };
      const sig = rnd(43, B64 + '-_');
      const finalTok = `<span class="h">${header}</span>.<span class="p">${b64(payload)}</span>.`;
      let f = 0;
      cancelAnimationFrame(el._raf);
      const run = () => {
        const shown = sig.slice(0, f) + rnd(Math.max(0, 43 - f), B64);
        el.innerHTML = finalTok + `<span class="s">${shown}</span>`;
        f += 2;
        if (f <= 43) el._raf = requestAnimationFrame(run);
      };
      run();
      dec.textContent = JSON.stringify(payload, null, 2);
      hashEl.textContent = '$2b$12$' + rnd(53, './' + B64);
      status.classList.remove('ok');
      status.textContent = 'verifying signature…';
      setTimeout(() => {
        status.classList.add('ok');
        status.textContent = '✓ signature valid · access granted · 0 DB reads';
      }, 750);
    };
    render();
    setInterval(() => { if (visible) render(); }, 3600);
  }

  sangyanViz();
  jwtViz();

  /* =========================================================
     MARQUEE DUPLICATION (seamless loop)
     ========================================================= */
  $$('.marquee__inner').forEach((el) => { el.innerHTML += el.innerHTML; });

  /* =========================================================
     NO-GSAP FALLBACK
     ========================================================= */
  if (!hasGSAP) {
    const l = $('#loader');
    if (l) l.remove();
    document.body.classList.remove('is-loading');
    if (GL) GL.uniforms.uIntro.value = 1;
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  /* ---------------- smooth scroll ---------------- */
  let lenis = null;
  if (window.Lenis && !reduce) {
    lenis = new Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 1 });
    lenis.on('scroll', (e) => { scrollVel = e.velocity || 0; ScrollTrigger.update(); });
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  } else {
    let lastY = scrollY;
    gsap.ticker.add(() => { scrollVel = scrollY - lastY; lastY = scrollY; });
  }
  // velocity decays when using native scrolling
  gsap.ticker.add(() => { if (!lenis) scrollVel *= 0.9; });

  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      const target = id === '#home' ? 0 : $(id);
      if (target === null) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { duration: 1.8, easing: (t) => 1 - Math.pow(1 - t, 4) });
      else if (target === 0) scrollTo({ top: 0, behavior: 'smooth' });
      else target.scrollIntoView({ behavior: 'smooth' });
    });
  });

  // lamp swings with scroll speed
  let lastImpulse = 0;
  gsap.ticker.add(() => {
    if (Lamp && Math.abs(scrollVel) > 2 && performance.now() - lastImpulse > 60) {
      Lamp.impulse(scrollVel * 0.6);
      lastImpulse = performance.now();
    }
  });

  /* =========================================================
     INTRO: watch counts to 12, then a lightning strike opens the site
     ========================================================= */
  const heroChars = $$('.hero__title .split').flatMap(splitChars);
  gsap.set(heroChars, { yPercent: 115 });
  gsap.set('.hero [data-fade]', { opacity: 0, y: 24 });
  gsap.set('#lampWrap', { y: -560 });
  gsap.set('.light-chip', { opacity: 0, y: 20 });
  gsap.set('#heroPhoto', { opacity: 0, yPercent: 10 });
  if (lenis) lenis.stop();

  let loaded = document.readyState === 'complete';
  addEventListener('load', () => { loaded = true; });

  const counter = $('#count');
  const prog = { v: 0 };
  const intro = gsap.timeline({ delay: 0.2 });
  intro
    .fromTo('#watch', { opacity: 0, scale: 0.84, rotate: -8, filter: 'blur(16px)' }, { opacity: 1, scale: 1, rotate: 0, filter: 'blur(0px)', duration: 1.4, ease: 'expo.out' }, 0)
    .fromTo('#count', { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: 1, ease: 'expo.out' }, 0.15)
    .to(prog, {
      v: 1, duration: reduce ? 0.6 : 3.6, ease: 'power2.inOut',
      onUpdate() {
        counter.textContent = String(Math.round(prog.v * 100)).padStart(3, '0');
        if (Watch) Watch.setProgress(prog.v);
      },
    }, 0.4)
    .add(() => {
      if (Watch) Watch.lock();
      Sound.tick();
      gsap.fromTo('#watch', { scale: 1 }, { scale: 1.025, duration: 0.12, yoyo: true, repeat: 1, ease: 'power2.out' });
    })
    .add(() => {
      if (!loaded) {
        intro.pause();
        const go = () => intro.resume();
        addEventListener('load', go, { once: true });
        setTimeout(go, 3000);
      }
    }, '+=0.05')
    .add(() => strike(), '+=0.55');

  // soft golden portal edge with sparkles
  function portalRing(ctx, x, y, R, a) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    [[26, 0.1], [9, 0.35], [2.2, 1]].forEach(([w, al], i) => {
      ctx.strokeStyle = i === 2 ? `rgba(255,250,235,${al * a})` : `rgba(240,196,98,${al * a})`;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.arc(x, y, R, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.fillStyle = `rgba(255,236,180,${a})`;
    for (let i = 0; i < 70; i++) {
      const t = Math.random() * Math.PI * 2;
      const rr = R + (Math.random() - 0.5) * 18;
      ctx.fillRect(x + Math.cos(t) * rr, y + Math.sin(t) * rr, 2, 2);
    }
    ctx.restore();
  }

  function strike() {
    const cv = $('#bolt');
    const fl = $('#strikeFlash');
    const loader = $('#loader');
    const ctx = cv.getContext('2d');
    const W = innerWidth, H = innerHeight;
    const dpr = Math.min(devicePixelRatio, 2);
    cv.width = W * dpr;
    cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // origin: the 12 o'clock marker on the dial, in screen pixels
    const svg = $('#watchSvg');
    const pt = svg.createSVGPoint();
    pt.x = 300; pt.y = 318;
    const o = pt.matrixTransform(svg.getScreenCTM());
    const ox = o.x, oy = o.y;
    fl.style.setProperty('--sx', ox + 'px');
    fl.style.setProperty('--sy', oy + 'px');
    loader.style.setProperty('--hx', ox + 'px');
    loader.style.setProperty('--hy', oy + 'px');

    const mobile = W < 760;
    const reach = Math.hypot(W, H);
    const PAL = ['#f7d77e', '#ffe9a8', '#d4a640', '#b8862f', '#ffffff', '#fffaf0', '#0d0c0a', '#1c1a17'];
    const pick = () => PAL[(Math.random() * PAL.length) | 0];
    const isDark = (c) => c === '#0d0c0a' || c === '#1c1a17';

    // phase 1: particles are sucked into the 12
    const inward = Array.from({ length: mobile ? 280 : 560 }, () => ({
      a: Math.random() * Math.PI * 2,
      r0: 140 + Math.random() * Math.max(W, H) * 0.6,
      d: Math.random() * 0.4,
      c: pick(),
      w: 0.6 + Math.random() * 1.6,
    }));
    // phase 2: they explode outward at lightning speed, spiralling
    const burst = Array.from({ length: mobile ? 1000 : 2200 }, () => {
      const a = Math.random() * Math.PI * 2;
      const s = 16 + Math.pow(Math.random(), 1.6) * 74;
      return {
        x: ox, y: oy, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        spin: 0.012 + Math.random() * 0.035, c: pick(),
        w: 0.6 + Math.random() * 2.2, life: 0.6 + Math.random() * 1,
      };
    });

    const T_IN = 0.6;   // implosion length
    const T_OPEN = 0.8; // when the portal starts opening
    const st = { R: 0, ringA: 0 };
    const clk = { t: 0 };
    let lastT = 0;

    const line = (x1, y1, x2, y2) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
    const render = () => {
      const t = clk.t;
      const dt = Math.min(3, Math.max(0, (t - lastT) * 60));
      lastT = t;
      ctx.clearRect(0, 0, W, H);
      ctx.lineCap = 'round';

      // charging core at the 12
      const core = t < T_IN ? t / T_IN : Math.max(0, 1 - (t - T_IN) / 0.5);
      if (core > 0.01) {
        const r = 18 + core * 120;
        const g = ctx.createRadialGradient(ox, oy, 0, ox, oy, r);
        g.addColorStop(0, `rgba(255,255,255,${core})`);
        g.addColorStop(0.3, `rgba(255,222,140,${0.7 * core})`);
        g.addColorStop(1, 'rgba(212,166,64,0)');
        ctx.fillStyle = g;
        ctx.fillRect(ox - r, oy - r, r * 2, r * 2);
      }

      if (t < T_IN + 0.05) {
        const k = Math.min(1, t / T_IN);
        inward.forEach((q) => {
          const e = Math.min(1, Math.max(0, (k - q.d) / (1 - q.d)));
          if (e <= 0) return;
          const r = q.r0 * (1 - e * e * e);
          const tail = r + 30 + 140 * e;
          const c = Math.cos(q.a), s = Math.sin(q.a);
          ctx.globalAlpha = Math.min(1, e * 1.5);
          if (isDark(q.c)) {
            ctx.strokeStyle = '#c9962f';
            ctx.lineWidth = q.w + 1.2;
            line(ox + c * r, oy + s * r, ox + c * tail, oy + s * tail);
          }
          ctx.strokeStyle = q.c;
          ctx.lineWidth = q.w;
          line(ox + c * r, oy + s * r, ox + c * tail, oy + s * tail);
        });
      } else {
        const bt = t - T_IN;
        const drag = Math.pow(0.972, dt);
        burst.forEach((q) => {
          const span = q.life + 0.4;
          if (bt > span) return;
          const cs = Math.cos(q.spin * dt), sn = Math.sin(q.spin * dt);
          const vx = (q.vx * cs - q.vy * sn) * drag, vy = (q.vx * sn + q.vy * cs) * drag;
          q.vx = vx; q.vy = vy;
          q.x += vx * dt; q.y += vy * dt;
          const a = Math.max(0, 1 - bt / span);
          const tx = q.x - vx * 1.8, ty = q.y - vy * 1.8;
          if (isDark(q.c)) {
            ctx.globalAlpha = a * 0.8;
            ctx.strokeStyle = '#c9962f';
            ctx.lineWidth = q.w + 1.4;
            line(tx, ty, q.x, q.y);
            ctx.globalAlpha = a;
            ctx.strokeStyle = q.c;
            ctx.lineWidth = q.w;
            line(tx, ty, q.x, q.y);
          } else {
            ctx.strokeStyle = q.c;
            ctx.globalAlpha = a * 0.16;
            ctx.lineWidth = q.w * 3.2;
            line(tx, ty, q.x, q.y);
            ctx.globalAlpha = a;
            ctx.lineWidth = q.w;
            line(tx, ty, q.x, q.y);
          }
        });
      }
      ctx.globalAlpha = 1;
      if (st.R > 2 && st.ringA > 0.01) portalRing(ctx, ox, oy, st.R, st.ringA);
    };
    gsap.ticker.add(render);

    gsap.timeline({
      onComplete: () => {
        gsap.ticker.remove(render);
        cv.remove();
        fl.remove();
        loader.remove();
      },
    })
      .to(clk, { t: 3.2, duration: 3.2, ease: 'none' }, 0)
      .to('#watch', { scale: 0.95, duration: T_IN, ease: 'power2.in' }, 0)
      .add(() => { Sound.whoosh(); if (Watch) Watch.struck(); }, T_IN)
      .fromTo(fl, { opacity: 0 }, { opacity: 0.4, duration: 0.06 }, T_IN)
      .to(fl, { opacity: 0, duration: 0.6, ease: 'power2.out' }, T_IN + 0.06)
      .to('#watch', { scale: 1.5, opacity: 0, filter: 'blur(12px)', duration: 1, ease: 'expo.in' }, T_IN)
      .to('#count', { x: -80, opacity: 0, duration: 0.6, ease: 'power3.in' }, T_IN)
      .add(() => { document.body.classList.remove('is-loading'); reveal(ox, oy); }, T_OPEN)
      .to(st, {
        R: reach * 1.05, duration: 1.25, ease: 'expo.inOut',
        onUpdate: () => loader.style.setProperty('--hr', st.R + 'px'),
      }, T_OPEN)
      .fromTo(st, { ringA: 1 }, { ringA: 0, duration: 1.25, ease: 'power1.in', immediateRender: false }, T_OPEN);
  }

function reveal(ox, oy) {
    if (lenis) lenis.start();
    // the page warps in from the point the particles came out of
    gsap.fromTo('#main',
      { scale: 1.18, filter: 'blur(14px)', transformOrigin: `${ox || innerWidth / 2}px ${oy || innerHeight / 2}px` },
      { scale: 1, filter: 'blur(0px)', duration: 1.7, ease: 'expo.out', clearProps: 'transform,filter' });
    const tl = gsap.timeline();
    if (GL) tl.to(GL.uniforms.uIntro, { value: 1, duration: 3, ease: 'expo.out' }, 0);
    tl.to(heroChars, { yPercent: 0, stagger: 0.03, duration: 1.3, ease: 'expo.out' }, 0.3)
      .to('.hero [data-fade]', { opacity: 1, y: 0, stagger: 0.08, duration: 1, ease: 'power3.out' }, 0.8)
      .to('#heroPhoto', { opacity: 1, yPercent: 0, duration: 1.8, ease: 'expo.out' }, 0.45)
      .to('#lampWrap', { y: 0, duration: 1.6, ease: 'elastic.out(1, 0.5)', onComplete: () => Lamp && Lamp.impulse(25) }, 1.2)
      .to('.light-chip', { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, 1.9)
      .fromTo('#lampHint', { opacity: 0, x: 12 }, { opacity: 1, x: 0, duration: 0.7, ease: 'power3.out' }, 2.7)
      .add(() => { ScrollTrigger.refresh(); startCalendar(); }, 0.3);
  }

function startCalendar() {
    const cal = $('#cal');
    if (!cal) return;
    const items = [
      ['Full-Stack Developer', 'React · Node.js · FastAPI'],
      ['UI/UX Developer', 'Tailwind · Framer · Motion'],
      ['Trailblazer', 'AWS SBCL · Google SA · #1 Hackbriven'],
      ['Agentic AI Explorer', 'Multi-agent orchestration'],
    ];
    const month = $('#calMonth');
    if (month) {
      const d = new Date();
      month.textContent = d.toLocaleString('en', { month: 'short' }).toUpperCase() + ' · ' + d.getFullYear();
    }
    const front = $('.cal__page--front', cal);
    const back = $('.cal__page--back', cal);
    const fill = (el, i) => {
      $('.cal__num', el).textContent = String(i + 1).padStart(2, '0');
      $('.cal__txt', el).textContent = items[i][0];
      $('.cal__sub', el).textContent = items[i][1];
    };
    let i = 0;
    fill(front, 0);
    fill(back, 1);
    setInterval(() => {
      const n = (i + 1) % items.length;
      fill(back, n);
      // the top page tears up and over the gold rings, revealing the next one
      gsap.timeline({
        onComplete: () => { fill(front, n); gsap.set(front, { rotateX: 0, opacity: 1, y: 0 }); i = n; },
      })
        .to(front, { rotateX: 105, y: -6, duration: 0.7, ease: 'power2.in', transformPerspective: 900 })
        .to(front, { opacity: 0, duration: 0.2 }, 0.5)
        .fromTo(back, { filter: 'brightness(0.85)' }, { filter: 'brightness(1)', duration: 0.7 }, 0);
    }, 2800);
  }

  /* =========================================================
     SCROLL CHOREOGRAPHY
     ========================================================= */
  // progress bar
  gsap.to('#progress', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 0.3 } });

  // nav hide/show + active link
  const nav = $('#nav');
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: (self) => nav.classList.toggle('nav--hidden', self.direction === 1 && self.scroll() > 240),
  });
  const navLinks = $$('.nav__links a');

  // particle shape per section
  $$('[data-shape]').forEach((sec) => {
    ScrollTrigger.create({
      trigger: sec, start: 'top 55%', end: 'bottom 55%',
      onToggle: (self) => {
        if (!self.isActive) return;
        if (GL) GL.setShape(+sec.dataset.shape);
        navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === '#' + sec.id));
      },
    });
  });

  // hero parallax out
  gsap.to('.hero__title .line:first-child', { xPercent: -14, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero__title .line--2', { xPercent: 10, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero__inner', { opacity: 0.1, y: -80, ease: 'none', scrollTrigger: { trigger: '.hero', start: '30% top', end: 'bottom top', scrub: true } });

  // headings: chars rise
  $$('.anim-heading').forEach((h) => {
    const chars = $$('.split', h).flatMap(splitChars);
    gsap.from(chars, {
      yPercent: 115, rotate: 6, stagger: 0.022, duration: 1.1, ease: 'expo.out',
      scrollTrigger: { trigger: h, start: 'top 85%', toggleActions: 'play none none reverse' },
    });
  });

  // section labels
  $$('.section-label').forEach((l) => {
    gsap.from(l, { opacity: 0, x: -30, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: l, start: 'top 90%' } });
  });

  // word-by-word paragraph reveal
  $$('.reveal-words').forEach((p) => {
    const words = splitWords(p);
    gsap.fromTo(words, { opacity: 0.12, y: 6 }, {
      opacity: 1, y: 0, stagger: 0.06, ease: 'none',
      scrollTrigger: { trigger: p, start: 'top 80%', end: 'bottom 50%', scrub: true },
    });
  });

  // generic reveals
  $$('[data-reveal]').forEach((el) => {
    gsap.from(el, { y: 50, opacity: 0, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%' } });
  });

  // portrait: clip reveal + parallax + tilt
  if (portrait) {
    const frame = $('.portrait__frame', portrait);
    gsap.fromTo(frame, { clipPath: 'inset(100% 0% 0% 0%)' }, {
      clipPath: 'inset(0% 0% 0% 0%)', duration: 1.6, ease: 'expo.inOut',
      scrollTrigger: { trigger: portrait, start: 'top 80%' },
    });
    gsap.fromTo($$('img', frame), { scale: 1.35 }, {
      scale: 1, ease: 'none', scrollTrigger: { trigger: portrait, start: 'top bottom', end: 'bottom top', scrub: true },
    });
    tilt(frame, 10);
  }

  // stat counters
  $$('[data-count]').forEach((el) => {
    const end = parseFloat(el.dataset.count);
    const dec = parseInt(el.dataset.dec || '0', 10);
    const o = { v: 0 };
    gsap.to(o, {
      v: end, duration: 2, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 90%' },
      onUpdate: () => { el.textContent = o.v.toFixed(dec); },
    });
  });

  // experience: horizontal pinned scroll on desktop
  const mm = gsap.matchMedia();
  mm.add('(min-width: 900px)', () => {
    const track = $('.exp__track');
    const pin = $('.exp__pin');
    const dist = () => {
      const pad = parseFloat(getComputedStyle(pin).paddingLeft) || 0;
      return Math.max(0, track.scrollWidth - innerWidth + pad * 2);
    };
    const tween = gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: { trigger: '.exp', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1 },
    });
    $$('.exp-card').forEach((card) => {
      gsap.fromTo($('.exp-card__num', card), { xPercent: 40 }, {
        xPercent: -20, ease: 'none',
        scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true },
      });
      gsap.from(card, {
        rotateY: -14, opacity: 0.3, transformPerspective: 1200, ease: 'none',
        scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left right', end: 'center 70%', scrub: true },
      });
    });

    // projects stack: previous card recedes as the next one arrives
    const projects = $$('.project');
    projects.forEach((p, i) => {
      if (i === projects.length - 1) return;
      gsap.to(p, {
        scale: 0.9, opacity: 0.35, filter: 'blur(3px)', ease: 'none',
        scrollTrigger: { trigger: projects[i + 1], start: 'top bottom', end: 'top 10%', scrub: true },
      });
    });
    return () => {};
  });
  mm.add('(max-width: 899px)', () => {
    $$('.exp-card, .project').forEach((c) => {
      gsap.from(c, { y: 60, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: c, start: 'top 88%' } });
    });
  });

  // project visual tilt
  $$('.tilt').forEach((el) => tilt(el, 7));

  // marquees driven by scroll velocity
  const marqueeTweens = $$('.marquee__inner').map((el, i) => {
    const left = i % 2 === 0;
    return gsap.fromTo(el, { xPercent: left ? 0 : -50 }, { xPercent: left ? -50 : 0, duration: 32 + i * 6, ease: 'none', repeat: -1 });
  });
  let mSpeed = 1;
  const marquees = $$('.marquee');
  gsap.ticker.add(() => {
    const v = Math.max(-40, Math.min(40, scrollVel));
    const wanted = 1 + Math.abs(v) * 0.25;
    mSpeed += ((v < -0.5 ? -wanted : wanted) - mSpeed) * 0.08;
    marqueeTweens.forEach((t) => t.timeScale(mSpeed));
    const sk = v * 0.15;
    marquees.forEach((m) => { m.style.transform = `skewX(${(-sk).toFixed(2)}deg)`; });
  });

  // honors rows
  $$('.honor').forEach((row, i) => {
    gsap.from(row, { y: 60, opacity: 0, duration: 1, delay: i * 0.05, ease: 'power3.out', scrollTrigger: { trigger: row, start: 'top 92%' } });
  });

  // contact CTA
  gsap.from('.contact__cta', { y: 60, opacity: 0, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: '.contact__cta', start: 'top 92%' } });

  /* ---------------- helpers ---------------- */
  function tilt(el, strength) {
    if (isTouch || reduce) return;
    gsap.set(el, { transformPerspective: 1000 });
    const rx = gsap.quickTo(el, 'rotationX', { duration: 0.7, ease: 'power3' });
    const ry = gsap.quickTo(el, 'rotationY', { duration: 0.7, ease: 'power3' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      ry(((e.clientX - r.left) / r.width - 0.5) * strength);
      rx(-((e.clientY - r.top) / r.height - 0.5) * strength);
    });
    el.addEventListener('pointerleave', () => { rx(0); ry(0); });
  }

  // magnetic buttons
  if (!isTouch) {
    $$('.magnetic').forEach((el) => {
      const xTo = gsap.quickTo(el, 'x', { duration: 0.9, ease: 'elastic.out(1, 0.4)' });
      const yTo = gsap.quickTo(el, 'y', { duration: 0.9, ease: 'elastic.out(1, 0.4)' });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * 0.3);
        yTo((e.clientY - (r.top + r.height / 2)) * 0.35);
      });
      el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });
  }

  addEventListener('load', () => ScrollTrigger.refresh());
})();
