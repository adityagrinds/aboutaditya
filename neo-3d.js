/* =====================================================================
   NEO HAZARD · the 3D layer of neo-hazard.html
   1. A WebGL scene behind the hero: a shader-built Earth (land, ocean,
      clouds, city lights, atmosphere), a belt of ~900 tumbling rocks,
      one glowing "potentially hazardous" asteroid with a trail that
      swings close past Earth, and a starfield.
   2. A cinematic intro: a data counter, then the camera flies in from
      deep space to Earth while the title rises. Scrolling the hero
      orbits the camera back out and fades the scene away.
   3. "The model line-up": a pinned, scroll-driven deck where the 13
      models arrive one at a time, each with its real numbers, ending
      on a summary of everything that was trained.
   Needs Three.js r128 + GSAP 3 + ScrollTrigger (loaded before this).
   ===================================================================== */
(() => {
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);
  // the page's own counters wait for the intro to finish
  let ready; window.NEO_READY = new Promise((r) => { ready = r; });

  /* =================================================================
     1 · THE SCENE
     ================================================================= */
  const canvas = document.getElementById('space');
  let scene3d = null;
  try { if (canvas && window.THREE) scene3d = buildScene(canvas); } catch (e) { console.warn('3D scene off:', e); }

  function buildScene(cv) {
    const T = window.THREE;
    const renderer = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: false, powerPreference: 'high-performance' });
    const DPR = Math.min(1.5, devicePixelRatio || 1);
    renderer.setPixelRatio(DPR);
    renderer.setClearColor(0x070709, 1);
    renderer.outputEncoding = T.sRGBEncoding;
    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 400);
    const SUN = new T.Vector3(-6, 2.2, 4).normalize();

    // bloom: the city lights, the atmosphere and the hazardous asteroid really glow
    let composer = null, bloom = null;
    if (T.EffectComposer && T.RenderPass && T.UnrealBloomPass) {
      try {
        composer = new T.EffectComposer(renderer);
        composer.setPixelRatio(DPR);
        composer.addPass(new T.RenderPass(scene, camera));
        bloom = new T.UnrealBloomPass(new T.Vector2(innerWidth / 2, innerHeight / 2), 0.5, 0.12, 0.86);   // only the brightest things glow, with a tight halo (a wide one greys the sky)
        composer.addPass(bloom);
        // the composer works in linear colour end to end; sRGB output on top would wash the black sky to grey
        renderer.outputEncoding = T.LinearEncoding;
      } catch (e) { composer = null; }
    }

    // lights for the rocks and the moon
    scene.add(new T.AmbientLight(0x2a3040, 1.1));
    const sunLight = new T.DirectionalLight(0xffd9a0, 2.3); sunLight.position.copy(SUN).multiplyScalar(20); scene.add(sunLight);
    const rimLight = new T.DirectionalLight(0x6f8cff, 0.7); rimLight.position.set(5, -2, -4); scene.add(rimLight);

    const world = new T.Group(); scene.add(world);

    /* ---- shared GLSL: value noise + fbm ---- */
    const noise = `
      float h3(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
      float n3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
        return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
                   mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }
      float fbm(vec3 p){ float a = .5, s = 0.; for (int k = 0; k < 6; k++){ s += a * n3(p); p *= 2.02; a *= .5; } return s; }
      float terrain(vec3 p){ vec3 q = p * 2.0 + vec3(3.7); q += .35 * vec3(fbm(q + 1.3), fbm(q + 7.1), fbm(q + 4.2)); return fbm(q); }`;

    /* ---- Earth: continents, relief, deserts, ice, ocean glint, city lights ---- */
    const earthMat = new T.ShaderMaterial({
      // lighting is done in the planet's own (object) space: sun direction and camera position are passed in that space
      uniforms: { uSunL: { value: new T.Vector3(1, 0, 0) }, uCamL: { value: new T.Vector3(0, 0, 5) } },
      vertexShader: `varying vec3 vP;
        void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
      fragmentShader: `uniform vec3 uSunL; uniform vec3 uCamL; varying vec3 vP; ${noise}
        void main(){
          vec3 p = normalize(vP);
          float hgt = terrain(p);
          float land = smoothstep(.505, .53, hgt);
          float coast = smoothstep(.49, .505, hgt) * (1. - land);
          float lat = abs(p.y);
          float ice = smoothstep(.78, .9, lat + (hgt - .5) * .3);
          float desert = smoothstep(.62, .5, abs(lat - .3)) * smoothstep(.55, .7, fbm(p * 3. + 9.));
          float mount = smoothstep(.6, .72, hgt);
          vec3 deep = vec3(.006, .03, .09), shallow = vec3(.03, .17, .32);
          vec3 ocean = mix(deep, shallow, smoothstep(.38, .5, hgt));
          vec3 green = mix(vec3(.06, .17, .07), vec3(.16, .25, .1), fbm(p * 9.));
          vec3 ground = mix(green, vec3(.52, .41, .24), desert);
          ground = mix(ground, vec3(.36, .32, .28), mount);
          vec3 col = mix(ocean, ground, land) + coast * vec3(.05, .12, .14);
          col = mix(col, vec3(.88, .92, .97), ice);
          // relief: tilt the normal along the terrain slope
          float e = .01;
          vec3 tx = normalize(cross(p, vec3(0., 1., 0.)) + 1e-4), ty = cross(p, tx);
          float dx = terrain(normalize(p + tx * e)) - hgt, dy = terrain(normalize(p + ty * e)) - hgt;
          vec3 N = p;
          vec3 bumpN = normalize(N - land * 7. * (tx * dx + ty * dy));
          vec3 L = normalize(uSunL), V = normalize(uCamL - vP);
          float d = dot(bumpN, L), day = smoothstep(-.2, .3, dot(N, L));
          vec3 c = col * (.025 + 2.1 * max(d, 0.) * day + .16 * day);
          // ocean glint
          vec3 H = normalize(L + V); float spec = pow(max(dot(N, H), 0.), 160.) * (1. - land) * (1. - ice) * day;
          c += vec3(1., .86, .62) * spec * .55 + vec3(.6, .7, .8) * pow(max(dot(N, H), 0.), 12.) * (1. - land) * day * .06;
          // city lights on the night side
          float city = land * (1. - ice) * (1. - desert * .7) * (1. - day) * smoothstep(.64, .8, fbm(p * 30.));
          c += vec3(1., .66, .3) * city * 2.4;
          // twilight band
          float twi = smoothstep(.25, 0., abs(dot(N, L))) * .35;
          c += vec3(.9, .4, .15) * twi * col.g;
          gl_FragColor = vec4(c, 1.);
        }`,
    });
    const earth = new T.Mesh(new T.SphereGeometry(1.2, 128, 128), earthMat);
    const tilt = new T.Group(); tilt.rotation.z = 0.41; world.add(tilt);
    tilt.add(earth);

    /* ---- clouds: their own layer, a bit faster than the ground ---- */
    const cloudMat = new T.ShaderMaterial({
      uniforms: { uSun: { value: new T.Vector3() }, uT: { value: 0 } },
      vertexShader: 'varying vec3 vN; varying vec3 vP; void main(){ vN = normalize(normalMatrix * normal); vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
      fragmentShader: `uniform vec3 uSun; uniform float uT; varying vec3 vN; varying vec3 vP; ${noise}
        void main(){
          vec3 p = normalize(vP);
          float c = fbm(p * 3.2 + vec3(uT * .02, 0., uT * .01));
          c = smoothstep(.6, .82, c + .08 * fbm(p * 14.));
          float day = smoothstep(-.25, .35, dot(normalize(vN), normalize(uSun)));
          gl_FragColor = vec4(vec3(.95, .97, 1.) * (.05 + 1.0 * day), c * .8);
        }`,
      transparent: true, depthWrite: false,
    });
    const clouds = new T.Mesh(new T.SphereGeometry(1.212, 96, 96), cloudMat);
    tilt.add(clouds);

    /* ---- atmosphere: blue on the day side, warm at the terminator ---- */
    const atmo = new T.Mesh(new T.SphereGeometry(1.2 * 1.17, 64, 64), new T.ShaderMaterial({
      uniforms: { uSun: { value: new T.Vector3() } },
      vertexShader: 'varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
      fragmentShader: `uniform vec3 uSun; varying vec3 vN;
        void main(){
          float i = pow(.7 - dot(vN, vec3(0., 0., 1.)), 3.2);
          float s = dot(vN, normalize(uSun)), d = smoothstep(-.35, .65, s);
          // blue where the sun is, a thin warm band only at sunset/sunrise, dark on the night side
          vec3 col = mix(vec3(.28, .55, 1.), vec3(1., .5, .25), smoothstep(.32, 0., abs(s)) * .55);
          gl_FragColor = vec4(col * i * (.08 + 1.45 * d), 1.);
        }`,
      side: T.BackSide, blending: T.AdditiveBlending, transparent: true, depthWrite: false,
    }));
    world.add(atmo);

    /* ---- a holographic scan: a lat/long grid and a ring that sweeps outward ---- */
    const grid = new T.LineSegments(new T.WireframeGeometry(new T.SphereGeometry(1.245, 24, 16)),
      new T.LineBasicMaterial({ color: 0xffb547, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false }));
    tilt.add(grid);
    const ringMat = new T.MeshBasicMaterial({ color: 0xffc46b, transparent: true, opacity: 0, side: T.DoubleSide, blending: T.AdditiveBlending, depthWrite: false });
    const ring = new T.Mesh(new T.RingGeometry(1, 1.025, 128), ringMat);
    ring.rotation.x = Math.PI / 2 - 0.32; world.add(ring);
    const scan = { k: 1, grid: 0 };          // k: 0 → 1 as the ring travels out
    const pingScan = () => { scan.k = 0; };

    /* ---- the moon ---- */
    const moon = new T.Mesh(new T.SphereGeometry(0.2, 48, 48), new T.ShaderMaterial({
      uniforms: { uSun: { value: new T.Vector3() } },
      vertexShader: 'varying vec3 vN; varying vec3 vP; void main(){ vN = normalize(normalMatrix * normal); vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
      fragmentShader: `uniform vec3 uSun; varying vec3 vN; varying vec3 vP; ${noise}
        void main(){ vec3 p = normalize(vP); float m = fbm(p * 4.); float cr = smoothstep(.55, .62, fbm(p * 11.));
          vec3 col = mix(vec3(.55, .54, .52), vec3(.32, .31, .3), m) - cr * .08;
          float d = max(dot(normalize(vN), normalize(uSun)), 0.);
          gl_FragColor = vec4(col * (.03 + 1.6 * d), 1.); }`,
    }));
    world.add(moon);

    /* ---- rocks: three lumpy shapes, instanced, in slightly different tones ---- */
    const rockGeo = (seed) => {
      const g = new T.IcosahedronGeometry(1, 1), pos = g.attributes.position, seen = new Map();
      let s = seed; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
      for (let i = 0; i < pos.count; i++) {
        const key = `${pos.getX(i).toFixed(3)},${pos.getY(i).toFixed(3)},${pos.getZ(i).toFixed(3)}`;
        if (!seen.has(key)) seen.set(key, 0.72 + rnd() * 0.5);
        const k = seen.get(key);
        pos.setXYZ(i, pos.getX(i) * k, pos.getY(i) * k * 0.85, pos.getZ(i) * k);
      }
      g.computeVertexNormals();
      return g;
    };
    const rockMat = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, metalness: 0.05, flatShading: true });
    const PER = innerWidth < 700 ? 160 : 300;
    const belts = [rockGeo(3), rockGeo(11), rockGeo(29)].map((g) => { const m = new T.InstancedMesh(g, rockMat, PER); m.instanceMatrix.setUsage(T.DynamicDrawUsage); return m; });
    const rocks = [];
    const tone = new T.Color();
    belts.forEach((mesh) => {
      for (let i = 0; i < PER; i++) {
        const r = 2.35 + Math.pow(Math.random(), 0.9) * 1.9;
        rocks.push({ mesh, i, a: Math.random() * Math.PI * 2, r, y: (Math.random() - 0.5) * 0.5 * (r / 3), w: 0.06 / Math.pow(r / 2.5, 1.5),
          s: 0.01 + Math.pow(Math.random(), 3) * 0.045, rx: Math.random() * 6, ry: Math.random() * 6, sp: (Math.random() - 0.5) * 2 });
        const v = 0.36 + Math.random() * 0.26;
        tone.setRGB(v * (1 + Math.random() * 0.12), v * 0.94, v * (0.86 + Math.random() * 0.08));
        mesh.setColorAt(i, tone);
      }
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
    const belt = new T.Group(); belt.rotation.set(0.32, 0, 0.18); world.add(belt);
    belts.forEach((m) => belt.add(m));
    const dummy = new T.Object3D();
    const ringLines = [];
    [2.5, 3.2, 4.1].forEach((r, k) => {
      const pts = []; for (let i = 0; i <= 160; i++) { const a = (i / 160) * Math.PI * 2; pts.push(new T.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r)); }
      const line = new T.Line(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ color: k === 1 ? 0xffb547 : 0x7aa2ff, transparent: true, opacity: 0 }));
      line.userData.max = k === 1 ? 0.2 : 0.1;
      belt.add(line); ringLines.push(line);
    });

    /* ---- the hazardous one: glowing, with a trail, on a path that grazes Earth ---- */
    const hz = new T.Mesh(rockGeo(71), new T.MeshStandardMaterial({ color: 0x3a2418, emissive: 0xff5a1f, emissiveIntensity: 0.9, roughness: 0.8, flatShading: true }));
    hz.scale.setScalar(0.13); world.add(hz);
    const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,190,120,1)'); gr.addColorStop(0.25, 'rgba(255,110,40,.6)'); gr.addColorStop(1, 'rgba(255,90,31,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new T.CanvasTexture(c); })();
    const hzGlow = new T.Sprite(new T.SpriteMaterial({ map: glowTex, blending: T.AdditiveBlending, transparent: true, depthWrite: false }));
    hzGlow.scale.setScalar(0.9); world.add(hzGlow);
    const TRAIL = 110, trailPos = new Float32Array(TRAIL * 3), trailCol = new Float32Array(TRAIL * 3);
    const trailGeo = new T.BufferGeometry();
    trailGeo.setAttribute('position', new T.BufferAttribute(trailPos, 3));
    trailGeo.setAttribute('color', new T.BufferAttribute(trailCol, 3));
    const trail = new T.Line(trailGeo, new T.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.95, blending: T.AdditiveBlending }));
    world.add(trail);
    const hzPath = (t) => {
      const a = 5.2, e = 0.62, b = a * Math.sqrt(1 - e * e), c = a * e;
      const v = new T.Vector3(a * Math.cos(t) - c + 0.35, 0, b * Math.sin(t));
      v.applyAxisAngle(new T.Vector3(1, 0, 0), -0.5).applyAxisAngle(new T.Vector3(0, 1, 0), 2.3);
      return v;
    };
    let hzT = 2.2;
    for (let i = 0; i < TRAIL; i++) { const p = hzPath(hzT - i * 0.012); trailPos.set([p.x, p.y, p.z], i * 3); }

    /* ---- stars that twinkle ---- */
    const SN = 3200, sp = new Float32Array(SN * 3), sc = new Float32Array(SN * 3), ss = new Float32Array(SN), sph = new Float32Array(SN);
    for (let i = 0; i < SN; i++) {
      const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, r = 60 + Math.random() * 90, q = Math.sqrt(1 - u * u);
      sp.set([r * q * Math.cos(th), r * u, r * q * Math.sin(th)], i * 3);
      const w = Math.random(); sc.set(w > 0.85 ? [1, 0.85, 0.65] : w < 0.15 ? [0.72, 0.82, 1] : [1, 1, 1], i * 3);
      ss[i] = 0.6 + Math.pow(Math.random(), 4) * 3.2; sph[i] = Math.random() * 6.28;
    }
    const starGeo = new T.BufferGeometry();
    starGeo.setAttribute('position', new T.BufferAttribute(sp, 3));
    starGeo.setAttribute('color', new T.BufferAttribute(sc, 3));
    starGeo.setAttribute('size', new T.BufferAttribute(ss, 1));
    starGeo.setAttribute('phase', new T.BufferAttribute(sph, 1));
    const starMat = new T.ShaderMaterial({
      uniforms: { uT: { value: 0 }, uPR: { value: DPR } },
      vertexShader: `attribute float size; attribute float phase; attribute vec3 color; uniform float uT; uniform float uPR; varying vec3 vC; varying float vA;
        void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv;
          vA = .5 + .4 * sin(uT * (1.2 + phase * .3) + phase * 7.); vC = color * 1.15; gl_PointSize = size * uPR * (95. / -mv.z); }`,
      fragmentShader: `varying vec3 vC; varying float vA; void main(){ float d = length(gl_PointCoord - .5); float a = smoothstep(.5, 0., d); gl_FragColor = vec4(vC * a * vA, a * vA); }`,
      transparent: true, depthWrite: false, blending: T.AdditiveBlending,
    });
    const stars = new T.Points(starGeo, starMat);
    scene.add(stars);

    /* ---- camera rig: orbit angles + distance, eased toward targets ---- */
    const cam = { dist: 34, az: -0.5, el: 0.55, fov: 58, roll: 0.25, rings: 0 };   // the intro starts far out
    const goal = { dist: 7.4, az: 0.35, el: 0.16 };
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    addEventListener('pointermove', (e) => { mouse.tx = e.clientX / innerWidth - 0.5; mouse.ty = e.clientY / innerHeight - 0.5; }, { passive: true });
    let scrollK = 0, alpha = 1, running = true, last = performance.now(), t = 0, nextScan = 9;
    const label = document.getElementById('hz');
    const v3 = new T.Vector3();

    function size() {
      const W = innerWidth, H = innerHeight;
      renderer.setSize(W, H, false);
      if (composer) { composer.setSize(W, H); bloom.resolution.set(W / 2, H / 2); }
      camera.aspect = W / H;
      // on wide screens the planet sits in the right half, level with the title block (below the top bar)
      if (W > 980) camera.setViewOffset(W, H, -W * 0.2, -28, W, H); else camera.clearViewOffset();
      camera.updateProjectionMatrix();
    }
    size(); addEventListener('resize', size);

    let introDone = false;
    function frame(now) {
      requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!running || document.hidden) return;
      t += calm ? 0 : dt;
      mouse.x += (mouse.tx - mouse.x) * Math.min(1, dt * 3); mouse.y += (mouse.ty - mouse.y) * Math.min(1, dt * 3);

      const az = cam.az + scrollK * 1.1 + mouse.x * 0.18 + t * 0.012;
      const el = cam.el + scrollK * 0.35 - mouse.y * 0.1;
      const dist = cam.dist + scrollK * 6;
      camera.position.set(Math.sin(az) * Math.cos(el) * dist, Math.sin(el) * dist, Math.cos(az) * Math.cos(el) * dist);
      camera.up.set(Math.sin(cam.roll), Math.cos(cam.roll), 0);
      camera.lookAt(0, scrollK * 0.6, 0);
      if (Math.abs(camera.fov - cam.fov) > 0.01) { camera.fov = cam.fov; camera.updateProjectionMatrix(); }
      camera.updateMatrixWorld(); camera.matrixWorldInverse.copy(camera.matrixWorld).invert();

      earth.rotation.y += dt * 0.045;
      clouds.rotation.y += dt * 0.062;
      const sunView = SUN.clone().transformDirection(camera.matrixWorldInverse);
      earth.updateMatrixWorld();
      const inv = earth.matrixWorld.clone().invert();
      earthMat.uniforms.uSunL.value.copy(SUN).transformDirection(inv);
      earthMat.uniforms.uCamL.value.copy(camera.position).applyMatrix4(inv);
      cloudMat.uniforms.uSun.value.copy(sunView); cloudMat.uniforms.uT.value = t;
      atmo.material.uniforms.uSun.value.copy(sunView);
      moon.material.uniforms.uSun.value.copy(sunView);
      starMat.uniforms.uT.value = t;

      // the moon on a tilted orbit
      const ma = t * 0.11 + 1.2;
      moon.position.set(Math.cos(ma) * 2.05, Math.sin(ma * 1.0) * 0.55, Math.sin(ma) * 2.05);
      moon.rotation.y = -ma;

      // the scan ring and the hologram grid
      if (introDone && t > nextScan) { pingScan(); nextScan = t + 8 + Math.random() * 3; }
      if (scan.k < 1) {
        scan.k = Math.min(1, scan.k + dt * 0.55);
        const k = scan.k, R = 1.22 + k * 3.4;
        ring.scale.setScalar(R); ringMat.opacity = Math.sin(Math.PI * Math.min(1, k * 1.1)) * 0.75 * (1 - k);
        grid.material.opacity = Math.max(0, 0.32 * Math.sin(Math.PI * Math.min(1, k * 1.6)));
      } else { ringMat.opacity = 0; grid.material.opacity = 0; }
      ringLines.forEach((l) => { l.material.opacity = l.userData.max * cam.rings; });

      for (const r of rocks) {
        r.a += r.w * dt; r.rx += r.sp * dt; r.ry += r.sp * 0.7 * dt;
        dummy.position.set(Math.cos(r.a) * r.r, r.y, Math.sin(r.a) * r.r);
        dummy.rotation.set(r.rx, r.ry, 0); dummy.scale.setScalar(r.s); dummy.updateMatrix();
        r.mesh.setMatrixAt(r.i, dummy.matrix);
      }
      belts.forEach((m) => { m.instanceMatrix.needsUpdate = true; });

      const p = hzPath(hzT), near = p.length();
      hzT += dt * (0.08 + 0.55 / (near * near));
      hz.position.copy(p); hz.rotation.x += dt * 0.7; hz.rotation.y += dt * 0.4;
      hzGlow.position.copy(p); hzGlow.scale.setScalar(0.75 + Math.sin(t * 3) * 0.08);
      trailPos.copyWithin(3, 0, (TRAIL - 1) * 3); trailPos.set([p.x, p.y, p.z], 0);
      for (let i = 0; i < TRAIL; i++) { const k = 1 - i / TRAIL; trailCol.set([1.2 * k, 0.45 * k * k, 0.15 * k * k], i * 3); }
      trailGeo.attributes.position.needsUpdate = true; trailGeo.attributes.color.needsUpdate = true;

      stars.rotation.y += dt * 0.004;
      if (composer) composer.render(); else renderer.render(scene, camera);

      if (label) {
        v3.copy(p).project(camera);
        const sx = (v3.x * 0.5 + 0.5) * innerWidth, sy = (-v3.y * 0.5 + 0.5) * innerHeight;
        label.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0)`;
        label.classList.toggle('is-on', v3.z < 1 && alpha > 0.4 && introDone);
        label.classList.toggle('is-near', near < 2.2);
      }
    }
    requestAnimationFrame(frame);

    return {
      cam, goal,
      setScroll(k) {
        scrollK = k;
        alpha = Math.max(0, 1 - Math.max(0, k - 0.35) / 0.65);
        cv.style.opacity = alpha.toFixed(3);
        running = alpha > 0.01;
      },
      scan: pingScan,
      done() { introDone = true; nextScan = t + 7; },
    };
  }

  /* =================================================================
     2 · THE INTRO
     ================================================================= */
  const intro = document.getElementById('intro'), introN = document.getElementById('introN');
  const heroBits = [...document.querySelectorAll('.hero h1 span, .hero__eyebrow, .hero__sub, .hero__one, .hero .stats')];
  function finishIntro() { if (intro) intro.classList.add('is-gone'); if (scene3d) scene3d.done(); ready(); }
  if (!hasGsap || calm || !scene3d) {
    if (scene3d) { Object.assign(scene3d.cam, { dist: scene3d.goal.dist, az: scene3d.goal.az, el: scene3d.goal.el, fov: 40, roll: 0, rings: 1 }); }
    finishIntro();
  } else {
    document.documentElement.classList.add('neo-intro');
    gsap.set(heroBits, { opacity: 0, y: 40 });
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    const n = { v: 0 };
    tl.to(n, { v: 90836, duration: 1.3, ease: 'power2.inOut', onUpdate: () => { if (introN) introN.textContent = Math.round(n.v).toLocaleString('en-US'); } })
      .to(intro, { opacity: 0, duration: 0.6, ease: 'power2.in', onComplete: () => intro.classList.add('is-gone') }, '+=0.15')
      // the fly-in: from deep space, past the belt, to Earth
      .to(scene3d.cam, { dist: scene3d.goal.dist, az: scene3d.goal.az, el: scene3d.goal.el, fov: 40, roll: 0, duration: 3, ease: 'expo.inOut' }, '<-0.2')
      .add(() => scene3d.scan(), '-=0.7')
      .to(scene3d.cam, { rings: 1, duration: 1.6, ease: 'power2.out' }, '<')
      .to(heroBits, { opacity: 1, y: 0, duration: 1.1, stagger: 0.08 }, '-=1.3')
      .add(() => { document.documentElement.classList.remove('neo-intro'); finishIntro(); }, '-=0.6');
  }

  // scrolling the hero away orbits the camera out and fades the scene
  if (scene3d) {
    const hero = document.getElementById('top');
    const onScroll = () => {
      const h = hero ? hero.offsetHeight : innerHeight;
      scene3d.setScroll(Math.min(1, Math.max(0, scrollY / (h * 0.95))));
    };
    addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }

  /* =================================================================
     3 · THE MODEL LINE-UP (pinned, scroll-driven)
     ================================================================= */
  addEventListener('DOMContentLoaded', () => {
    const sec = document.getElementById('lineup'), M = window.NEO_M;
    if (!sec || !M) return;
    const deck = sec.querySelector('[data-deck]'), rail = sec.querySelector('[data-rail]'), num = sec.querySelector('[data-jnum]'), final = sec.querySelector('[data-final]');
    const N = M.length;
    const pct = (v) => (v * 100).toFixed(1) + '%';
    const fmt = (n) => n.toLocaleString('en-US');
    const bestF1 = M.reduce((a, b) => (b.s.f1 > a.s.f1 ? b : a));
    const bestRec = M.reduce((a, b) => (b.s.rec > a.s.rec ? b : a));
    const bestPrec = M.reduce((a, b) => (b.s.prec > a.s.prec ? b : a));
    const ABOUT = {
      base: 'Says “safe” every single time. 90.3% accurate and catches nothing: the bar every real model has to beat.',
      lr: 'A straight-line boundary, trained as-is. With 9 safe rocks for every hazardous one, it learns to mostly say “safe”.',
      lrb: 'The same model, but every missed hazard now costs about nine times more during training.',
      rf: 'Hundreds of decision trees vote. Careful and precise, but it lets most hazards slip past.',
      dt: 'A single tree, 10 levels deep, weighted. It flags almost every hazardous asteroid.',
      knn: 'Looks at the 5 most similar asteroids and copies their label. It can’t be weighted, so the rare class gets outvoted.',
      svm: 'Finds the widest gap between the two classes, weighted. Behaves a lot like logistic regression.',
      slr: 'Back to logistic regression, now trained on SMOTE: synthetic hazardous examples until both classes are equal.',
      srf: 'Random Forest on SMOTE data. The synthetic examples finally let the forest see enough hazards.',
      sdt: 'The decision tree on SMOTE data: still catching almost everything.',
      sknn: 'KNN couldn’t be weighted, but SMOTE gives it enough hazardous neighbours to vote with.',
      ssvm: 'The linear SVM on SMOTE data, nearly identical to its weighted version.',
      trf: 'Random Forest tuned with GridSearchCV inside a leak-proof pipeline, so SMOTE only ever touches the training folds.',
    };
    const GRP = { 'Baseline': 'is-base', 'No imbalance fix': 'is-raw', 'Class weighting': 'is-w', 'SMOTE': 'is-s', 'SMOTE + tuning': 'is-t' };

    deck.innerHTML = M.map((m, i) => {
      const [tn, fp, fn, tp] = m.cm;
      const badge = m === bestF1 ? '<span class="jc__win">Best F1</span>' : m === bestRec ? '<span class="jc__win">Best recall</span>' : m === bestPrec ? '<span class="jc__win">Most precise</span>' : '';
      const bar = (k, v) => `<div class="jc__m"><span>${k}</span><b>${pct(v)}</b><i style="--v:${v.toFixed(3)}"></i></div>`;
      return `<article class="jc ${GRP[m.grp] || ''}" data-i="${i}">
        <div class="jc__top"><span class="jc__grp">${m.grp}</span>${badge}<span class="jc__no">Model ${String(i + 1).padStart(2, '0')}</span></div>
        <h3 class="jc__name">${m.name}</h3>
        <p class="jc__about">${ABOUT[m.id] || ''}</p>
        <div class="jc__ms">${bar('Recall', m.s.rec)}${bar('Precision', m.s.prec)}${bar('F1', m.s.f1)}${bar('Accuracy', m.s.acc)}</div>
        <p class="jc__cm"><b>${fmt(tp)}</b> of 1,768 hazards caught &middot; <b>${fmt(fn)}</b> missed &middot; <b>${fmt(fp)}</b> false alarms</p>
      </article>`;
    }).join('');
    let lastG = '';
    rail.innerHTML = M.map((m, i) => {
      const head = m.grp !== lastG ? `<li class="jr__grp">${m.grp}</li>` : ''; lastG = m.grp;
      return `${head}<li class="jr__it" data-i="${i}"><i></i>${m.name}</li>`;
    }).join('');
    // the summary at the end
    const trained = M.filter((m) => m.id !== 'base').length;
    final.innerHTML = `
      <p class="sec__kick mono">The whole line-up</p>
      <h3><b data-fcount>0</b> models</h3>
      <p class="jf__sub">${trained} trained + 1 baseline &middot; 5 algorithms &times; 2 ways to fix the imbalance &middot; plus a tuned Random Forest</p>
      <div class="jf__chips">${M.map((m, i) => `<span class="${GRP[m.grp] || ''}" style="--k:${i}">${m.name}<small>${m.grp}</small></span>`).join('')}</div>
      <div class="jf__best">
        <div><small class="mono">Best recall</small><b>${pct(bestRec.s.rec)}</b><span>${bestRec.name} · ${bestRec.grp}</span></div>
        <div><small class="mono">Best F1</small><b>${pct(bestF1.s.f1)}</b><span>${bestF1.name} · ${bestF1.grp}</span></div>
        <div><small class="mono">Most precise</small><b>${pct(bestPrec.s.prec)}</b><span>${bestPrec.name} · ${bestPrec.grp}</span></div>
      </div>`;

    const cards = [...deck.children], items = [...rail.querySelectorAll('.jr__it')];
    const lerp = (a, b, k) => a + (b - a) * k;
    let shown = -1, finalOn = false;
    function render(p) {
      // p runs 0 … N-1 through the cards, then up to N for the summary
      const f = Math.min(1, Math.max(0, (p - (N - 1)) / 0.8));
      cards.forEach((c, i) => {
        const d = i - p;                                       // > 0: still to come, < 0: already seen
        let x = 0, y = 0, z = 0, ry = 0, rx = 0, o = 1, s = 1;
        if (d > 0) { const k = Math.min(1, d); x = lerp(0, 34, k); y = lerp(0, 46, k); z = lerp(0, -520, k); rx = lerp(0, -28, k); ry = lerp(0, -22, k); o = Math.max(0, 1 - d * 1.1); }
        else { const k = Math.min(3.2, -d); x = -k * 9; y = -k * 5; z = -k * 150; ry = k * 16; o = Math.max(0, 1 - k * 0.32); s = 1 - k * 0.04; }
        o *= 1 - f;
        c.style.transform = `translate3d(${x.toFixed(1)}%, ${y.toFixed(1)}px, ${z.toFixed(0)}px) rotateX(${rx.toFixed(1)}deg) rotateY(${ry.toFixed(1)}deg) scale(${s.toFixed(3)})`;
        c.style.opacity = o.toFixed(3);
        c.style.zIndex = String(100 - Math.round(Math.abs(d) * 10));
        c.classList.toggle('is-front', Math.abs(d) < 0.5);
      });
      const cur = Math.max(0, Math.min(N - 1, Math.round(p)));
      if (cur !== shown) {
        shown = cur;
        num.textContent = String(cur + 1).padStart(2, '0');
        items.forEach((it, i) => { it.classList.toggle('is-done', i < cur); it.classList.toggle('is-on', i === cur); });
      }
      sec.style.setProperty('--fin', f.toFixed(3));
      if (f > 0.5 && !finalOn) { finalOn = true; final.classList.add('is-on'); countUp(); }
      if (f < 0.4 && finalOn) { finalOn = false; final.classList.remove('is-on'); }
    }
    function countUp() {
      const el = final.querySelector('[data-fcount]'); const o = { v: 0 };
      if (hasGsap) gsap.to(o, { v: N, duration: 1.1, ease: 'power2.out', onUpdate: () => { el.textContent = Math.round(o.v); } });
      else el.textContent = N;
    }

    if (!hasGsap || calm) { sec.classList.add('is-static'); final.classList.add('is-on'); final.querySelector('[data-fcount]').textContent = N; return; }
    sec.classList.add('is-live');
    const total = N - 1 + 0.9;
    render(0);
    ScrollTrigger.create({
      trigger: sec, pin: sec.querySelector('[data-pin]'), start: 'top top', end: `+=${(N + 1) * 62}%`, scrub: 0.6,
      snap: { snapTo: (v) => Math.min(1, Math.max(0, Math.round(v * total) / total)), duration: { min: 0.15, max: 0.45 }, delay: 0.05, ease: 'power2.inOut' },
      onUpdate: (st) => render(st.progress * total),
    });
    // images above the line-up load lazily and change the page height; re-measure when they do
    let rt = 0;
    const remeasure = () => { clearTimeout(rt); rt = setTimeout(() => ScrollTrigger.refresh(), 150); };
    document.addEventListener('load', (e) => { if (e.target && e.target.tagName === 'IMG') remeasure(); }, true);
    addEventListener('load', remeasure);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);
  });
})();
