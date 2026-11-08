/* Download the shared 3D engine (and, for a client's glTF building, its loader) only when a visible
   feature needs it. VERSIONS is stamped by site/build.mjs with each file's content hash. */
window.AlphaAssets=(()=>{
 const VERSIONS={"vendor/three.min.js":"9274bbcec8","vendor/GLTFLoader.js":"8aca94c62d","building-gltf.js":"350608716a"};
 const pending=new Map(),waiting=new WeakMap();
 function script(path,ready){
  if(ready())return Promise.resolve();
  if(pending.has(path))return pending.get(path);
  const promise=new Promise((resolve,reject)=>{
   const tag=document.createElement('script');
   tag.src='/'+path+'?v='+VERSIONS[path];
   tag.onload=()=>{if(ready())resolve();else{pending.delete(path);tag.remove();reject(new Error(path+' unavailable'))}};
   tag.onerror=()=>{pending.delete(path);tag.remove();reject(new Error(path+' download failed'))};
   document.head.append(tag);
  });
  pending.set(path,promise);
  return promise;
 }
 const three=()=>script('vendor/three.min.js',()=>!!window.THREE);
 // A glTF building needs the loader (after THREE) and the adapter that reads levels, units and hotspots.
 const gltf=()=>three().then(()=>Promise.all([script('vendor/GLTFLoader.js',()=>!!window.THREE.GLTFLoader),script('building-gltf.js',()=>!!window.GltfBuilding)]));
 function whenVisible(element,callback){
  if(!('IntersectionObserver' in window)){callback();return}
  if(waiting.has(element))return;
  const observer=new IntersectionObserver(entries=>{
   if(!entries.some(entry=>entry.isIntersecting))return;
   observer.disconnect();waiting.delete(element);callback();
  },{rootMargin:'180px'});
  waiting.set(element,observer);observer.observe(element);
 }
 return {three,gltf,whenVisible};
})();
