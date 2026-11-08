// The glTF building path: a model exported in metres with level_/unit_/hotspot_ nodes is read into the
// same interface as the demo tower, and the real viewer runs on it (with a stand-in WebGL renderer).
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {threeContext, parseGlb} from '../site/lib/three-node.mjs';
import {exportTower} from '../site/tools/export-tower.mjs';
import {checkBuilding} from '../site/tools/check-building.mjs';

// Arrays made inside the VM context belong to another realm; copy them before deep comparisons.
const plain = value => JSON.parse(JSON.stringify(value));

const exported = await exportTower();

/** Runs the viewer on a building inside a context with a fake renderer; returns the API and helpers. */
function viewer(context, building, options = {}) {
  let frame = null, now = 0;
  const renders = [], anchors = [];
  class Renderer { constructor() { this.shadowMap = {}; this.info = {render: {calls: 0, triangles: 0}}; } setPixelRatio() {} setSize() {} render(scene, camera) { renders.push({scene, camera}); } dispose() {} }
  class Observer { observe() {} disconnect() {} }
  Object.assign(context, {ResizeObserver: Observer, IntersectionObserver: Observer, requestAnimationFrame: f => (frame = f, 1), cancelAnimationFrame() { frame = null; },
    document: {hidden: false, addEventListener() {}, removeEventListener() {}}, performance: {now: () => now},
    matchMedia: q => ({matches: q.includes('reduced-motion')}), ViewerControls: {fitDistance: () => 90, bind: () => ({cancel() {}})}});
  const canvas = {dataset: {}, parentElement: {getBoundingClientRect: () => ({width: 900, height: 580})}};
  const api = context.Architecture.create({...context.THREE, WebGLRenderer: Renderer}, canvas, () => {}, {onRender: list => anchors.splice(0, anchors.length, ...list), building, ...options});
  const flush = (count = 4) => { for (let i = 0; i < count && frame; i++) { now += 1000 / 60; const f = frame; frame = null; f(); } };
  flush();
  return {api, canvas, anchors, flush, camera: () => renders.at(-1).camera, scene: () => renders.at(-1).scene};
}

async function loadExported() {
  const context = threeContext(['viewer-kit.js', 'viewer-site.js', 'building-tower.js', 'building-gltf.js', 'architecture.js']);
  const gltf = await parseGlb(context, exported.glb);
  return {context, source: context.GltfBuilding.fromScene(context.THREE, gltf.scene, exported.manifest)};
}

test('the demo tower survives export to glTF: levels, units, hotspots and floor heights', async () => {
  const {context, source} = await loadExported();
  assert.equal(source.report.levels, 14); assert.equal(source.report.units, 72); assert.equal(source.report.hotspots, 4);
  assert.deepEqual(plain(source.report.warnings), []);
  const building = source.build(context.ViewerKit.create(context.THREE));
  assert.deepEqual([building.floors.min, building.floors.max, building.floors.default], [2, 13, 7]);
  for (const n of [2, 7, 13]) assert.ok(Math.abs(building.floorY(n) - context.TowerBuilding.floorY(n)) < 1e-4, `floor ${n}`);
  const u705 = building.units.find(u => u.userData.unitId === '705');
  assert.equal(u705.userData.floor, 7); assert.ok(Math.abs(Math.abs(u705.userData.facing) - Math.PI) < 1e-6, 'back-row unit faces -z');
  assert.deepEqual(plain(Object.keys(building.amenities).sort()), ['garden', 'lobby', 'pool', 'terraces']);
});

test('the viewer runs on the glTF building: floors open, availability paints, hotspots project, no interior', async () => {
  const {source, context} = await loadExported();
  const v = viewer(context, source);
  assert.equal(v.api.capabilities.interiors, false); assert.deepEqual(plain(v.api.capabilities.floors), [2, 13]);
  const keys = v.anchors.filter(a => a.show).map(a => a.key);
  for (const key of ['amenity:pool', 'amenity:lobby']) assert.ok(keys.includes(key), key);
  v.api.focusFloor(7); v.flush();
  assert.deepEqual(plain(v.anchors.filter(a => a.key.startsWith('unit:')).map(a => a.key).sort()), ['701', '702', '703', '704', '705', '706'].map(id => 'unit:' + id));
  const find = id => { let found; v.scene().traverse(o => { if (o.userData.unitId === id) found = o; }); return found; };
  assert.equal(find('805').material.name, 'ghost'); assert.notEqual(find('705').material.name, 'ghost');
  v.api.paint({'705': 'available', '706': 'sold'}); v.flush();
  assert.equal(find('705').material.name, 'available'); assert.equal(find('701').material.name, 'dim');
  v.api.select('705', false); v.api.setMode('interior', 'living'); v.flush(30);
  assert.equal(v.api.state().mode, 'building', 'no furnished plans, so the viewer stays outside');
  assert.ok(Number.isFinite(v.camera().position.x));
  v.api.dispose();
});

test('a hand-made model is read by node names alone, and multi-part units become one pickable mesh', async () => {
  const context = threeContext(['viewer-kit.js', 'building-gltf.js']), T = context.THREE;
  const model = new T.Group();
  for (const n of [1, 2, 3]) {
    const level = new T.Group(); level.name = `level_${n}`; level.position.y = (n - 1) * 3;
    level.add(new T.Mesh(new T.BoxGeometry(20, .3, 12), new T.MeshStandardMaterial({name: 'slab'})));
    if (n > 1) for (const [i, z] of [[1, 4], [2, -4]]) {
      const unit = new T.Group(); unit.name = `unit_${n}0${i}`; unit.position.set(0, 1.5, z);
      unit.add(new T.Mesh(new T.BoxGeometry(8, 2.6, 3), new T.MeshStandardMaterial({name: 'glass'})), new T.Mesh(new T.BoxGeometry(8, .1, 1), new T.MeshStandardMaterial({name: 'rail'})));
      level.add(unit);
    }
    model.add(level);
  }
  const pool = new T.Object3D(); pool.name = 'hotspot_pool'; pool.position.set(0, 9.5, 0); model.children.at(-1).add(pool);
  const glb = await new Promise(resolve => new T.GLTFExporter().parse(model, resolve, {binary: true}));
  const source = context.GltfBuilding.fromScene(T, (await parseGlb(context, Buffer.from(glb))).scene);
  const building = source.build(context.ViewerKit.create(T));
  assert.deepEqual(plain(building.units.map(u => u.userData.unitId)), ['201', '202', '301', '302']);
  assert.ok(building.units.every(u => u.isMesh), 'each unit is one mesh');
  assert.deepEqual(plain(building.units.map(u => u.userData.floor)), [2, 2, 3, 3]);
  assert.ok(Math.cos(building.units[0].userData.facing) > .9 && Math.cos(building.units[1].userData.facing) < -.9, 'facing comes from the side of the building');
  assert.ok(Math.abs(building.floorY(3) - building.floorY(2) - 3) < .01);
  assert.ok(building.amenities.pool && !building.amenities.pool.normal, 'a rooftop hotspot is visible from any side');
});

test('the package checker reports homes missing from the model', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'building-'));
  writeFileSync(join(dir, 'building.glb'), exported.glb);
  writeFileSync(join(dir, 'building.json'), JSON.stringify(exported.manifest));
  const ok = await checkBuilding(join(dir, 'building.json'));
  assert.deepEqual(plain(ok.errors), []); assert.equal(ok.units, 72); assert.equal(ok.levels.length, 14);
  const missing = await checkBuilding(join(dir, 'building.json'), ['705', '1401']);
  assert.ok(missing.errors.some(e => e.includes('1401')), 'unit sold but not modelled');
  assert.ok(missing.errors.some(e => e.includes('in the model but not in the inventory')));
});

test('model materials never replace the viewer palette, and night glow uses the model material', async () => {
  const {context, source} = await loadExported();
  const kit = context.ViewerKit.create(context.THREE), paletteGlass = kit.palette.glass;
  const building = new Promise(resolve => resolve(source.build(kit)));
  const b = await building;
  assert.equal(kit.materials.glass, paletteGlass, 'palette entry kept');
  const lobby = Object.values(kit.materials).find(m => m.name === 'lobbyGlass');
  assert.ok(lobby, 'model material registered');
  b.applyLight(1); assert.ok(lobby.emissiveIntensity > .5); b.applyLight(0); assert.ok(lobby.emissiveIntensity < .1);
});
