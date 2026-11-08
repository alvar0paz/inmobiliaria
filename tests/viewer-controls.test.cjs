const test = require('node:test');
const assert = require('node:assert/strict');
const {gestures,wheelScale,fitDistance} = require('../public/viewer-controls.js');
function fixture(){
 const result={rotations:[],zooms:[],taps:[],active:[]};
 const control=gestures({rotate:(...v)=>result.rotations.push(v),zoom:v=>result.zooms.push(v),tap:e=>result.taps.push(e.pointerId),active:v=>result.active.push(v)});
 return {control,result};
}
const pointer=(id,x,y,type='touch')=>({pointerId:id,clientX:x,clientY:y,pointerType:type,button:0});
test('a tap selects once; small hand jitter does not move the camera',()=>{
 const {control:c,result:r}=fixture();c.down(pointer(1,100,100));c.move(pointer(1,102,103));c.up(pointer(1,102,103));c.up(pointer(1,102,103),true);
 assert.deepEqual(r.taps,[1]);assert.deepEqual(r.rotations,[]);assert.equal(c.active,false);
});
test('dragging and returning to the origin never selects a unit',()=>{
 const {control:c,result:r}=fixture();c.down(pointer(1,0,0));c.move(pointer(1,30,10));c.move(pointer(1,0,0));c.up(pointer(1,0,0));
 assert.deepEqual(r.taps,[]);assert.deepEqual(r.rotations,[[30,10],[-30,-10]]);
});
test('pinch zoom remains a gesture after either finger is released',()=>{
 for(const released of [1,2]){
  const {control:c,result:r}=fixture();c.down(pointer(1,0,0));c.down(pointer(2,100,0));c.move(pointer(2,200,0));
  c.up(pointer(released,released===1?0:200,0));const other=released===1?2:1;const x=other===1?0:200;
  c.move(pointer(other,x+10,5));c.up(pointer(other,x+10,5));
  assert.deepEqual(r.zooms,[.5]);assert.deepEqual(r.taps,[]);assert.deepEqual(r.rotations,[[10,5]]);assert.equal(c.active,false);
 }
});
test('cancelled/lost pointers and tab blur do not leave a stuck drag or select',()=>{
 const {control:c,result:r}=fixture();c.down(pointer(1,0,0));c.up(pointer(1,0,0),true);c.down(pointer(2,10,10));c.cancel();c.move(pointer(2,30,30));c.up(pointer(2,30,30));
 assert.deepEqual(r.taps,[]);assert.deepEqual(r.rotations,[]);assert.equal(c.active,false);
 c.down(pointer(3,10,10));c.up(pointer(3,10,10));assert.deepEqual(r.taps,[3]);
});
test('secondary mouse clicks do not activate the viewer',()=>{
 const {control:c,result:r}=fixture();assert.equal(c.down({...pointer(1,0,0,'mouse'),button:2}),false);assert.equal(c.active,false);assert.deepEqual(r.active,[]);
});
test('wheel normalization supports pixel, line and page deltas without inversion',()=>{
 assert.equal(wheelScale(16),wheelScale(1,1));assert.equal(wheelScale(800),wheelScale(1,2,800));
 for(const delta of [-1e6,-100,0,100,1e6])assert.ok(wheelScale(delta)>0&&Number.isFinite(wheelScale(delta)));
 assert.ok(wheelScale(-1e6)<1);assert.ok(wheelScale(1e6)>1);assert.equal(wheelScale(0),1);
});
test('portrait framing fits the full network and remains finite at narrow sizes',()=>{
 const landscape=fitDistance(100,66,35,1.5),portrait=fitDistance(100,66,35,.65);
 assert.ok(portrait>landscape);assert.ok(Number.isFinite(fitDistance(100,66,35,0)));
 assert.ok(fitDistance(100,66,35,.65)>fitDistance(28,46,22,.65));
});
