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
  // Interior cameras are relative to the apartment floor.
  const ROOMS = {
    overview: {theta: .55, phi: .7, r: 23, x: 0, y: 0, z: 1.2},
    living: {theta: Math.PI + .7, phi: 1.42, r: 6.2, x: -2.4, y: 1, z: 3.4},
    kitchen: {theta: .22, phi: 1.39, r: 5.1, x: -4.4, y: 1.2, z: -3.8},
    bedroom: {theta: .34, phi: 1.16, r: 4.4, x: 5, y: .9, z: -3.5},
    terrace: {theta: Math.PI + .4, phi: 1.5, r: 4.4, x: 3.2, y: 1.3, z: 7.2},
  };
  const ROOM_SPOTS = {living: [-3.4, 1.9, 1.6], kitchen: [-4.6, 2.1, -3.4], bedroom: [5, 1.7, -3.2], terrace: [3.5, 1.6, 7]};

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

    /* ---------- One furnished apartment, placed at the chosen floor ---------- */
    const interior = new T.Group();
    home.add(interior);
    box(interior, 15, .3, 11, 0, -.15, 0, stone);
    for (let i = 0; i < 54; i++) box(interior, .265, .035, 10.9, -7.15 + i * .27, .025, 0, i % 3 === 0 ? oak : mat('floor', '#bda17d'));
    box(interior, 15, 3.2, .18, 0, 1.6, -5.5, lightStone); box(interior, .18, 3.2, 11, -7.5, 1.6, 0, lightStone);
    box(interior, 3, 1, .18, 6, .5, -.2, lightStone); box(interior, .18, 3.2, 5, 2.5, 1.6, -3, lightStone);
    box(interior, 15, .12, .1, 0, .12, -5.35, oak); box(interior, .1, .12, 11, -7.35, .12, 0, oak);
    // Kitchen, with cabinet gaps, recessed handles, hob, basin and tap.
    for (let i = 0; i < 7; i++) { box(interior, .74, .9, .7, -6.7 + i * .78, .5, -4.95, oak); box(interior, .52, .025, .03, -6.7 + i * .78, .82, -4.57, metal); box(interior, .74, .75, .4, -6.7 + i * .78, 2.5, -5.18, lightStone); }
    box(interior, 5.5, .09, .85, -4.4, 1, -4.9, lightStone); box(interior, 5.5, .035, .05, -4.4, 2.08, -4.94, glow);
    box(interior, 1, .03, .55, -5.8, 1.06, -4.85, metal); for (const x of [-6.05, -5.55]) for (const z of [-5, -4.7]) cyl(interior, .12, .02, x, 1.08, z, dark);
    box(interior, .7, .015, .45, -3, 1.06, -4.85, metal); box(interior, .56, .02, .32, -3, 1.075, -4.85, mat('basin', '#80938b', {metalness: .6})); cyl(interior, .025, .35, -3, 1.25, -5.1, brass); box(interior, .25, .035, .035, -2.9, 1.43, -5.1, brass);
    box(interior, 2.8, .9, 1.15, -4.7, .5, -2, wood); box(interior, 3, .1, 1.35, -4.7, 1, -2, lightStone);
    for (const x of [-5.5, -4.2]) { cyl(interior, .33, .1, x, .72, -.9, oak); for (const z of [-1.1, -.7]) for (const xx of [-.18, .18]) box(interior, .04, .65, .04, x + xx, .36, z, metal); }
    for (const x of [-5.7, -3.8]) { cyl(interior, .025, 1.1, x, 2.65, -2, metal); cyl(interior, .27, .2, x, 2.04, -2, brass, .1); cyl(interior, .23, .025, x, 1.93, -2, glow); }
    // Living room: layered rug, modular sofa, cushions, coffee table, books and shelving.
    box(interior, 5, .035, 3.7, -2.7, .07, 2.2, mat('rug', '#d1c8b2', {roughness: 1}));
    for (let i = 0; i < 27; i++) box(interior, 4.85, .012, .026, -2.7, .095, .5 + i * .13, mat('rugThread', '#bcb69e'));
    box(interior, 3.5, .32, 1.15, -3.7, .35, 1.1, wood); box(interior, 3.45, .25, 1.05, -3.7, .63, 1.1, fabric); box(interior, 3.6, .85, .25, -3.7, .78, .55, fabric);
    for (const x of [-5.4, -2]) box(interior, .24, .7, 1.3, x, .65, 1.1, fabric);
    for (const x of [-4.7, -3.7, -2.7]) { box(interior, .94, .22, .95, x, .72, 1.2, fabric); box(interior, .68, .55, .18, x, .98, .8, cushion).rotation.x = -.16; }
    cyl(interior, .85, .13, -3.3, .52, 3, stone); cyl(interior, .4, .45, -3.3, .27, 3, wood); box(interior, .4, .055, .3, -3.55, .63, 3.1, oak); box(interior, .3, .04, .24, -3.5, .68, 3.1, lightStone); cyl(interior, .13, .27, -3, .72, 2.9, brass, .08);
    box(interior, .4, 2.1, 3, -7.15, 1.1, 1.7, wood); for (const y of [.35, 1, 1.7, 2.3]) box(interior, .5, .06, 3.3, -7, y, 1.7, oak);
    for (let i = 0; i < 12; i++) box(interior, .3, .4, .1, -7, .59, 1 + i * .12, i % 3 ? stone : cushion);
    plant(interior, -6.3, .05, 4.3, 1.1); plant(interior, -.7, .05, 3.9, .7);
    // Dining and sculptural pendant.
    cyl(interior, .85, .12, .6, .9, -1.4, oak); cyl(interior, .25, .85, .6, .43, -1.4, wood);
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2, x = .6 + Math.cos(a) * 1.15, z = -1.4 + Math.sin(a) * 1.15; cyl(interior, .33, .14, x, .5, z, fabric); cyl(interior, .12, .45, x, .23, z, wood); }
    cyl(interior, .02, .6, .6, 2.9, -1.4, metal); sphere(interior, .38, .6, 2.4, -1.4, glow, 1.5, .6, 1.5);
    // Bedroom: upholstered bed, linen layers, pillows, bedside tables and wardrobe.
    box(interior, 2.7, .3, 2.6, 5, .3, -3.4, wood); box(interior, 2.6, .28, 2.45, 5, .55, -3.4, fabric); box(interior, 2.8, 1.2, .18, 5, .85, -4.72, cushion);
    box(interior, 2.65, .09, 1.4, 5, .74, -2.95, mat('linen', '#b5ad93'));
    for (const x of [4.35, 5.65]) { box(interior, 1, .17, .55, x, .81, -4.1, fabric).rotation.y = x < 5 ? .05 : -.05; const bx = x < 5 ? 3.1 : 6.9; box(interior, .65, .45, .6, bx, .3, -4.1, oak); cyl(interior, .16, .22, bx, .67, -4.1, brass); sphere(interior, .2, bx, .88, -4.1, glow); }
    for (const x of [3.4, 4.4, 5.4, 6.4]) { box(interior, .94, 2.8, .6, x, 1.45, -5.07, oak); box(interior, .03, .42, .03, x + .25, 1.4, -4.74, brass); }
    box(interior, 2.5, .025, 1.5, 5, .08, -1.4, mat('bedrug', '#d2c8af'));
    // Window frames and voile curtains remain visible in every interior view.
    const homeGlass = mat('homeglass', '#bdd6d2', {transparent: true, opacity: .12, roughness: .1, metalness: .15, depthWrite: false, noShadow: true});
    for (let x = -7; x <= 7; x += 1.75) { box(interior, .065, 3.2, .09, x, 1.6, 5.5, metal); box(interior, 1.7, 2.9, .025, x + .85, 1.6, 5.5, homeGlass); }
    const curtain = mat('curtain', '#e9e3d3', {transparent: true, opacity: .8});
    for (const x of [-7.1, 6.9]) for (let k = 0; k < 7; k++) cyl(interior, .065, 2.9, x + k * .08, 1.65, 5.22, curtain);
    box(interior, 15, .09, .12, 0, 3.18, 5.5, metal); box(interior, 15, .06, .12, 0, .15, 5.5, metal);
    box(interior, 15, .2, 2.5, 0, -.04, 6.85, stone); for (let i = 0; i < 50; i++) box(interior, .23, .035, 2.4, -7.3 + i * .3, .08, 6.85, oak);
    box(interior, 15, 1, .045, 0, .7, 8.05, glass); box(interior, 15, .045, .06, 0, 1.23, 8.05, metal);
    for (const x of [-7, -3.5, 0, 3.5, 7]) box(interior, .05, 1.2, .05, x, .65, 8, metal);
    for (const x of [-6.5, 6.5]) plant(interior, x, .1, 7.2, 1);
    cyl(interior, .5, .08, 3.5, .65, 6.8, stone); cyl(interior, .16, .6, 3.5, .32, 6.8, metal);
    for (const x of [2.3, 4.7]) { box(interior, .8, .12, .8, x, .45, 6.8, fabric); box(interior, .8, .65, .12, x, .75, 6.4, wood); for (const z of [6.5, 7.1]) for (const a of [-.3, .3]) box(interior, .04, .4, .04, x + a, .2, z, metal); }
    merge(interior);
    // The tower continues below the apartment, so terrace views look down its facade.
    const shaft = new T.Group();
    home.add(shaft);
    const shaftBody = box(shaft, 14.8, 1, 10.8, 0, 0, 0, unitLit[3]);
    const shaftSlabs = Array.from({length: 12}, () => box(shaft, 15.6, .27, 11.6, 0, 0, 0, lightStone));
    // Warm lamps for evenings inside.
    const homeLights = [[-3, 1.25, 2.9], [.6, 2.1, -1.4], [5, 1.4, -3.6]].map(([x, y, z]) => { const l = new T.PointLight('#ffb867', 0, 8, 2); l.position.set(x, y, z); home.add(l); return l; });

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
        const r = ROOMS[room] || ROOMS.overview;
        return {...r, theta: r.theta, y: r.y + home.position.y, r: room === 'overview' && compact ? 28 : r.r, fov: room === 'overview' ? 40 : 56};
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
      shaftBody.scale.y = h;
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
      const hit = ray.intersectObjects(units.filter(u => !floors[u.userData.floor - 2].ghost), false)[0];
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
        } else for (const u of units) if (u.userData.floor === focus) { u.getWorldPosition(w); add(`unit:${u.userData.unitId}`, w.x, w.y + 1.75, w.z); }
      } else for (const [key, p] of Object.entries(ROOM_SPOTS)) if (key !== room) add(`room:${key}`, p[0], p[1] + home.position.y, p[2]);
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
      room = view;
      if (seq) { mode = next; return wake(); }
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
      state() { return {mode: shown, room, focus, selected: selected?.userData.unitId ?? null, aim, home: home.position.y, transitioning: !!(seq || flight || intro)}; },
      stats() { return {drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles}; },
    };
  }
  return {create, floorY};
})();
