const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const THREE=require('../dist/vendor/three.min.js');
const Scene=require('../legacy-viewer/sector-scene.js');
const Controls=require('../dist/viewer-controls.js');

// Use the real scene, raycaster and projection math; stub only browser/WebGL I/O.
function mount({webgl=true,width=720,height=640}={}){
  const elements=new Map(),documentEvents={},frames=new Map(),observers=[];let id=0,camera,renderCount=0;
  class Element{
    constructor(key){this.key=key;this.dataset={};this.style={};this.events={};this.attributes={};this.children=[];this.hidden=false;this.textContent='';this.clientWidth=width;this.clientHeight=height;this.offsetWidth=100;this.offsetHeight=34;this.classList={toggle(){},contains:value=>value==='immersive'};}
    setAttribute(key,value){this.attributes[key]=value}
    addEventListener(type,fn){(this.events[type]??=[]).push(fn)}
    emit(type,event={}){for(const fn of this.events[type]||[])fn({target:this,preventDefault(){},...event})}
    append(node){this.children.push(node)}
    getBoundingClientRect(){return{left:0,top:0,width:this.clientWidth,height:this.clientHeight}}
    focus(){document.activeElement=this}
    blur(){document.activeElement=null}
    setPointerCapture(){}
  }
  const get=key=>{if(!elements.has(key))elements.set(key,new Element(key));return elements.get(key)};
  const places=['pixel','metro','coral'].map(key=>{const e=new Element(key);e.dataset.sectorPlace=key;return e});
  const actions=['left','in','out','reset'].map(key=>{const e=new Element(key);e.dataset.sectorAction=key;return e});
  const views=['perspective','above'].map(key=>{const e=new Element(key);e.dataset.sectorView=key;return e});
  const document={hidden:false,documentElement:{lang:'es-EC'},body:new Element('body'),getElementById:get,createElement:()=>new Element('generated'),
    addEventListener:(event,fn)=>documentEvents[event]=fn,
    querySelectorAll:selector=>selector.startsWith('.sector-places')?places:selector==='[data-sector-place]'?[...places,...get('sector-map-labels').children.filter(e=>e.dataset.sectorPlace)]:selector==='[data-sector-action]'?actions:selector==='[data-sector-view]'?views:[]};
  const context={document,console,THREE:{...THREE,WebGLRenderer:class{
    constructor(){if(!webgl)throw new Error('No WebGL');this.shadowMap={}}
    setPixelRatio(){} setClearColor(){} setSize(){} dispose(){} render(scene,cam){camera=cam;renderCount++}
  }},AlphaSectorScene:Scene,ViewerControls:Controls,matchMedia:()=>({matches:true}),
    requestAnimationFrame:fn=>{frames.set(++id,fn);return id},cancelAnimationFrame:key=>frames.delete(key),
    IntersectionObserver:class{constructor(fn){observers.push(fn)}observe(){}},ResizeObserver:class{constructor(fn){this.fn=fn}observe(){this.fn()}}};
  context.window=context;context.window.devicePixelRatio=1;
  vm.runInNewContext(fs.readFileSync(require.resolve('../legacy-viewer/sector-map.js'),'utf8'),context);
  function flush(){let count=0;while(frames.size){assert.ok(count++<10,'animation settles');const callbacks=[...frames.values()];frames.clear();callbacks.forEach(fn=>fn())}}
  function reveal(value=true){observers[0]([{isIntersecting:value}]);flush()}
  function click(items,key){const e=items.find(x=>Object.values(x.dataset).includes(key));e.emit('click');flush()}
  return{get,places,actions,views,document,reveal,flush,click,documentEvents,frames,get camera(){return camera},get renderCount(){return renderCount}};
}

test('sector geometry batches draw calls and all three landmarks are ray-pickable',()=>{
  const model=Scene.build(THREE),batches=model.scene.children.filter(m=>m.isInstancedMesh);
  assert.ok(batches.length<40,'repeated geometry is instanced');
  assert.ok(batches.reduce((sum,b)=>sum+b.count,0)>500,'detailed streetscape');
  for(const [key,p] of Object.entries(model.places)){
    const [x,,z]=p.ground;
    const ray=new THREE.Raycaster(new THREE.Vector3(x,100,z),new THREE.Vector3(0,-1,0));
    assert.ok(ray.intersectObjects(model.pickables).some(hit=>hit.object.userData.owners[hit.instanceId]===key),key);
  }
  const material=batches.find(m=>m.material===batches[0].material).material;
  const initial=material.color.getHex();model.theme(true);assert.notEqual(material.color.getHex(),initial);model.theme(false);assert.equal(material.color.getHex(),initial);
});

test('initialization is lazy, drawing settles, and hidden maps stop drawing',()=>{
  const app=mount();assert.equal(app.renderCount,0);app.reveal();
  assert.equal(app.get('sector-map').dataset.ready,'true');assert.equal(app.frames.size,0);
  assert.ok(app.renderCount>0);const count=app.renderCount;app.reveal(false);app.click(app.actions,'left');assert.equal(app.renderCount,count);
  app.reveal();assert.ok(app.renderCount>count);
});

test('landmark selection, bilingual status, views and zoom work at mobile width',()=>{
  const app=mount({width:360,height:520});app.reveal();
  app.click(app.places,'metro');assert.equal(app.get('sector-map').dataset.selected,'metro');
  assert.equal(app.places[1].attributes['aria-pressed'],'true');
  app.document.documentElement.lang='en';app.documentEvents['site:render']();app.flush();
  assert.match(app.get('sector-place-description').textContent,/fictional point of interest/);
  app.click(app.views,'above');assert.equal(app.get('sector-map').dataset.view,'above');assert.ok(app.camera.position.y>160);
  for(let i=0;i<20;i++)app.click(app.actions,'in');assert.ok(app.camera.zoom<=1.85);
  app.click(app.actions,'reset');assert.equal(app.camera.zoom,1);assert.equal(app.views[0].attributes['aria-pressed'],'true');
  const visible=app.get('sector-map-labels').children.filter(e=>e.style.visibility==='visible');assert.ok(visible.some(e=>e.dataset.sectorPlace==='metro'));
  for(const e of visible){const [x,y]=e.style.transform.match(/-?[\d.]+/g).map(Number);assert.ok(x>=0&&x+e.offsetWidth<=360);assert.ok(y>=64&&y+e.offsetHeight<=430)}
});

test('WebGL failure leaves the static map and directions context usable',()=>{
  const app=mount({webgl:false});app.reveal();assert.equal(app.get('sector-canvas').hidden,true);assert.equal(app.get('sector-map-tools').hidden,true);
  assert.equal(app.get('sector-map').dataset.ready,'false');app.click(app.places,'coral');assert.match(app.get('sector-place-description').textContent,/Comercio/);
});

test('WebGL context restoration re-enables controls and redraws the scene',()=>{
  const app=mount();app.reveal();const canvas=app.get('sector-canvas');canvas.emit('webglcontextlost');assert.equal(canvas.hidden,true);
  canvas.emit('webglcontextrestored');app.flush();assert.equal(canvas.hidden,false);assert.equal(app.get('sector-map-tools').hidden,false);assert.equal(app.get('sector-map').dataset.ready,'true');
});
