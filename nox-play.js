/* =====================================================================
   NOX'S ARCADE · opens from NOX's card (window.NoxPlay.open)
   A menu with four games; Play starts straight away.
   - Night Eyes (memory): eyes open on a grid for a moment; tap
     where they were before the timer runs out. Red eyes are traps.
     3 lives; a wrong tap or running out of time costs one.
   - Colour Clash (focus): a colour word in the wrong ink. Tap the INK or
     the WORD, whichever the rule says; the rule flips without warning.
     40 seconds, streaks multiply points, a wrong tap costs 3 seconds.
   - Bug Bounty (coding): a little code editor. Either tap the line with
     the bug, or predict what the code prints. Every question has its
     own clock, levels bring harder code and less time. 3 lives.
   - Math Pounce (maths): time attack. Quick sums, true-or-false,
     missing signs and "which is bigger". A right answer adds 2 s,
     a wrong one costs 3 s; every 6 right answers is a new level.
   In Bug Bounty and Math Pounce, NOX sits at the bottom and cheers.
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
  const R = (a, b) => a + rand(b - a + 1);
  const pick = (a) => a[rand(a.length)];
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const buzz = (ms) => { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* not supported */ } };
  const bestOf = (g) => +(store.get(`nox:best:${g}`) || 0);

  /* ---------------- the games ---------------- */
  const GAMES = {
    eyes: {
      name: 'Night Eyes', brand: 'Night <em>Eyes</em>', line: 'Night Eyes? Hope your memory’s sharp 👀', kind: 'Memory &middot; against the clock',
      desc: 'Eyes open in the dark for a moment. Remember them, then find them before the timer runs out.',
      verdict: (lv) => lv >= 10 ? 'Nox bows to you. That memory is scary good.' : lv >= 7 ? 'Sharp and quick. Nox is a little worried now.' : lv >= 4 ? 'Nice run. The traps get sneakier from here.' : 'Warm-up done. The next run is the real one.',
    },
    trick: {
      name: 'Colour Clash', brand: 'Colour <em>Clash</em>', line: 'Colour Clash… don’t trust your eyes 🎨', kind: 'Focus &middot; 40 seconds',
      desc: 'A colour word in the wrong ink. Tap the ink or the word, as the rule says. It flips.',
      verdict: (n) => n >= 40 ? 'Unshakeable. Your brain ignores nothing.' : n >= 28 ? 'Fast and focused. Nox is impressed.' : n >= 16 ? 'Solid. The flips got you a few times.' : 'Tricky, right? Your brain wants to read the word.',
    },
    code: {
      name: 'Bug Bounty', brand: 'Bug <em>Bounty</em>', line: 'Bug Bounty! Show me how you debug 🐛', kind: 'Coding &middot; beat the clock',
      desc: 'Spot the buggy line or predict what the code prints. Harder code, less time, every level.',
      verdict: (lv) => lv >= 7 ? 'Senior-engineer energy. Nox would merge your PRs.' : lv >= 5 ? 'Sharp debugger. Those quirks didn’t fool you.' : lv >= 3 ? 'Solid run. The tricky stuff starts now.' : 'Every bug you missed is one you won’t miss next time.',
    },
    math: {
      name: 'Math Pounce', brand: 'Math <em>Pounce</em>', line: 'Math Pounce. Fast brains only 🐾', kind: 'Maths &middot; time attack',
      desc: 'Fast mental maths. Right answers add time, wrong ones steal it. How far can you pounce?',
      verdict: (lv) => lv >= 8 ? 'Human calculator. Nox is taking notes.' : lv >= 5 ? 'Quick and clean. Your brain is warmed up.' : lv >= 3 ? 'Nice pounce. The two-step sums are next.' : 'Warm-up done. Go again, you’ll go further.',
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

  /* ---------------- Bug Bounty: the question banks ----------------
     Every question is generated with fresh numbers, and every answer is
     computed here, so it is always right. [tier, make] — tier 1 is easy. */
  const OUT = [
    [1, () => { const a = R(2, 9), b = R(2, 9); return { code: [`let a = ${a};`, `let b = ${b};`, 'console.log(a + b * 2);'], ans: a + b * 2, wrong: [(a + b) * 2, a * b + 2, a + b] }; }],
    [1, () => { const a = R(2, 9), b = R(1, 6); return { code: [`let x = ${a};`, `x += ${b};`, 'x *= 2;', 'console.log(x);'], ans: (a + b) * 2, wrong: [a + b * 2, a * 2 + b, a + b] }; }],
    [1, () => { const w = pick(['panther', 'jungle', 'nox', 'midnight', 'firefly', 'shadow', 'pounce']); return { code: [`const word = "${w}";`, 'console.log(word.length);'], ans: w.length, wrong: [w.length + 1, w.length - 1, w.length + 2] }; }],
    [1, () => { const a = R(11, 40), b = R(3, 7); return { code: [`console.log(${a} % ${b});`], ans: a % b, wrong: [Math.floor(a / b), a % b + 1, b] }; }],
    [2, () => { const n = R(4, 9), s = (n * (n + 1)) / 2; return { code: ['let sum = 0;', `for (let i = 1; i <= ${n}; i++) {`, '  sum += i;', '}', 'console.log(sum);'], ans: s, wrong: [s - n, s + n + 1, n * n] }; }],
    [2, () => { const xs = Array.from({ length: 5 }, () => R(1, 20)), t = R(5, 14), c = xs.filter((x) => x > t).length; return { code: [`const nums = [${xs.join(', ')}];`, `const big = nums.filter(n => n > ${t});`, 'console.log(big.length);'], ans: c, wrong: [c + 1, c + 2, 5 - c] }; }],
    [2, () => { const a = R(1, 9), b = R(2, 9), c = R(1, 9), k = R(2, 5); return { code: [`const xs = [${a}, ${b}, ${c}];`, `const out = xs.map(x => x * ${k});`, 'console.log(out[1]);'], ans: b * k, wrong: [a * k, c * k, b + k] }; }],
    [2, () => { const a = R(2, 20), b = R(2, 20); return { code: [`const x = ${a}, y = ${b};`, 'const d = x > y ? x - y : y - x;', 'console.log(d);'], ans: Math.abs(a - b), wrong: [a + b, a - b, Math.abs(a - b) + 1] }; }],
    [3, () => { const a = R(2, 9), b = R(2, 9); return pick([
      { code: [`console.log("${a}" + ${b});`], ans: `"${a}${b}"`, wrong: [`${a + b}`, `"${a + b}"`, 'NaN'] },
      { code: [`console.log("${a + b}" - ${b});`], ans: `${a}`, wrong: [`"${a + b}${b}"`, 'NaN', `"${a}"`] },
    ]); }],
    [3, () => { const xs = [R(1, 9), R(1, 9), R(1, 9)], k = R(2, 10), s = xs[0] + xs[1] + xs[2] + k; return { code: [`const xs = [${xs.join(', ')}];`, `const total = xs.reduce((s, n) => s + n, ${k});`, 'console.log(total);'], ans: s, wrong: [s - k, s + 1, s - 1] }; }],
    [3, () => { const a = R(1, 9), b = R(1, 9); return { code: [`const o = { a: ${a}, b: ${b} };`, 'o.a = o.b + 1;', 'console.log(o.a + o.b);'], ans: 2 * b + 1, wrong: [a + b, a + b + 1, 2 * b] }; }],
    [3, () => { const n = R(9, 70); let c = 0, m = n; while (m > 1) { m = Math.floor(m / 2); c++; } return { code: [`let n = ${n}, steps = 0;`, 'while (n > 1) {', '  n = Math.floor(n / 2);', '  steps++;', '}', 'console.log(steps);'], ans: c, wrong: [c + 1, c - 1, Math.floor(n / 2)] }; }],
    [3, () => pick([
      { code: ['console.log(typeof null);'], ans: '"object"', wrong: ['"null"', '"undefined"', 'null'] },
      { code: ['console.log(0.1 + 0.2 === 0.3);'], ans: 'false', wrong: ['true', 'undefined', 'TypeError'] },
      { code: ['console.log([] + []);'], ans: '""', wrong: ['[]', '0', 'undefined'] },
      { code: ['console.log(typeof NaN);'], ans: '"number"', wrong: ['"NaN"', '"undefined"', '"object"'] },
    ])],
  ];
  const BUGS = [
    [1, () => ({ goal: 'returns the largest number', lines: ['function largest(nums) {', '  let best = nums[0];', '  for (const n of nums) {', '    if (n < best) best = n;', '  }', '  return best;', '}'], bug: 3, fix: '    if (n > best) best = n;' })],
    [1, () => ({ goal: 'counts the even numbers', lines: ['function countEven(nums) {', '  let count = 0;', '  for (const n of nums) {', '    if (n % 2 === 1) count++;', '  }', '  return count;', '}'], bug: 3, fix: '    if (n % 2 === 0) count++;' })],
    [1, () => ({ goal: 'returns the last item', lines: ['function last(arr) {', '  const first = arr[0];', '  return arr[arr.length];', '}'], bug: 2, fix: '  return arr[arr.length - 1];' })],
    [1, () => { const k = R(2, 5); return { goal: `multiplies every number by ${k}`, lines: ['function scale(nums) {', `  const out = nums.map(x => x + ${k});`, '  return out;', '}'], bug: 1, fix: `  const out = nums.map(x => x * ${k});` }; }],
    [1, () => { const a = pick([16, 18, 21]); return { goal: `is true from age ${a} and up`, lines: ['function canEnter(age) {', `  const ok = age > ${a};`, '  return ok;', '}'], bug: 1, fix: `  const ok = age >= ${a};` }; }],
    [2, () => ({ goal: 'adds 1 + 2 + … + n', lines: ['function total(n) {', '  let sum = 0;', '  for (let i = 1; i < n; i++) {', '    sum += i;', '  }', '  return sum;', '}'], bug: 2, fix: '  for (let i = 1; i <= n; i++) {' })],
    [2, () => ({ goal: 'counts down from n to 1', lines: ['function countdown(n) {', '  for (let i = n; i > 0; i++) {', '    console.log(i);', '  }', '}'], bug: 1, fix: '  for (let i = n; i > 0; i--) {' })],
    [2, () => ({ goal: 'reverses a word', lines: ['function reverse(word) {', "  const chars = word.split('');", '  chars.reverse();', "  return chars.join(' ');", '}'], bug: 3, fix: "  return chars.join('');" })],
    [2, () => ({ goal: 'returns the average', lines: ['function average(nums) {', '  let total = 0;', '  for (const n of nums) total += n;', '  return total * nums.length;', '}'], bug: 3, fix: '  return total / nums.length;' })],
    [3, () => ({ goal: 'is true if x is in the list', lines: ['function has(list, x) {', '  const at = list.indexOf(x);', '  return at > 0;', '}'], bug: 2, fix: '  return at !== -1;' })],
    [3, () => ({ goal: 'swaps a and b', lines: ['let a = 1, b = 2;', 'const t = a;', 'a = b;', 'b = a;', 'console.log(a, b); // 2 1'], bug: 3, fix: 'b = t;' })],
    [3, () => ({ goal: 'keeps the passing scores (50+)', lines: ['function passed(scores) {', '  return scores.filter(s => {', '    s >= 50;', '  });', '}'], bug: 2, fix: '    return s >= 50;' })],
    [3, () => ({ goal: 'builds the full name', lines: ['function fullName(user) {', '  const first = user.first;', '  const last = user.last;', "  return first + ' ' + user.lats;", '}'], bug: 3, fix: "  return first + ' ' + last;" })],
  ];
  // four different options, the right one included
  function four(ans, wrong) {
    const out = [String(ans)];
    wrong.map(String).forEach((w) => { if (!out.includes(w)) out.push(w); });
    let k = 2;
    while (out.length < 4) { const f = /^-?\d+$/.test(String(ans)) ? String(+ans + k) : pick(['undefined', 'NaN', 'null', 'Error']); if (!out.includes(f)) out.push(f); k++; }
    return shuffle(out.slice(0, 4));
  }
  // a tiny JS highlighter: comments, strings, keywords, numbers, function calls
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  function hl(line) {
    const re = /(\/\/.*$)|("[^"]*"|'[^']*')|\b(const|let|function|return|for|of|if|while|typeof|true|false|null|NaN)\b|\b(\d+(?:\.\d+)?)\b|([A-Za-z_]\w*)(?=\()/g;
    let out = '', last = 0, m;
    while ((m = re.exec(line))) {
      out += esc(line.slice(last, m.index));
      const cls = m[1] ? 'c' : m[2] ? 's' : m[3] ? 'k' : m[4] ? 'n' : 'f';
      out += `<span class="tk-${cls}">${esc(m[0])}</span>`;
      last = re.lastIndex;
    }
    return out + esc(line.slice(last));
  }

  /* ---------------- Math Pounce: the question maker ---------------- */
  // an expression for this level: [tokens, value]
  function mexpr(lv) {
    const ops = lv <= 1 ? ['+'] : lv <= 2 ? ['+', '−'] : lv <= 3 ? ['+', '−', '×'] : ['+', '−', '×', '÷'];
    const op = pick(ops);
    let a, b, v;
    if (op === '+') { a = R(2, 6 + lv * 5); b = R(2, 6 + lv * 5); v = a + b; }
    else if (op === '−') { a = R(6, 10 + lv * 6); b = R(1, a - 1); v = a - b; }
    else if (op === '×') { a = R(2, Math.min(12, 3 + lv)); b = R(2, Math.min(12, 4 + lv)); v = a * b; }
    else { b = R(2, Math.min(12, 2 + lv)); v = R(2, Math.min(12, 2 + lv)); a = b * v; }
    if (lv >= 5 && Math.random() < 0.45) {
      // two steps: multiplication comes first
      const c = R(2, 9), d = R(2, 9), e = R(2, 9);
      if (Math.random() < 0.5) return [[c, '+', d, '×', e], c + d * e];
      const f = R(1, c * d - 1);
      return [[c, '×', d, '−', f], c * d - f];
    }
    if (lv >= 6 && Math.random() < 0.22) { const n = R(4, 15); return [[`${n}²`], n * n]; }
    if (lv >= 7 && Math.random() < 0.22) { const p = pick([10, 20, 25, 50, 75]), base = pick([40, 60, 80, 120, 200, 240]); return [[`${p}%`, 'of', base], (p * base) / 100]; }
    return [[a, op, b], v];
  }
  const near = (v) => shuffle([v + 1, v - 1, v + 2, v - 2, v + 10, v - 10, v + 5].filter((x) => x >= 0 && x !== v)).slice(0, 3);
  function mquestion(lv) {
    const kinds = ['pick', 'pick', 'tf'];
    if (lv >= 3) kinds.push('sign');
    if (lv >= 4) kinds.push('big', 'tf');
    const kind = pick(kinds);
    if (kind === 'sign') {
      // a ? b = c, where exactly one sign works
      for (let tries = 0; tries < 20; tries++) {
        const a = R(2, 12 + lv), b = R(2, 9);
        const res = { '+': a + b, '−': a - b, '×': a * b, '÷': a % b === 0 ? a / b : null };
        const op = pick(Object.keys(res).filter((k) => res[k] !== null && res[k] > 0));
        const c = res[op];
        if (Object.values(res).filter((x) => x === c).length === 1) return { kind, label: 'Missing sign', toks: [a, '?', b, '=', c], opts: ['+', '−', '×', '÷'], ans: op };
      }
    }
    if (kind === 'big') {
      let e1, e2;
      do { e1 = mexpr(Math.max(3, lv - 1)); e2 = mexpr(Math.max(3, lv - 1)); } while (e1[1] === e2[1]);
      return { kind, label: 'Which is bigger?', left: e1[0], right: e2[0], ans: e1[1] > e2[1] ? 'L' : 'R' };
    }
    const [toks, v] = mexpr(lv);
    if (kind === 'tf') {
      const truth = Math.random() < 0.5, shown = truth ? v : pick(near(v));
      return { kind, label: 'True or false?', toks: [...toks, '=', shown], ans: truth ? 'T' : 'F' };
    }
    return { kind: 'pick', label: 'Quick maths', toks: [...toks, '=', '?'], opts: shuffle([v, ...near(v)]).map(String), ans: String(v) };
  }
  // the little live demo at the top of each menu card
  const PREVIEW = {
    eyes: `<div class="gm__pgrid">${Array.from({ length: 9 }, () => `<span class="gm__pcell">${eyesSvg}</span>`).join('')}</div>`,
    trick: '<span class="gm__pword" data-pword>BLUE</span><span class="gm__prule" data-prule>Tap the <b>INK</b></span>',
    code: `<div class="gm__pcode" data-pcode>${['function largest(nums) {', '  let best = nums[0];', '  for (const n of nums) {', '    if (n < best) best = n;', '  return best;'].map((l, i) => `<span class="gm__pline"><i>${i + 1}</i>${hl(l)}</span>`).join('')}</div>`,
    math: '<div class="gm__pmath"><span class="gm__peq" data-peq>7 × 8 = ?</span><span class="gm__ptime"><i data-ptime></i></span></div>',
  };
  const card = (g, i) => `
    <article class="gm__card gm__card--${['tl', 'tr', 'bl', 'br'][i]}" data-card="${g}" style="--i:${i}" tabindex="0" role="button" aria-label="Play ${GAMES[g].name}" data-cursor="Play">
      <div class="gm__prev gm__prev--${g}" aria-hidden="true">${PREVIEW[g]}</div>
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
      <div class="gm__hub" data-hub>
        ${card('eyes', 0)}${card('trick', 1)}
        <div class="gm__nox">
          <p class="gm__speech" data-speech aria-live="polite"><span data-speechtx></span></p>
          <div class="gm__face" aria-hidden="true">
            <span class="gm__orbit"></span>
            <span class="gm__ring"></span>
            <span class="gm__photo"></span>
            <i class="gm__eye gm__eye--l"></i><i class="gm__eye gm__eye--r"></i>
          </div>
          <h2 class="gm__title">Pick a <em>game.</em></h2>
          <p class="np__mono gm__kick">Four games &middot; beat your best</p>
        </div>
        ${card('code', 2)}${card('math', 3)}
      </div>
    </section>

    <main class="gm__stage" data-stage="eyes" aria-label="Night Eyes">
      <p class="gm__status" data-status aria-live="polite"></p>
      <div class="gm__timer gm__etimer" aria-hidden="true"><i data-ebar></i></div>
      <div class="gm__gridwrap"><div class="gm__grid" data-grid></div><div class="gm__banner" data-banner aria-hidden="true"></div></div>
      <div class="gm__dots" data-dots aria-hidden="true"></div>
      <p class="gm__say" data-say></p>
    </main>

    <main class="gm__stage gm__trick" data-stage="trick" aria-label="Colour Clash">
      <div class="gm__timer" aria-hidden="true"><i data-bar></i></div>
      <p class="gm__rule" data-rule aria-live="polite"></p>
      <div class="gm__wcard" data-wcard><span class="gm__word" data-word></span></div>
      <div class="gm__streak" data-streak aria-hidden="true">${'<i></i>'.repeat(10)}<b data-mult>&times;1</b></div>
      <div class="gm__opts" data-opts></div>
      <p class="gm__say" data-say></p>
    </main>

    <main class="gm__stage bh" data-stage="code" aria-label="Bug Bounty">
      <div class="bh__win" data-win>
        <div class="bh__clock" aria-hidden="true"><i data-cbar></i></div>
        <div class="bh__bar">
          <span class="bh__dots" aria-hidden="true"><i></i><i></i><i></i></span>
          <span class="bh__tab"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 4L1.5 8 5 12M11 4l3.5 4L11 12"/></svg><b data-ctab>hunt.js</b></span>
          <span class="bh__mode" data-cmode></span>
        </div>
        <div class="bh__code" data-code></div>
        <div class="bh__term" data-term>
          <p class="bh__prompt"><span>&rsaquo;</span> node hunt.js <i class="bh__caret"></i></p>
          <p class="bh__out" data-cout></p>
          <div class="bh__opts" data-copts></div>
        </div>
      </div>
      <p class="gm__say" data-say></p>
    </main>

    <main class="gm__stage mp" data-stage="math" aria-label="Math Pounce">
      <div class="mp__clock" aria-hidden="true"><i data-mbar></i><b class="mp__plus" data-mplus></b></div>
      <p class="mp__label" data-mlabel></p>
      <div class="mp__board" data-mboard></div>
      <div class="mp__opts" data-mopts></div>
      <div class="gm__streak mp__streak" data-mstreak aria-hidden="true">${'<i></i>'.repeat(10)}<b data-mmult>&times;1</b></div>
      <p class="gm__say" data-say></p>
    </main>

    <div class="gm__lvlban" data-lvlban aria-hidden="true"></div>
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
      if (name === 'menu') {
        $('[data-brand]').innerHTML = 'Play with <em>Nox</em>'; renderBests(); startPreviews();
        focusG = ''; hub.dataset.focus = ''; speechTx.textContent = '';
        setTimeout(() => { if (!closing && root.classList.contains('is-menu')) speak(greet()); }, 750);
      }
      else stopPreviews();
    }
    const speechTx = $('[data-speechtx]'), hub = $('[data-hub]');
    function speak(text) {
      // NOX types his line, letter by letter
      clearInterval(speak.t); let k = 0;
      speechTx.textContent = '';
      $('[data-speech]').classList.remove('is-on'); void speechTx.offsetWidth; $('[data-speech]').classList.add('is-on');
      if (calm) { speechTx.textContent = text; return; }
      const chars = [...text];
      speak.t = setInterval(() => { speechTx.textContent = chars.slice(0, ++k).join(''); if (k >= chars.length) clearInterval(speak.t); }, 26);
    }
    const greet = () => (['eyes', 'trick', 'code', 'math'].some(bestOf) ? pick(['Back for more? Let’s see how smart you are 😼', 'Let’s see how smart you are 😼', 'Think you can beat your best? 😼']) : 'Let’s see how smart you are 😼');
    let focusG = '';
    hub.addEventListener('pointerover', (e) => {
      const c = e.target.closest('[data-card]');
      const g = c ? c.dataset.card : '';
      if (g === focusG) return;
      focusG = g; hub.dataset.focus = g;
      if (g) speak(GAMES[g].line);
    });
    hub.addEventListener('pointerleave', () => { if (!focusG) return; focusG = ''; hub.dataset.focus = ''; speak(greet()); });
    hub.addEventListener('focusin', (e) => { const c = e.target.closest('[data-card]'); if (c && c.dataset.card !== focusG) { focusG = c.dataset.card; hub.dataset.focus = focusG; speak(GAMES[focusG].line); } });
    function renderBests() { ['eyes', 'trick'].forEach((g) => { $(`[data-mybest="${g}"]`).textContent = bestOf(g) || '–'; }); }

    /* ---- menu previews: a tiny live demo inside each card ---- */
    let prevT = 0;
    function startPreviews() {
      stopPreviews();
      if (calm) return;
      const cells = $$('.gm__pcell'), word = $('[data-pword]'), rule = $('[data-prule]');
      const plines = $$('.gm__pline'), peq = $('[data-peq]'), ptime = $('[data-ptime]');
      let k = 0;
      const step = () => {
        // Bug Bounty: a red squiggle hops between lines, then lands on the real bug
        plines.forEach((l) => l.classList.remove('is-bug', 'is-fix'));
        if (plines.length) plines[k % 3 === 2 ? 3 : rand(plines.length)].classList.add(k % 3 === 2 ? 'is-fix' : 'is-bug');
        // Math Pounce: a new sum, and the clock refills
        if (peq) {
          const [t, v] = mexpr(2 + (k % 4));
          peq.innerHTML = `${t.join(' ')} = <b>${k % 2 ? v : '?'}</b>`;
          peq.classList.remove('is-in'); void peq.offsetWidth; peq.classList.add('is-in');
          ptime.classList.remove('is-run'); void ptime.offsetWidth; ptime.classList.add('is-run');
        }
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

    /* ================= GAME 1 · Night Eyes ================= */
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

    /* ================= GAME 2 · Colour Clash ================= */
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

    /* ---- a big "Level N" title card across the middle of the screen ---- */
    const lvlBan = $('[data-lvlban]');
    function levelBanner(n, sub) {
      lvlBan.innerHTML = `<b>Level ${n}</b><span>${sub}</span>`;
      lvlBan.classList.remove('is-on'); void lvlBan.offsetWidth; lvlBan.classList.add('is-on');
      // the game steps back while the title card is up, so the two never overlap
      root.classList.add('is-leveling');
      clearTimeout(levelBanner.t); levelBanner.t = setTimeout(() => root.classList.remove('is-leveling'), 1250);
    }

    /* ---- NOX as cheerleader: the real panther rig, sitting at the bottom of the screen ----
       He leaps on right answers, runs a victory lap on streaks, celebrates level-ups and
       shrugs off misses. Only where there's room for him (wide, tall screens). */
    function noxCheer(stageSay) {
      // no room (or no pet.js): the cheering goes into the line under the game instead
      const fallback = { good(s) { if (s && s % 5 === 0) stageSay(pick(['On fire! 🔥', 'Unstoppable 😼', `${s} in a row! 🐾`])); }, bad() {}, level() {}, hello(t) { stageSay(t); }, stop() {} };
      if (!window.NoxPet || calm || innerWidth < 1100 || innerHeight < 620) return fallback;
      const home = () => Math.max(200, innerWidth * 0.13);
      let tx = home(), n = null;
      try {
        n = window.NoxPet.spawn({ host: root, z: 10, game: { scale: Math.max(1.25, Math.min(1.75, innerHeight / 520)), startX: -180, groundY: () => innerHeight - 18, targetX: () => tx, top: 760 } });
      } catch (e) { n = null; }
      if (!n) return fallback;
      let lastLine = 0;
      const talk = (t, ms = 1500) => { const now = performance.now(); if (now - lastLine < 900) return; lastLine = now; n.say(t, ms); };
      return {
        good(streak) {
          n.leap();
          if (streak && streak % 5 === 0) {
            // a victory lap across the bottom of the screen
            tx = tx < innerWidth / 2 ? innerWidth - home() : home();
            talk(pick(['On fire! 🔥', 'Unstoppable 😼', 'Look at you go!', `${streak} in a row! 🐾`]), 1800);
          } else if (Math.random() < 0.3) talk(pick(['Purr-fect 😼', 'Yes!', 'Nailed it', 'Easy 🐾', 'Sharp!']), 1100);
        },
        bad() { talk(pick(['Oops 😾', 'Shake it off!', 'Next one 💪', 'Hmm… no.']), 1300); },
        level(lv) { n.leap(); setTimeout(() => n && n.leap(), 720); lastLine = 0; talk(`Level ${lv}! Let’s go 🐾`, 1900); },
        hello(t) { setTimeout(() => talk(t, 1900), 1300); },
        stop() { if (n) { n.stop(); n = null; } },
      };
    }

    /* ================= GAME 3 · Bug Bounty ================= */
    function codeGame() {
      const stage = $('[data-stage="code"]'), say = sayIn(stage);
      const win = $('[data-win]', stage), codeEl = $('[data-code]', stage), bar = $('[data-cbar]', stage);
      const tabEl = $('[data-ctab]', stage), modeEl = $('[data-cmode]', stage), outEl = $('[data-cout]', stage), opts = $('[data-copts]', stage);
      const PER_LEVEL = 4;
      let level = 1, lives = 3, solved = 0, streak = 0, q = null, phase = 'off', traf = 0, tStart = 0, tLimit = 1, lastSec = 99, cheer = null, used = [];
      const tier = () => (level <= 2 ? 1 : level <= 4 ? 2 : 3);
      const limitMs = () => Math.max(6, 17 - level * 1.4) * 1000;
      const mult = () => (streak >= 10 ? 3 : streak >= 5 ? 2 : 1);
      const hud = () => {
        lvlEl.textContent = `Level ${level}`;
        livesEl.querySelectorAll('svg').forEach((s, i) => s.classList.toggle('is-lost', i >= lives));
        comboEl.textContent = `×${mult()}`; comboEl.classList.toggle('is-on', mult() > 1);
      };
      // pick a template: mostly from this level's tier, sometimes an easier one; avoid repeats
      function draw(bank) {
        const t = tier(), pool = bank.filter(([tt]) => tt <= t);
        const top = pool.filter(([tt]) => tt === t);
        let i, tries = 0;
        do { const src = Math.random() < 0.7 && top.length ? top : pool; i = bank.indexOf(pick(src)); tries++; } while (used.includes(i + (bank === BUGS ? 100 : 0)) && tries < 12);
        used.push(i + (bank === BUGS ? 100 : 0)); if (used.length > 6) used.shift();
        return bank[i][1]();
      }
      function clockStart() {
        tLimit = limitMs(); tStart = performance.now(); lastSec = 99;
        cancelAnimationFrame(traf);
        const step = (now) => {
          if (phase !== 'ask') return;
          const left = Math.max(0, tLimit - (now - tStart)), k = left / tLimit;
          bar.style.transform = `scaleX(${k})`; bar.classList.toggle('is-low', k < 0.3);
          const s = Math.ceil(left / 1000);
          if (s <= 3 && s < lastSec && s > 0) Sfx.tick();
          lastSec = s;
          if (left <= 0) { miss(null, 'time'); return; }
          traf = requestAnimationFrame(step);
        };
        traf = requestAnimationFrame(step);
      }
      const clockLeft = () => Math.max(0, tLimit - (performance.now() - tStart));
      function renderLines(lines, clickable) {
        codeEl.innerHTML = lines.map((l, i) => `<div class="bh__line${clickable && i > 0 ? ' is-pick' : ''}" data-l="${i}" style="--d:${i * 55}ms"><span class="bh__ln">${i + 1}</span><span class="bh__src">${hl(l) || ' '}</span></div>`).join('');
      }
      function ask() {
        phase = 'ask'; hud();
        const bugMode = level >= 2 ? Math.random() < 0.5 : Math.random() < 0.4;
        win.dataset.mode = bugMode ? 'bug' : 'out';
        win.classList.remove('is-in'); void win.offsetWidth; win.classList.add('is-in');
        outEl.textContent = ''; outEl.className = 'bh__out';
        if (bugMode) {
          const b = draw(BUGS);
          q = { kind: 'bug', ...b };
          tabEl.textContent = `${b.lines[0].match(/function (\w+)/) ? b.lines[0].match(/function (\w+)/)[1] : 'swap'}.js`;
          modeEl.textContent = 'Find the bug';
          renderLines([`// should: ${b.goal}`, ...b.lines], true);
          opts.innerHTML = `<p class="bh__hint">Tap the line that breaks it${coarse ? '' : ' · or press its number'}</p>`;
        } else {
          const o = draw(OUT);
          q = { kind: 'out', ...o, ans: String(o.ans) };
          tabEl.textContent = 'output.js';
          modeEl.textContent = 'Predict the output';
          renderLines(['// what does this print?', ...o.code], false);
          opts.innerHTML = four(o.ans, o.wrong).map((v, i) => `<button type="button" class="bh__opt" data-v="${esc(v)}" style="--d:${120 + i * 60}ms" data-cursor="Run"><kbd>${i + 1}</kbd><span>${esc(v)}</span></button>`).join('');
        }
        clockStart();
      }
      function good(el) {
        phase = 'done'; cancelAnimationFrame(traf);
        streak++; solved++;
        const left = clockLeft(), pts = (10 * level + Math.ceil(left / 1000) * 3) * mult();
        setScore(score + pts); Sfx.hit(streak); hud();
        if (q.kind === 'bug') {
          const line = codeEl.querySelector(`[data-l="${q.bug + 1}"]`);
          line.classList.add('is-hit'); ripple(line);
          // the bug gets fixed in place, typed over
          setTimeout(() => { const src = line.querySelector('.bh__src'); src.innerHTML = hl(q.fix); line.classList.add('is-fixed'); }, 260);
          outEl.innerHTML = `<b>✓ fixed</b> in ${((tLimit - left) / 1000).toFixed(1)}s &nbsp;+${pts}`;
        } else {
          el.classList.add('is-good'); ripple(el);
          outEl.innerHTML = `<b>${esc(q.ans)}</b> &nbsp;✓ +${pts}`;
        }
        outEl.className = 'bh__out is-good';
        floatAt(win, `+${pts}`);
        cheer.good(streak);
        if (solved % PER_LEVEL === 0) {
          later(() => {
            level++; hud(); Sfx.level();
            levelBanner(level, level === 3 ? 'Loops and arrays now' : level === 5 ? 'JavaScript quirks unlocked' : `${(limitMs() / 1000).toFixed(0)}s per bug`);
            cheer.level(level);
          }, 700);
          later(ask, 2000);
        } else later(ask, 1100);
      }
      function miss(el, why) {
        phase = 'done'; cancelAnimationFrame(traf);
        streak = 0; lives--; hud(); Sfx.miss(); buzz(80);
        shake(win); cheer.bad();
        if (q.kind === 'bug') {
          if (el) el.classList.add('is-wrong');
          const line = codeEl.querySelector(`[data-l="${q.bug + 1}"]`);
          line.classList.add('is-reveal');
          setTimeout(() => { line.querySelector('.bh__src').innerHTML = hl(q.fix); line.classList.add('is-fixed'); }, 500);
          outEl.innerHTML = why === 'time' ? `✗ time&rsquo;s up &middot; the bug was on line ${q.bug + 2}` : `✗ not that one &middot; the bug was on line ${q.bug + 2}`;
        } else {
          if (el) el.classList.add('is-wrong');
          opts.querySelectorAll('.bh__opt').forEach((b) => { if (b.dataset.v === q.ans) b.classList.add('is-good'); });
          outEl.innerHTML = why === 'time' ? `✗ time&rsquo;s up &middot; it prints <b>${esc(q.ans)}</b>` : `✗ it prints <b>${esc(q.ans)}</b>`;
        }
        outEl.className = 'bh__out is-bad';
        say(why === 'time' ? pick(['Too slow! ⏱', 'Tick tock…']) : pick(['Close!', 'Read it again 👀', 'Tricky one']));
        if (lives <= 0) { later(() => gameOver(level), 1700); return; }
        later(ask, 2100);
      }
      codeEl.onclick = (e) => {
        const l = e.target.closest('.bh__line.is-pick');
        if (!l || phase !== 'ask' || q.kind !== 'bug') return;
        const idx = +l.dataset.l - 1;
        if (idx === q.bug) good(l); else miss(l, 'wrong');
      };
      opts.onclick = (e) => {
        const b = e.target.closest('.bh__opt');
        if (!b || phase !== 'ask' || q.kind !== 'out') return;
        if (b.dataset.v === q.ans) good(b); else miss(b, 'wrong');
      };
      return {
        start() {
          level = 1; lives = 3; solved = 0; streak = 0; used = []; hud();
          $('[data-say]', stage).textContent = '';
          cheer = noxCheer(say); cheer.hello(pick(['Let’s squash some bugs 🐛', 'Code time! 😼']));
          ask();
        },
        stop() { phase = 'off'; cancelAnimationFrame(traf); if (cheer) { cheer.stop(); cheer = null; } },
        key(k) {
          if (phase !== 'ask' || !/^[1-9]$/.test(k)) return;
          if (q.kind === 'out') { const b = opts.children[+k - 1]; if (b) b.click(); }
          else { const l = codeEl.querySelector(`[data-l="${+k - 1}"].is-pick`); if (l) l.click(); }
        },
      };
    }

    /* ================= GAME 4 · Math Pounce ================= */
    function mathGame() {
      const stage = $('[data-stage="math"]'), say = sayIn(stage);
      const bar = $('[data-mbar]', stage), plus = $('[data-mplus]', stage), label = $('[data-mlabel]', stage), board = $('[data-mboard]', stage), opts = $('[data-mopts]', stage);
      const streakEl = $('[data-mstreak]', stage), multEl = $('[data-mmult]', stage);
      const START = 30, CAP = 45, PER_LEVEL = 6;
      let tLeft = START, level = 1, right = 0, streak = 0, q = null, live = false, lock = false, last = 0, raf = 0, lastSec = 99, cheer = null;
      const mult = () => (streak >= 10 ? 3 : streak >= 5 ? 2 : 1);
      const hud = () => {
        const s = Math.max(0, Math.ceil(tLeft));
        lvlEl.textContent = `Level ${level} · 0:${String(Math.min(59, s)).padStart(2, '0')}`;
        if (live && s <= 5 && s < lastSec && s > 0) Sfx.tick();
        lastSec = s;
      };
      const hudStreak = () => {
        const m = mult();
        [...streakEl.querySelectorAll('i')].forEach((d, i) => d.classList.toggle('is-on', i < Math.min(streak, 10)));
        streakEl.dataset.m = m; multEl.textContent = `×${m}`;
        comboEl.textContent = `×${m}`; comboEl.classList.toggle('is-on', m > 1);
      };
      const tok = (t, i) => {
        const cls = /^[+−×÷=?]$/.test(String(t)) ? (t === '?' ? 'is-q' : 'is-op') : t === 'of' ? 'is-op is-word' : '';
        return `<span class="mp__t ${cls}" style="--d:${i * 45}ms">${t}</span>`;
      };
      function bump(delta) {
        plus.textContent = delta > 0 ? `+${delta}s` : `−${-delta}s`;
        plus.className = `mp__plus ${delta > 0 ? 'is-good' : 'is-bad'}`;
        void plus.offsetWidth; plus.classList.add('is-on');
      }
      function next() {
        q = mquestion(level);
        label.textContent = q.label;
        label.classList.remove('is-in'); void label.offsetWidth; label.classList.add('is-in');
        if (q.kind === 'big') {
          board.innerHTML = `<button type="button" class="mp__side" data-v="L" data-cursor="Bigger">${q.left.map(tok).join('')}</button><span class="mp__vs">or</span><button type="button" class="mp__side" data-v="R" data-cursor="Bigger">${q.right.map(tok).join('')}</button>`;
          opts.innerHTML = '';
        } else {
          board.innerHTML = `<div class="mp__eq">${q.toks.map(tok).join('')}</div>`;
          if (q.kind === 'tf') opts.innerHTML = '<button type="button" class="mp__opt mp__tf is-t" data-v="T" data-cursor="True"><kbd>1</kbd>True</button><button type="button" class="mp__opt mp__tf is-f" data-v="F" data-cursor="False"><kbd>2</kbd>False</button>';
          else opts.innerHTML = q.opts.map((v, i) => `<button type="button" class="mp__opt${q.kind === 'sign' ? ' is-sign' : ''}" data-v="${v}" style="--d:${80 + i * 50}ms" data-cursor="Pounce"><kbd>${i + 1}</kbd>${v}</button>`).join('');
        }
        board.classList.remove('is-in'); void board.offsetWidth; board.classList.add('is-in');
      }
      function answer(v, el) {
        if (!live || lock) return;
        if (v === q.ans) {
          streak++; right++;
          const pts = 10 * level * mult();
          setScore(score + pts); Sfx.hit(streak); hudStreak();
          tLeft = Math.min(CAP, tLeft + 2); bump(2);
          if (el) { el.classList.add('is-good'); ripple(el); }
          board.classList.add('is-good'); floatAt(board, `+${pts}`);
          cheer.good(streak);
          lock = true;
          if (right % PER_LEVEL === 0) {
            level++; Sfx.level();
            levelBanner(level, level === 3 ? 'Missing signs appear' : level === 4 ? 'Which is bigger? + division' : level === 5 ? 'Two-step sums' : level === 6 ? 'Squares join in' : level === 7 ? 'Percentages too' : 'Faster, bigger numbers');
            cheer.level(level);
            later(() => { lock = false; board.classList.remove('is-good'); next(); }, 1100);
          } else later(() => { lock = false; board.classList.remove('is-good'); next(); }, 260);
        } else {
          streak = 0; hudStreak(); Sfx.miss(); buzz(70);
          tLeft -= 3; bump(-3); hud();
          if (el) { el.classList.add('is-wrong'); ripple(el, 'is-bad'); }
          shake(board); cheer.bad();
          say(q.kind === 'big' ? 'The other side was bigger' : q.kind === 'tf' ? (q.ans === 'T' ? 'It was true!' : 'That was false!') : `It was ${q.ans}`);
          lock = true; later(() => { lock = false; next(); }, 650);
        }
      }
      function tick(now) {
        if (!live) return;
        const dt = Math.min(0.1, (now - last) / 1000); last = now;
        tLeft -= dt;
        bar.style.transform = `scaleX(${Math.max(0, tLeft / CAP)})`;
        bar.classList.toggle('is-low', tLeft < 7);
        hud();
        if (tLeft <= 0) {
          live = false; stage.querySelectorAll('button').forEach((b) => (b.disabled = true));
          say('Time! ⏱'); later(() => gameOver(level), 1100); return;
        }
        raf = requestAnimationFrame(tick);
      }
      stage.onclick = (e) => { const b = e.target.closest('[data-v]'); if (b && !b.disabled) answer(b.dataset.v, b); };
      return {
        prep() {
          tLeft = START; level = 1; right = 0; streak = 0; lock = false; lastSec = 99;
          $('[data-say]', stage).textContent = ''; bar.style.transform = `scaleX(${START / CAP})`; bar.classList.remove('is-low');
          hudStreak(); hud(); next(); stage.querySelectorAll('[data-v]').forEach((b) => (b.disabled = true));
          cheer = noxCheer(say);
        },
        start() {
          stage.querySelectorAll('[data-v]').forEach((b) => (b.disabled = false));
          cheer.hello(pick(['Pounce on those numbers! 🐾', 'Maths time 😼']));
          live = true; last = performance.now(); raf = requestAnimationFrame(tick);
        },
        stop() { live = false; cancelAnimationFrame(raf); if (cheer) { cheer.stop(); cheer = null; } },
        key(k) {
          if (!live) return;
          const map = { 1: 0, 2: 1, 3: 2, 4: 3, ArrowLeft: 0, ArrowRight: 1 };
          if (!(k in map)) return;
          const btns = q.kind === 'big' ? board.querySelectorAll('[data-v]') : opts.querySelectorAll('[data-v]');
          const b = btns[map[k]]; if (b) b.click();
        },
      };
    }

    const engines = { eyes: eyesGame(), trick: trickGame(), code: codeGame(), math: mathGame() };

    /* ---- game flow ---- */
    function play(g) {
      stopRun();
      current = g; root.dataset.game = g;
      $('[data-brand]').innerHTML = GAMES[g].brand;
      resetScore(); comboEl.classList.remove('is-on');
      engine = engines[g];
      setScreen(null);
      if (g === 'trick' || g === 'math') engine.prep();
      if (g === 'code') { const w = $('[data-stage="code"] [data-win]'); $('[data-code]', w).innerHTML = ''; $('[data-copts]', w).innerHTML = ''; $('[data-cout]', w).textContent = ''; }
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
