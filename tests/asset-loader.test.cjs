const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
function mount(){
 const scripts=[],observers=[];
 const context={document:{createElement:()=>({remove(){}}),head:{append:script=>scripts.push(script)}},IntersectionObserver:class{constructor(fn){this.fn=fn;observers.push(this)}observe(){}disconnect(){this.disconnected=true}}};
 context.window=context;
 vm.runInNewContext(fs.readFileSync(require.resolve('../public/asset-loader.js'),'utf8'),context);
 return {context,scripts,observers,assets:context.SiteAssets};
}
test('concurrent viewers share one download and failed downloads can retry',async()=>{
 const {context,scripts,assets}=mount();
 const first=assets.three();assert.equal(assets.three(),first);assert.equal(scripts.length,1);
 scripts[0].onerror();await assert.rejects(first);
 const retry=assets.three();assert.equal(scripts.length,2);
 context.THREE={};scripts[1].onload();await retry;await assets.three();assert.equal(scripts.length,2);
});
test('hidden viewers wait; repeated requests share an observer that disconnects on reveal',()=>{
 const {assets,observers}=mount(),element={};let calls=0;
 assets.whenVisible(element,()=>calls++);assets.whenVisible(element,()=>calls++);
 assert.equal(observers.length,1);observers[0].fn([{isIntersecting:false}]);assert.equal(calls,0);
 observers[0].fn([{isIntersecting:true}]);assert.equal(calls,1);assert.equal(observers[0].disconnected,true);
});
test('a glTF building loads the engine first, then the loader and adapter, each with its version',async()=>{
 const {context,scripts,assets}=mount();
 const loading=assets.gltf();assert.equal(scripts.length,1);assert.match(scripts[0].src,/^\/vendor\/three\.min\.js\?v=[0-9a-f]{10}$/);
 context.THREE={};scripts[0].onload();await new Promise(r=>setTimeout(r));
 assert.deepEqual(scripts.slice(1).map(s=>s.src.replace(/\?v=[0-9a-f]{10}$/,'')),['/vendor/GLTFLoader.js','/building-gltf.js']);
 context.THREE.GLTFLoader=class{};context.GltfBuilding={};scripts[1].onload();scripts[2].onload();await loading;
 await assets.gltf();assert.equal(scripts.length,3,'already loaded files are not fetched again');
});
