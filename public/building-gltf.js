/* A client's building from a glTF model (.glb) plus an optional JSON manifest, adapted to the viewer's
   BUILDING INTERFACE (see architecture.js). The model is prepared from the approved drawings in any 3D
   tool (SketchUp, Revit, ArchiCAD, Blender) and exported in metres, Y up. The full guide, with naming
   rules and the manifest format, is docs/building-package.md.

   What the viewer reads from the model, by node name or by glTF "extras" (custom properties):
     level_<n>      a node per floor (n = floor number); the floor-by-floor opening lifts these.
     unit_<id>      a mesh (or group) per home: the volume the buyer picks and that turns colour.
     hotspot_<key>  an empty where a point of interest sits (pool, lobby, terraces...).
   Everything else is static architecture: kept with its own materials and merged per material.
   This version shows the exterior, floors and units; furnished interiors stay with the demo tower. */
window.GltfBuilding = (() => {
  'use strict';
  const LEVEL = /^level[_-]?(\d+)$/i, UNIT = /^unit[_-]?([\w.-]+)$/i, HOTSPOT = /^hotspot[_-]?([\w-]+)$/i;

  /** Loads manifest + model; resolves to a building the viewer can show (options.building). */
  async function load(T, manifestUrl) {
    if (!T.GLTFLoader) throw new Error('GLTFLoader is not loaded');
    const manifest = await (await fetch(manifestUrl)).json();
    const modelUrl = new URL(manifest.model || 'building.glb', new URL(manifestUrl, location.href)).href;
    const gltf = await new T.GLTFLoader().loadAsync(modelUrl);
    return fromScene(T, gltf.scene, manifest);
  }

  /** Reads levels, units and hotspots from a loaded scene; returns {footprint, build, report}. */
  function fromScene(T, model, manifest = {}) {
    model.updateMatrixWorld(true);
    const box = new T.Box3().setFromObject(model), size = box.getSize(new T.Vector3()), center = box.getCenter(new T.Vector3());
    const tag = (o, re, key) => o.userData[key] ?? (re.exec(o.name || '') || [])[1];
    const levelNodes = [], unitNodes = [], hotspotNodes = [];
    model.traverse(o => {
      if (tag(o, LEVEL, 'level') != null) levelNodes.push(o);
      else if (tag(o, UNIT, 'unitId') != null) unitNodes.push(o);
      else if (tag(o, HOTSPOT, 'hotspot') != null) hotspotNodes.push(o);
    });
    const report = {size: size.toArray().map(v => +v.toFixed(2)), levels: levelNodes.length, units: unitNodes.length, hotspots: hotspotNodes.length, warnings: []};
    if (size.y > 400 || size.y < 3) report.warnings.push(`Model is ${size.y.toFixed(1)} m tall: export in metres with Y up.`);
    if (!unitNodes.length) report.warnings.push('No unit_<id> nodes: nothing can be selected.');
    return {footprint: [size.x, size.z], report, build: kit => build(kit, T, model, manifest, {box, size, center, levelNodes, unitNodes, hotspotNodes})};
  }

  function build(kit, T, model, manifest, {box, size, center, levelNodes, unitNodes, hotspotNodes}) {
    const {smooth} = kit.util, root = new T.Group();
    root.name = manifest.name || 'building';
    const world = new T.Vector3(), local = new T.Box3();

    // Levels: every level node becomes a direct child of the root (keeping its world placement), so the
    // viewer can lift and ghost floors independently. Without level nodes the model is one level.
    const levels = [];
    const levelOf = new Map();
    for (const node of levelNodes.length ? levelNodes : [model]) {
      const n = Number(node === model ? 1 : node.userData.level ?? LEVEL.exec(node.name)[1]);
      node.updateMatrixWorld(true);
      local.setFromObject(node);
      const group = new T.Group();
      group.name = `level_${n}`;
      node.matrixWorld.decompose(group.position, group.quaternion, group.scale);
      for (const child of [...node.children]) group.add(child);
      const elevation = manifest.levels?.[n]?.elevation ?? node.userData.elevation ?? (Number.isFinite(local.min.y) ? local.min.y : 0);
      levels.push({group, n, elevation});
      levelOf.set(n, levels.at(-1));
    }
    levels.sort((a, b) => a.n - b.n);
    levels.forEach((l, i) => { l.delay = .2 + i * .085; root.add(l.group); });
    root.updateMatrixWorld(true);
    // Anything outside a level (site walls, canopies) rides with the lowest level.
    if (levelNodes.length) for (const child of [...model.children]) if (!levelNodes.includes(child)) {
      child.updateMatrixWorld(true);
      const parentInverse = new T.Matrix4().copy(levels[0].group.matrixWorld).invert();
      child.applyMatrix4(parentInverse.multiply(child.parent.matrixWorld));
      levels[0].group.add(child);
    }
    root.updateMatrixWorld(true);

    // Units: one pickable mesh each. A unit modelled as several meshes is merged into one.
    const units = [];
    for (const node of unitNodes) {
      const id = String(node.userData.unitId ?? UNIT.exec(node.name)[1]);
      const mesh = node.isMesh ? node : collapse(T, node);
      if (!mesh) continue;
      mesh.getWorldPosition(world);
      const owner = levels.find(l => isInside(l.group, mesh));
      const floor = Number(node.userData.floor ?? manifest.units?.[id]?.floor ?? owner?.n ?? 1);
      const facing = node.userData.facing ?? manifest.units?.[id]?.facing ?? Math.atan2(world.x - center.x, world.z - center.z);
      Object.assign(mesh.userData, {unitId: id, floor, facing, variant: hash(id) % 4});
      mesh.castShadow = mesh.receiveShadow = true;
      units.push(mesh);
    }
    units.sort((a, b) => a.userData.floor - b.userData.floor || a.userData.unitId.localeCompare(b.userData.unitId, undefined, {numeric: true}));
    const floors = [...new Set(units.map(u => u.userData.floor))].sort((a, b) => a - b);

    // Hotspots: empties, with an optional camera ("view" extras); otherwise a view looking back at them
    // from outside the building.
    const amenities = {};
    for (const node of hotspotNodes) {
      const key = String(node.userData.hotspot ?? HOTSPOT.exec(node.name)[1]);
      node.getWorldPosition(world);
      const out = Math.atan2(world.x - center.x, world.z - center.z), onRoof = world.y > box.max.y - 3;
      amenities[key] = {
        at: world.toArray(),
        ...(onRoof ? {} : {normal: node.userData.normal || [Math.sin(out), 0, Math.cos(out)]}),
        view: node.userData.view || manifest.hotspots?.[key]?.view || {theta: out + .3, phi: onRoof ? .85 : 1.3, r: Math.max(24, size.y * .7), x: world.x, y: world.y, z: world.z},
      };
    }

    // Static architecture: real shadows, sky reflections, and merged per material to keep draw calls low.
    const own = new Map();
    for (const l of levels) {
      l.group.traverse(o => {
        if (!o.isMesh || o.userData.unitId) return;
        o.castShadow = o.receiveShadow = true;
        for (const m of [].concat(o.material)) { kit.adopt(m); if (m.name && !own.has(m.name)) own.set(m.name, m); }
      });
      if (manifest.merge !== false) kit.merge(l.group);
    }
    // Night glow is looked up among the model's own materials, never the viewer's palette.
    const glow = (manifest.night?.materials || []).map(name => own.get(name)).filter(Boolean);
    // Dark by day; after dusk they glow in the manifest's colour (or their own emissive colour).
    glow.forEach(m => { if (manifest.night.color) m.emissive.set(manifest.night.color).convertSRGBToLinear(); m.emissiveIntensity = 0; });

    const elevations = new Map(levels.map(l => [l.n, l.elevation]));
    const floorY = n => elevations.get(n) ?? (levels.length > 1 ? interpolate(levels, n) : 0);
    const def = floors[Math.floor(floors.length / 2)] ?? 1, span = Math.max(size.x, size.z);
    return {
      root, levels, units, floorY, amenities,
      floors: {min: floors[0] ?? 1, max: floors.at(-1) ?? 1, default: manifest.floors?.default ?? def},
      frame: {
        width: size.x + 2, height: box.max.y + 6, depth: size.z + 4, x: center.x, z: center.z,
        y: box.max.y * .44, yCompact: box.max.y * .48,
        sunTarget: [center.x, box.max.y * .375, center.z], sunSpan: Math.max(span, box.max.y) * 1.3,
        floorRadius: [span * 2.15, span * 2.65], ...manifest.frame,
      },
      frontUnit: floor => units.find(u => u.userData.floor === floor && Math.cos(u.userData.facing) > .5) || units.find(u => u.userData.floor === floor),
      applyLight(night) { glow.forEach(m => { m.emissiveIntensity = smooth(.1, 1, night) * (manifest.night.intensity ?? 1); }); },
    };
  }

  function isInside(group, o) { for (let p = o; p; p = p.parent) if (p === group) return true; return false; }
  function interpolate(levels, n) {
    const known = levels.filter(l => Number.isFinite(l.elevation)), a = known[0], b = known.at(-1);
    return b.n === a.n ? a.elevation : a.elevation + (n - a.n) * (b.elevation - a.elevation) / (b.n - a.n);
  }
  function hash(text) { let h = 0; for (const c of text) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; }

  // Several meshes under one unit node become a single mesh in that node's place.
  function collapse(T, node) {
    const parts = [];
    node.updateMatrixWorld(true);
    const inverse = new T.Matrix4().copy(node.matrixWorld).invert();
    node.traverse(o => { if (o.isMesh) parts.push(o); });
    if (!parts.length) return null;
    let count = 0;
    for (const p of parts) count += (p.geometry.index || p.geometry.attributes.position).count;
    const position = new Float32Array(count * 3), normal = new Float32Array(count * 3), v = new T.Vector3(), m = new T.Matrix4(), nm = new T.Matrix3();
    let at = 0;
    for (const p of parts) {
      const g = p.geometry.index ? p.geometry.toNonIndexed() : p.geometry, pos = g.attributes.position, nor = g.attributes.normal;
      m.multiplyMatrices(inverse, p.matrixWorld); nm.getNormalMatrix(m);
      for (let i = 0; i < pos.count; i++, at++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(m); position.set([v.x, v.y, v.z], at * 3);
        if (nor) { v.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize(); normal.set([v.x, v.y, v.z], at * 3); }
      }
    }
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.BufferAttribute(position, 3));
    geometry.setAttribute('normal', new T.BufferAttribute(normal, 3));
    const mesh = new T.Mesh(geometry, parts[0].material);
    mesh.name = node.name;
    mesh.userData = {...node.userData};
    node.matrix.decompose(mesh.position, mesh.quaternion, mesh.scale);
    node.parent.add(mesh);
    node.parent.remove(node);
    return mesh;
  }

  return {load, fromScene};
})();
