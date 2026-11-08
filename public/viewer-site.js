/* The setting every building sits in: sky and image-based lighting, the Andes, fields, a fictional
   neighbourhood, the street and plaza, lamps and the soft contact shadow under the building. */
window.ViewerSite = (() => {
  'use strict';
  const STOREY = 3.2;
  const glsl = n => (Math.round(n * 1000) / 1000).toFixed(3).replace(/0+$/, '').replace(/\.$/, '.');

  // footprint: the building's [width, depth] in metres; blending(): true while a lighting change is animating.
  function create(kit, {renderer, scene, env, footprint = [28, 18.2], blending = () => false}) {
    const {T, mat, box, cyl, sphere, tree, merge, shader, NOISE} = kit, {clamp, seeded} = kit.util;
    const {stone, lightStone, wood, metal, leaf, glow} = kit.palette;
    // Neighbouring blocks draw their own windows; a share of them light up at night.
    const cityLit = mat('cityLit', '#cfd1ca', {roughness: .9, emissive: '#ff9f45', emissiveIntensity: 0, surface: 'city'});
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
      if (!pmrem || !envDirty || (!force && blending() && envFrame++ % 5)) return;
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
      const levels = Math.max(1, Math.floor((5 + Math.pow(cityRnd(), 1.7) * (cap - 5)) / STOREY)), top = levels * STOREY + .6;
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
    box(site, 40, .35, 31.5, 0, .02, -.25, mat('paving', '#e8e1d2', {roughness: .8, surface: 'paving'}));
    for (let x = -18.7; x < 19.5; x += 1.1) box(site, .025, .01, 29.5, x, .203, -.25, stone);
    for (let z = -15.4; z < 15; z += 1.1) box(site, 38, .01, .025, 0, .204, z, stone);
    for (const x of [-27, 27]) box(site, 14, .2, 31.5, x, -.1, -.25, lawn);
    box(site, 68, .2, 12, 0, -.1, -22, lawn);
    box(site, 38, .7, .8, 0, .55, -15.6, leaf);
    for (const x of [-17.5, 17.5]) for (const z of [-12, -2, 9]) tree(site, x, z, 1.1);
    for (const [x, z, s] of [[-26, -8, 1.2], [27, -4, 1], [-28, 8, 1.1], [25, 9, 1.3], [-18, -22, 1], [8, -24, 1.2], [-6, -23, .9], [26, -21, 1.1]]) tree(site, x, z, s);
    for (let x = -84; x <= 84; x += 12) if (Math.abs(x) > 20) { tree(site, x, 15.6, .95); tree(site, x + 6, 30.4, .95); }
    // Loose groves in the open park land around the site.
    const parkRnd = seeded(61);
    for (let i = 0; i < 90; i++) {
      const x = (parkRnd() - .5) * 200, z = -22 + parkRnd() * 110;
      if ((z > 10 && z < 36) || (Math.abs(x) < 37 && z < 18) || Math.hypot(x, z) > 105) continue;
      tree(site, x, z, .85 + parkRnd() * .5);
    }
    for (const x of [-11, 11]) { box(site, 3, .5, 1, x, .5, 13.6, stone); for (let k = 0; k < 6; k++) box(site, 3, .07, .1, x, .8, 13.2 + k * .15, wood); }
    const lamp = (x, y, z) => { cyl(site, .065, 4, x, y + 2, z, metal); sphere(site, .28, x, y + 4, z, glow); lamps.push([x, y + .03, z]); };
    for (const x of [-17, 17]) lamp(x, .2, 14);
    // Street lamps sit between the street trees.
    for (const x of [-72, -36, 0, 36, 72]) lamp(x, -.04, 30.4);
    for (const x of [-78, -42, 42, 78]) lamp(x, -.04, 15.6);
    merge(site);
    env.add(site);

    // Soft ground contact under the tower and warm pools of light under lamps at night.
    const ao = new T.Mesh(new T.PlaneGeometry(60, 60), shader({},
      `varying vec2 vUv;void main(){vec2 p=(vUv-.5)*60.;vec2 q=abs(p)-vec2(${glsl(footprint[0] / 2 + .3)},${glsl(footprint[1] / 2 + .3)});float d=length(max(q,0.));gl_FragColor=vec4(.17,.16,.12,(1.-smoothstep(0.,5.,d))*.42);}`,
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

    function applyLight(L) {
      const n = L.night, u = skyUniforms;
      u.top.value.copy(L.top); u.horizon.value.copy(L.horizon); u.sunColor.value.copy(L.sun); u.sunDir.value.copy(L.sunAt); u.night.value = n;
      u.ground.value.copy(L.ground).lerp(L.horizon, .35);
      hazeColor.value.copy(L.horizon).convertSRGBToLinear();
      for (const p of peaks) p.material.color.copy(p.userData.base).multiplyScalar(1 - .72 * n).lerp(L.horizon, 1 - p.userData.haze).convertSRGBToLinear();
      for (const m of bodies) m.emissiveIntensity = kit.util.smooth(.15, 1, n) * .9;
      lampHalos.material.uniforms.glow.value = kit.util.smooth(.3, 1, n);
      lampHalos.visible = n > .3;
      envDirty = true;
      stars.material.opacity = kit.util.smooth(.55, 1, n);
      stars.visible = stars.material.opacity > .01;
      pools.material.uniforms.glow.value = kit.util.smooth(.3, 1, n);
    }
    return {
      city, envReady, applyLight, refreshEnvironment,
      // Sky dome and stars travel with the camera so they never clip.
      follow(camera) { sky.position.copy(camera.position); stars.position.copy(camera.position); },
      viewport(pixelHeight) { lampHalos.material.uniforms.scale.value = pixelHeight / (2 * Math.tan(Math.PI * 40 / 360)); },
      dispose() { envTarget?.dispose(); pmrem?.dispose(); },
    };
  }
  return {create};
})();
