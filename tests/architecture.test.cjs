const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const THREE=require('../dist/vendor/three.min.js');
function fixture(){
 const renders=[];let frame;
 class Renderer {constructor(){this.shadowMap={};this.info={render:{calls:0,triangles:0}}}setPixelRatio(){}setSize(){}render(scene,camera){renders.push({scene,camera})}dispose(){this.disposed=true}}
 class Observer{observe(){}disconnect(){}}
 const canvas={dataset:{},parentElement:{getBoundingClientRect:()=>({width:900,height:580})}};
 const window={};const context={window,devicePixelRatio:2,matchMedia:()=>({matches:true}),ResizeObserver:Observer,IntersectionObserver:Observer,document:{hidden:false,addEventListener(){},removeEventListener(){}},requestAnimationFrame:f=>(frame=f,1),cancelAnimationFrame(){frame=null},ViewerControls:{fitDistance:()=>90,bind:()=>({cancel(){}})}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../dist/architecture.js'),'utf8'),context);
 const api=window.Architecture.create({...THREE,WebGLRenderer:Renderer},canvas,()=>{});
 function flush(){for(let i=0;i<4&&frame;i++){const f=frame;frame=null;f()}}
 flush();return{api,canvas,renders,flush};
}
test('building has a selectable mesh for every inventory unit',()=>{const f=fixture(),scene=f.renders.at(-1).scene,ids=[];scene.traverse(o=>{if(o.userData.unitId)ids.push(o.userData.unitId)});assert.equal(ids.length,72);assert.equal(new Set(ids).size,72);for(let floor=2;floor<=13;floor++)for(let n=1;n<=6;n++)assert.ok(ids.includes(`${floor}0${n}`));f.api.dispose()});
test('room views and lighting render real scene changes with finite cameras',()=>{const f=fixture();for(const room of ['overview','living','kitchen','bedroom','terrace']){f.api.setMode('interior',room);f.flush();assert.equal(f.canvas.dataset.room,room);assert.equal(f.canvas.dataset.mode,'interior');const shot=f.renders.at(-1);assert.ok(shot.camera.position.toArray().every(Number.isFinite));assert.equal(shot.scene.children[0].visible,false);assert.equal(shot.scene.children[1].visible,true)}const before=f.renders.at(-1).scene.background.getHex();f.api.lighting(2);f.flush();assert.notEqual(f.renders.at(-1).scene.background.getHex(),before);f.api.setMode('building');f.api.select('705');f.flush();assert.ok(f.renders.at(-1).camera.position.z<0);f.api.dispose()});
