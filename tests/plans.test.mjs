// The demo tower's apartment plans: habitable rooms on the façade, sales areas that match the plans,
// and room cameras that stay inside the apartment they show.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {threeContext} from '../site/lib/three-node.mjs';

const data = JSON.parse(readFileSync(new URL('../site/data/demo-data.json', import.meta.url)));
const residencia = data.projects.find(p => p.name === 'Residencia 01');
const context = threeContext(['viewer-kit.js', 'building-tower.js']);
const {PLANS, SLOTS} = context.TowerBuilding;

test('every unit lists the interior and terrace area of its plan', () => {
  for (const u of residencia.units) {
    assert.equal(u.m2, PLANS[u.type].area, `unit ${u.id} area`);
    assert.equal(u.terrace, PLANS[u.type].terrace, `unit ${u.id} terrace`);
  }
  assert.equal(PLANS.depa3.area, 103.2);
});

test('the living room and every bedroom share the glazed façade; service rooms line the corridor', () => {
  for (const [type, plan] of Object.entries(PLANS)) {
    const edges = [plan.living[0], plan.living[1], ...plan.rooms.flatMap(r => [r.x0, r.x1])];
    assert.equal(edges[0], -plan.w / 2, `${type} starts at the party wall`);
    assert.equal(edges.at(-1), plan.w / 2, `${type} ends at the party wall`);
    for (let i = 1; i < edges.length - 1; i += 2) assert.equal(edges[i], edges[i + 1], `${type} rooms are contiguous along the façade`);
    assert.ok(plan.band >= 3.3 && plan.zb < plan.d / 2, `${type} façade band is deep enough for a bedroom`);
    assert.ok(plan.living[1] - plan.living[0] >= 3.4, `${type} living room is at least 3.4 m wide`);
    for (const r of plan.rooms) {
      assert.ok(r.x1 - r.x0 >= 2.5, `${type} bedroom is at least 2.5 m wide`);
      assert.ok(r.bx - r.bed / 2 > r.x0 && r.bx + r.bed / 2 < r.x1, `${type} bed fits its room`);
    }
    assert.ok(plan.bath[1] + 1.05 <= plan.zb + .1, `${type} bathroom stays on the corridor side`);
    assert.ok(plan.kz < plan.zb, `${type} kitchen stays on the corridor side`);
  }
});

test('room cameras stay inside the apartment, on desktop and on a phone', () => {
  const T = context.THREE, kit = context.ViewerKit.create(T), home = new T.Group();
  const inventory = residencia.units.map(u => ({id: u.id, type: u.type}));
  const building = context.TowerBuilding.build(kit, {home, inventory, unitMaterial: kit.mat('unit', '#334455')});
  const {interiors} = building;
  for (const type of Object.keys(PLANS)) {
    const unit = building.units.find(u => inventory.find(i => i.id === u.userData.unitId)?.type === type);
    interiors.select(unit); interiors.place(unit);
    const slot = SLOTS[unit.userData.pos];
    const zRange = slot.side > 0 ? [slot.facade - slot.d, slot.facade] : [slot.facade, slot.facade + slot.d];
    for (const room of interiors.rooms().filter(r => r !== 'overview')) for (const aspect of [1.6, .46]) {
      const v = interiors.view(room, aspect), s = Math.sin(v.phi);
      const x = v.x + v.r * s * Math.sin(v.theta), z = v.z + v.r * s * Math.cos(v.theta);
      assert.ok(x > slot.x0 && x < slot.x0 + slot.w && z > zRange[0] && z < zRange[1], `${type} ${room} camera at aspect ${aspect} is inside (${x.toFixed(2)}, ${z.toFixed(2)})`);
    }
  }
});
