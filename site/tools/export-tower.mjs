// Exports the demo tower (exterior, floors, units, hotspots) as a building package: building.glb +
// building.json. It shows what a client package looks like and exercises the glTF path end to end.
// Usage: node site/tools/export-tower.mjs <output-folder>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { threeContext } from '../lib/three-node.mjs';

export async function exportTower() {
  const context = threeContext(['viewer-kit.js', 'building-tower.js']);
  const T = context.THREE, kit = context.ViewerKit.create(T);
  const building = context.TowerBuilding.build(kit, {home: new T.Group(), inventory: [], unitMaterial: kit.mat('unitGlass', '#33495a', {roughness: .06, metalness: .55})});
  // Name nodes the way an architect's export would: level_<n>, unit_<id>, hotspot_<key>.
  for (const l of building.levels) { l.group.name = `level_${l.n}`; l.group.userData.elevation = building.floorY(l.n); }
  for (const u of building.units) { u.name = `unit_${u.userData.unitId}`; u.userData = {unitId: u.userData.unitId, floor: u.userData.floor, facing: u.userData.facing}; }
  for (const [key, a] of Object.entries(building.amenities)) {
    const marker = new T.Object3D();
    marker.name = `hotspot_${key}`;
    marker.position.set(...a.at);
    marker.userData = {view: a.view, ...(a.normal ? {normal: a.normal} : {})};
    building.levels.at(-1).group.add(marker);
  }
  building.root.name = 'Residencia 01';
  const glb = await new Promise(resolve => new T.GLTFExporter().parse(building.root, resolve, {binary: true}));
  const manifest = {
    version: 1, name: 'Residencia 01', model: 'building.glb',
    floors: {default: 7},
    frame: building.frame,
    night: {materials: ['lobbyGlass'], color: '#ffcf96', intensity: .7},
  };
  return {glb: Buffer.from(glb), manifest};
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file://').href) {
  const out = process.argv[2] || 'tower-package';
  const {glb, manifest} = await exportTower();
  mkdirSync(out, {recursive: true});
  writeFileSync(join(out, 'building.glb'), glb);
  writeFileSync(join(out, 'building.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(`Wrote ${out}/building.glb (${(glb.length / 1024).toFixed(0)} KB) and building.json`);
}
