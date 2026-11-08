// Checks a building package (building.json + its .glb) the way the viewer will read it, before publishing.
// Usage: node site/tools/check-building.mjs <path/to/building.json> [--units ids.json]
//   --units: a JSON array of the unit ids sold in the project; reports homes missing from the model.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { threeContext, parseGlb } from '../lib/three-node.mjs';

export async function checkBuilding(manifestPath, expectedUnits = null) {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const context = threeContext(['viewer-kit.js', 'building-gltf.js']);
  const T = context.THREE, gltf = await parseGlb(context, readFileSync(join(dirname(manifestPath), manifest.model || 'building.glb')));
  const source = context.GltfBuilding.fromScene(T, gltf.scene, manifest);
  const building = source.build(context.ViewerKit.create(T));
  const errors = [...source.report.warnings];
  const ids = building.units.map(u => u.userData.unitId), duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (duplicates.length) errors.push(`Duplicate unit ids: ${[...new Set(duplicates)].join(', ')}`);
  const perFloor = {};
  for (const u of building.units) (perFloor[u.userData.floor] ??= []).push(u.userData.unitId);
  if (expectedUnits) {
    const missing = expectedUnits.map(String).filter(id => !ids.includes(id)), extra = ids.filter(id => !expectedUnits.map(String).includes(id));
    if (missing.length) errors.push(`Units in the inventory but not in the model: ${missing.join(', ')}`);
    if (extra.length) errors.push(`Units in the model but not in the inventory: ${extra.join(', ')}`);
  }
  if (!building.levels.some(l => l.n > 1)) errors.push('No level_<n> nodes: floors cannot be opened one by one.');
  return {
    name: manifest.name, size: source.report.size,
    levels: building.levels.map(l => ({n: l.n, elevation: +building.floorY(l.n).toFixed(2)})),
    floors: building.floors, units: ids.length, perFloor, hotspots: Object.keys(building.amenities), errors,
  };
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file://').href) {
  const [path, flag, unitsFile] = process.argv.slice(2);
  if (!path) { console.error('Usage: node site/tools/check-building.mjs <building.json> [--units ids.json]'); process.exit(2); }
  const result = await checkBuilding(path, flag === '--units' ? JSON.parse(readFileSync(unitsFile, 'utf8')) : null);
  console.log(`${result.name}: ${result.size.join(' × ')} m, ${result.levels.length} levels, ${result.units} units, hotspots: ${result.hotspots.join(', ') || 'none'}`);
  for (const [floor, list] of Object.entries(result.perFloor)) console.log(`  floor ${floor}: ${list.join(' ')}`);
  for (const error of result.errors) console.log(`  ✗ ${error}`);
  process.exit(result.errors.length ? 1 : 0);
}
