/* All visible architecture is procedural geometry. No photographs or raster textures. */
window.Architecture = (() => {
  'use strict';
  const FH = 3.2, ROOF = 42;
  const floorY = n => 3.5 + (n - 2) * FH;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  const easeOut = k => 1 - Math.pow(1 - k, 3);
  const smooth = (a, b, x) => { const k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
  const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
  const clock = () => (typeof performance === 'object' ? performance : Date).now();
  const seeded = seed => () => (seed = seed * 16807 % 2147483647) / 2147483647;

  // Raw display colours. Fog and sky share the horizon, so the ground melts into the distance.
  const LIGHTS = [
    {top: '#7fa8d4', horizon: '#e1e8e6', sun: '#fff1d6', sunI: 2.5, sky: '#e6f1ff', ground: '#7c735e', hemiI: .72, fill: .32, exposure: 1, sunAt: [45, 75, 38], night: 0},
    {top: '#7488b0', horizon: '#f1d7b6', sun: '#ffc285', sunI: 2.3, sky: '#f2dcc6', ground: '#6c5d48', hemiI: .6, fill: .22, exposure: .98, sunAt: [-62, 30, 44], night: .22},
    {top: '#07111d', horizon: '#243548', sun: '#a9c2e0', sunI: .28, sky: '#3f5878', ground: '#14181d', hemiI: .26, fill: .08, exposure: 1.05, sunAt: [-30, 70, -25], night: 1},
  ];
  // Points of interest on the exterior, with the camera that frames each one.
  const AMENITIES = {
    pool: {at: [-3.7, ROOF + .9, 0], view: {theta: .95, phi: .82, r: 30, x: -2.5, y: ROOF, z: 0}},
    garden: {at: [4.2, ROOF + 3, 0], view: {theta: -.6, phi: 1, r: 27, x: 3.5, y: ROOF + 1.2, z: 0}},
    terraces: {at: [5, floorY(9) + 1.5, 8.7], normal: [0, 0, 1], view: {theta: .42, phi: 1.33, r: 22, x: 4.5, y: floorY(9) + 1, z: 7.5}},
    lobby: {at: [0, 2.6, 10.4], normal: [0, 0, 1], view: {theta: .25, phi: 1.43, r: 24, x: 0, y: 2.8, z: 6}},
  };
  // Concept plans in metres. Inventory metadata selects a plan; no unit-ID inference.
  const PLANS = {
    estudio: {w: 6.2, d: 5.8, beds: 0, bedrooms: [[1.35, -1.5, 1.5]], social: .2, bath: [-2.1, -1.85]},
    suite: {w: 7.6, d: 7, beds: 1, bedrooms: [[1.9, -1.9, 1.6]], social: .3, bath: [-2.65, -2.3]},
    depa2: {w: 10, d: 7.6, beds: 2, bedrooms: [[-1.15, -2.2, 1.6], [2.95, -2.2, 1.2]], social: .35, bath: [-4, -2.6]},
    depa3: {w: 12, d: 8.6, beds: 3, bedrooms: [[-2.45, -2.7, 1.6], [.95, -2.7, 1.2], [4.3, -2.7, 1.2]], social: -.15, bath: [-5, -3.1]},
  };

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
    scene.fog = new T.Fog('#e1e8e6', 70, 520);

    const hemi = new T.HemisphereLight('#e8f3ff', '#73664c', .7);
    const sun = new T.DirectionalLight('#ffe3b2', 2.4);
    sun.castShadow = true;
    sun.shadow.mapSize.set(compact ? 1024 : 2048, compact ? 1024 : 2048);
    sun.shadow.bias = -.0004;
    sun.shadow.normalBias = .08;
    const fill = new T.DirectionalLight('#adc8e7', .3);
    fill.position.set(-35, 25, -20);
    scene.add(hemi, sun, sun.target, fill);

    const materials = {}, geometries = {};
    const mat = (name, color, extra = {}) => {
      if (materials[name]) return materials[name];
      const {noShadow, ...rest} = extra;
      const m = new T.MeshStandardMaterial({color, roughness: .65, ...rest});
      m.name = name;
      m.color.convertSRGBToLinear();
      if (noShadow) m.userData.noShadow = true;
      return materials[name] = m;
    };
    const stone = mat('stone', '#ded4bd'), lightStone = mat('lightStone', '#ece5d6'), wood = mat('wood', '#97704a'), oak = mat('oak', '#bd9567');
    const dark = mat('dark', '#37443c'), metal = mat('metal', '#424b43', {metalness: .65, roughness: .3});
    const glass = mat('glass', '#829d9b', {metalness: .55, roughness: .12, transparent: true, opacity: .58, depthWrite: false, noShadow: true});
    const leaf = mat('leaf', '#506946'), leaf2 = mat('leaf2', '#7c8c59'), water = mat('water', '#5baca9', {metalness: .5, roughness: .13});
    const fabric = mat('fabric', '#e9dfc9', {roughness: 1}), cushion = mat('cushion', '#9b9f82', {roughness: 1}), brass = mat('brass', '#bb985b', {metalness: .6, roughness: .3});
    const glow = mat('glow', '#fff1c7', {emissive: '#ffb563', emissiveIntensity: .8});
    const led = mat('led', '#f4ead2', {emissive: '#ffcf8a', emissiveIntensity: .3});
    const lobbyGlass = mat('lobbyGlass', '#829d9b', {metalness: .55, roughness: .12, transparent: true, opacity: .62, depthWrite: false, emissive: '#ffcf96', emissiveIntensity: 0, noShadow: true});
    const cityLit = mat('cityLit', '#a7b2b0', {metalness: .2, roughness: .4, emissive: '#ff9f45', emissiveIntensity: 0});
    const cityDark = mat('cityDark', '#9da9a8', {metalness: .2, roughness: .4});
    // Four glazing variants look identical by day and light up differently at night.
    const unitLit = [['#ffa44a', .8], ['#f08f3c', .55], ['#8fb4f0', .4], ['#000000', 0]].map(([emissive, peak], i) => {
      const m = mat(`unitGlass${i}`, '#587b79', {roughness: .18, metalness: .5, emissive});
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
    const ghost = mat('ghost', '#f6f3ec', {roughness: .3, transparent: true, opacity: .13, depthWrite: false, noShadow: true});

    const boxGeo = new T.BoxGeometry(1, 1, 1);
    function box(p, w, h, d, x, y, z, m = stone) {
      let geometry = boxGeo;
      const soft = ['fabric', 'cushion', 'linen'].includes(m.name) && h > .12;
      if (soft) {
        const key = `soft${w},${h},${d}`;
        geometry = geometries[key];
        if (!geometry) {
          geometry = new T.BoxGeometry(w, h, d, 5, 5, 5);
          const pos = geometry.attributes.position, r = Math.min(.09, w / 4, h / 3, d / 3), v = new T.Vector3(), inner = new T.Vector3();
          for (let i = 0; i < pos.count; i++) {
            v.fromBufferAttribute(pos, i);
            inner.set(clamp(v.x, -w / 2 + r, w / 2 - r), clamp(v.y, -h / 2 + r, h / 2 - r), clamp(v.z, -d / 2 + r, d / 2 - r));
            v.sub(inner).normalize().multiplyScalar(r).add(inner);
            pos.setXYZ(i, v.x, v.y, v.z);
          }
          geometry.computeVertexNormals();
          geometries[key] = geometry;
        }
      }
      const o = new T.Mesh(geometry, m);
      if (!soft) o.scale.set(w, h, d);
      o.position.set(x, y, z);
      o.castShadow = o.receiveShadow = true;
      p.add(o);
      return o;
    }
    function cyl(p, r, h, x, y, z, m, top = r) {
      const key = `c${r},${h},${top}`;
      const o = new T.Mesh(geometries[key] || (geometries[key] = new T.CylinderGeometry(top, r, h, 20)), m);
      o.position.set(x, y, z);
      o.castShadow = o.receiveShadow = true;
      p.add(o);
      return o;
    }
    function sphere(p, r, x, y, z, m, sx = 1, sy = 1, sz = 1) {
      const key = `s${r}`;
      const o = new T.Mesh(geometries[key] || (geometries[key] = new T.SphereGeometry(r, 10, 8)), m);
      o.position.set(x, y, z);
      o.scale.set(sx, sy, sz);
      o.castShadow = true;
      p.add(o);
      return o;
    }
    function plant(p, x, y, z, s = 1) {
      cyl(p, .28 * s, .5 * s, x, y + .25 * s, z, stone, .36 * s);
      for (let i = 0; i < 7; i++) {
        const a = i * 2.4;
        sphere(p, .27 * s, x + Math.cos(a) * .22 * s, y + (.8 + (i % 3) * .16) * s, z + Math.sin(a) * .22 * s, i % 2 ? leaf : leaf2, .55, 1.8, .8).rotation.z = Math.cos(a) * .6;
      }
    }
    function tree(p, x, z, s = 1) {
      cyl(p, .19 * s, 3 * s, x, 1.5 * s, z, wood, .1 * s);
      for (let i = 0; i < 7; i++) {
        const a = i * 2.4;
        sphere(p, 1.05 * s, x + Math.cos(a) * .65 * s, (3.3 + (i % 3) * .45) * s, z + Math.sin(a) * .65 * s, i % 2 ? leaf : leaf2, 1, 1.1, 1);
      }
    }
    // Static meshes are merged per material, so the whole scene costs a couple of hundred draw calls.
    function merge(root) {
      root.updateMatrixWorld(true);
      const inverse = new T.Matrix4().copy(root.matrixWorld).invert(), relative = new T.Matrix4(), normal = new T.Matrix3(), v = new T.Vector3();
      const buckets = new Map();
      root.traverse(o => {
        if (!o.isMesh || o.userData.unitId || o.userData.keep) return;
        if (!buckets.has(o.material)) buckets.set(o.material, []);
        buckets.get(o.material).push(o);
      });
      for (const [material, list] of buckets) {
        let vertices = 0, indices = 0;
        for (const o of list) {
          vertices += o.geometry.attributes.position.count;
          indices += o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count;
        }
        const position = new Float32Array(vertices * 3), normals = new Float32Array(vertices * 3);
        const index = vertices > 65535 ? new Uint32Array(indices) : new Uint16Array(indices);
        let vo = 0, io = 0;
        for (const o of list) {
          relative.multiplyMatrices(inverse, o.matrixWorld);
          normal.getNormalMatrix(relative);
          const g = o.geometry, p = g.attributes.position, n = g.attributes.normal;
          for (let i = 0; i < p.count; i++) {
            const at = (vo + i) * 3;
            v.fromBufferAttribute(p, i).applyMatrix4(relative);
            position[at] = v.x; position[at + 1] = v.y; position[at + 2] = v.z;
            v.fromBufferAttribute(n, i).applyMatrix3(normal).normalize();
            normals[at] = v.x; normals[at + 1] = v.y; normals[at + 2] = v.z;
          }
          if (g.index) for (let i = 0; i < g.index.count; i++) index[io++] = g.index.getX(i) + vo;
          else for (let i = 0; i < p.count; i++) index[io++] = i + vo;
          vo += p.count;
          o.parent.remove(o);
        }
        const geometry = new T.BufferGeometry();
        geometry.setAttribute('position', new T.BufferAttribute(position, 3));
        geometry.setAttribute('normal', new T.BufferAttribute(normals, 3));
        geometry.setIndex(new T.BufferAttribute(index, 1));
        geometry.computeBoundingSphere();
        const mesh = new T.Mesh(geometry, material);
        mesh.castShadow = !material.userData.noShadow;
        mesh.receiveShadow = true;
        root.add(mesh);
      }
    }
    function shader(uniforms, fragment, extra = {}) {
      return new T.ShaderMaterial({uniforms, transparent: true, depthWrite: false, toneMapped: false,
        vertexShader: 'varying vec2 vUv;varying vec3 vDir;void main(){vUv=uv;vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
        fragmentShader: fragment, ...extra});
    }

    /* ---------- Shared surroundings: sky, mountains, city and site ---------- */
    const sky = new T.Mesh(new T.SphereGeometry(1500, 32, 16), shader(
      {top: {value: new T.Color()}, horizon: {value: new T.Color()}, sunColor: {value: new T.Color()}, sunDir: {value: new T.Vector3(0, 1, 0)}, night: {value: 0}},
      `uniform vec3 top,horizon,sunColor,sunDir;uniform float night;varying vec3 vDir;
       void main(){vec3 d=normalize(vDir);float h=max(d.y,0.);vec3 c=mix(horizon,top,pow(smoothstep(0.,1.,h),.55));
       float s=max(dot(d,normalize(sunDir)),0.);float disc=smoothstep(.9994-night*.0004,.9998,s);
       c+=sunColor*(disc*(1.-night*.4)+pow(s,10.)*.22*(1.-night)+pow(s,60.)*.25)*step(0.,d.y);gl_FragColor=vec4(c,1.);}`,
      {side: T.BackSide, transparent: false}));
    sky.userData.keep = true;
    sky.renderOrder = -2;
    const starGeo = new T.BufferGeometry(), starPos = [], rnd = seeded(7);
    for (let i = 0; i < 700; i++) {
      const a = rnd() * Math.PI * 2, y = .08 + rnd() * .92, r = Math.sqrt(1 - y * y);
      starPos.push(Math.cos(a) * r * 1300, y * 1300, Math.sin(a) * r * 1300);
    }
    starGeo.setAttribute('position', new T.Float32BufferAttribute(starPos, 3));
    const stars = new T.Points(starGeo, new T.PointsMaterial({color: '#ffffff', size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false}));
    stars.renderOrder = -1;
    env.add(sky, stars);

    // The Andes: two hazy ridges and a snow-capped volcano behind the city.
    const peaks = [];
    function ridge(radius, low, high, seed, base, haze) {
      const r = seeded(seed), steps = 180, pos = [], idx = [], phase = [r() * 6, r() * 6, r() * 6];
      for (let i = 0; i <= steps; i++) {
        const a = i / steps * Math.PI * 2;
        const n = .5 + .28 * Math.sin(a * 4 + phase[0]) + .14 * Math.sin(a * 9 + phase[1]) + .08 * Math.sin(a * 23 + phase[2]) + (i % steps ? (r() - .5) * .07 : 0);
        const h = low + (high - low) * Math.pow(clamp(n, 0, 1), 1.5), d = radius + 14 * Math.sin(a * 7 + phase[0]);
        pos.push(Math.cos(a) * d, h, Math.sin(a) * d, Math.cos(a) * (d + 60), -14, Math.sin(a) * (d + 60));
        if (i) idx.push(i * 2 - 2, i * 2 - 1, i * 2, i * 2, i * 2 - 1, i * 2 + 1);
      }
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
      g.setIndex(idx);
      return peak(new T.Mesh(g, null), base, haze);
    }
    function peak(mesh, base, haze) {
      mesh.material = new T.MeshBasicMaterial({side: T.DoubleSide, fog: false, toneMapped: false});
      mesh.userData = {keep: true, base: new T.Color(base), haze};
      peaks.push(mesh);
      env.add(mesh);
      return mesh;
    }
    ridge(640, 55, 140, 11, '#8e9cab', .3);
    const volcano = peak(new T.Mesh(new T.CylinderGeometry(9, 230, 200, 32, 1, true), null), '#7f8d9c', .4);
    volcano.position.set(Math.cos(-2) * 760, 86, Math.sin(-2) * 760);
    const capGeo = new T.CylinderGeometry(11, 76, 56, 32, 1, true), capPos = capGeo.attributes.position, capRnd = seeded(3);
    for (let i = 0; i < capPos.count; i++) if (capPos.getY(i) < 0) {
      const lift = capRnd() * 18, k = (lift / 56);
      capPos.setXYZ(i, capPos.getX(i) * (1 - k * .8), capPos.getY(i) + lift, capPos.getZ(i) * (1 - k * .8));
    }
    peak(new T.Mesh(capGeo, null), '#f4f3ef', .55).position.set(volcano.position.x, 86 + 100 - 28, volcano.position.z);
    ridge(470, 24, 70, 5, '#76858f', .52);

    const ground = new T.Mesh(new T.CircleGeometry(900, 72), mat('ground', '#c4c7b5'));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -.2;
    ground.receiveShadow = true;
    ground.userData.keep = true;
    env.add(ground);

    // A fictional neighbourhood gives scale without pretending to be a real location.
    const city = new T.Group(), cityRnd = seeded(20261027);
    const bodies = [mat('context', '#d6d8cf'), mat('contextWarm', '#dcd4c5'), mat('contextCool', '#cbd2cf')];
    for (let gx = -8; gx <= 8; gx++) for (let gz = -9; gz <= 9; gz++) {
      const x = gx * 24 + (cityRnd() - .5) * 6, z = gz * 22 + (cityRnd() - .5) * 5, d = Math.hypot(x, z);
      if (d > 205 || (Math.abs(x) < 38 && z > -34 && z < 40) || (z > 9 && z < 38) || cityRnd() < .1) continue;
      const w = 9 + cityRnd() * 9, depth = 8 + cityRnd() * 8, cap = d < 60 ? 12 : d < 140 ? 24 : d < 170 ? 30 : 46;
      const levels = Math.max(1, Math.floor((5 + Math.pow(cityRnd(), 1.7) * (cap - 5)) / FH)), top = levels * FH + .6;
      box(city, w, top, depth, x, top / 2 - .2, z, bodies[Math.floor(cityRnd() * 3)]);
      for (let k = 0; k < levels; k++) box(city, w + .16, 1.05, depth + .16, x, k * FH + 1.7, z, cityRnd() < .55 ? cityLit : cityDark);
      box(city, w + .3, .25, depth + .3, x, top - .15, z, lightStone);
    }
    merge(city);
    env.add(city);

    const site = new T.Group(), lawn = mat('lawn', '#a3ad86'), lamps = [];
    box(site, 420, .06, 12, 0, -.14, 23, mat('road', '#6b716b'));
    for (let x = -196; x < 200; x += 7) if (Math.abs(x) > 5) box(site, 3, .02, .13, x, -.09, 23, lightStone);
    for (let i = 0; i < 9; i++) box(site, 4.2, .02, .55, 0, -.09, 18.2 + i * 1.2, lightStone);
    for (const z of [15.6, 30.4]) box(site, 420, .14, 3.4, 0, -.1, z, stone);
    box(site, 32, .35, 29, 0, .02, 1, lightStone);
    for (let x = -15; x < 16; x += 1.1) box(site, .025, .01, 27, x, .203, 1, stone);
    for (let z = -12; z < 15; z += 1.1) box(site, 30, .01, .025, 0, .204, z, stone);
    for (const x of [-23, 23]) box(site, 14, .2, 29, x, -.1, 1, lawn);
    box(site, 60, .2, 12, 0, -.1, -19.5, lawn);
    box(site, 30, .7, .8, 0, .55, -13.1, leaf);
    for (const x of [-12, 12]) for (const z of [-9, 0, 10]) tree(site, x, z, 1.1);
    for (const [x, z, s] of [[-22, -8, 1.2], [23, -4, 1], [-24, 8, 1.1], [21, 9, 1.3], [-18, -19, 1], [8, -21, 1.2], [-6, -20, .9], [26, -18, 1.1]]) tree(site, x, z, s);
    for (let x = -84; x <= 84; x += 12) if (Math.abs(x) > 20) { tree(site, x, 15.6, .95); tree(site, x + 6, 30.4, .95); }
    for (const x of [-10, 10]) { box(site, 3, .5, 1, x, .5, 13, stone); for (let k = 0; k < 6; k++) box(site, 3, .07, .1, x, .8, 12.6 + k * .15, wood); }
    const lamp = (x, y, z) => { cyl(site, .065, 4, x, y + 2, z, metal); sphere(site, .28, x, y + 4, z, glow); lamps.push([x, y + .03, z]); };
    for (const x of [-14, 14]) lamp(x, .2, 14);
    // Street lamps sit between the street trees.
    for (const x of [-72, -36, 0, 36, 72]) lamp(x, -.04, 30.4);
    for (const x of [-78, -42, 42, 78]) lamp(x, -.04, 15.6);
    merge(site);
    env.add(site);

    // Soft ground contact under the tower and warm pools of light under lamps at night.
    const ao = new T.Mesh(new T.PlaneGeometry(44, 44), shader({},
      'varying vec2 vUv;void main(){vec2 p=(vUv-.5)*44.;vec2 q=abs(p-vec2(0.,.8))-vec2(8.2,8.6);float d=length(max(q,0.));gl_FragColor=vec4(.17,.16,.12,(1.-smoothstep(0.,5.,d))*.42);}',
      {polygonOffset: true, polygonOffsetFactor: -2}));
    ao.rotation.x = -Math.PI / 2;
    ao.position.y = .21;
    ao.userData.keep = true;
    const poolPos = [], poolUv = [], poolIdx = [];
    lamps.forEach(([x, y, z], i) => {
      poolPos.push(x - 4, y, z - 4, x + 4, y, z - 4, x + 4, y, z + 4, x - 4, y, z + 4);
      poolUv.push(0, 0, 1, 0, 1, 1, 0, 1);
      poolIdx.push(i * 4, i * 4 + 2, i * 4 + 1, i * 4, i * 4 + 3, i * 4 + 2);
    });
    const poolGeo = new T.BufferGeometry();
    poolGeo.setAttribute('position', new T.Float32BufferAttribute(poolPos, 3));
    poolGeo.setAttribute('uv', new T.Float32BufferAttribute(poolUv, 2));
    poolGeo.setIndex(poolIdx);
    const pools = new T.Mesh(poolGeo, shader({glow: {value: 0}},
      'uniform float glow;varying vec2 vUv;void main(){float d=length(vUv-.5)*2.;float a=pow(clamp(1.-d,0.,1.),2.)*glow*.55;gl_FragColor=vec4(1.,.72,.4,a);}',
      {blending: T.AdditiveBlending, side: T.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3}));
    pools.userData.keep = true;
    env.add(ao, pools);

    /* ---------- The tower, split into levels that can lift apart ---------- */
    const building = new T.Group(), levels = [], floors = [], units = [];
    world.add(building);
    const level = (n, delay) => { const group = new T.Group(); building.add(group); const l = {group, n, lift: 0, target: 0, ghost: false, delay}; levels.push(l); return l; };
    const base = level(1, .2).group;
    box(base, 15, 3.15, 14, 0, 1.8, 0, lobbyGlass);
    for (let x = -7.5; x <= 7.5; x += 1.5) box(base, .11, 3.5, .14, x, 1.8, 7.1, metal);
    box(base, 6, .35, 4, 0, 3.2, 8.5, stone); box(base, 5, .1, 3.9, 0, 2.98, 8.4, wood);
    box(base, .3, 3.1, .3, -2.7, 1.5, 10.2, metal); box(base, .3, 3.1, .3, 2.7, 1.5, 10.2, metal);
    box(base, 5, .05, .05, 0, 3.02, 10.3, led);
    box(base, 14, 3, .3, 0, 1.65, -6.8, wood); box(base, 4, .85, 1, 0, .85, 2, stone);
    for (let x = -6; x < 7; x += .23) box(base, .09, 2.8, .1, x, 1.6, -6.56, oak);
    const unitRnd = seeded(42);
    for (let f = 0; f < 12; f++) {
      const n = f + 2, y = floorY(n), l = level(n, .45 + f * .085), fl = l.group;
      floors.push(l);
      box(fl, 16, .27, 16, 0, y, 0, lightStone);
      box(fl, 2, 3, 14, 0, y + 1.6, 0, stone);
      for (const side of [-1, 1]) for (let col = 0; col < 3; col++) {
        const x = (col - 1) * 5, z = side * 5.7, roll = unitRnd();
        const unit = box(fl, 4.75, 2.85, 3.9, x, y + 1.55, z, unitLit[0]);
        Object.assign(unit.userData, {unitId: `${n}0${side === 1 ? col + 1 : col + 4}`, floor: n, side, variant: roll < .36 ? 0 : roll < .64 ? 1 : roll < .8 ? 2 : 3});
        units.push(unit);
        box(fl, .18, 2.9, 4.1, x - 2.4, y + 1.6, z, stone);
        box(fl, 4.6, .16, 1.6, x, y + .18, side * 8.1, stone);
        box(fl, 4.6, 1, .06, x, y + .78, side * 8.82, glass);
        box(fl, 4.8, .06, .09, x, y + 1.32, side * 8.82, metal);
        for (const a of [-2.25, 0, 2.25]) { box(fl, .065, 2.7, .1, x + a, y + 1.6, side * 7.71, metal); box(fl, .05, 1.1, .06, x + a, y + .77, side * 8.82, metal); }
        if ((f + col) % 3 === 0) { box(fl, 1.5, .45, .55, x + 1.4, y + .4, side * 8.38, stone); for (let i = 0; i < 4; i++) sphere(fl, .25, x + .9 + i * .3, y + .85, side * 8.38, leaf, 1, 1.35, 1); }
        if ((col + f) % 4 === 0) box(fl, 1.7, .14, .7, x - .5, y + .8, side * 6.5, glow);
        if (col === 0) for (let k = 0; k < 4; k++) box(fl, .12, 2.8, .18, x - 1.9 + k * .24, y + 1.6, side * 7.88, wood);
      }
      for (const side of [-1, 1]) { box(fl, .32, 3.1, 14.5, side * 7.65, y + 1.58, 0, stone); for (let k = -4; k <= 4; k += 2) box(fl, .35, 2.2, 1.35, side * 7.84, y + 1.65, k, glass); }
    }
    const roof = level(14, .45 + 12 * .085 + .05).group;
    box(roof, 16, .35, 17, 0, ROOF, 0, lightStone);
    for (const z of [-8.53, 8.53]) box(roof, 16.1, .07, .07, 0, ROOF - .08, z, led);
    for (const x of [-8.03, 8.03]) box(roof, .07, .07, 17.1, x, ROOF - .08, 0, led);
    box(roof, 6, .4, 9, -3.7, ROOF + .2, 0, stone); box(roof, 5.6, .08, 8.6, -3.7, ROOF + .44, 0, water);
    for (let i = 0; i < 10; i++) box(roof, .018, .012, 8, -6 + i * .5, ROOF + .49, 0, mat('ripple', '#a1d2c5', {roughness: .2}));
    for (let i = 0; i < 4; i++) { box(roof, .12, 2.6, .12, 1.4 + i * 1.7, ROOF + 1.3, -5, wood); box(roof, .12, 2.6, .12, 1.4 + i * 1.7, ROOF + 1.3, 4, wood); }
    for (let i = 0; i < 17; i++) box(roof, 5.8, .13, .13, 4, ROOF + 2.7, -5 + i * .56, wood);
    for (const z of [-7.8, 7.8]) { box(roof, 15, 1, .07, 0, ROOF + .6, z, glass); box(roof, 15, .07, .09, 0, ROOF + 1.15, z, metal); }
    for (let i = 0; i < 4; i++) { box(roof, 1.1, .2, 2.5, 3.4, ROOF + .45, -3 + i * 2.4, fabric); plant(roof, 6.5, ROOF + .2, -5 + i * 3, .8); }
    levels.forEach(l => merge(l.group));

    const halo = new T.Mesh(boxGeo, new T.MeshBasicMaterial({color: '#e8a53c', transparent: true, opacity: .14, blending: T.AdditiveBlending, depthWrite: false}));
    halo.scale.set(1.07, 1.1, 1.1);
    halo.userData.keep = true;

    /* ---------- Four furnished plans, each with its own circulation and room views ---------- */
    const homeGlass = mat('homeglass', '#bdd6d2', {transparent: true, opacity: .12, roughness: .1, metalness: .15, depthWrite: false, noShadow: true});
    const linen = mat('linen', '#b5ad93'), rug = mat('rug', '#d1c8b2', {roughness: 1});
    const curtain = mat('curtain', '#e9e3d3', {transparent: true, opacity: .8});
    const tile = mat('tile', '#c3c5ba', {roughness: .4});
    function group(parent, x, z, angle = 0) {
      const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = angle; parent.add(g); return g;
    }
    function bed(parent, x, z, w, index) {
      const g = group(parent, x, z); g.userData.bed = index;
      box(g, w + .12, .25, 2.12, 0, .24, 0, wood);
      box(g, w, .25, 2, 0, .48, 0, fabric);
      box(g, w + .25, 1.12, .13, 0, .68, -1.08, cushion);
      box(g, w + .02, .07, 1.15, 0, .64, .35, linen);
      for (let i = 0; i < 12; i++) box(g, w, .012, .018, 0, .683, -.1 + i * .075, rug);
      const pillows = w > 1.4 ? [-w / 4, w / 4] : [0];
      for (const px of pillows) box(g, .56, .15, .4, px, .68, -.66, fabric).rotation.y = px < 0 ? .06 : -.06;
      for (const bx of [-w / 2 - .35, w / 2 + .35]) {
        box(g, .42, .42, .42, bx, .24, -.7, oak);
        cyl(g, .08, .2, bx, .55, -.7, brass); sphere(g, .13, bx, .74, -.7, glow);
      }
      box(g, w + .7, .025, 1, 0, .06, 1, rug);
      // Built-in wardrobe along the back wall, offset from the headboard.
      box(g, .5, 2.5, 1.05, w / 2 + .6, 1.3, .2, oak);
      box(g, .025, .4, .025, w / 2 + .32, 1.2, .2, brass);
    }
    function kitchen(parent, x, z, length) {
      const g = group(parent, x, z, Math.PI / 2), count = Math.round(length / .55), width = length / count;
      for (let i = 0; i < count; i++) {
        const at = -length / 2 + width * (i + .5);
        box(g, width - .025, .82, .58, at, .46, 0, oak);
        box(g, width * .65, .02, .035, at, .78, .31, brass);
        box(g, width - .025, .65, .32, at, 2.05, -.12, lightStone);
      }
      box(g, length + .08, .07, .68, 0, .91, 0, lightStone);
      box(g, length, .025, .025, 0, 1.7, -.04, glow);
      box(g, .52, .02, .42, -length / 2 + .4, .96, 0, metal);
      for (const xx of [-.12, .12]) for (const zz of [-.11, .11]) cyl(g, .07, .015, -length / 2 + .4 + xx, .98, zz, dark);
      box(g, .5, .018, .38, length / 2 - .4, .96, 0, metal);
      box(g, .38, .02, .27, length / 2 - .4, .975, 0, tile);
      cyl(g, .02, .25, length / 2 - .4, 1.1, -.2, brass);
      box(g, .17, .025, .025, length / 2 - .32, 1.23, -.2, brass);
      for (let i = 0; i < 3; i++) cyl(g, .06, .14 + i * .03, -.2 + i * .15, 1.04, -.15, i % 2 ? oak : stone);
    }
    function living(parent, x, z, wide) {
      const g = group(parent, x, z), w = wide ? 2.6 : 2.05;
      box(g, w + .5, .025, 2.55, 0, .055, .55, rug);
      for (let i = 0; i < 20; i++) box(g, w + .4, .009, .015, 0, .072, -.6 + i * .12, linen);
      box(g, w, .25, .86, 0, .25, 0, wood);
      box(g, w, .58, .18, 0, .6, -.4, fabric);
      for (const xx of [-w / 2, w / 2]) box(g, .16, .5, .95, xx, .5, 0, fabric);
      for (let i = 0; i < 3; i++) {
        const xx = (i - 1) * (w - .2) / 3;
        box(g, (w - .28) / 3, .2, .76, xx, .48, .05, fabric);
        box(g, .42, .38, .15, xx, .75, -.2, i === 1 ? linen : cushion).rotation.x = -.15;
      }
      cyl(g, .55, .08, 0, .42, 1.25, stone); cyl(g, .2, .36, 0, .21, 1.25, wood);
      box(g, .3, .04, .22, -.15, .49, 1.25, oak); box(g, .25, .035, .18, -.12, .53, 1.25, lightStone);
      cyl(g, .08, .16, .23, .55, 1.2, brass);
    }
    function dining(parent, x, z, seats) {
      const g = group(parent, x, z), radius = seats === 6 ? .85 : seats === 4 ? .62 : .44;
      cyl(g, radius, .07, 0, .76, 0, oak); cyl(g, .18, .7, 0, .38, 0, wood);
      for (let i = 0; i < seats; i++) {
        const a = i * Math.PI * 2 / seats, cx = Math.cos(a) * (radius + .32), cz = Math.sin(a) * (radius + .32);
        const c = group(g, cx, cz, -a + Math.PI / 2);
        box(c, .38, .08, .4, 0, .44, 0, fabric); box(c, .4, .4, .07, 0, .67, .2, oak);
        for (const xx of [-.14, .14]) for (const zz of [-.14, .14]) box(c, .035, .4, .035, xx, .22, zz, wood);
      }
      cyl(g, .015, .6, 0, 2.7, 0, metal); sphere(g, .25, 0, 2.3, 0, glow, 1.5, .6, 1.5);
      cyl(g, .1, .22, 0, .9, 0, brass, .06);
    }
    function bathroom(parent, x, z) {
      const g = group(parent, x, z);
      box(g, 1.8, .04, 2.1, 0, .06, 0, tile);
      for (let i = 0; i < 5; i++) box(g, .012, .01, 2.1, -.8 + i * .4, .085, 0, lightStone);
      box(g, .09, 1.1, 2.1, .9, .6, 0, lightStone);
      box(g, .75, .06, .85, -.43, .12, -.58, lightStone);
      box(g, .025, 2, .9, 0, 1.15, -.58, homeGlass);
      cyl(g, .025, 1.8, -.75, 1.1, -.85, brass); box(g, .35, .025, .28, -.6, 2, -.85, metal);
      box(g, .6, .6, .43, .52, .53, .4, oak); box(g, .65, .06, .48, .52, .86, .4, lightStone);
      cyl(g, .2, .06, .52, .92, .4, stone); cyl(g, .015, .22, .52, 1.02, .2, brass);
      box(g, .45, .4, .18, -.5, .44, .78, lightStone); sphere(g, .25, -.5, .32, .5, lightStone, .8, .65, 1.2);
      box(g, .12, .35, .4, .81, 1.1, .4, fabric);
    }
    function makePlan(type, plan) {
      const g = new T.Group(), {w, d, bedrooms, social, bath} = plan;
      g.name = 'interior-' + type; g.userData.typology = type; home.add(g); g.visible = false;
      box(g, w, .25, d, 0, -.13, 0, stone);
      for (let i = 0; i < Math.floor(w / .2); i++) box(g, .19, .028, d - .1, -w / 2 + .1 + i * .2, .018, 0, i % 3 ? oak : mat('floor', '#bda17d'));
      box(g, w, 2.8, .12, 0, 1.4, -d / 2, lightStone);
      box(g, .12, 1.1, d, -w / 2, .55, 0, lightStone);
      box(g, .12, 1.1, d, w / 2, .55, 0, lightStone);
      box(g, w, .1, .07, 0, .1, -d / 2 + .09, oak);
      bathroom(g, ...bath);
      if (plan.beds === 0) {
        // Open sleeping nook: timber screen, without an enclosed bedroom.
        for (let i = 0; i < 12; i++) box(g, .06, 2.3, .07, .05, 1.15, -2.6 + i * .13, oak);
      } else {
        const left = plan.beds === 1 ? .05 : -w / 2 + 1.8;
        const span = (w / 2 - left) / plan.beds, front = -d / 2 + 3.65;
        for (let i = 0; i < plan.beds; i++) {
          const edge = left + i * span;
          box(g, .1, 1.2, 3.65, edge, .6, -d / 2 + 1.825, lightStone);
          // Cutaway partitions retain a real, 85 cm circulation opening.
          box(g, span - .9, 1.1, .1, edge + (span - .9) / 2, .55, front, lightStone);
          box(g, .8, .025, .08, edge + span - .45, .06, front, brass);
        }
      }
      bedrooms.forEach(([x, z, bw], i) => bed(g, x, z, bw, i + 1));
      const kx = -w / 2 + .4, kz = social + 1.25, lx = w / 4, lz = social + .7;
      kitchen(g, kx, kz, plan.beds === 0 ? 1.9 : 2.5);
      living(g, lx, lz, plan.beds >= 2);
      if (plan.beds === 0) {
        box(g, .55, .06, .85, -.5, .9, 1.75, oak); cyl(g, .22, .48, -.05, .25, 1.75, wood);
      } else dining(g, plan.beds === 1 ? -.9 : -1, social + 2.2, plan.beds === 3 ? 6 : 4);
      plant(g, w / 2 - .5, .04, d / 2 - .5, .65);
      // A slim bookcase and a work ledge give each second/third bedroom a use.
      bedrooms.slice(1).forEach(([x, z], i) => {
        box(g, 1, .06, .45, x, .76, z + 1.55, oak);
        box(g, .04, .72, .4, x - .44, .38, z + 1.55, wood);
        box(g, .04, .72, .4, x + .44, .38, z + 1.55, wood);
        for (let j = 0; j < 5; j++) box(g, .08, .22 + j * .015, .18, x - .35 + j * .09, .92, z + 1.55, j % 2 ? cushion : lightStone);
      });
      // Glazed frontage and a furnished balcony, scaled to this plan only.
      const bays = Math.ceil(w / 1.5), bay = w / bays, tz = d / 2 + 1;
      for (let i = 0; i <= bays; i++) {
        const x = -w / 2 + i * bay;
        box(g, .045, 2.7, .06, x, 1.4, d / 2, metal);
        if (i < bays) box(g, bay - .06, 2.6, .025, x + bay / 2, 1.4, d / 2, homeGlass);
      }
      box(g, w, .06, .08, 0, 2.77, d / 2, metal);
      for (const x of [-w / 2 + .08, w / 2 - .5]) for (let k = 0; k < 5; k++) cyl(g, .045, 2.55, x + k * .08, 1.4, d / 2 - .15, curtain);
      box(g, w, .18, 1.9, 0, -.05, tz, stone);
      for (let i = 0; i < Math.floor(w / .2); i++) box(g, .19, .025, 1.8, -w / 2 + .1 + i * .2, .06, tz, oak);
      box(g, w, .95, .035, 0, .6, tz + .9, glass); box(g, w, .035, .045, 0, 1.1, tz + .9, metal);
      for (let i = 0; i <= bays; i++) box(g, .04, 1, .04, -w / 2 + i * bay, .6, tz + .9, metal);
      for (const x of [-w / 2 + .45, w / 2 - .45]) plant(g, x, .08, tz, .75);
      const tx = plan.beds >= 2 ? 1.6 : 0;
      cyl(g, .38, .06, tx, .62, tz, stone); cyl(g, .08, .56, tx, .32, tz, metal);
      for (const x of [tx - .8, tx + .8]) {
        box(g, .55, .1, .6, x, .45, tz, fabric); box(g, .55, .5, .08, x, .7, tz - .3, oak);
        for (const dx of [-.2, .2]) for (const dz of [-.2, .2]) box(g, .035, .4, .035, x + dx, .22, tz + dz, wood);
      }
      merge(g);
      const view = (x, z, r = 4.3, theta = .3) => ({x, y: .7, z, r, theta, phi: 1.04});
      const views = {overview: {x: 0, y: .3, z: .6, r: Math.max(w, d) * 1.9 + 2, theta: .4, phi: .65},
        living: view(lx, lz + .35, 4.8), kitchen: view(kx + .3, kz, 4, 1.1)};
      bedrooms.forEach(([x, z], i) => views[i ? 'bedroom' + (i + 1) : 'bedroom'] = view(x, z, 4.2));
      views.bathroom = view(bath[0], bath[1], 3.4, .5);
      views.terrace = {x: tx, y: 1.1, z: tz, r: 3.5, theta: Math.PI + .25, phi: 1.4};
      const spots = Object.fromEntries(Object.entries(views).filter(([key]) => key !== 'overview').map(([key, v]) => [key, [v.x, 1.4, v.z]]));
      return {group: g, views, spots, ...plan};
    }
    const interiors = Object.fromEntries(Object.entries(PLANS).map(([type, plan]) => [type, makePlan(type, plan)]));
    const inventoryTypes = new Map((options.units || []).map(u => [String(u.id), u.type]));
    let typology = 'suite', activeInterior = interiors.suite;
    activeInterior.group.visible = true;
    // The tower continues below the apartment; its dimensions follow the concept plan.
    const shaft = new T.Group(); home.add(shaft);
    const shaftBody = box(shaft, 1, 1, 1, 0, 0, 0, unitLit[3]);
    const shaftSlabs = Array.from({length: 12}, () => box(shaft, 1, .27, 1, 0, 0, 0, lightStone));
    const homeLights = Array.from({length: 4}, () => { const l = new T.PointLight('#ffb867', 0, 8, 2); home.add(l); return l; });

    // Full-screen fade used when the camera passes between the tower and the apartment.
    const fade = new T.Mesh(new T.PlaneGeometry(2, 2), new T.ShaderMaterial({uniforms: {opacity: {value: 0}, color: {value: new T.Color('#efebe2')}},
      vertexShader: 'void main(){gl_Position=vec4(position.xy,0.,1.);}',
      fragmentShader: 'uniform float opacity;uniform vec3 color;void main(){gl_FragColor=vec4(color,opacity);}',
      transparent: true, depthTest: false, depthWrite: false, toneMapped: false}));
    fade.frustumCulled = false;
    fade.renderOrder = 1000;
    fade.visible = false;
    scene.add(fade);

    /* ---------- State ---------- */
    const ray = new T.Raycaster(), pointer = new T.Vector2(), v = new T.Vector3(), w = new T.Vector3();
    let mode = 'building', shown = 'building', room = 'overview', lastRoom = 'overview', focus = null, lastFloor = 7, selected = null, hovered = null, paintMap = null;
    let aim = 'default', flight = null, seq = null, intro = null, lastInput = -Infinity, orbitSpeed = 0, userMoved = false;
    let raf = 0, last = 0, visible = true, disposed = false, ready = false, width = 1, height = 1;
    const pose = {theta: .62, phi: 1.42, r: 95, x: 0, y: 22, z: 0, fov: 40}, goal = {...pose};
    if (!reduced && options.intro !== false) {
      intro = {t0: null};
      Object.assign(pose, {theta: -.35, phi: 1.5, r: 170, y: 12, fov: 34});
      Object.assign(goal, pose);
      city.scale.y = .001;
      levels.forEach(l => { l.group.visible = false; });
    }

    const PRE = LIGHTS.map(p => ({top: new T.Color(p.top), horizon: new T.Color(p.horizon), sun: new T.Color(p.sun), sky: new T.Color(p.sky), ground: new T.Color(p.ground),
      sunI: p.sunI, hemiI: p.hemiI, fill: p.fill, exposure: p.exposure, night: p.night, sunAt: new T.Vector3(...p.sunAt).normalize()}));
    const light = {...PRE[1], top: PRE[1].top.clone(), horizon: PRE[1].horizon.clone(), sun: PRE[1].sun.clone(), sky: PRE[1].sky.clone(), ground: PRE[1].ground.clone(), sunAt: PRE[1].sunAt.clone()};
    let blend = null;

    function wake() { if (!raf && !disposed && visible && !document.hidden) raf = requestAnimationFrame(draw); }
    function defaultView() {
      // Narrow screens keep room above the roof for the scene's title bar.
      return {theta: .62, phi: 1.42, r: ViewerControls.fitDistance(22, 48, 22, camera.aspect, 40) * (camera.aspect < 1 ? 1.12 : .92), x: 0, y: camera.aspect < 1 ? 23 : 21, z: 0, fov: 40};
    }
    function unitView(u, focused) {
      const {side, floor} = u.userData, y = floorY(floor);
      return focused
        ? {x: u.position.x * .5, y: y + 2.4, z: side * 2, theta: side > 0 ? .55 : Math.PI + .55, phi: 1.02, r: compact ? 56 : 44, fov: 40}
        : {x: u.position.x, y: y + 1.5, z: u.position.z, theta: side > 0 ? .38 : Math.PI + .38, phi: 1.3, r: compact ? 52 : 42, fov: 40};
    }
    function currentView() {
      if (mode === 'interior') {
        const r = activeInterior.views[room] || activeInterior.views.overview;
        return {...r, theta: r.theta, y: r.y + home.position.y, r: room === 'overview' ? r.r * Math.max(1, 1.2 / camera.aspect) : r.r, fov: room === 'overview' ? 40 : 56};
      }
      if (aim.startsWith('amenity:')) return {...AMENITIES[aim.slice(8)].view, fov: 40};
      if (focus !== null) {
        if (selected && selected.userData.floor === focus) return unitView(selected, true);
        const angles = [.55, Math.PI - .55, Math.PI + .55, -.55];
        const theta = angles.reduce((a, b) => Math.abs(wrap(b - pose.theta)) < Math.abs(wrap(a - pose.theta)) ? b : a);
        return {x: 0, y: floorY(focus) + 2.4, z: 0, theta, phi: 1, r: compact ? 62 : 50, fov: 40};
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
      city.scale.y = 1;
      levels.forEach(l => { l.group.visible = true; l.group.position.y = l.lift; });
      wake();
    }
    function orbitAllowed() {
      return !reduced && options.orbit !== false && !seq && !intro && !hovered && (shown === 'building' ? focus === null : room === 'overview');
    }

    function placeHome() {
      const n = selected ? selected.userData.floor : (focus ?? lastFloor);
      const y = floorY(n) + .135, h = y - .5;
      home.position.set(0, y, 0);
      shaftBody.scale.set(activeInterior.w - .2, h, activeInterior.d - .2);
      shaftSlabs.forEach(s => s.scale.set(activeInterior.w + .3, 1, activeInterior.d + .3));
      const lamps = ['living', 'kitchen', 'bedroom', 'terrace'];
      homeLights.forEach((l, i) => { const v = activeInterior.views[lamps[i]]; l.position.set(v.x, 2.2, v.z); });
      shaftBody.position.y = -.3 - h / 2;
      shaftSlabs.forEach((s, k) => { const m = n - 1 - k; s.visible = m >= 2; s.position.y = floorY(m) - y + .1; });
    }
    function positionSun() {
      const inside = shown === 'interior', c = sun.shadow.camera, span = inside ? 16 : 62;
      sun.target.position.copy(inside ? home.position : v.set(0, 18, 0));
      sun.position.copy(sun.target.position).addScaledVector(light.sunAt, inside ? 80 : 150);
      Object.assign(c, {left: -span, right: span, top: span, bottom: -span, near: .5, far: inside ? 200 : 360});
      c.updateProjectionMatrix();
      sun.target.updateMatrixWorld();
    }
    function applyLight() {
      const L = light, n = L.night;
      scene.background.copy(L.horizon);
      scene.fog.color.copy(L.horizon);
      const u = sky.material.uniforms;
      u.top.value.copy(L.top); u.horizon.value.copy(L.horizon); u.sunColor.value.copy(L.sun); u.sunDir.value.copy(L.sunAt); u.night.value = n;
      sun.color.copy(L.sun); sun.intensity = L.sunI;
      hemi.color.copy(L.sky); hemi.groundColor.copy(L.ground); hemi.intensity = L.hemiI;
      fill.intensity = L.fill;
      renderer.toneMappingExposure = L.exposure;
      positionSun();
      for (const p of peaks) p.material.color.copy(p.userData.base).multiplyScalar(1 - .72 * n).lerp(L.horizon, 1 - p.userData.haze).convertSRGBToLinear();
      unitLit.forEach((m, i) => { m.emissiveIntensity = smooth(.1 + i * .16, .55 + i * .16, n) * m.userData.peak; });
      cityLit.emissiveIntensity = smooth(.15, 1, n) * .42;
      lobbyGlass.emissiveIntensity = smooth(.1, 1, n) * .7;
      led.emissiveIntensity = .3 + n * 2.4;
      glow.emissiveIntensity = .6 + n * 2.2;
      stars.material.opacity = smooth(.55, 1, n);
      stars.visible = stars.material.opacity > .01;
      pools.material.uniforms.glow.value = smooth(.3, 1, n);
      homeLights.forEach(l => { l.intensity = smooth(.1, .9, n) * 1.5; });
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
        const d = u.userData, l = floors[d.floor - 2];
        u.material = u === selected ? selectedMat : l.ghost ? ghost : u === hovered ? hoverMat : paintMap ? statusMats[paintMap[d.unitId]] || statusMats.dim : unitLit[d.variant];
        u.castShadow = !l.ghost;
      }
    }
    function pickAt(e) {
      const b = canvas.getBoundingClientRect();
      pointer.set((e.clientX - b.left) / b.width * 2 - 1, -(e.clientY - b.top) / b.height * 2 + 1);
      ray.setFromCamera(pointer, camera);
      const hit = ray.intersectObjects(units.filter(u => !floors[u.userData.floor - 2].ghost && (!paintMap || paintMap[u.userData.unitId] !== 'dim')), false)[0];
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
      if (intro) { city.scale.y = Math.max(.001, easeOut(clamp(elapsed / 1.6, 0, 1))); moving = true; }
      const k = reduced ? 1 : 1 - Math.exp(-dt * 5);
      for (const l of levels) {
        const d = l.target - l.lift;
        if (Math.abs(d) > .005) { l.lift += d * k; moving = true; } else l.lift = l.target;
        let drop = 0;
        if (intro) { const p = clamp((elapsed - l.delay) / .6, 0, 1); l.group.visible = p > 0; drop = (1 - easeOut(p)) * 7; }
        l.group.position.y = l.lift + drop;
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
          if (selected) { selected.getWorldPosition(w); add(`selected:${selected.userData.unitId}`, w.x, w.y + 1.9, w.z, [0, 0, selected.userData.side]); }
        } else for (const u of units) if (u.userData.floor === focus && (!paintMap || paintMap[u.userData.unitId] !== 'dim')) { u.getWorldPosition(w); add(`unit:${u.userData.unitId}`, w.x, w.y + 1.75, w.z); }
      } else for (const [key, p] of Object.entries(activeInterior.spots)) if (key !== room) add(`room:${key}`, p[0], p[1] + home.position.y, p[2]);
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
      sky.position.copy(camera.position);
      stars.position.copy(camera.position);
      renderer.render(scene, camera);
      if (!ready) { ready = true; options.onReady?.(); }
      options.onRender?.(anchors());
      if (active) wake();
    }

    /* ---------- Public actions ---------- */
    function swap() {
      shown = mode;
      const inside = shown === 'interior';
      world.visible = !inside;
      home.visible = inside;
      if (inside) placeHome();
      if (hovered) { hovered = null; repaint(); options.onHover?.(null); }
      canvas.dataset.mode = shown;
      canvas.dataset.room = room;
      camera.near = inside ? .08 : .5;
      camera.updateProjectionMatrix();
      positionSun();
    }
    function frontUnit() {
      return selected || units.find(u => u.userData.unitId === `${focus ?? lastFloor}02`);
    }
    function approachView() {
      if (mode === 'interior') {
        const u = frontUnit(), side = u.userData.side;
        return {x: u.position.x, y: floorY(u.userData.floor) + 1.5, z: u.position.z, theta: side > 0 ? .12 : Math.PI + .12, phi: 1.42, r: 9, fov: 46};
      }
      return {r: pose.r * 1.6, phi: Math.max(.45, pose.phi - .25)};
    }
    function entryView() {
      if (shown === 'interior') return {x: 0, y: home.position.y + 1.4, z: 3, theta: .18, phi: 1.38, r: 24, fov: 46};
      const u = frontUnit(), side = u.userData.side;
      return {x: u.position.x, y: floorY(u.userData.floor) + 1.5, z: u.position.z, theta: side > 0 ? .15 : Math.PI + .15, phi: 1.38, r: 11, fov: 46};
    }
    function setMode(value, view = 'overview') {
      const next = value === 'interior' ? 'interior' : 'building';
      room = activeInterior.views[view] ? view : 'overview';
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
      const nextType = inventoryTypes.get(u?.userData.unitId) || 'suite';
      const nextInterior = interiors[nextType] || interiors.suite;
      const changed = nextInterior !== activeInterior;
      activeInterior.group.visible = false;
      activeInterior = nextInterior;
      typology = activeInterior.group.userData.typology;
      activeInterior.group.visible = true;
      canvas.dataset.typology = typology;
      if (!activeInterior.views[room]) room = 'overview';
      canvas.dataset.room = room;
      if (shown === 'interior') {
        placeHome();
        if (changed) fly(currentView(), 900);
      }
      if (u) u.add(halo);
      if (reduced || !u) { selectedMat.emissiveIntensity = .45; halo.material.opacity = .14; }
      repaint();
      if (u && move && mode === 'building') { aim = 'unit'; fly(currentView(), 1500); }
      wake();
    }
    function focusFloor(n) {
      n = n == null || n === '' ? null : clamp(Math.round(+n), 2, 13);
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
    canvas.dataset.typology = typology;
    canvas.dataset.room = room;
    size();
    if (!intro) travel(defaultView(), 0);
    wake();

    return {
      setMode, select, focusFloor, lighting,
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
        control.cancel();
        const seen = new Set();
        scene.traverse(o => { for (const item of [o.geometry, o.material]) if (item && !seen.has(item)) { seen.add(item); item.dispose(); } });
        boxGeo.dispose();
        Object.values(geometries).forEach(g => g.dispose());
        Object.values(materials).forEach(m => m.dispose());
        renderer.dispose();
      },
      state() { return {mode: shown, room, typology, rooms: Object.keys(activeInterior.views), bedrooms: activeInterior.beds, focus, selected: selected?.userData.unitId ?? null, aim, home: home.position.y, transitioning: !!(seq || flight || intro)}; },
      stats() { return {drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles}; },
    };
  }
  return {create, floorY};
})();
