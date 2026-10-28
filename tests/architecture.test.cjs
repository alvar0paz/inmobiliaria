const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const THREE=require('../dist/vendor/three.min.js');
function fixture(options={}){
 const renders=[],anchors=[];let frame,now=0;
 class Renderer {constructor(){this.shadowMap={};this.info={render:{calls:0,triangles:0}}}setPixelRatio(){}setSize(){}render(scene,camera){renders.push({scene,camera})}dispose(){this.disposed=true}}
 class Observer{observe(){}disconnect(){}}
 const canvas={dataset:{},parentElement:{getBoundingClientRect:()=>({width:options.width||900,height:options.height||580})}};
 const window={};const context={window,devicePixelRatio:2,performance:{now:()=>now},matchMedia:q=>({matches:q.includes("reduced-motion")?options.reduced!==false:!!options.compact}),ResizeObserver:Observer,IntersectionObserver:Observer,document:{hidden:false,addEventListener(){},removeEventListener(){}},requestAnimationFrame:f=>(frame=f,1),cancelAnimationFrame(){frame=null},ViewerControls:{fitDistance:()=>90,bind:()=>({cancel(){}})}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../dist/architecture.js'),'utf8'),context);
 const api=window.Architecture.create({...THREE,WebGLRenderer:Renderer},canvas,()=>{},{onRender:list=>anchors.splice(0,anchors.length,...list),...options});
 function flush(count=4){for(let i=0;i<count&&frame;i++){now+=1000/60;const f=frame;frame=null;f()}}
 flush();return{api,canvas,renders,flush,anchors,floorY:window.Architecture.floorY,scene:()=>renders.at(-1).scene};
}
const unit=(scene,id)=>{let found;scene.traverse(o=>{if(o.userData.unitId===id)found=o});return found};
test('building has a selectable mesh for every inventory unit',()=>{const f=fixture(),scene=f.renders.at(-1).scene,ids=[];scene.traverse(o=>{if(o.userData.unitId)ids.push(o.userData.unitId)});assert.equal(ids.length,72);assert.equal(new Set(ids).size,72);for(let floor=2;floor<=13;floor++)for(let n=1;n<=6;n++)assert.ok(ids.includes(`${floor}0${n}`));f.api.dispose()});
test('room views and lighting render real scene changes with finite cameras',()=>{const f=fixture();for(const room of ['overview','living','kitchen','bedroom','terrace']){f.api.setMode('interior',room);f.flush();assert.equal(f.canvas.dataset.room,room);assert.equal(f.canvas.dataset.mode,'interior');const shot=f.renders.at(-1);assert.ok(shot.camera.position.toArray().every(Number.isFinite));assert.equal(shot.scene.children[0].visible,false);assert.equal(shot.scene.children[1].visible,true)}const before=f.renders.at(-1).scene.background.getHex();f.api.lighting(2);f.flush();assert.notEqual(f.renders.at(-1).scene.background.getHex(),before);f.api.setMode('building');f.api.select('705');f.flush();assert.ok(f.renders.at(-1).camera.position.z<0);f.api.dispose()});
test('static geometry is merged so the whole scene stays within a draw-call budget',()=>{const f=fixture();let meshes=0;f.scene().traverse(o=>{if(o.isMesh||o.isPoints)meshes++});assert.ok(meshes<320,`${meshes} meshes`);f.api.dispose()});
test('focusing a floor lifts and ghosts every level above it and keeps lower floors solid',()=>{
 const f=fixture(),building=f.scene().children[0].children[0],levels=building.children;
 f.api.focusFloor(7);f.flush();
 // levels: lobby, floors 2–13, roof
 assert.equal(levels[6].position.y,0);assert.ok(levels[7].position.y>5);assert.ok(levels[13].position.y>levels[7].position.y);
 assert.ok(levels[8].children.some(o=>o.isMesh&&o.material.name==='ghost'));assert.ok(levels[6].children.every(o=>o.material.name!=='ghost'));
 assert.equal(unit(f.scene(),'805').material.name,'ghost');assert.notEqual(unit(f.scene(),'705').material.name,'ghost');
 assert.deepEqual(f.anchors.filter(a=>a.key.startsWith('unit:')).map(a=>a.key).sort(),['701','702','703','704','705','706'].map(id=>'unit:'+id));
 f.api.focusFloor(null);f.flush();
 assert.ok(levels.every(l=>l.position.y===0));assert.ok(levels[8].children.every(o=>o.material.name!=='ghost'));f.api.dispose()});
test('availability paint follows status, filters and selection',()=>{
 const f=fixture(),scene=f.scene();
 f.api.paint({'705':'available','706':'sold','704':'reserved'});f.flush();
 assert.equal(unit(scene,'705').material.name,'available');assert.equal(unit(scene,'706').material.name,'sold');assert.equal(unit(scene,'704').material.name,'reserved');assert.equal(unit(scene,'701').material.name,'dim');
 f.api.select('705',false);f.flush();assert.equal(unit(scene,'705').material.name,'selected');
 f.api.paint(null);f.flush();assert.match(unit(scene,'701').material.name,/^unitGlass/);assert.equal(unit(scene,'705').material.name,'selected');f.api.dispose()});
test('the furnished apartment opens at the chosen floor height',()=>{
 const f=fixture();f.api.select('1104',false);f.api.setMode('interior','living');f.flush();
 const state=f.api.state();assert.equal(state.mode,'interior');assert.ok(Math.abs(state.home-(f.floorY(11)+.135))<1e-6);
 assert.ok(f.renders.at(-1).camera.position.y>f.floorY(11));
 assert.ok(f.anchors.some(a=>a.key==='room:kitchen'&&Number.isFinite(a.x)&&Number.isFinite(a.y)));assert.ok(!f.anchors.some(a=>a.key==='room:living'));
 f.api.select(null);f.api.setMode('building');f.api.focusFloor(4);f.api.setMode('interior');f.flush();assert.ok(Math.abs(f.api.state().home-(f.floorY(4)+.135))<1e-6);f.api.dispose()});
test('exterior hotspots project to the screen and amenity views move the camera',()=>{
 const f=fixture();const keys=f.anchors.filter(a=>a.show).map(a=>a.key);
 for(const key of ['amenity:pool','amenity:garden','amenity:terraces','amenity:lobby'])assert.ok(keys.includes(key),key);
 const before=f.renders.at(-1).camera.position.clone();f.api.focus('pool');f.flush();
 const after=f.renders.at(-1).camera.position;assert.ok(after.distanceTo(before)>5);assert.ok(after.y>42);f.api.dispose()});
test('night lighting switches on windows, lamps and stars',()=>{
 const f=fixture();const mats=()=>{const m={};f.scene().traverse(o=>{if(o.material&&o.material.name)m[o.material.name]=o.material});return m};
 f.api.lighting(0);f.flush();assert.equal(mats().unitGlass0.emissiveIntensity,0);
 f.api.lighting(2);f.flush();assert.ok(mats().unitGlass0.emissiveIntensity>.5);assert.ok(mats().cityLit.emissiveIntensity>.2);
 let stars;f.scene().traverse(o=>{if(o.isPoints)stars=o});assert.ok(stars.visible&&stars.material.opacity>.9);f.api.dispose()});

test('animated navigation during fade-in reaches the latest mode and room',()=>{
 const f=fixture({reduced:false,intro:false,orbit:false});
 f.api.setMode('interior','living');f.flush(60);assert.equal(f.api.state().mode,'interior');
 f.api.setMode('building');f.flush(240);assert.equal(f.api.state().mode,'building');assert.equal(f.api.state().transitioning,false);
 f.api.setMode('interior','living');f.flush(60);f.api.setMode('interior','kitchen');f.flush(240);
 assert.equal(f.api.state().mode,'interior');assert.equal(f.canvas.dataset.room,'kitchen');assert.equal(f.api.state().transitioning,false);f.api.dispose();
});
test('animated navigation before the swap honours the latest destination',()=>{
 const f=fixture({reduced:false,intro:false,orbit:false});f.api.setMode('interior');f.flush(15);f.api.setMode('building');f.flush(240);
 assert.equal(f.api.state().mode,'building');assert.equal(f.api.state().transitioning,false);f.api.dispose();
});
test('filtered units have no selectable scene hotspots',()=>{
 const f=fixture();f.api.focusFloor(7);f.api.paint(Object.fromEntries(['701','702','703','704','705','706'].map(id=>[id,id==='705'?'available':'dim'])));f.flush();
 assert.deepEqual(f.anchors.filter(a=>a.key.startsWith('unit:')).map(a=>a.key),['unit:705']);f.api.dispose();
});

test('inventory metadata selects four genuinely different furnished plans',()=>{
 const units=[{id:'701',type:'estudio'},{id:'702',type:'suite'},{id:'703',type:'depa2'},{id:'704',type:'depa3'}];
 const f=fixture({units}),widths=[];
 for(const [i,u] of units.entries()){
  f.api.select(u.id,false);f.api.setMode('interior');f.flush();
  const state=f.api.state(),home=f.scene().children[1],plans=home.children.filter(g=>g.userData.typology),active=plans.filter(g=>g.visible);
  assert.equal(state.typology,u.type);assert.equal(f.canvas.dataset.typology,u.type);assert.equal(state.bedrooms,i);
  assert.equal(active.length,1);assert.equal(active[0].userData.typology,u.type);
  const beds=[];active[0].traverse(o=>{if(o.userData.bed)beds.push(o)});assert.equal(beds.length,Math.max(1,i));
  assert.equal(state.rooms.filter(r=>r.startsWith('bedroom')).length,Math.max(1,i));
  const bounds=new THREE.Box3().setFromObject(active[0]),size=bounds.getSize(new THREE.Vector3());widths.push(size.x);
  for(const room of state.rooms){f.api.setMode('interior',room);f.flush();assert.equal(f.canvas.dataset.room,room);assert.ok(f.renders.at(-1).camera.position.toArray().every(Number.isFinite));}
 }
 assert.ok(widths.every((w,i)=>i===0||w>widths[i-1]),`distinct increasing footprints: ${widths}`);f.api.dispose();
});
test('switching from a third bedroom to a studio removes stale rooms and anchors',()=>{
 const f=fixture({units:[{id:'705',type:'depa3'},{id:'703',type:'estudio'}]});
 f.api.select('705',false);f.api.setMode('interior','bedroom3');f.flush();
 f.api.setMode('building');f.api.select('703',false);f.api.setMode('interior','bedroom3');f.flush();
 assert.equal(f.api.state().typology,'estudio');assert.equal(f.api.state().room,'overview');
 assert.ok(!f.anchors.some(a=>/bedroom[23]/.test(a.key)));assert.ok(f.anchors.some(a=>a.key==='room:bedroom'));
 f.api.select(null,false);f.api.setMode('interior');f.flush();assert.equal(f.api.state().typology,'suite');f.api.dispose();
});
test('changing type during the animated crossing uses the latest selected unit and floor',()=>{
 const f=fixture({reduced:false,intro:false,orbit:false,units:[{id:'705',type:'depa3'},{id:'1103',type:'estudio'}]});
 f.api.select('705',false);f.api.setMode('interior','bedroom3');f.flush(20);
 f.api.select('1103',false);f.api.setMode('interior','bedroom');f.flush(240);
 assert.equal(f.api.state().typology,'estudio');assert.equal(f.api.state().mode,'interior');assert.equal(f.api.state().room,'bedroom');
 assert.ok(Math.abs(f.api.state().home-f.floorY(11)-.135)<1e-6);assert.equal(f.api.state().transitioning,false);f.api.dispose();
});

test('portrait overview keeps each furnished plan inside the mobile canvas',()=>{
 const units=['estudio','suite','depa2','depa3'].map((type,i)=>({id:`70${i+1}`,type}));
 const f=fixture({units,compact:true,width:350,height:420});
 for(const u of units){
  f.api.select(u.id,false);f.api.setMode('interior');f.flush();
  f.scene().updateMatrixWorld(true);
  const active=f.scene().children[1].children.find(g=>g.userData.typology===u.type),bounds=new THREE.Box3().setFromObject(active),camera=f.renders.at(-1).camera;
  camera.updateMatrixWorld();
  for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
   const p=new THREE.Vector3(x,y,z).project(camera);assert.ok(Math.abs(p.x)<1&&Math.abs(p.y)<1,`${u.type} clips at ${p.x}, ${p.y}`);
  }
 }
 f.api.dispose();
});
