/* The 3D viewer: renderer, sky and site, lighting presets, cameras, the guided journey (exterior → floor →
   apartment), unit picking and availability colours, post-processing and input. It knows nothing about any
   particular building; it shows whatever implements the BUILDING INTERFACE below.

   BUILDING INTERFACE — what options.building (default TowerBuilding) provides:
     footprint            [width, depth] in metres, for the ground-contact shadow.
     build(kit, ctx)      ctx = {home, inventory, unitMaterial}; returns:
       root               Group whose children are the levels, bottom to top.
       levels             [{group, n, delay}]: n is the floor number, delay staggers the opening animation.
       units              Meshes with userData {unitId, floor, facing (radians, 0 = facing +z)}; the viewer
                          sets their material (glass by day, lit by night, availability colours).
       floorY(n)          Height of floor n's slab; floors {min, max, default} bound the floor stepper.
       amenities          {key: {at: [x,y,z], normal?, view}} hotspots on the exterior.
       frame              {width, height, depth, x, z, y, yCompact, sunTarget, sunSpan, floorRadius} framing.
       frontUnit(floor)?  Unit the camera approaches on a floor with nothing selected.
       interiors?         Furnished plans for "La vida dentro" (select, place, has, rooms, overview, view,
                          entry, spots, lamps, typology, beds); omit it and the viewer stays outside.
       applyLight(night)? Building-specific night glow. */
window.Architecture = (() => {
  'use strict';
  const {clamp, lerp, ease, easeOut, smooth, wrap, clock} = ViewerKit.util;

  // Raw display colours. Fog and sky share the horizon, so the ground melts into the distance.
  const LIGHTS = [
    {top: '#5287c4', horizon: '#d3e0e6', sun: '#fff0d8', sunI: 2.7, sky: '#e0edff', ground: '#6d6a55', hemiI: .6, fill: .25, exposure: .8, sunAt: [-40, 60, 50], night: 0},
    {top: '#5d74a6', horizon: '#f0cda4', sun: '#ffb36b', sunI: 2.5, sky: '#f2dcc6', ground: '#5c4c3a', hemiI: .55, fill: .18, exposure: .86, sunAt: [-62, 26, 44], night: .22},
    {top: '#07111d', horizon: '#243548', sun: '#a9c2e0', sunI: .28, sky: '#3f5878', ground: '#14181d', hemiI: .26, fill: .08, exposure: 1.05, sunAt: [-30, 70, -25], night: 1},
  ];

  function create(T, canvas, onUnit, options = {}) {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const compact = matchMedia('(max-width: 700px)').matches;
    const scene = new T.Scene(), camera = new T.PerspectiveCamera(40, 1, .5, 4000);
    const renderer = new T.WebGLRenderer({canvas, antialias: true, alpha: false, powerPreference: 'high-performance'});
    renderer.setPixelRatio(Math.min(devicePixelRatio, compact ? 1.5 : 1.75));
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    // world: the tower. home: the furnished apartment. env: everything both share.
    const world = new T.Group(), home = new T.Group(), env = new T.Group();
    scene.add(world, home, env);
    home.visible = false;
    scene.background = new T.Color();
    // Exponential haze: clear near the tower, thickening into aerial perspective toward the Andes.
    scene.fog = new T.FogExp2('#e1e8e6', .0017);

    const hemi = new T.HemisphereLight('#e8f3ff', '#73664c', .7);
    const sun = new T.DirectionalLight('#ffe3b2', 2.4);
    sun.castShadow = true;
    sun.shadow.mapSize.set(compact ? 1024 : 2048, compact ? 1024 : 2048);
    sun.shadow.bias = -.0004;
    sun.shadow.normalBias = .08;
    const fill = new T.DirectionalLight('#adc8e7', .3);
    fill.position.set(-35, 25, -20);
    scene.add(hemi, sun, sun.target, fill);


    const kit = ViewerKit.create(T), {mat, materials} = kit;
    const Building = options.building || TowerBuilding;
    const site = ViewerSite.create(kit, {renderer, scene, env, footprint: Building.footprint, blending: () => !!blend});
    // Four glazing variants look identical by day and light up differently at night.
    const unitLit = [['#ffa44a', .8], ['#f08f3c', .55], ['#8fb4f0', .4], ['#000000', 0]].map(([emissive, peak], i) => {
      const m = mat(`unitGlass${i}`, '#33495a', {roughness: .06, metalness: .55, emissive, envMapIntensity: 1.4, surface: 'unit'});
      m.userData.peak = peak;
      return m;
    });
    const statusMats = {
      available: mat('available', '#8cc49f', {roughness: .35, emissive: '#2f7a4a', emissiveIntensity: .25}),
      reserved: mat('reserved', '#e2b062', {roughness: .35, emissive: '#8a5a12', emissiveIntensity: .2}),
      sold: mat('sold', '#9fa39d', {roughness: .5}),
      dim: mat('dim', '#cfd1ca', {roughness: .7}),
    };
    const hoverMat = mat('hover', '#f6ebcd', {roughness: .3, emissive: '#c79a52', emissiveIntensity: .45});
    const selectedMat = mat('selected', '#dcae58', {roughness: .3, emissive: '#b8781a', emissiveIntensity: .45});
    const ghost = mat('ghost', '#e9e6de', {roughness: .6, transparent: true, opacity: .055, depthWrite: false, noShadow: true, envMapIntensity: .3});

    const building = Building.build(kit, {home, inventory: options.units, unitMaterial: unitLit[0]});
    world.add(building.root);
    const {levels, units, floorY, amenities: AMENITIES, frame, interiors} = building;
    // base: a level's own height in the model (0 for the tower); lift: how far it opens upward.
    for (const l of levels) Object.assign(l, {lift: 0, target: 0, ghost: false, delay: l.delay ?? 0, base: l.group.position.y});
    const levelOf = new Map(levels.map(l => [l.n, l]));
    // A unit faces outward from the building; cameras look back at it from that side.
    const facing = u => u.userData.facing ?? 0;
    const tidy = x => Math.abs(x) < 1e-9 ? 0 : x;
    const outward = u => [tidy(Math.sin(facing(u))), 0, tidy(Math.cos(facing(u)))];
    let blend = null;

    const halo = new T.Mesh(kit.boxGeo, new T.MeshBasicMaterial({color: '#e8a53c', transparent: true, opacity: .14, blending: T.AdditiveBlending, depthWrite: false}));
    halo.scale.set(1.07, 1.1, 1.1);
    halo.userData.keep = true;
    function cutaway(n) {
      for (const l of levels) l.group.visible = n === null || l.n < n;
      halo.visible = n === null;
    }
    const homeLights = Array.from({length: 4}, () => { const l = new T.PointLight('#ffe0b8', 0, 8, 2); home.add(l); return l; });

    // Full-screen fade used when the camera passes between the tower and the apartment.
    const fade = new T.Mesh(new T.PlaneGeometry(2, 2), new T.ShaderMaterial({uniforms: {opacity: {value: 0}, color: {value: new T.Color('#efebe2')}},
      vertexShader: 'void main(){gl_Position=vec4(position.xy,0.,1.);}',
      fragmentShader: 'uniform float opacity;uniform vec3 color;void main(){gl_FragColor=vec4(color,opacity);}',
      transparent: true, depthTest: false, depthWrite: false, toneMapped: false}));
    fade.frustumCulled = false;
    fade.renderOrder = 1000;
    fade.visible = false;
    scene.add(fade);

    /* ---------- Post-processing on capable screens: multisampling and bloom ----------
       The scene renders into a 4× multisampled buffer; bright lamps, windows and the sun bloom
       softly, with a light vignette. Screen-space ambient occlusion was tried and removed: up close
       (the furnished apartment, paving joints) it left noisy halos and dashed edges. Phones, WebGL1
       and slow GPUs keep the direct render, which already has sky lighting, reflections and detail. */
    function makePipeline() {
      const caps = renderer.capabilities;
      if (!caps || !caps.isWebGL2 || !T.WebGLMultisampleRenderTarget || options.quality === 'low' || (compact && options.quality !== 'high')) return null;
      const quadScene = new T.Scene(), quadCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1), quad = new T.Mesh(new T.PlaneGeometry(2, 2));
      quad.frustumCulled = false;
      quadScene.add(quad);
      const VS = 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
      const pass = (uniforms, fs) => new T.ShaderMaterial({uniforms, vertexShader: VS, fragmentShader: fs, depthTest: false, depthWrite: false, toneMapped: false});
      const linear = {minFilter: T.LinearFilter, magFilter: T.LinearFilter, depthBuffer: false};
      const color = new T.WebGLMultisampleRenderTarget(1, 1, {minFilter: T.LinearFilter, magFilter: T.LinearFilter});
      color.samples = 4;
      color.texture.encoding = T.sRGBEncoding;
      const mips = [2, 4, 8, 16, 32].map(() => new T.WebGLRenderTarget(1, 1, linear));
      const brightMat = pass({tColor: {value: color.texture}, threshold: {value: .9}, texel: {value: new T.Vector2()}},
        `uniform sampler2D tColor;uniform float threshold;uniform vec2 texel;varying vec2 vUv;
         void main(){vec3 c=vec3(0.);for(int i=0;i<4;i++){vec2 o=vec2(i==1||i==3?1.:-1.,i>1?1.:-1.)*texel;c+=texture2D(tColor,vUv+o).rgb;}c*=.25;
          float l=max(c.r,max(c.g,c.b));gl_FragColor=vec4(c*smoothstep(threshold,threshold+.18,l),1.);}`);
      const downMat = pass({tSrc: {value: null}, texel: {value: new T.Vector2()}},
        `uniform sampler2D tSrc;uniform vec2 texel;varying vec2 vUv;
         void main(){vec3 c=texture2D(tSrc,vUv).rgb*.5;c+=(texture2D(tSrc,vUv+texel).rgb+texture2D(tSrc,vUv-texel).rgb+texture2D(tSrc,vUv+vec2(texel.x,-texel.y)).rgb+texture2D(tSrc,vUv+vec2(-texel.x,texel.y)).rgb)*.125;gl_FragColor=vec4(c,1.);}`);
      const upMat = pass({tSrc: {value: null}, texel: {value: new T.Vector2()}, weight: {value: 1}},
        `uniform sampler2D tSrc;uniform vec2 texel;uniform float weight;varying vec2 vUv;
         void main(){vec3 c=texture2D(tSrc,vUv).rgb*.25;c+=(texture2D(tSrc,vUv+vec2(texel.x,0.)).rgb+texture2D(tSrc,vUv-vec2(texel.x,0.)).rgb+texture2D(tSrc,vUv+vec2(0.,texel.y)).rgb+texture2D(tSrc,vUv-vec2(0.,texel.y)).rgb)*.1875;gl_FragColor=vec4(c*weight,1.);}`);
      upMat.blending = T.AdditiveBlending;
      upMat.transparent = true;
      const finalMat = pass({tColor: {value: color.texture}, tBloom: {value: mips[0].texture}, bloom: {value: .3}},
        `uniform sampler2D tColor,tBloom;uniform float bloom;varying vec2 vUv;
         void main(){vec3 c=texture2D(tColor,vUv).rgb+texture2D(tBloom,vUv).rgb*bloom;c=1.-(1.-c)*(1.-max(c-1.,0.));
          vec2 q=vUv-.5;c*=1.-dot(q,q)*.22;
          c+=(fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5)/255.;gl_FragColor=vec4(c,1.);}`);
      const run = (material, out) => { quad.material = material; renderer.setRenderTarget(out); renderer.render(quadScene, quadCam); };
      let slow = 0, frames = 0;
      return {
        resize(w, h) {
          color.setSize(w, h);
          mips.forEach((m, i) => m.setSize(Math.max(1, Math.round(w / (2 << i))), Math.max(1, Math.round(h / (2 << i)))));
          brightMat.uniforms.texel.value.set(.5 / w, .5 / h);
        },
        // Sustained frames slower than about 30 fps fall back to the direct render.
        measure(ms) {
          if (++frames < 40 || options.quality === 'high') return true;
          slow = ms > 36 ? slow + 1 : Math.max(0, slow - 2);
          return slow < 45;
        },
        render(look) {
          renderer.setRenderTarget(color);
          renderer.render(scene, camera);
          const calls = renderer.info.render.calls, triangles = renderer.info.render.triangles, autoShadow = renderer.shadowMap.autoUpdate;
          renderer.shadowMap.autoUpdate = false;
          run(brightMat, mips[0]);
          for (let i = 1; i < mips.length; i++) { downMat.uniforms.tSrc.value = mips[i - 1].texture; downMat.uniforms.texel.value.set(1 / mips[i - 1].width, 1 / mips[i - 1].height); run(downMat, mips[i]); }
          renderer.autoClear = false;
          for (let i = mips.length - 1; i > 0; i--) { upMat.uniforms.tSrc.value = mips[i].texture; upMat.uniforms.texel.value.set(1 / mips[i].width, 1 / mips[i].height); upMat.uniforms.weight.value = .9; run(upMat, mips[i - 1]); }
          renderer.autoClear = true;
          finalMat.uniforms.bloom.value = look.bloom;
          run(finalMat, null);
          renderer.shadowMap.autoUpdate = autoShadow;
          return {calls, triangles};
        },
        dispose() { [color, ...mips].forEach(t => t.dispose()); [brightMat, downMat, upMat, finalMat].forEach(m => m.dispose()); quad.geometry.dispose(); },
      };
    }
    let pipeline = makePipeline(), sceneStats = null, lastFrame = 0;

    /* ---------- State ---------- */
    const ray = new T.Raycaster(), pointer = new T.Vector2(), v = new T.Vector3(), w = new T.Vector3();
    let mode = 'building', shown = 'building', room = 'overview', lastRoom = 'overview', focus = null, lastFloor = building.floors.default, selected = null, hovered = null, paintMap = null;
    let aim = 'default', flight = null, seq = null, intro = null, lastInput = -Infinity, orbitSpeed = 0, userMoved = false;
    let raf = 0, last = 0, visible = true, disposed = false, ready = false, width = 1, height = 1;
    const pose = {theta: .62, phi: 1.42, r: 95, x: 0, y: 22, z: 0, fov: 40}, goal = {...pose};
    if (!reduced && options.intro !== false) {
      intro = {t0: null};
      Object.assign(pose, {theta: .35, phi: 1.3, r: 105, y: 23, fov: 40});
      Object.assign(goal, pose);
      site.city.scale.y = .001;
      levels.forEach(l => { l.group.visible = false; });
    }

    const PRE = LIGHTS.map(p => ({top: new T.Color(p.top), horizon: new T.Color(p.horizon), sun: new T.Color(p.sun), sky: new T.Color(p.sky), ground: new T.Color(p.ground),
      sunI: p.sunI, hemiI: p.hemiI, fill: p.fill, exposure: p.exposure, night: p.night, sunAt: new T.Vector3(...p.sunAt).normalize()}));
    const light = {...PRE[1], top: PRE[1].top.clone(), horizon: PRE[1].horizon.clone(), sun: PRE[1].sun.clone(), sky: PRE[1].sky.clone(), ground: PRE[1].ground.clone(), sunAt: PRE[1].sunAt.clone()};

    function wake() { if (!raf && !disposed && visible && !document.hidden) raf = requestAnimationFrame(draw); }
    function defaultView() {
      // Narrow screens keep room above the roof for the scene's title bar.
      return {theta: .62, phi: 1.28, r: ViewerControls.fitDistance(frame.width, frame.height, frame.depth, camera.aspect, 40) * (camera.aspect < 1 ? 1.12 : .92), x: frame.x, y: camera.aspect < 1 ? frame.yCompact : frame.y, z: frame.z, fov: 40};
    }
    function unitView(u, focused) {
      const {floor} = u.userData, f = facing(u), y = floorY(floor), [fx, , fz] = outward(u);
      return focused
        ? {x: u.position.x * .5 + fx * 2, y: y + 2.4, z: fz * 2, theta: f + .55, phi: 1.02, r: compact ? 68 : 54, fov: 40}
        : {x: u.position.x, y: y + 1.5, z: u.position.z, theta: f + .38, phi: 1.3, r: compact ? 58 : 46, fov: 40};
    }
    function currentView() {
      if (mode === 'interior') {
        const v = !interiors.has(room) || room === 'overview' ? interiors.overview(camera.aspect) : interiors.view(room, camera.aspect);
        return {...v, y: v.y + home.position.y};
      }
      if (aim.startsWith('amenity:')) return {...AMENITIES[aim.slice(8)].view, fov: 40};
      if (focus !== null) {
        if (selected && selected.userData.floor === focus) return unitView(selected, true);
        const angles = [.55, Math.PI - .55, Math.PI + .55, -.55];
        const theta = angles.reduce((a, b) => Math.abs(wrap(b - pose.theta)) < Math.abs(wrap(a - pose.theta)) ? b : a);
        return {x: frame.x, y: floorY(focus) + 2.4, z: frame.z, theta, phi: 1, r: compact ? frame.floorRadius[1] : frame.floorRadius[0], fov: 40};
      }
      if (aim === 'unit' && selected) return unitView(selected, false);
      return defaultView();
    }
    // Internal camera move. Every view is a set of orbit parameters, so moves follow smooth arcs.
    function travel(view, duration = 1500, arc = 0) {
      const to = {...pose, ...view};
      to.theta = pose.theta + wrap(to.theta - pose.theta);
      Object.assign(goal, to);
      if (reduced || duration <= 0) { flight = null; Object.assign(pose, to); }
      else flight = {from: {...pose}, to, t0: clock(), duration, arc};
      wake();
    }
    // Requested moves wait for a crossing in progress and leave the opening shot alone.
    function fly(view, duration, arc) {
      if (seq && seq.phase === 'out') return;
      if (intro) { if (aim === 'default') return; finishIntro(); }
      userMoved = false;
      travel(view, duration, arc);
    }
    function interact() {
      if (intro) finishIntro();
      if (flight) { flight = null; Object.assign(goal, pose); }
      lastInput = clock();
      userMoved = true;
    }
    function finishIntro() {
      if (!intro) return;
      intro = null;
      site.city.scale.y = 1;
      levels.forEach(l => { l.group.visible = true; l.group.position.y = l.base + l.lift; });
      wake();
    }
    function orbitAllowed() {
      return !reduced && options.orbit !== false && !seq && !intro && !hovered && (shown === 'building' ? focus === null : room === 'overview');
    }

    // The apartment opens on the chosen unit's floor (or the floor in view); everything from that floor up
    // is cut away. Returns true when the building moved the apartment to another position on the floor.
    function placeHome() {
      const n = selected ? selected.userData.floor : (focus ?? lastFloor);
      home.position.set(0, floorY(n) + .135, 0);
      cutaway(n);
      const moved = interiors.place(selected);
      interiors.lamps().forEach((v, i) => homeLights[i].position.set(v.x, 2.2, v.z));
      return moved;
    }
    function positionSun() {
      const inside = shown === 'interior', c = sun.shadow.camera, span = inside ? 22 : frame.sunSpan;
      sun.target.position.copy(inside ? home.position : v.set(...frame.sunTarget));
      sun.position.copy(sun.target.position).addScaledVector(light.sunAt, inside ? 80 : 150);
      Object.assign(c, {left: -span, right: span, top: span, bottom: -span, near: .5, far: inside ? 200 : 360});
      c.updateProjectionMatrix();
      sun.target.updateMatrixWorld();
    }
    function applyLight() {
      const L = light, n = L.night;
      scene.background.copy(L.horizon);
      scene.fog.color.copy(L.horizon).convertSRGBToLinear();
      site.applyLight(L);
      sun.color.copy(L.sun); sun.intensity = L.sunI;
      // With sky lighting from the environment map, the hemisphere light only adds a little bounce.
      hemi.color.copy(L.sky); hemi.groundColor.copy(L.ground); hemi.intensity = L.hemiI * (site.envReady ? .3 : 1);
      fill.intensity = L.fill * (site.envReady ? .5 : 1);
      renderer.toneMappingExposure = L.exposure * (shown === 'interior' ? .84 : 1);
      positionSun();
      unitLit.forEach((m, i) => { m.emissiveIntensity = smooth(.1 + i * .16, .55 + i * .16, n) * m.userData.peak; });
      building.applyLight?.(n);
      kit.palette.led.emissiveIntensity = .3 + n * 2.4;
      kit.palette.glow.emissiveIntensity = .6 + n * 2.2;
      // A little warm bounce keeps shaded cabinetry readable in daylight;
      // evening illumination still comes from the same four bounded lights.
      homeLights.forEach(l => { l.intensity = .14 + smooth(.1, .9, n) * 1.36; });
    }
    function lighting(index) {
      const target = PRE[clamp(index | 0, 0, PRE.length - 1)];
      if (reduced || !ready) { mixLight(target, target, 1); blend = null; applyLight(); }
      else blend = {from: {...light, top: light.top.clone(), horizon: light.horizon.clone(), sun: light.sun.clone(), sky: light.sky.clone(), ground: light.ground.clone(), sunAt: light.sunAt.clone()}, to: target, t0: clock()};
      wake();
    }
    function mixLight(a, b, k) {
      for (const key of ['top', 'horizon', 'sun', 'sky', 'ground']) light[key].copy(a[key]).lerp(b[key], k);
      for (const key of ['sunI', 'hemiI', 'fill', 'exposure', 'night']) light[key] = lerp(a[key], b[key], k);
      light.sunAt.copy(a.sunAt).lerp(b.sunAt, k).normalize();
    }

    function setGhost(l, on) {
      l.ghost = on;
      l.group.traverse(o => {
        if (!o.isMesh || o.userData.unitId || o.userData.keep) return;
        if (!o.userData.solid) o.userData.solid = o.material;
        o.material = on ? ghost : o.userData.solid;
        o.castShadow = !on && !o.material.userData.noShadow;
      });
    }
    function repaint() {
      for (const u of units) {
        const d = u.userData, l = levelOf.get(d.floor);
        u.material = u === selected ? selectedMat : l.ghost ? ghost : u === hovered ? hoverMat : paintMap ? statusMats[paintMap[d.unitId]] || statusMats.dim : unitLit[d.variant];
        u.castShadow = !l.ghost;
      }
    }
    function pickAt(e) {
      const b = canvas.getBoundingClientRect();
      pointer.set((e.clientX - b.left) / b.width * 2 - 1, -(e.clientY - b.top) / b.height * 2 + 1);
      ray.setFromCamera(pointer, camera);
      const hit = ray.intersectObjects(units.filter(u => !levelOf.get(u.userData.floor).ghost && (!paintMap || paintMap[u.userData.unitId] !== 'dim')), false)[0];
      return hit ? hit.object : null;
    }

    /* ---------- Frame loop ---------- */
    function stepSequence(t) {
      if (!seq) return false;
      const out = seq.phase === 'out', k = clamp((t - seq.t0 - (out ? 380 : 0)) / (out ? 480 : 800), 0, 1);
      fade.material.uniforms.opacity.value = out ? ease(k) : 1 - ease(k);
      if (k >= 1) {
        if (out) {
          swap();
          Object.assign(pose, entryView());
          Object.assign(goal, pose);
          flight = null;
          seq = {phase: 'in', t0: t};
          travel(currentView(), 2000);
        } else seq = null;
      }
      fade.visible = fade.material.uniforms.opacity.value > .001;
      return true;
    }
    function stepCamera(t, dt) {
      if (flight) {
        const k = clamp((t - flight.t0) / flight.duration, 0, 1), e = ease(k), lift = Math.sin(Math.PI * k) * flight.arc;
        for (const key in flight.to) pose[key] = lerp(flight.from[key], flight.to[key], e);
        pose.r += lift;
        pose.phi -= lift * .05;
        if (k >= 1) flight = null;
        return true;
      }
      let moving = false;
      if (orbitAllowed() && t - lastInput > 6000) {
        orbitSpeed = lerp(orbitSpeed, shown === 'building' ? .065 : .05, 1 - Math.exp(-dt * 1.2));
        goal.theta += orbitSpeed * dt;
        moving = true;
      } else orbitSpeed = 0;
      const k = reduced ? 1 : 1 - Math.exp(-dt * 9);
      for (const key in goal) {
        const d = goal[key] - pose[key];
        if (Math.abs(d) > 1e-4) { pose[key] += d * k; moving = true; } else pose[key] = goal[key];
      }
      return moving;
    }
    function stepLevels(t, dt) {
      let moving = false;
      const elapsed = intro ? (t - intro.t0) / 1000 : 0;
      if (intro) { site.city.scale.y = Math.max(.001, easeOut(clamp(elapsed / 1.6, 0, 1))); moving = true; }
      const k = reduced ? 1 : 1 - Math.exp(-dt * 5);
      for (const l of levels) {
        const d = l.target - l.lift;
        if (Math.abs(d) > .005) { l.lift += d * k; moving = true; } else l.lift = l.target;
        let drop = 0;
        if (intro) { const p = clamp((elapsed - l.delay) / .6, 0, 1); l.group.visible = p > 0; drop = (1 - easeOut(p)) * 7; }
        l.group.position.y = l.base + l.lift + drop;
      }
      if (intro && elapsed > 2.3) finishIntro();
      return moving;
    }
    function stepLight(t) {
      if (!blend) return false;
      const k = clamp((t - blend.t0) / 1500, 0, 1);
      mixLight(blend.from, blend.to, ease(k));
      applyLight();
      if (k >= 1) blend = null;
      return true;
    }
    function anchors() {
      const list = [];
      if (seq || intro || !options.onRender) return list;
      const add = (key, x, y, z, normal) => {
        v.set(x, y, z);
        if (normal && w.set(...normal).dot(camera.position.clone().sub(v)) <= 0) return list.push({key, show: false});
        v.project(camera);
        const sx = (v.x * .5 + .5) * width, sy = (-v.y * .5 + .5) * height;
        list.push({key, x: sx, y: sy, show: v.z < 1 && sx > -10 && sx < width + 10 && sy > -10 && sy < height + 10});
      };
      if (shown === 'building') {
        if (focus === null) {
          for (const [key, a] of Object.entries(AMENITIES)) add(`amenity:${key}`, ...a.at, a.normal);
          if (selected) { selected.getWorldPosition(w); add(`selected:${selected.userData.unitId}`, w.x, w.y + 1.9, w.z, outward(selected)); }
        } else for (const u of units) if (u.userData.floor === focus && (!paintMap || paintMap[u.userData.unitId] !== 'dim')) { u.getWorldPosition(w); add(`unit:${u.userData.unitId}`, w.x, w.y + 1.75, w.z); }
      } else for (const [key, x, y, z] of interiors.spots(room)) add(`room:${key}`, x, y + home.position.y, z);
      return list;
    }
    function draw() {
      raf = 0;
      if (disposed || !visible || document.hidden) return;
      const t = clock(), dt = clamp((t - (last || t)) / 1000, 0, .05) || .016;
      last = t;
      if (intro && intro.t0 === null) { intro.t0 = t; travel(defaultView(), 3600); }
      let active = stepSequence(t);
      active = stepLevels(t, dt) || active;
      active = stepCamera(t, dt) || active;
      active = stepLight(t) || active;
      if (selected && !reduced && shown === 'building') {
        const pulse = .5 + .5 * Math.sin(t / 420);
        selectedMat.emissiveIntensity = .3 + pulse * .35;
        halo.material.opacity = .06 + pulse * .14;
        active = true;
      }
      const s = Math.sin(pose.phi);
      camera.position.set(pose.x + pose.r * s * Math.sin(pose.theta), pose.y + pose.r * Math.cos(pose.phi), pose.z + pose.r * s * Math.cos(pose.theta));
      camera.lookAt(pose.x, pose.y, pose.z);
      if (Math.abs(camera.fov - pose.fov) > .01) { camera.fov = pose.fov; camera.updateProjectionMatrix(); }
      camera.updateMatrixWorld();
      site.follow(camera);
      site.refreshEnvironment(false);
      if (pipeline) {
        const fading = fade.visible ? fade.material.uniforms.opacity.value : 0, n = light.night;
        sceneStats = pipeline.render({bloom: lerp(.07, .85, n) * (shown === 'interior' ? .5 : 1) * (1 - fading)});
        // Continuous animation measures real frame time; a struggling GPU steps quality down.
        if (lastFrame && t - lastFrame < 200 && !pipeline.measure(t - lastFrame)) { pipeline.dispose(); pipeline = null; renderer.setRenderTarget(null); }
      } else {
        renderer.render(scene, camera);
        sceneStats = null;
      }
      lastFrame = active ? t : 0;
      if (!ready) { ready = true; options.onReady?.(); }
      options.onRender?.(anchors());
      if (active) wake();
    }

    /* ---------- Public actions ---------- */
    function swap() {
      shown = mode;
      const inside = shown === 'interior';
      home.visible = inside;
      if (inside) placeHome(); else cutaway(null);
      if (hovered) { hovered = null; repaint(); options.onHover?.(null); }
      canvas.dataset.mode = shown;
      canvas.dataset.room = room;
      camera.near = inside ? .08 : .5;
      camera.updateProjectionMatrix();
      // The apartment is roofless for the cut-away view, so it would see the whole sky: damp sky
      // light inside to what windows and a ceiling would let through.
      for (const m of Object.values(materials)) m.envMapIntensity = (m.userData.env ??= m.envMapIntensity) * (inside ? .5 : 1);
      renderer.toneMappingExposure = light.exposure * (inside ? .84 : 1);
      positionSun();
    }
    function frontUnit() {
      const floor = focus ?? lastFloor;
      return selected || building.frontUnit?.(floor) || units.find(u => u.userData.floor === floor) || units[0];
    }
    function approachView() {
      if (mode === 'interior') {
        const u = frontUnit();
        return {x: u.position.x, y: floorY(u.userData.floor) + 1.5, z: u.position.z, theta: facing(u) + .12, phi: 1.42, r: 9, fov: 46};
      }
      return {r: pose.r * 1.6, phi: Math.max(.45, pose.phi - .25)};
    }
    function entryView() {
      if (shown === 'interior') { const v = interiors.entry(); return {...v, y: v.y + home.position.y}; }
      const u = frontUnit();
      return {x: u.position.x, y: floorY(u.userData.floor) + 1.5, z: u.position.z, theta: facing(u) + .15, phi: 1.38, r: 11, fov: 46};
    }
    function setMode(value, view = 'overview') {
      // A building without furnished plans (a glTF model, for now) has no interior to enter.
      const next = value === 'interior' && interiors ? 'interior' : 'building';
      room = interiors?.has(view) ? view : 'overview';
      if (seq) {
        mode = next;
        // Before the swap, its destination can still be changed safely. Once fading
        // in, cancel that completed crossing and honour the latest navigation.
        if (seq.phase === 'out') return wake();
        seq = null;
        flight = null;
        fade.visible = false;
        fade.material.uniforms.opacity.value = 0;
      }
      if (next === shown) {
        mode = next;
        canvas.dataset.room = room;
        const between = mode === 'interior' && room !== 'overview' && lastRoom !== 'overview' && room !== lastRoom;
        lastRoom = room;
        return fly(currentView(), between ? 1900 : 1500, between ? 6 : 0);
      }
      mode = next;
      lastRoom = room;
      if (reduced || !ready || intro) { finishIntro(); swap(); travel(currentView(), 0); return; }
      seq = {phase: 'out', t0: clock()};
      travel(approachView(), 900);
    }
    function select(id, move = true) {
      const u = id == null ? null : units.find(m => m.userData.unitId === String(id)) || null;
      if (halo.parent) halo.parent.remove(halo);
      selected = u;
      if (interiors) {
        const changed = interiors.select(u);
        canvas.dataset.typology = interiors.typology;
        if (!interiors.has(room)) room = 'overview';
        canvas.dataset.room = room;
        if (shown === 'interior') {
          const moved = placeHome();
          if (changed || moved) fly(currentView(), 900);
        }
      }
      if (u) u.add(halo);
      if (reduced || !u) { selectedMat.emissiveIntensity = .45; halo.material.opacity = .14; }
      repaint();
      if (u && move && mode === 'building') { aim = 'unit'; fly(currentView(), 1500); }
      wake();
    }
    function focusFloor(n) {
      n = n == null || n === '' ? null : clamp(Math.round(+n), building.floors.min, building.floors.max);
      const changed = n !== focus;
      focus = n;
      if (n !== null) lastFloor = n;
      for (const l of levels) {
        const above = n !== null && l.n > n;
        l.target = above ? 6.5 + (l.n - n) * 1.15 : 0;
        if (above !== l.ghost) setGhost(l, above);
      }
      repaint();
      if (n !== null && mode === 'building' && (changed || aim !== 'floor')) { aim = selected && selected.userData.floor === n ? 'unit' : 'floor'; fly(currentView(), 1500); }
      wake();
    }
    function size() {
      const b = canvas.parentElement.getBoundingClientRect();
      width = b.width || 1; height = b.height || 1;
      renderer.setSize(width, height, false);
      if (renderer.getPixelRatio) {
        const ratio = renderer.getPixelRatio();
        pipeline?.resize(Math.round(width * ratio), Math.round(height * ratio));
        site.viewport(height * ratio);
      }
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      if (!userMoved && !flight && !seq && !intro) travel({...currentView(), theta: pose.theta}, 0);
      wake();
    }
    const limits = () => shown === 'building' ? [14, 140] : [1.5, 40];
    const control = ViewerControls.bind(canvas, {
      rotate: (dx, dy) => { interact(); goal.theta -= dx * .006; goal.phi = clamp(goal.phi + dy * .004, .18, 1.5); wake(); },
      zoom: s => { interact(); goal.r = clamp(goal.r * s, ...limits()); wake(); },
      reset: () => fly(currentView(), 1200),
      tap: e => { if (shown !== 'building' || seq || !onUnit) return; const hit = pickAt(e); if (hit) onUnit(hit.userData.unitId); },
      hover: e => {
        if (!options.onHover || shown !== 'building' || seq || intro) return;
        const hit = pickAt(e);
        if (hit !== hovered) { hovered = hit; repaint(); wake(); }
        options.onHover(hit ? hit.userData.unitId : null, e.clientX, e.clientY);
      },
      leave: () => { if (hovered) { hovered = null; repaint(); wake(); } options.onHover?.(null); },
    });
    const resize = new ResizeObserver(size);
    resize.observe(canvas.parentElement);
    const observer = new IntersectionObserver(e => { visible = e[0].isIntersecting; if (visible) wake(); else if (raf) { cancelAnimationFrame(raf); raf = 0; } });
    observer.observe(canvas);
    const visibility = () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else { last = 0; wake(); } };
    document.addEventListener('visibilitychange', visibility);

    mixLight(PRE[1], PRE[1], 1);
    applyLight();
    repaint();
    canvas.dataset.mode = 'building';
    if (interiors) canvas.dataset.typology = interiors.typology;
    canvas.dataset.room = room;
    size();
    if (!intro) travel(defaultView(), 0);
    wake();

    return {
      setMode, select, focusFloor, lighting, floorY,
      // What this building offers: a glTF building without furnished plans has no "La vida dentro".
      capabilities: {interiors: !!interiors, floors: [building.floors.min, building.floors.max]},
      paint(states) { paintMap = states || null; repaint(); wake(); },
      focus(key) { if (!AMENITIES[key] || mode !== 'building') return; aim = `amenity:${key}`; fly(currentView(), 1800); },
      view() { aim = 'default'; fly(currentView(), 1600); },
      // Pointer activity over the scene pauses the idle orbit without moving the camera.
      hold() { lastInput = clock(); },
      command(action) {
        if (action === 'reset') return fly(currentView(), 1200);
        interact();
        const [min, max] = limits();
        if (action === 'left') goal.theta -= .3;
        if (action === 'right') goal.theta += .3;
        if (action === 'in') goal.r = Math.max(min, goal.r * .82);
        if (action === 'out') goal.r = Math.min(max, goal.r / .82);
        wake();
      },
      dispose() {
        disposed = true;
        cancelAnimationFrame(raf);
        resize.disconnect();
        observer.disconnect();
        document.removeEventListener('visibilitychange', visibility);
        control.detach ? control.detach() : control.cancel();
        const seen = new Set();
        scene.traverse(o => { for (const item of [o.geometry, o.material]) if (item && !seen.has(item)) { seen.add(item); item.dispose(); } });
        kit.dispose();
        building.dispose?.();
        pipeline?.dispose();
        site.dispose();
        renderer.dispose();
      },
      state() { return {mode: shown, room, typology: interiors?.typology ?? null, rooms: interiors ? interiors.rooms() : [], bedrooms: interiors?.beds ?? null, focus, selected: selected?.userData.unitId ?? null, aim, home: home.position.y, transitioning: !!(seq || flight || intro)}; },
      stats() { const s = sceneStats || renderer.info.render; return {drawCalls: s.calls, triangles: s.triangles, post: !!pipeline}; },
    };
  }
  /** Like create(), but options.building may be a manifest URL: the glTF building is loaded first. */
  async function load(T, canvas, onUnit, options = {}) {
    const building = typeof options.building === 'string' ? await GltfBuilding.load(T, options.building) : options.building;
    return create(T, canvas, onUnit, {...options, building});
  }
  // floorY: the demo tower's floor heights (kept for tests). A page with a glTF building needs no tower script.
  return {create, load, floorY: n => TowerBuilding.floorY(n)};
})();
