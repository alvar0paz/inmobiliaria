/* Download the shared 3D engine only when a visible feature needs it. */
window.AlphaAssets=(()=>{
 let engine;
 const waiting=new WeakMap();
 function three(){
  if(window.THREE)return Promise.resolve();
  if(engine)return engine;
  engine=new Promise((resolve,reject)=>{
   const script=document.createElement('script');
   script.src='/vendor/three.min.js?v=' + '9274bbcec8';
   script.onload=()=>{if(window.THREE)resolve();else{engine=null;script.remove();reject(new Error('3D engine unavailable'))}};
   script.onerror=()=>{engine=null;script.remove();reject(new Error('3D engine download failed'))};
   document.head.append(script);
  });
  return engine;
 }
 function whenVisible(element,callback){
  if(!('IntersectionObserver' in window)){callback();return}
  if(waiting.has(element))return;
  const observer=new IntersectionObserver(entries=>{
   if(!entries.some(entry=>entry.isIntersecting))return;
   observer.disconnect();waiting.delete(element);callback();
  },{rootMargin:'180px'});
  waiting.set(element,observer);observer.observe(element);
 }
 return {three,whenVisible};
})();
