/* The demo building, Residencia 01: a 13-storey procedural tower with six homes per floor, a rooftop
   pool and garden, and four furnished plans shown in "La vida dentro". It implements the building
   interface the viewer expects (see architecture.js › BUILDING INTERFACE); a client's real building
   comes from a glTF model instead (building-gltf.js). All dimensions are metres. */
window.TowerBuilding = (() => {
  'use strict';
  const FH = 3.2, ROOF = 42;
  const floorY = n => 3.5 + (n - 2) * FH;
  // Concept plans in metres; +z is the glazed façade and terrace, -z the corridor wall with the
  // entry door. Inventory metadata selects a plan; no unit-ID inference.
  const PLANS = {
    estudio: {w: 6.2, d: 5.8, beds: 0, bedrooms: [[1.35, -1.5, 1.5]], social: .2, bath: [-2.1, -1.85], door: -.6},
    suite: {w: 7.6, d: 7, beds: 1, bedrooms: [[1.9, -1.9, 1.6]], social: .3, bath: [-2.65, -2.3], door: -.85, left: .05},
    depa2: {w: 10, d: 7.6, beds: 2, bedrooms: [[-.5, -2.2, 1.6], [2.95, -2.2, 1.2]], social: .35, bath: [-4, -2.6], door: -2.6, left: -2.1},
    depa3: {w: 12, d: 8.6, beds: 3, bedrooms: [[-1.72, -2.7, 1.6], [1.3, -2.7, 1.2], [4.3, -2.7, 1.2]], social: -.15, bath: [-5, -3.1], door: -3.6, left: -3.1},
  };
  /* The typical floor, sized so the real plans fit: 28 × 18.2 m with a central corridor.
     Front row (+z): 01 suite · 02 two-bed · lift core · 03 studio. Back row (-z): 04 studio ·
     05 three-bed · 06 suite · stair. Each façade carries 1.95 m terraces. */
  const FLOOR = {w: 28, d: 18.2, front: 9.1, back: -9.1, corridor: [-.5, 1.5], core: [3.6, 7.8], stair: [11.8, 14]};
  const SLOTS = [
    {pos: 0, type: 'suite', side: 1, x0: -14}, {pos: 1, type: 'depa2', side: 1, x0: -6.4}, {pos: 2, type: 'estudio', side: 1, x0: 7.8},
    {pos: 3, type: 'estudio', side: -1, x0: -14}, {pos: 4, type: 'depa3', side: -1, x0: -7.8}, {pos: 5, type: 'suite', side: -1, x0: 4.2},
  ].map(s => {
    const {w, d} = PLANS[s.type], facade = s.side > 0 ? FLOOR.front : FLOOR.back;
    return {...s, w, d, x: s.x0 + w / 2, facade, z: facade - s.side * d / 2};
  });
  // Points of interest on the exterior, with the camera that frames each one.
  const AMENITIES = {
    pool: {at: [3.75, ROOF + .9, -5], view: {theta: .95, phi: .82, r: 34, x: 3, y: ROOF, z: -4}},
    garden: {at: [-8, ROOF + 3, -2.5], view: {theta: -.6, phi: 1, r: 30, x: -7.5, y: ROOF + 1.2, z: -2.5}},
    terraces: {at: [-1.4, floorY(9) + 1.5, 10.6], normal: [0, 0, 1], view: {theta: .42, phi: 1.33, r: 24, x: -1.4, y: floorY(9) + 1, z: 9.5}},
    lobby: {at: [0, 2.6, 12.6], normal: [0, 0, 1], view: {theta: .25, phi: 1.43, r: 28, x: 0, y: 2.8, z: 8}},
  };

  function build(kit, {home, inventory, unitMaterial}) {
    const {T, mat, box, cyl, sphere, plant, merge, group} = kit, {smooth, seeded} = kit.util;
    const {stone, lightStone, wood, oak, dark, metal, glass, leaf, water, fabric, cushion, brass, glow, led} = kit.palette;
    const lobbyGlass = mat('lobbyGlass', '#9fb9b6', {metalness: .2, roughness: .05, transparent: true, opacity: .5, depthWrite: false, emissive: '#ffcf96', emissiveIntensity: 0, noShadow: true, envMapIntensity: 1.5});

    /* ---------- The tower, split into levels that can lift apart ---------- */
    const building = new T.Group(), levels = [], units = [];
    const level = (n, delay) => { const group = new T.Group(); building.add(group); const l = {group, n, lift: 0, target: 0, ghost: false, delay}; levels.push(l); return l; };
    const base = level(1, .2).group, [cx0, cx1] = FLOOR.core, [sx0, sx1] = FLOOR.stair, coreX = (cx0 + cx1) / 2, stairX = (sx0 + sx1) / 2;
    box(base, 26.4, 3.15, 16.6, 0, 1.8, 0, lobbyGlass);
    for (let x = -13; x <= 13; x += 1.625) box(base, .11, 3.5, .14, x, 1.8, 8.35, metal);
    box(base, 7, .35, 4, 0, 3.2, 10.4, stone); box(base, 6, .1, 3.9, 0, 2.98, 10.3, wood);
    box(base, .3, 3.1, .3, -3.2, 1.5, 12.1, metal); box(base, .3, 3.1, .3, 3.2, 1.5, 12.1, metal);
    box(base, 6, .05, .05, 0, 3.02, 12.2, led);
    box(base, 26, 3, .3, 0, 1.65, -8.15, wood); box(base, 4, .85, 1, -2, .85, 3, stone);
    for (let x = -12.5; x < 12.6; x += .25) box(base, .09, 2.8, .1, x, 1.6, -7.92, oak);
    // The lift core and stair rise from the lobby through every floor.
    box(base, cx1 - cx0, 3.3, 7.6, coreX, 1.75, 5.3, stone); box(base, sx1 - sx0, 3.3, 8.6, stairX, 1.75, -4.8, stone);
    for (const x of [coreX - 1, coreX + 1]) box(base, 1, 2.1, .04, x, 1.05, 1.48, brass);
    const unitRnd = seeded(42);
    for (let f = 0; f < 12; f++) {
      const n = f + 2, y = floorY(n), l = level(n, .45 + f * .085), fl = l.group;
      box(fl, FLOOR.w, .27, FLOOR.d, 0, y, 0, lightStone);
      // Solid core: lifts and services face the street; the stair has a slit window at the back.
      box(fl, cx1 - cx0, 2.95, 7.6, coreX, y + 1.6, 5.3, stone);
      box(fl, sx1 - sx0, 2.95, 8.6, stairX, y + 1.6, -4.8, stone);
      box(fl, .5, 2.4, .05, stairX, y + 1.6, FLOOR.back - .01, glass);
      for (const sl of SLOTS) {
        const {side, w, d, x, x0, facade, pos} = sl, roll = unitRnd(), out = facade + side * .975, bays = Math.ceil(w / 1.5), bay = w / bays;
        const unit = box(fl, w - .3, 2.85, d - .4, x, y + 1.55, facade - side * (d / 2 - .05), unitMaterial);
        Object.assign(unit.userData, {unitId: `${n}0${pos + 1}`, floor: n, side, facing: side > 0 ? 0 : Math.PI, pos, variant: roll < .36 ? 0 : roll < .64 ? 1 : roll < .8 ? 2 : 3});
        units.push(unit);
        // Party-wall fins frame each home; terrace slab, glass balustrade and façade mullions.
        box(fl, .2, 2.95, 2.25, x0, y + 1.6, facade + side * .95, stone);
        box(fl, w - .1, .16, 1.95, x, y + .1, out, stone);
        box(fl, w - .2, 1, .06, x, y + .78, facade + side * 1.92, glass);
        box(fl, w - .1, .06, .09, x, y + 1.32, facade + side * 1.92, metal);
        for (let k = 0; k <= bays; k++) box(fl, .065, 2.7, .1, x0 + k * bay, y + 1.6, facade + side * .02, metal);
        for (let k = 1; k < bays; k++) box(fl, .05, 1.1, .06, x0 + k * bay, y + .77, facade + side * 1.92, metal);
        if ((f + pos) % 3 === 0) { box(fl, 1.5, .45, .55, x + w / 2 - 1.2, y + .4, facade + side * 1.65, stone); for (let i = 0; i < 4; i++) sphere(fl, .25, x + w / 2 - 1.7 + i * .3, y + .85, facade + side * 1.65, leaf, 1, 1.35, 1); }
        if ((pos + f) % 4 === 0) box(fl, 1.7, .14, .7, x - .5, y + .8, facade - side * 1.2, glow);
        if (pos === 0 || pos === 3) for (let k = 0; k < 4; k++) box(fl, .12, 2.8, .18, x0 + .5 + k * .24, y + 1.6, facade + side * .2, wood);
      }
      for (const x of [cx0, 14]) box(fl, .2, 2.95, 2.25, x, y + 1.6, FLOOR.front + .95, stone);
      box(fl, .2, 2.95, 2.25, sx0, y + 1.6, FLOOR.back - .95, stone);
      // Side façades with windows; the corridor ends in full-height glazing.
      for (const sx of [-1, 1]) {
        box(fl, .32, 3.1, FLOOR.d, sx * 13.9, y + 1.58, 0, stone);
        for (const k of [-7.2, -4.6, 4.6, 7.2]) box(fl, .35, 2.2, 1.35, sx * 14.07, y + 1.65, k, glass);
        box(fl, .35, 2.7, 1.8, sx * 14.07, y + 1.5, .5, glass);
      }
    }
    const roof = level(14, .45 + 12 * .085 + .05).group;
    box(roof, FLOOR.w + .4, .35, FLOOR.d + .4, 0, ROOF, 0, lightStone);
    for (const z of [-(FLOOR.d / 2 + .23), FLOOR.d / 2 + .23]) box(roof, FLOOR.w + .5, .07, .07, 0, ROOF - .08, z, led);
    for (const x of [-(FLOOR.w / 2 + .23), FLOOR.w / 2 + .23]) box(roof, .07, .07, FLOOR.d + .5, x, ROOF - .08, 0, led);
    // Pool deck, pergola garden, lift overrun and stair bulkhead.
    box(roof, 12, .4, 5.6, 3.75, ROOF + .2, -5, stone); box(roof, 11.6, .08, 5.2, 3.75, ROOF + .44, -5, water);
    for (let i = 0; i < 4; i++) for (const z of [-7, 2]) box(roof, .12, 2.6, .12, -11.5 + i * 2.5, ROOF + 1.3, z, wood);
    for (let i = 0; i < 17; i++) box(roof, 8, .13, .13, -7.75, ROOF + 2.7, -7 + i * .56, wood);
    box(roof, cx1 - cx0, 2.6, 2.4, coreX, ROOF + 1.3, 2.7, stone); box(roof, sx1 - sx0, 2.6, 3, stairX, ROOF + 1.3, -2, stone);
    for (const z of [-(FLOOR.d / 2 - .3), FLOOR.d / 2 - .3]) { box(roof, FLOOR.w - .8, 1, .07, 0, ROOF + .6, z, glass); box(roof, FLOOR.w - .8, .07, .09, 0, ROOF + 1.15, z, metal); }
    for (let i = 0; i < 4; i++) box(roof, 1.1, .2, 2.5, .6 + i * 2.2, ROOF + .45, -.5, fabric);
    for (let i = 0; i < 5; i++) plant(roof, -12 + i * 5.5, ROOF + .2, 7, .8);
    for (let i = 0; i < 3; i++) plant(roof, -12, ROOF + .2, -5 + i * 3, .8);
    levels.forEach(l => merge(l.group));

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
    const screed = mat('screed', '#b9b3a6', {roughness: .9, surface: 'plaster'});
    // One plan builder for both the furnished apartment and the neighbouring "shells" around it:
    // shells keep floor, walls, door, glazing and terrace so the floor's distribution reads clearly.
    function makePlan(type, plan, full = true, into = null) {
      const g = into || new T.Group(), {w, d, bedrooms, bath, door} = plan;
      // Shells share a handful of materials so all five neighbours merge into a few meshes.
      const trim = full ? smokedOak : lightStone, skirt = full ? oak : lightStone;
      if (full) { g.name = 'interior-' + type; g.userData.typology = type; g.visible = false; home.add(g); }
      box(g, w, .25, d, 0, -.13, 0, full ? stone : screed);
      // Staggered, full-width oak planks with genuine joints rather than long stripes.
      const plankCount = full ? Math.ceil(w / .24) : 0, plankWidth = w / Math.max(1, plankCount);
      for (let i = 0; i < plankCount; i++) {
        let start = -d / 2 + .04, piece = 0;
        while (start < d / 2 - .04) {
          const end = Math.min(d / 2 - .04, start + (piece === 0 ? .55 + (i % 3) * .45 : 1.9));
          box(g, plankWidth - .008, .028, end - start - .008, -w / 2 + (i + .5) * plankWidth, .018, (start + end) / 2, floorTones[(i + piece) % 3]);
          start = end; piece++;
        }
      }
      // Corridor wall with the front door (opening 0.9 m, lintel at 2.1 m) and a door leaf ajar.
      const dl = door - .45, dr = door + .45, back = -d / 2;
      const wallH = full ? 2.8 : 1.1;
      box(g, dl + w / 2, wallH, .12, (-w / 2 + dl) / 2, wallH / 2, back, lightStone);
      box(g, w / 2 - dr, wallH, .12, (dr + w / 2) / 2, wallH / 2, back, lightStone);
      if (full) box(g, .9, .7, .12, door, 2.45, back, lightStone);
      for (const x of [dl, dr]) box(g, .05, full ? 2.1 : 1.1, .16, x, full ? 1.05 : .55, back, trim);
      const leafPanel = group(g, dl, back + .06, -1.1);
      box(leafPanel, .86, full ? 2.05 : 1.05, .045, .43, full ? 1.04 : .53, 0, trim);
      if (full) box(leafPanel, .025, .025, .14, .78, 1.02, .05, brass);
      box(g, w, .1, .07, 0, .1, back + .09, skirt);
      box(g, .12, 1.1, d, -w / 2, .55, 0, lightStone);
      box(g, .12, 1.1, d, w / 2, .55, 0, lightStone);
      if (full) {
        for (const side of [-1, 1]) box(g, .025, .09, d - .12, side * (w / 2 - .075), .09, 0, smokedOak);
        bathroom(g, ...bath);
      } else {
        box(g, 1.8, .03, 2.1, bath[0], .015, bath[1], tile);
        box(g, .09, 1.1, 2.1, bath[0] + .9, .55, bath[1], lightStone);
        box(g, 1.8, 1.1, .09, bath[0], .55, bath[1] + 1.05, lightStone);
      }
      if (plan.beds === 0) {
        // Open sleeping nook: timber screen, without an enclosed bedroom.
        for (let i = 0; i < 12; i++) box(g, .06, full ? 2.3 : 1.1, .07, .05, full ? 1.15 : .55, -2.6 + i * .13, skirt);
      } else {
        const left = plan.left;
        const span = (w / 2 - left) / plan.beds, front = -d / 2 + 3.65;
        for (let i = 0; i < plan.beds; i++) {
          const edge = left + i * span;
          box(g, .1, 1.2, 3.65, edge, .6, -d / 2 + 1.825, lightStone);
          // Cutaway partitions retain a real, 85 cm circulation opening.
          box(g, span - .9, 1.1, .1, edge + (span - .9) / 2, .55, front, lightStone);
          box(g, .8, .025, .08, edge + span - .45, .06, front, brass);
        }
      }
      if (full) furnish(g, type, plan);
      // Glazed frontage and a terrace, scaled to this plan only.
      const bays = Math.ceil(w / 1.5), bay = w / bays, tz = d / 2 + 1;
      for (let i = 0; i <= bays; i++) {
        const x = -w / 2 + i * bay;
        box(g, .045, 2.7, .06, x, 1.4, d / 2, metal);
        if (i < bays) box(g, bay - .06, 2.6, .025, x + bay / 2, 1.4, d / 2, homeGlass);
      }
      box(g, w, .06, .08, 0, 2.77, d / 2, metal);
      box(g, w, .18, 1.9, 0, -.05, tz, stone);
      if (full) for (let i = 0; i < Math.floor(w / .2); i++) box(g, .19, .025, 1.8, -w / 2 + .1 + i * .2, .06, tz, oak);
      box(g, w, .95, .035, 0, .6, tz + .9, glass); box(g, w, .035, .045, 0, 1.1, tz + .9, metal);
      for (let i = 0; i <= bays; i++) box(g, .04, 1, .04, -w / 2 + i * bay, .6, tz + .9, metal);
      if (!full) return g;
      merge(g);
      const {kx, kz, lx, lz, tx} = plan.layout;
      const view = (x, z, r = 4.3, theta = .3) => ({x, y: .7, z, r, theta, phi: 1.04});
      const views = {overview: {x: 0, y: 0, z: 0, r: 30, theta: .42, phi: .84},
        living: view(lx, lz + .35, 2.35, .05), kitchen: view(kx + .3, kz, 4, 1.1)};
      bedrooms.forEach(([x, z], i) => views[i ? 'bedroom' + (i + 1) : 'bedroom'] = view(x, z, 4.2));
      views.bathroom = view(bath[0], bath[1], 3.4, .5);
      views.terrace = {x: tx, y: 1.1, z: tz, r: 3.5, theta: Math.PI + .25, phi: 1.4};
      const spots = Object.fromEntries(Object.entries(views).filter(([key]) => key !== 'overview').map(([key, v]) => [key, [v.x, 1.4, v.z]]));
      return {group: g, views, spots, ...plan};
    }
    // Furniture, kitchen, living, dining, beds and terrace set for one furnished plan.
    function furnish(g, type, plan) {
      const {w, d, bedrooms, social} = plan;
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
      const kx = -w / 2 + .4, kz = social + 1.25, lx = w / 4, lz = social + .7, tz = d / 2 + 1, tx = plan.beds >= 2 ? 1.6 : 0;
      plan.layout = {kx, kz, lx, lz, tx};
      kitchen(g, kx, kz, plan.beds === 0 ? 1.9 : 2.5);
      living(g, lx, lz, plan.beds >= 2);
      if (plan.beds === 0) {
        box(g, .55, .06, .85, -.5, .9, 1.75, oak); cyl(g, .22, .48, -.05, .25, 1.75, wood);
      } else dining(g, plan.beds === 1 ? -.9 : -1, social + 2.2, plan.beds === 3 ? 6 : 4);
      plant(g, w / 2 - .5, .04, d / 2 - .5, .65);
      // A slim bookcase and a work ledge give each second/third bedroom a use.
      bedrooms.slice(1).forEach(([x, z]) => {
        box(g, 1, .06, .45, x, .76, z + 1.55, oak);
        box(g, .04, .72, .4, x - .44, .38, z + 1.55, wood);
        box(g, .04, .72, .4, x + .44, .38, z + 1.55, wood);
        for (let j = 0; j < 5; j++) box(g, .08, .22 + j * .015, .18, x - .35 + j * .09, .92, z + 1.55, j % 2 ? cushion : lightStone);
      });
      for (const x of [-w / 2 + .08, w / 2 - .5]) for (let k = 0; k < 5; k++) cyl(g, .045, 2.55, x + k * .08, 1.4, d / 2 - .15, curtain);
      for (const x of [-w / 2 + .45, w / 2 - .45]) plant(g, x, .08, tz, .75);
      cyl(g, .38, .06, tx, .62, tz, stone); cyl(g, .08, .56, tx, .32, tz, metal);
      for (const x of [tx - .8, tx + .8]) {
        box(g, .55, .1, .6, x, .45, tz, fabric); box(g, .55, .5, .08, x, .7, tz - .3, oak);
        for (const dx of [-.2, .2]) for (const dz of [-.2, .2]) box(g, .035, .4, .035, x + dx, .22, tz + dz, wood);
      }
    }
    const interiors = Object.fromEntries(Object.entries(PLANS).map(([type, plan]) => [type, makePlan(type, {...plan})]));
    const inventoryTypes = new Map((inventory || []).map(u => [String(u.id), u.type]));
    let typology = 'suite', activeInterior = interiors.suite, activeSlot = SLOTS[0];
    activeInterior.group.visible = true;
    /* The whole floor around the apartment: slab, corridor, lift lobby and stair, plus the five
       neighbouring homes as cut-away shells. The levels below stay visible (same façade as the
       exterior) and everything from this floor up is cut away. */
    const plate = new T.Group(); home.add(plate);
    const corridorFloor = mat('corridor', '#a99f8c', {roughness: .5, surface: 'paving'});
    box(plate, FLOOR.w, .27, FLOOR.d, 0, -.145, 0, stone);
    box(plate, FLOOR.w - .3, .03, FLOOR.d - .3, 0, -.03, 0, corridorFloor);
    {
      const [cx0, cx1] = FLOOR.core, [sx0, sx1] = FLOOR.stair, [c0, c1] = FLOOR.corridor, coreX = (cx0 + cx1) / 2;
      // Lift core: two cars facing the corridor, then services and shafts up to the façade.
      const sd = FLOOR.front - c1 - 2.3, szc = (c1 + 2.3 + FLOOR.front) / 2;
      for (const x of [cx0 + .1, cx1 - .1]) box(plate, .2, 1.1, sd, x, .55, szc, stone);
      box(plate, cx1 - cx0, 1.1, .2, coreX, .55, FLOOR.front - .1, stone);
      box(plate, .15, 1.1, sd, coreX, .55, szc, stone);
      for (const x of [cx0 + 1.05, cx1 - 1.05]) box(plate, 1.7, .02, sd - .4, x, .01, szc, dark);
      for (const [i, x] of [[0, cx0 + 1.05], [1, cx1 - 1.05]]) {
        box(plate, 2, 2.8, .2, x, 1.4, c1 + 2.2, stone);
        box(plate, .15, 2.8, 2.2, i ? cx1 - .07 : cx0 + .07, 1.4, c1 + 1.1, stone);
        box(plate, 1.6, 2.6, 1.9, x, 1.3, c1 + 1.15, dark);
        for (const dx of [-.76, .76]) box(plate, .48, 2.8, .15, x + dx, 1.4, c1 + .07, stone);
        box(plate, 1.04, .7, .15, x, 2.45, c1 + .07, stone);
        box(plate, .5, 2.1, .04, x - .26, 1.05, c1 + .02, brass); box(plate, .5, 2.1, .04, x + .26, 1.05, c1 + .02, brass);
      }
      box(plate, .15, 2.8, 2.2, coreX, 1.4, c1 + 1.1, stone);
      box(plate, .1, .14, .05, coreX, 1.2, c1 + .03, glow);
      // Stair: a flight up to the half landing beside the opening of the flight down.
      const sz = (FLOOR.back + c0) / 2, sw = sx1 - sx0;
      box(plate, .15, 1.1, c0 - FLOOR.back, sx0 + .07, .55, sz, stone);
      box(plate, sw, 1.1, .15, (sx0 + sx1) / 2, .55, FLOOR.back + .07, stone);
      box(plate, sw - 1, 1.1, .15, sx0 + .5 + (sw - 1) / 2 + .5, .55, c0 - .07, stone);
      for (let i = 0; i < 9; i++) box(plate, .95, .175 * (i + 1), .28, sx0 + .62, .0875 * (i + 1), -1.4 - i * .28, lightStone);
      box(plate, sw - .3, .18, 1.6, (sx0 + sx1) / 2, 1.575 - .09, -4.78, lightStone);
      box(plate, .95, .02, 2.5, sx1 - .62, .005, -2.65, dark);
      box(plate, .05, 1, 2.5, sx1 - 1.12, .5, -2.65, metal);
      // Corridor ends in glazing; recessed lights mark the route to each door.
      for (const sx of [-1, 1]) box(plate, .12, 2.6, c1 - c0, sx * (FLOOR.w / 2 - .06), 1.3, (c0 + c1) / 2, homeGlass);
      for (let x = -12; x <= 12; x += 3) box(plate, .5, .02, .5, x, .005, (c0 + c1) / 2, interiorLed);
    }
    merge(plate);
    // The five neighbouring homes, rebuilt and merged whenever the apartment changes slot.
    const shellRoot = new T.Group();
    plate.add(shellRoot);
    let shellFor = -1;
    function buildShells(pos) {
      if (shellFor === pos) return;
      shellFor = pos;
      for (const c of [...shellRoot.children]) { shellRoot.remove(c); if (c.isMesh) c.geometry.dispose(); }
      for (const sl of SLOTS) {
        if (sl.pos === pos) continue;
        const g = new T.Group();
        g.position.set(sl.x, 0, sl.z); g.rotation.y = sl.side > 0 ? 0 : Math.PI;
        shellRoot.add(g);
        makePlan(sl.type, PLANS[sl.type], false, g);
      }
      merge(shellRoot);
      for (const c of [...shellRoot.children]) if (!c.isMesh) shellRoot.remove(c);
    }
    buildShells(0);
    // Plan-local positions and cameras, mapped onto the floor at the apartment's slot.
    const local = new T.Vector3();
    function onFloor(view) {
      const a = activeInterior.group.rotation.y;
      local.set(view.x, 0, view.z).applyAxisAngle(T.Object3D.DefaultUp, a).add(activeInterior.group.position);
      return {...view, x: local.x, z: local.z, theta: view.theta + a};
    }

    const interiorsApi = {
      get typology() { return typology; },
      get beds() { return activeInterior.beds; },
      rooms: () => Object.keys(activeInterior.views),
      has: room => !!activeInterior.views[room],
      // Shows the furnished plan for the unit's typology (or the sample suite); true when the plan changed.
      select(unit) {
        const next = interiors[inventoryTypes.get(unit?.userData.unitId) || 'suite'] || interiors.suite, changed = next !== activeInterior;
        activeInterior.group.visible = false;
        activeInterior = next;
        typology = activeInterior.group.userData.typology;
        activeInterior.group.visible = true;
        return changed;
      },
      // The apartment opens in its own slot on the floor: the chosen unit's, or for a sample view the
      // first slot of that typology. Its shell steps aside for the furnished plan. True when the slot changed.
      place(unit) {
        const before = activeSlot;
        activeSlot = unit ? SLOTS[unit.userData.pos] : SLOTS.find(sl => sl.type === typology) || SLOTS[0];
        const g = activeInterior.group;
        g.position.set(activeSlot.x, 0, activeSlot.facade - activeSlot.side * activeInterior.d / 2);
        g.rotation.y = activeSlot.side > 0 ? 0 : Math.PI;
        buildShells(activeSlot.pos);
        return activeSlot !== before;
      },
      // Views and points are relative to the floor the apartment sits on; the viewer adds its height.
      lamps: () => ['living', 'kitchen', 'bedroom', 'terrace'].map(key => onFloor(activeInterior.views[key])),
      // The overview frames the apartment with the corridor, core and neighbours around it, seen from its
      // own façade so its terrace faces the camera.
      overview(aspect) {
        const s = activeSlot, {w: pw, d: pd} = activeInterior, cz = s.facade - s.side * pd / 2;
        const r = ViewerControls.fitDistance(Math.max(pw, pd) * 1.7 + 5, 5, pd + 6, aspect, 40) * .92;
        return {x: s.x * .8, y: 0, z: cz * .6, theta: s.side > 0 ? .38 : Math.PI + .38, phi: .84, r, fov: 40};
      },
      view: room => ({...onFloor(activeInterior.views[room]), fov: 56}),
      entry() { const v = onFloor({x: 0, z: activeInterior.d / 2, theta: .18}); return {...v, y: 1.4, phi: 1.38, r: 24, fov: 46}; },
      spots: current => Object.entries(activeInterior.spots).filter(([key]) => key !== current).map(([key, p]) => { const q = onFloor({x: p[0], z: p[2], theta: 0}); return [key, q.x, p[1], q.z]; }),
    };

    return {
      root: building, levels, units,
      floorY, floors: {min: 2, max: 13, default: 7},
      amenities: AMENITIES,
      // Camera framing and shadow coverage for the exterior.
      frame: {width: 30, height: 48, depth: 22, y: 21, yCompact: 23, x: 0, z: 0, sunTarget: [0, 18, 0], sunSpan: 62, floorRadius: [60, 74]},
      // The unit the camera approaches when entering a floor with nothing selected.
      frontUnit: floor => units.find(u => u.userData.unitId === `${floor}02`),
      interiors: interiorsApi,
      applyLight(night) { lobbyGlass.emissiveIntensity = smooth(.1, 1, night) * .7; },
    };
  }

  return {footprint: [28, 18.2], build, floorY, PLANS, FLOOR, SLOTS};
})();
