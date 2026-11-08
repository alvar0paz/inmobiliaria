/* Shared toolkit for the 3D viewer and every building it shows: materials with procedural surface
   detail (no image textures), primitive helpers, trees and per-material mesh merging. One kit per viewer. */
window.ViewerKit = (() => {
  'use strict';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  const easeOut = k => 1 - Math.pow(1 - k, 3);
  const smooth = (a, b, x) => { const k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
  const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
  const clock = () => (typeof performance === 'object' ? performance : Date).now();
  const seeded = seed => () => (seed = seed * 16807 % 2147483647) / 2147483647;
  const util = {clamp, lerp, ease, easeOut, smooth, wrap, clock, seeded};

  function create(T) {
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
        // Multi-material meshes and vertex colours (rare in exported architecture) stay as they are.
        if (Array.isArray(o.material) || o.geometry.attributes.color) return;
        if (!o.geometry.attributes.normal) o.geometry.computeVertexNormals();
        if (!buckets.has(o.material)) buckets.set(o.material, []);
        buckets.get(o.material).push(o);
      });
      for (const [material, list] of buckets) {
        let vertices = 0, indices = 0;
        for (const o of list) {
          vertices += o.geometry.attributes.position.count;
          indices += o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count;
        }
        // Texture coordinates survive only where the material actually samples a texture.
        const textured = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap'].some(k => material[k]) && list.every(o => o.geometry.attributes.uv);
        const position = new Float32Array(vertices * 3), normals = new Float32Array(vertices * 3), uvs = textured ? new Float32Array(vertices * 2) : null;
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
            if (uvs) { const uv = g.attributes.uv; uvs[(vo + i) * 2] = uv.getX(i); uvs[(vo + i) * 2 + 1] = uv.getY(i); }
          }
          if (g.index) for (let i = 0; i < g.index.count; i++) index[io++] = g.index.getX(i) + vo;
          else for (let i = 0; i < p.count; i++) index[io++] = i + vo;
          vo += p.count;
          o.parent.remove(o);
        }
        const geometry = new T.BufferGeometry();
        geometry.setAttribute('position', new T.BufferAttribute(position, 3));
        geometry.setAttribute('normal', new T.BufferAttribute(normals, 3));
        if (uvs) geometry.setAttribute('uv', new T.BufferAttribute(uvs, 2));
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
    function group(parent, x, z, angle = 0) {
      const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = angle; parent.add(g); return g;
    }
    // Materials that arrive from outside (a glTF model) join the same registry, so lighting changes reach them.
    function adopt(m) {
      if (Object.values(materials).includes(m)) return m;
      const key = m.name && !materials[m.name] ? m.name : `${m.name || 'material'}#${m.uuid}`;
      materials[key] = m;
      return m;
    }
    function dispose() {
      boxGeo.dispose();
      Object.values(geometries).forEach(g => g.dispose());
      Object.values(materials).forEach(m => m.dispose());
      clumps.forEach(g => g.dispose());
    }
    return {
      T, util, NOISE, materials, geometries, boxGeo, mat, detail, adopt, dispose,
      box, cyl, sphere, plant, tree, merge, shader, group,
      palette: {stone, lightStone, wood, oak, dark, metal, glass, leaf, leaf2, leaf3, water, fabric, cushion, brass, glow, led},
    };
  }
  return {create, util};
})();
