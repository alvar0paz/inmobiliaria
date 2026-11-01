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
    {top: '#5287c4', horizon: '#d3e0e6', sun: '#fff0d8', sunI: 2.7, sky: '#e0edff', ground: '#6d6a55', hemiI: .6, fill: .25, exposure: .8, sunAt: [-40, 60, 50], night: 0},
    {top: '#5d74a6', horizon: '#f0cda4', sun: '#ffb36b', sunI: 2.5, sky: '#f2dcc6', ground: '#5c4c3a', hemiI: .55, fill: .18, exposure: .86, sunAt: [-62, 26, 44], night: .22},
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

    const materials = {}, geometries = {};
    const mat = (name, color, extra = {}) => {
      if (materials[name]) return materials[name];
      const {noShadow, surface, ...rest} = extra;
      const m = new T.MeshStandardMaterial({color, roughness: .65, ...rest});
      m.name = name;
      m.color.convertSRGBToLinear();
      if (noShadow) m.userData.noShadow = true;
      if (surface) detail(m, surface);
      return materials[name] = m;
    };
    /* Procedural surface detail. Each finish is a few lines of GLSL evaluated in the object's own
       space, so merged geometry needs no UVs and nothing is downloaded: plaster mottling and rain
       streaks, asphalt grain, mown grass, wood grain, windowed neighbours and rippled water. */
    const NOISE = `float rHash(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
      float rNoise(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
      return mix(mix(mix(rHash(i),rHash(i+vec3(1,0,0)),f.x),mix(rHash(i+vec3(0,1,0)),rHash(i+vec3(1,1,0)),f.x),f.y),
        mix(mix(rHash(i+vec3(0,0,1)),rHash(i+vec3(1,0,1)),f.x),mix(rHash(i+vec3(0,1,1)),rHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
      float rFbm(vec3 p){return rNoise(p)*.55+rNoise(p*2.03+3.1)*.28+rNoise(p*4.1+7.7)*.17;}`;
    const SURFACES = {
      plaster: `float n=rFbm(P*.9),g=rNoise(P*31.),st=rNoise(vec3(P.x*2.3,P.y*.12,P.z*2.3));
        sTint=vec3(.94+.1*n+.04*g)*(1.-.07*(1.-abs(N.y))*smoothstep(.5,.85,st));sRough=.8+.35*n;`,
      paving: `vec2 id=floor((P.xz+vec2(15.,12.))/1.1);float n=rFbm(P*.6),g=rNoise(P*27.);
        sTint=vec3(.9+.08*n+.05*g+.06*rHash(vec3(id,1.)));sRough=.75+.4*g;`,
      asphalt: `float g=rNoise(P*11.),n=rFbm(P*.25),w=rNoise(vec3(P.x*.05,0.,P.z*1.6));
        sTint=vec3(.74+.34*g)*(.86+.24*n)*(1.-.14*smoothstep(.55,.8,w));sRough=.85+.25*g;`,
      grass: `float n=rFbm(P*.16),m=rNoise(P*1.3),g=rNoise(P*17.);
        sTint=mix(vec3(.78,.9,.66),vec3(1.12,1.06,.84),n)*(.84+.22*m)*(.88+.16*g);sRough=1.;`,
      fields: `vec2 w=vec2(P.x,-P.y);float r=length(w),n=rFbm(P*.011),m=rFbm(P*.05+4.),g=rNoise(P*2.5);
        vec3 land=mix(mix(vec3(.6,.76,.48),vec3(.98,.93,.76),smoothstep(.4,.7,n)),vec3(.5,.64,.42),smoothstep(.5,.72,m)*.7);
        vec2 q=fract((w+vec2(12.,11.))/vec2(24.,22.)),e=min(q,1.-q)*vec2(24.,22.);float edge=min(e.x,e.y);
        float town=1.-smoothstep(200.,240.,r),street=1.-smoothstep(2.5,2.8,edge),walk=(1.-smoothstep(3.7,3.9,edge))-street;
        float park=max(step(-25.,w.y)*step(abs(w.x),110.),1.-step(90.,r)),yard=max(smoothstep(.3,.6,rFbm(P*.09+9.)),park);
        vec3 lot=mix(vec3(.9,.88,.83)*(.92+.1*g),land*.95,yard);
        town*=1.-park*step(r,180.);vec3 c=mix(land,lot,town);c=mix(c,vec3(.93,.91,.87),walk*town);c=mix(c,vec3(.36,.37,.38)*(.9+.2*g),street*town);
        sTint=c*(.9+.14*g);sRough=1.;`,
      wood: `vec3 q=abs(N.y)>.5?vec3(P.x*26.,P.y,P.z*1.1):abs(N.x)>.5?vec3(P.x,P.y*1.1,P.z*26.):vec3(P.x*26.,P.y*1.1,P.z);
        float gr=rNoise(q)*.6+rNoise(q*2.7)*.4,k=rNoise(P*3.);sTint=vec3(.84+.28*gr)*(.94+.1*k);sRough=.85+.3*gr;`,
      plank: `float gr=rNoise(vec3(P.x*34.,P.y*34.,P.z*1.3))*.6+rNoise(vec3(P.x*90.,P.y*9.,P.z*3.))*.4,k=rNoise(P*1.7);
        sTint=vec3(.86+.24*gr)*(.95+.1*k);sRough=.8+.35*gr;`,
      leaf: `float n=rFbm(P*.3),l=rNoise(P*8.5),u=N.y*.5+.5;
        sTint=mix(vec3(.92,1.,.82),vec3(1.14,1.08,.78),n)*(.5+.62*u)*(.78+.34*l);sRough=1.;`,
      unit: `float n=rNoise(vec3(P.x*6.,P.y*1.5,P.z*6.)),ceil=smoothstep(-.5,.45,P.y),cur=smoothstep(.35,.65,rNoise(vec3((P.x+P.z)*7.,0.,3.)));
        sTint=vec3(.9+.2*n);sRough=.5+.9*n;sLit=vec3(mix(.3,1.35,ceil*ceil))*(1.-.5*cur);`,
      city: `float n=rFbm(P*.4),g=rNoise(P*19.),wall=step(abs(N.y),.5),roof=step(.5,N.y);
        float b=rHash(vec3(floor((P.x+12.)/24.),5.,floor((P.z+11.)/22.)));
        vec2 uv=abs(N.x)>.5?vec2(P.z,P.y):vec2(P.x,P.y);vec2 c=vec2(uv.x/mix(2.2,3.1,b),(uv.y+.2)/3.2),f=fract(c),id=floor(c);
        float wx=mix(.14,.32,fract(b*7.)),win=wall*step(wx,f.x)*step(f.x,1.-wx*.6)*step(.3,f.y)*step(f.y,.88)*step(1.,c.y);
        float shop=wall*(1.-step(1.,c.y))*step(.12,f.y)*step(.06,f.x)*step(f.x,.94);
        vec3 body=mix(vec3(1.),vec3(1.05,.97,.88),step(.55,b))*(.92+.09*n+.04*g);
        vec3 glassC=vec3(.26,.31,.35)*(.7+.6*rHash(vec3(id,b*31.)));
        sTint=mix(body,glassC,max(win,shop));sTint=mix(sTint,vec3(.66,.66,.64)*(.85+.25*g)*(.9+.15*n),roof);
        sRough=mix(1.,.12,max(win,shop));
        float on=step(.56,rHash(vec3(id*1.7,b*13.)));
        sLit=win*on*mix(vec3(1.,.8,.58),vec3(1.,.95,.86),rHash(vec3(id,3.)))*(.55+.45*rHash(vec3(id,9.)))+shop*step(.4,b)*vec3(1.,.86,.66);`,
      water: `sTint=vec3(.92+.1*rNoise(P*2.));`,
    };
    const NORMALS = {
      water: `vec2 wp=vSurf.xz*2.6;float h0=rFbm(vec3(wp,0.)),hx=rFbm(vec3(wp+vec2(.06,0.),0.)),hz=rFbm(vec3(wp+vec2(0.,.06),0.));
        normal=normalize(normal+(viewMatrix*vec4(-(hx-h0)*.7,0.,-(hz-h0)*.7,0.)).xyz);`,
    };
    function detail(m, kind) {
      m.userData.surface = kind;
      m.customProgramCacheKey = () => 'surface:' + kind;
      m.onBeforeCompile = s => {
        s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vSurf;varying vec3 vSurfN;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSurf=position;vSurfN=normal;');
        s.fragmentShader = s.fragmentShader
          .replace('#include <common>', `#include <common>\nvarying vec3 vSurf;varying vec3 vSurfN;${NOISE}
            vec3 sTint=vec3(1.),sLit=vec3(1.);float sRough=1.,sMetal=1.;void surfaceDetail(){vec3 P=vSurf,N=normalize(vSurfN);${SURFACES[kind]}}`)
          .replace('#include <color_fragment>', '#include <color_fragment>\nsurfaceDetail();diffuseColor.rgb*=sTint;')
          .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor=clamp(roughnessFactor*sRough,.04,1.);')
          .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor=clamp(metalnessFactor*sMetal,0.,1.);')
          .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n' + (NORMALS[kind] || ''))
          .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance*=sLit;');
      };
      return m;
    }
    const stone = mat('stone', '#d8cdb4', {surface: 'plaster'}), lightStone = mat('lightStone', '#e2dacb', {surface: 'plaster'});
    const wood = mat('wood', '#8f6844', {surface: 'wood'}), oak = mat('oak', '#bd9567', {surface: 'wood', roughness: .55});
    const dark = mat('dark', '#37443c'), metal = mat('metal', '#3d433f', {metalness: .8, roughness: .32});
    // Railings and screens: clear, reflective glass whose sheen comes from the sky.
    const glass = mat('glass', '#b9cfcc', {metalness: .1, roughness: .04, transparent: true, opacity: .32, depthWrite: false, noShadow: true, envMapIntensity: 1.6});
    const leaf = mat('leaf', '#4b6640', {surface: 'leaf'}), leaf2 = mat('leaf2', '#6f8550', {surface: 'leaf'}), leaf3 = mat('leaf3', '#3f5a3a', {surface: 'leaf'});
    const water = mat('water', '#1d6b74', {metalness: .1, roughness: .04, envMapIntensity: 1.3, surface: 'water'});
    const fabric = mat('fabric', '#e9dfc9', {roughness: 1}), cushion = mat('cushion', '#9b9f82', {roughness: 1}), brass = mat('brass', '#bb985b', {metalness: .85, roughness: .28});
    const glow = mat('glow', '#fff1c7', {emissive: '#ffb563', emissiveIntensity: .8});
    const led = mat('led', '#f4ead2', {emissive: '#ffcf8a', emissiveIntensity: .3});
    const lobbyGlass = mat('lobbyGlass', '#9fb9b6', {metalness: .2, roughness: .05, transparent: true, opacity: .5, depthWrite: false, emissive: '#ffcf96', emissiveIntensity: 0, noShadow: true, envMapIntensity: 1.5});
    // Neighbouring blocks draw their own windows; a share of them light up at night.
    const cityLit = mat('cityLit', '#cfd1ca', {roughness: .9, emissive: '#ff9f45', emissiveIntensity: 0, surface: 'city'});
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
    // Canopy clumps: lumpy, flat-bottomed blobs in three shapes with smooth, outward normals.
    const clumps = [0, 1, 2].map(k => {
      const g = new T.IcosahedronGeometry(1, 1), pos = g.attributes.position, nor = g.attributes.normal, d = new T.Vector3(), n = new T.Vector3();
      for (let i = 0; i < pos.count; i++) {
        d.fromBufferAttribute(pos, i).normalize();
        const r = 1 + .16 * Math.sin(d.x * 5 + k * 2) * Math.sin(d.y * 4 + k) * Math.sin(d.z * 6 + k * 3) + .08 * Math.sin(d.x * 13 + d.z * 11 + k * 5), y = d.y * r;
        pos.setXYZ(i, d.x * r, y < -.25 ? -.25 + (y + .25) * .35 : y, d.z * r);
        n.set(d.x, d.y * 1.2 + .15, d.z).normalize();
        nor.setXYZ(i, n.x, n.y, n.z);
      }
      return g;
    });
    const treeRnd = seeded(808);
    function tree(p, x, z, s = 1) {
      const r = treeRnd, h = (2.1 + r() * .7) * s, lean = (r() - .5) * .12;
      const trunk = cyl(p, .2 * s, h, x, h / 2, z, wood, .1 * s); trunk.rotation.z = lean;
      // Two or three limbs fork from the trunk into the crown.
      const limbs = 2 + (r() < .5);
      for (let i = 0; i < limbs; i++) {
        const a = r() * Math.PI * 2, limb = cyl(p, .085 * s, 1.3 * s, x + Math.cos(a) * .3 * s, h + .3 * s, z + Math.sin(a) * .3 * s, wood, .05 * s);
        limb.rotation.set(Math.sin(a) * .7, 0, -Math.cos(a) * .7);
      }
      const tones = [leaf, leaf2, leaf3], tone = tones[Math.floor(r() * 3)], crown = h + .9 * s;
      for (let i = 0; i < 9; i++) {
        const a = i * 2.4 + r(), ring = i === 0 ? 0 : (i < 6 ? 1.05 : .55) + r() * .35, y = crown + (i === 0 ? .7 : i < 6 ? (r() - .45) * .7 : .9 + r() * .5) * s;
        const o = new T.Mesh(clumps[i % 3], i % 3 === 2 ? tones[(tones.indexOf(tone) + 1) % 3] : tone);
        const size = (i === 0 ? 1.3 : .82 + r() * .35) * s;
        o.position.set(x + Math.cos(a) * ring * s, y, z + Math.sin(a) * ring * s);
        o.scale.set(size, size * (.85 + r() * .2), size);
        o.rotation.y = r() * 6.28;
        o.castShadow = o.receiveShadow = true;
        p.add(o);
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
    // Sky with a bright haze band at the horizon, a sun halo and drifting fair-weather clouds.
    // The same shader, seen from inside a small sphere, also lights and reflects in every material.
    const skyUniforms = {top: {value: new T.Color()}, horizon: {value: new T.Color()}, sunColor: {value: new T.Color()}, sunDir: {value: new T.Vector3(0, 1, 0)},
      night: {value: 0}, ground: {value: new T.Color()}};
    const skyShader = below => shader({...skyUniforms, below: {value: below}},
      `uniform vec3 top,horizon,sunColor,sunDir,ground;uniform float night,below;varying vec3 vDir;
       float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
       float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h2(i),h2(i+vec2(1,0)),f.x),mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x),f.y);}
       float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*n2(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return s;}
       void main(){vec3 d=normalize(vDir);float h=max(d.y,0.);
       vec3 c=mix(horizon,top,pow(smoothstep(0.,1.,h),.5));
       c=mix(c,horizon*vec3(1.05,1.04,1.02),exp(-h*14.)*.55*(1.-night*.6));
       vec3 sd=normalize(sunDir);float s=max(dot(d,sd),0.);
       vec2 uv=d.xz/(h+.1)*.8;float cl=fbm(uv+vec2(4.,1.)),sh=fbm(uv+vec2(4.,1.)+sd.xz*.08);
       float cover=smoothstep(.5,.78,cl)*smoothstep(.0,.16,d.y);
       vec3 lit=mix(vec3(1.),sunColor,.4)*(.92+.35*pow(s,6.));vec3 shade=mix(horizon,top,.35)*.92;
       vec3 cc=mix(mix(shade,lit,smoothstep(.35,.75,cl-sh+.55)),top*1.5+vec3(.02,.025,.035),night);
       c=mix(c,cc,cover*(.8-.45*night));
       float disc=smoothstep(.9994-night*.0004,.9998,s);
       c+=sunColor*(disc*(1.-night*.4)*(1.-cover)+pow(s,8.)*.2*(1.-night)+pow(s,64.)*.3)*step(0.,d.y);
       c=mix(c,ground,(1.-smoothstep(-.3,-.02,d.y))*below);
       ${below ? 'gl_FragColor=linearToOutputTexel(vec4(pow(c,vec3(2.2)),1.));' : 'gl_FragColor=vec4(c,1.);'}}`,
      {side: T.BackSide, transparent: false});
    const sky = new T.Mesh(new T.SphereGeometry(1500, 32, 16), skyShader(0));
    // Image-based lighting: the sky is rendered into a prefiltered environment map that gives every
    // material soft sky light and glass, water and metal their reflections. Rebuilt when the light changes.
    const pmrem = typeof renderer.getContext === 'function' && T.PMREMGenerator ? new T.PMREMGenerator(renderer) : null;
    const envScene = new T.Scene();
    envScene.add(new T.Mesh(new T.SphereGeometry(50, 32, 16), skyShader(1)));
    let envTarget = null, envDirty = true, envFrame = 0;
    const envReady = !!pmrem;
    function refreshEnvironment(force) {
      if (!pmrem || !envDirty || (!force && blend && envFrame++ % 5)) return;
      envDirty = false;
      const auto = renderer.shadowMap.autoUpdate;
      renderer.shadowMap.autoUpdate = false;
      const next = pmrem.fromScene(envScene, .015, .1, 100);
      renderer.shadowMap.autoUpdate = auto;
      scene.environment = next.texture;
      if (envTarget) envTarget.dispose();
      envTarget = next;
    }
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
      return peak(new T.Mesh(g, null), base, haze, [0, high], 1);
    }
    // Mountains carry gullies and ridgelines, and sink into the haze at their feet.
    const hazeColor = {value: new T.Color()};
    function peak(mesh, base, haze, span = [0, 140], rock = 1) {
      mesh.material = new T.MeshBasicMaterial({side: T.DoubleSide, fog: false, toneMapped: false});
      mesh.material.customProgramCacheKey = () => 'peak';
      mesh.material.onBeforeCompile = s => {
        Object.assign(s.uniforms, {haze: hazeColor, span: {value: new T.Vector2(...span)}, rock: {value: rock}});
        s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vSurf;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvSurf=position;');
        s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vSurf;uniform vec3 haze;uniform vec2 span;uniform float rock;${NOISE}`)
          .replace('#include <color_fragment>', `#include <color_fragment>
            float hk=smoothstep(span.x,span.y,vSurf.y),g=rFbm(vec3(vSurf.x*.035,vSurf.y*.007,vSurf.z*.035)),r=rNoise(vSurf*.12);
            diffuseColor.rgb*=1.+rock*((g-.5)*.5+(r-.5)*.12);diffuseColor.rgb=mix(haze,diffuseColor.rgb,.25+.75*hk);`);
      };
      mesh.userData = {keep: true, base: new T.Color(base), haze};
      peaks.push(mesh);
      env.add(mesh);
      return mesh;
    }
    ridge(640, 55, 140, 11, '#8e9cab', .3);
    const volcano = peak(new T.Mesh(new T.CylinderGeometry(9, 230, 200, 48, 1, true), null), '#7f8d9c', .4, [-100, 100], 1.2);
    volcano.position.set(Math.cos(-2) * 760, 86, Math.sin(-2) * 760);
    const capGeo = new T.CylinderGeometry(11, 76, 56, 32, 1, true), capPos = capGeo.attributes.position, capRnd = seeded(3);
    for (let i = 0; i < capPos.count; i++) if (capPos.getY(i) < 0) {
      const lift = capRnd() * 18, k = (lift / 56);
      capPos.setXYZ(i, capPos.getX(i) * (1 - k * .8), capPos.getY(i) + lift, capPos.getZ(i) * (1 - k * .8));
    }
    peak(new T.Mesh(capGeo, null), '#f4f3ef', .55, [-40, 28], .7).position.set(volcano.position.x, 86 + 100 - 28, volcano.position.z);
    ridge(470, 24, 70, 5, '#76858f', .52);

    const ground = new T.Mesh(new T.CircleGeometry(900, 72), mat('ground', '#b4b5a8', {roughness: 1, surface: 'fields'}));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -.2;
    ground.receiveShadow = true;
    ground.userData.keep = true;
    env.add(ground);

    // A fictional neighbourhood gives scale without pretending to be a real location.
    const city = new T.Group(), cityRnd = seeded(20261027);
    const bodies = [cityLit, mat('cityLitWarm', '#d9cfbe', {roughness: .9, emissive: '#ff9f45', emissiveIntensity: 0, surface: 'city'}),
      mat('cityLitCool', '#c3c9c6', {roughness: .9, emissive: '#ff9f45', emissiveIntensity: 0, surface: 'city'})];
    const rooftop = mat('rooftop', '#8e8f8a', {roughness: .95, surface: 'plaster'});
    for (let gx = -8; gx <= 8; gx++) for (let gz = -9; gz <= 9; gz++) {
      const x = gx * 24 + (cityRnd() - .5) * 2.4, z = gz * 22 + (cityRnd() - .5) * 2.4, d = Math.hypot(x, z);
      if (d < 90 || (z > -25 && Math.abs(x) < 110) || d > 205 || (Math.abs(x) < 38 && z > -34 && z < 40) || (z > 9 && z < 38) || cityRnd() < .1) continue;
      const w = 9 + cityRnd() * 6.5, depth = 8 + cityRnd() * 6, cap = d < 140 ? 10 : d < 170 ? 15 : 22;
      const levels = Math.max(1, Math.floor((5 + Math.pow(cityRnd(), 1.7) * (cap - 5)) / FH)), top = levels * FH + .6;
      box(city, w, top, depth, x, top / 2 - .2, z, bodies[Math.floor(cityRnd() * 3)]);
      // Parapet, roof membrane and a plant room or water tank break up each skyline.
      box(city, w + .3, .45, depth + .3, x, top + .02, z, lightStone);
      box(city, w - .5, .1, depth - .5, x, top + .2, z, rooftop);
      if (cityRnd() < .7) box(city, 2 + cityRnd() * 3, 1.6, 2 + cityRnd() * 2, x + (cityRnd() - .5) * w * .4, top + 1, z + (cityRnd() - .5) * depth * .4, rooftop);
      else cyl(city, .9, 1.8, x + w * .25, top + 1.1, z - depth * .2, metal);
    }
    merge(city);
    env.add(city);

    const site = new T.Group(), lawn = mat('lawn', '#8f9e6c', {roughness: 1, surface: 'grass'}), lamps = [];
    box(site, 420, .06, 12, 0, -.14, 23, mat('road', '#5d615e', {roughness: .9, surface: 'asphalt'}));
    for (let x = -196; x < 200; x += 7) if (Math.abs(x) > 5) box(site, 3, .02, .13, x, -.09, 23, lightStone);
    for (let i = 0; i < 9; i++) box(site, 4.2, .02, .55, 0, -.09, 18.2 + i * 1.2, lightStone);
    for (const z of [15.6, 30.4]) box(site, 420, .14, 3.4, 0, -.1, z, stone);
    box(site, 32, .35, 29, 0, .02, 1, mat('paving', '#e8e1d2', {roughness: .8, surface: 'paving'}));
    for (let x = -15; x < 16; x += 1.1) box(site, .025, .01, 27, x, .203, 1, stone);
    for (let z = -12; z < 15; z += 1.1) box(site, 30, .01, .025, 0, .204, z, stone);
    for (const x of [-23, 23]) box(site, 14, .2, 29, x, -.1, 1, lawn);
    box(site, 60, .2, 12, 0, -.1, -19.5, lawn);
    box(site, 30, .7, .8, 0, .55, -13.1, leaf);
    for (const x of [-12, 12]) for (const z of [-9, 0, 10]) tree(site, x, z, 1.1);
    for (const [x, z, s] of [[-22, -8, 1.2], [23, -4, 1], [-24, 8, 1.1], [21, 9, 1.3], [-18, -19, 1], [8, -21, 1.2], [-6, -20, .9], [26, -18, 1.1]]) tree(site, x, z, s);
    for (let x = -84; x <= 84; x += 12) if (Math.abs(x) > 20) { tree(site, x, 15.6, .95); tree(site, x + 6, 30.4, .95); }
    // Loose groves in the open park land around the site.
    const parkRnd = seeded(61);
    for (let i = 0; i < 90; i++) {
      const x = (parkRnd() - .5) * 200, z = -22 + parkRnd() * 110;
      if ((z > 10 && z < 36) || (Math.abs(x) < 32 && z < 18) || Math.hypot(x, z) > 105) continue;
      tree(site, x, z, .85 + parkRnd() * .5);
    }
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
    // Soft halos around each lamp head; they read as glare at night and vanish by day.
    const haloGeo = new T.BufferGeometry();
    haloGeo.setAttribute('position', new T.Float32BufferAttribute(lamps.flatMap(([x, y, z]) => [x, y + 3.97, z]), 3));
    const lampHalos = new T.Points(haloGeo, new T.ShaderMaterial({uniforms: {glow: {value: 0}, scale: {value: 600}},
      vertexShader: 'uniform float scale;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=clamp(scale*2.4/-mv.z,2.,90.);gl_Position=projectionMatrix*mv;}',
      fragmentShader: 'uniform float glow;void main(){float d=length(gl_PointCoord-.5)*2.;float a=(exp(-d*d*9.)*.9+exp(-d*3.5)*.25)*(1.-smoothstep(.8,1.,d))*glow;gl_FragColor=vec4(vec3(1.,.78,.5)*a,a);}',
      transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false}));
    lampHalos.userData.keep = true;
    lampHalos.renderOrder = 5;
    env.add(ao, pools, lampHalos);

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
    for (let i = 0; i < 4; i++) { box(roof, .12, 2.6, .12, 1.4 + i * 1.7, ROOF + 1.3, -5, wood); box(roof, .12, 2.6, .12, 1.4 + i * 1.7, ROOF + 1.3, 4, wood); }
    for (let i = 0; i < 17; i++) box(roof, 5.8, .13, .13, 4, ROOF + 2.7, -5 + i * .56, wood);
    for (const z of [-7.8, 7.8]) { box(roof, 15, 1, .07, 0, ROOF + .6, z, glass); box(roof, 15, .07, .09, 0, ROOF + 1.15, z, metal); }
    for (let i = 0; i < 4; i++) { box(roof, 1.1, .2, 2.5, 3.4, ROOF + .45, -3 + i * 2.4, fabric); plant(roof, 6.5, ROOF + .2, -5 + i * 3, .8); }
    levels.forEach(l => merge(l.group));

    const halo = new T.Mesh(boxGeo, new T.MeshBasicMaterial({color: '#e8a53c', transparent: true, opacity: .14, blending: T.AdditiveBlending, depthWrite: false}));
    halo.scale.set(1.07, 1.1, 1.1);
    halo.userData.keep = true;

    /* ---------- Four furnished plans, each with its own circulation and room views ---------- */
    const homeGlass = mat('homeglass', '#bdd6d2', {transparent: true, opacity: .14, roughness: .03, metalness: .1, depthWrite: false, noShadow: true, envMapIntensity: 1.4});
    const linen = mat('linen', '#b5ad93'), rug = mat('rug', '#d1c8b2', {roughness: 1});
    const curtain = mat('curtain', '#e9e3d3', {transparent: true, opacity: .8});
    const tile = mat('tile', '#c3c5ba', {roughness: .3, surface: 'paving'});
    // Interior-only finishes: warm oak, honed limestone and muted clay. All detail
    // stays in geometry and is merged with the plan; no image textures or lights per object.
    const smokedOak = mat('interiorOak', '#81634c', {roughness: .48, surface: 'wood'});
    const limestone = mat('limestone', '#e0d6c5', {roughness: .37, surface: 'plaster'});
    const clay = mat('clay', '#a66e57', {roughness: .86});
    const floorTones = ['#b39a78', '#bca17f', '#c4a987'].map((c, i) => mat('floorOak' + i, c, {roughness: .42, surface: 'plank', envMapIntensity: .8}));
    const interiorLed = mat('interiorLed', '#fff2dc', {emissive: '#ffd3a1', emissiveIntensity: .65});
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
        box(g, .42, .3, .42, bx, .34, -.7, smokedOak);
        box(g, .35, .012, .018, bx, .36, -.48, brass);
        cyl(g, .08, .18, bx, .58, -.7, brass); cyl(g, .17, .22, bx, .75, -.7, fabric, .11);
        cyl(g, .12, .015, bx, .63, -.7, interiorLed);
      }
      // Upholstered channel headboard and a folded throw at the foot of the bed.
      for (let i = 0; i < 7; i++) box(g, (w + .2) / 7 - .018, .94, .045, -(w + .2) / 2 + (i + .5) * (w + .2) / 7, .72, -1, fabric);
      box(g, w + .04, .045, .44, 0, .71, .77, clay);
      box(g, .035, .24, .44, w / 2 + .025, .6, .77, clay);
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
      box(g, length, .68, .035, 0, 1.29, -.31, limestone);
      for (let i = 1; i < count; i++) box(g, .008, .64, .008, -length / 2 + width * i, 1.29, -.288, stone);
      box(g, length, .025, .025, 0, 1.7, -.04, interiorLed);
      // Recessed oven face, drawer reveals and inset toe-kick make cabinetry legible close up.
      box(g, .48, .43, .025, -length / 2 + .4, .51, .305, metal);
      box(g, .37, .27, .012, -length / 2 + .4, .5, .323, dark);
      box(g, .33, .025, .035, -length / 2 + .4, .69, .34, brass);
      box(g, length - .08, .08, .04, 0, .08, .25, smokedOak);
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
      cyl(g, .55, .065, 0, .42, 1.25, limestone); cyl(g, .26, .36, 0, .21, 1.25, smokedOak);
      // Reeded coffee-table base, nested side table and ceramic styling.
      for (let i = 0; i < 18; i++) { const a = i * Math.PI / 9; cyl(g, .025, .33, Math.cos(a) * .26, .215, 1.25 + Math.sin(a) * .26, oak); }
      cyl(g, .3, .055, .67, .32, 1.47, smokedOak); cyl(g, .08, .28, .67, .17, 1.47, brass);
      box(g, .3, .04, .22, -.15, .49, 1.25, oak); box(g, .25, .035, .18, -.12, .53, 1.25, lightStone);
      cyl(g, .1, .17, .23, .54, 1.2, clay, .065); cyl(g, .045, .035, .23, .64, 1.2, dark);
      box(g, .48, .035, .75, -w / 2 + .48, .605, .07, linen);
      box(g, .48, .3, .03, -w / 2 + .48, .44, .46, linen);
      for (let i = 0; i < 6; i++) box(g, .012, .1, .015, -w / 2 + .27 + i * .075, .25, .46, linen);
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
      for (let i = 0; i < seats; i++) {
        const a = i * Math.PI * 2 / seats, px = Math.cos(a) * radius * .65, pz = Math.sin(a) * radius * .65;
        cyl(g, .14, .012, px, .805, pz, limestone); cyl(g, .105, .012, px, .817, pz, lightStone);
        const napkin = box(g, .07, .018, .13, px, .834, pz, linen); napkin.rotation.y = -a;
      }
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
      // Staggered, full-width oak planks with genuine joints rather than long stripes.
      const plankCount = Math.ceil(w / .24), plankWidth = w / plankCount;
      for (let i = 0; i < plankCount; i++) {
        let start = -d / 2 + .04, piece = 0;
        while (start < d / 2 - .04) {
          const end = Math.min(d / 2 - .04, start + (piece === 0 ? .55 + (i % 3) * .45 : 1.9));
          box(g, plankWidth - .008, .028, end - start - .008, -w / 2 + (i + .5) * plankWidth, .018, (start + end) / 2, floorTones[(i + piece) % 3]);
          start = end; piece++;
        }
      }
      box(g, w, 2.8, .12, 0, 1.4, -d / 2, lightStone);
      box(g, .12, 1.1, d, -w / 2, .55, 0, lightStone);
      box(g, .12, 1.1, d, w / 2, .55, 0, lightStone);
      box(g, w, .1, .07, 0, .1, -d / 2 + .09, oak);
      for (const side of [-1, 1]) box(g, .025, .09, d - .12, side * (w / 2 - .075), .09, 0, smokedOak);
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
      if (type === 'suite') {
        // A designed master-suite backdrop: timber fins, warm concealed light and
        // original geometric relief art, all part of the procedural 3D scene.
        const bx = bedrooms[0][0], back = -d / 2 + .08;
        box(g, 2.95, 2.35, .055, bx, 1.3, back, smokedOak);
        for (let i = 0; i < 32; i++) box(g, .045, 2.25, .035, bx - 1.42 + i * .092, 1.3, back + .045, oak);
        box(g, 2.9, .025, .035, bx, 2.49, back + .075, interiorLed);
        box(g, .95, 1.08, .055, bx, 1.85, back + .11, brass);
        box(g, .9, 1.03, .025, bx, 1.85, back + .15, fabric);
        const disc = cyl(g, .29, .018, bx - .09, 1.94, back + .17, clay); disc.rotation.x = Math.PI / 2;
        box(g, .28, .52, .025, bx + .18, 1.72, back + .19, cushion);
      }
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
        living: view(lx, lz + .35, 2.35, .05), kitchen: view(kx + .3, kz, 4, 1.1)};
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

    /* ---------- Post-processing on capable screens: ambient occlusion and bloom ----------
       The scene renders into a 4× multisampled buffer. A half-resolution depth pre-pass feeds
       screen-space ambient occlusion (contact shadows in corners, under furniture and between
       buildings); bright lamps, windows and the sun bloom softly. Phones, WebGL1 and slow GPUs
       keep the direct render, which already has sky lighting, reflections and surface detail. */
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
      const depth = new T.WebGLRenderTarget(1, 1, {minFilter: T.NearestFilter, magFilter: T.NearestFilter});
      depth.depthTexture = new T.DepthTexture(1, 1, T.UnsignedIntType);
      const aoRaw = new T.WebGLRenderTarget(1, 1, linear), aoBlur = new T.WebGLRenderTarget(1, 1, linear);
      const mips = [2, 4, 8, 16, 32].map(() => new T.WebGLRenderTarget(1, 1, linear));
      const depthOnly = new T.MeshBasicMaterial({colorWrite: false});
      const projInv = new T.Matrix4();
      const aoMat = pass({tDepth: {value: depth.depthTexture}, projInv: {value: projInv}, proj: {value: camera.projectionMatrix}, radius: {value: 2}, texel: {value: new T.Vector2()}, reach: {value: 220}},
        `uniform sampler2D tDepth;uniform mat4 projInv,proj;uniform float radius,reach;uniform vec2 texel;varying vec2 vUv;
         vec3 pos(vec2 uv){float d=texture2D(tDepth,uv).x;vec4 v=projInv*vec4(uv*2.-1.,d*2.-1.,1.);return v.xyz/v.w;}
         void main(){float d=texture2D(tDepth,vUv).x;if(d>=1.){gl_FragColor=vec4(1.);return;}
          vec3 p=pos(vUv),px=pos(vUv+vec2(texel.x,0.))-p,nx=p-pos(vUv-vec2(texel.x,0.)),py=pos(vUv+vec2(0.,texel.y))-p,ny=p-pos(vUv-vec2(0.,texel.y));
          vec3 n=normalize(cross(abs(px.z)<abs(nx.z)?px:nx,abs(py.z)<abs(ny.z)?py:ny));
          float rs=clamp(radius*proj[1][1]*.5/-p.z,texel.y*3.,.12),ang=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))))*6.2832,occ=0.;
          for(int i=0;i<12;i++){float f=(float(i)+.5)/12.;float a=ang+float(i)*2.3998;vec2 o=vec2(cos(a),sin(a)*texel.y/texel.x)*rs*sqrt(f);
           vec3 v=pos(vUv+o)-p;float l=length(v);occ+=max(dot(n,v/l)-.08,0.)*clamp(1.-l/radius,0.,1.);}
          float ao=pow(clamp(1.-occ/12.*3.2,0.,1.),1.6);gl_FragColor=vec4(mix(ao,1.,smoothstep(reach*.6,reach,-p.z)),0.,0.,1.);}`);
      const blurMat = pass({tAO: {value: aoRaw.texture}, tDepth: {value: depth.depthTexture}, texel: {value: new T.Vector2()}, near: {value: .5}, far: {value: 4000}},
        `uniform sampler2D tAO,tDepth;uniform vec2 texel;uniform float near,far;varying vec2 vUv;
         float lin(float d){float z=d*2.-1.;return 2.*near*far/(far+near-z*(far-near));}
         void main(){float c=lin(texture2D(tDepth,vUv).x),s=0.,w=0.;
          for(int x=-2;x<=2;x++)for(int y=-2;y<=2;y++){vec2 uv=vUv+vec2(float(x),float(y))*texel;float k=1./(1.+abs(lin(texture2D(tDepth,uv).x)-c)*8./max(c*.02,.05));s+=texture2D(tAO,uv).x*k;w+=k;}
          gl_FragColor=vec4(s/w,0.,0.,1.);}`);
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
      const finalMat = pass({tColor: {value: color.texture}, tAO: {value: aoBlur.texture}, tBloom: {value: mips[0].texture}, aoStrength: {value: .8}, bloom: {value: .3}, useAO: {value: 1}},
        `uniform sampler2D tColor,tAO,tBloom;uniform float aoStrength,bloom,useAO;varying vec2 vUv;
         void main(){vec3 c=texture2D(tColor,vUv).rgb;float ao=mix(1.,texture2D(tAO,vUv).x,aoStrength*useAO);
          c=c*ao+texture2D(tBloom,vUv).rgb*bloom;c=1.-(1.-c)*(1.-max(c-1.,0.));
          vec2 q=vUv-.5;c*=1.-dot(q,q)*.22;
          c+=(fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5)/255.;gl_FragColor=vec4(c,1.);}`);
      const hidden = [];
      const run = (material, out) => { quad.material = material; renderer.setRenderTarget(out); renderer.render(quadScene, quadCam); };
      let w = 0, h = 0, slow = 0, frames = 0, aoOn = true;
      return {
        resize(bw, bh) {
          w = bw; h = bh;
          color.setSize(w, h);
          const hw = Math.max(1, w >> 1), hh = Math.max(1, h >> 1);
          depth.setSize(hw, hh); aoRaw.setSize(hw, hh); aoBlur.setSize(hw, hh);
          aoMat.uniforms.texel.value.set(1 / hw, 1 / hh);
          blurMat.uniforms.texel.value.set(1 / hw, 1 / hh);
          mips.forEach((m, i) => m.setSize(Math.max(1, Math.round(w / (2 << i))), Math.max(1, Math.round(h / (2 << i)))));
          brightMat.uniforms.texel.value.set(.5 / w, .5 / h);
        },
        // Frames that take longer than about 30 fps drop ambient occlusion, then the whole pipeline.
        measure(ms) {
          if (++frames < 40 || options.quality === 'high') return true;
          slow = ms > 36 ? slow + 1 : Math.max(0, slow - 2);
          if (slow > 45) { slow = 0; frames = 0; if (aoOn) aoOn = false; else return false; }
          return true;
        },
        render(look) {
          const inside = shown === 'interior', autoShadow = renderer.shadowMap.autoUpdate;
          renderer.setRenderTarget(color);
          renderer.render(scene, camera);
          const calls = renderer.info.render.calls, triangles = renderer.info.render.triangles;
          renderer.shadowMap.autoUpdate = false;
          if (aoOn && look.ao > .01) {
            // Depth of opaque surfaces only; glass, ghosts, sky and effects are skipped.
            scene.traverseVisible(o => { if ((o.isMesh || o.isPoints) && (o.material.transparent || o.material.isShaderMaterial || o.isPoints)) hidden.push(o); });
            hidden.forEach(o => { o.visible = false; });
            scene.overrideMaterial = depthOnly;
            const background = scene.background; scene.background = null;
            renderer.setRenderTarget(depth);
            renderer.render(scene, camera);
            scene.overrideMaterial = null; scene.background = background;
            hidden.forEach(o => { o.visible = true; });
            hidden.length = 0;
            projInv.copy(camera.projectionMatrixInverse);
            aoMat.uniforms.radius.value = inside ? .7 : 2.6;
            aoMat.uniforms.reach.value = inside ? 40 : 260;
            blurMat.uniforms.near.value = camera.near; blurMat.uniforms.far.value = camera.far;
            run(aoMat, aoRaw);
            run(blurMat, aoBlur);
          }
          run(brightMat, mips[0]);
          for (let i = 1; i < mips.length; i++) { downMat.uniforms.tSrc.value = mips[i - 1].texture; downMat.uniforms.texel.value.set(1 / mips[i - 1].width, 1 / mips[i - 1].height); run(downMat, mips[i]); }
          renderer.autoClear = false;
          for (let i = mips.length - 1; i > 0; i--) { upMat.uniforms.tSrc.value = mips[i].texture; upMat.uniforms.texel.value.set(1 / mips[i].width, 1 / mips[i].height); upMat.uniforms.weight.value = .9; run(upMat, mips[i - 1]); }
          renderer.autoClear = true;
          finalMat.uniforms.aoStrength.value = look.ao;
          finalMat.uniforms.useAO.value = aoOn ? 1 : 0;
          finalMat.uniforms.bloom.value = look.bloom;
          run(finalMat, null);
          renderer.shadowMap.autoUpdate = autoShadow;
          return {calls, triangles};
        },
        dispose() { [color, depth, aoRaw, aoBlur, ...mips].forEach(t => t.dispose()); [aoMat, blurMat, brightMat, downMat, upMat, finalMat, depthOnly].forEach(m => m.dispose()); quad.geometry.dispose(); },
      };
    }
    let pipeline = makePipeline(), sceneStats = null, lastFrame = 0;

    /* ---------- State ---------- */
    const ray = new T.Raycaster(), pointer = new T.Vector2(), v = new T.Vector3(), w = new T.Vector3();
    let mode = 'building', shown = 'building', room = 'overview', lastRoom = 'overview', focus = null, lastFloor = 7, selected = null, hovered = null, paintMap = null;
    let aim = 'default', flight = null, seq = null, intro = null, lastInput = -Infinity, orbitSpeed = 0, userMoved = false;
    let raf = 0, last = 0, visible = true, disposed = false, ready = false, width = 1, height = 1;
    const pose = {theta: .62, phi: 1.42, r: 95, x: 0, y: 22, z: 0, fov: 40}, goal = {...pose};
    if (!reduced && options.intro !== false) {
      intro = {t0: null};
      Object.assign(pose, {theta: .35, phi: 1.3, r: 105, y: 23, fov: 40});
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
      return {theta: .62, phi: 1.28, r: ViewerControls.fitDistance(22, 48, 22, camera.aspect, 40) * (camera.aspect < 1 ? 1.12 : .92), x: 0, y: camera.aspect < 1 ? 23 : 21, z: 0, fov: 40};
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
      scene.fog.color.copy(L.horizon).convertSRGBToLinear();
      const u = skyUniforms;
      u.top.value.copy(L.top); u.horizon.value.copy(L.horizon); u.sunColor.value.copy(L.sun); u.sunDir.value.copy(L.sunAt); u.night.value = n;
      u.ground.value.copy(L.ground).lerp(L.horizon, .35);
      hazeColor.value.copy(L.horizon).convertSRGBToLinear();
      sun.color.copy(L.sun); sun.intensity = L.sunI;
      // With sky lighting from the environment map, the hemisphere light only adds a little bounce.
      hemi.color.copy(L.sky); hemi.groundColor.copy(L.ground); hemi.intensity = L.hemiI * (envReady ? .3 : 1);
      fill.intensity = L.fill * (envReady ? .5 : 1);
      renderer.toneMappingExposure = L.exposure * (shown === 'interior' ? .84 : 1);
      positionSun();
      for (const p of peaks) p.material.color.copy(p.userData.base).multiplyScalar(1 - .72 * n).lerp(L.horizon, 1 - p.userData.haze).convertSRGBToLinear();
      unitLit.forEach((m, i) => { m.emissiveIntensity = smooth(.1 + i * .16, .55 + i * .16, n) * m.userData.peak; });
      for (const m of bodies) m.emissiveIntensity = smooth(.15, 1, n) * .9;
      lampHalos.material.uniforms.glow.value = smooth(.3, 1, n);
      lampHalos.visible = n > .3;
      envDirty = true;
      lobbyGlass.emissiveIntensity = smooth(.1, 1, n) * .7;
      led.emissiveIntensity = .3 + n * 2.4;
      glow.emissiveIntensity = .6 + n * 2.2;
      stars.material.opacity = smooth(.55, 1, n);
      stars.visible = stars.material.opacity > .01;
      pools.material.uniforms.glow.value = smooth(.3, 1, n);
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
      refreshEnvironment(false);
      if (pipeline) {
        const fading = fade.visible ? fade.material.uniforms.opacity.value : 0, n = light.night;
        sceneStats = pipeline.render({ao: (shown === 'interior' ? .9 : .8) * (1 - fading), bloom: lerp(.07, .85, n) * (1 - fading)});
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
      world.visible = !inside;
      home.visible = inside;
      if (inside) placeHome();
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
      if (renderer.getPixelRatio) {
        const ratio = renderer.getPixelRatio();
        pipeline?.resize(Math.round(width * ratio), Math.round(height * ratio));
        lampHalos.material.uniforms.scale.value = height * ratio / (2 * Math.tan(Math.PI * 40 / 360));
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
        clumps.forEach(g => g.dispose());
        pipeline?.dispose();
        envTarget?.dispose();
        pmrem?.dispose();
        renderer.dispose();
      },
      state() { return {mode: shown, room, typology, rooms: Object.keys(activeInterior.views), bedrooms: activeInterior.beds, focus, selected: selected?.userData.unitId ?? null, aim, home: home.position.y, transitioning: !!(seq || flight || intro)}; },
      stats() { const s = sceneStats || renderer.info.render; return {drawCalls: s.calls, triangles: s.triangles, post: !!pipeline}; },
    };
  }
  return {create, floorY};
})();
