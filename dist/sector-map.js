/* Progressive, on-demand WebGL enhancement for the shared EL SECTOR section. */
(()=>{
  'use strict';
  const stage=document.getElementById('sector-map');if(!stage)return;
  const canvas=document.getElementById('sector-canvas'),labelsHost=document.getElementById('sector-map-labels');
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const descriptions={
    pixel:['Pixel, en la esquina de Av. 5 de Junio y Rodrigo de Chávez.','Pixel, at the corner of Av. 5 de Junio and Rodrigo de Chávez.'],
    metro:['Metro, una referencia de movilidad en el esquema de ubicación de Pixel.','Metro, a transit landmark in Pixel’s location diagram.'],
    coral:['Coral, una referencia comercial en el esquema de ubicación de Pixel.','Coral, a shopping landmark in Pixel’s location diagram.']
  };
  let renderer,model,camera,ray,input,ready=false,failed=false,lost=false,visible=false,raf=0,selection='pixel';
  const cam={theta:.63,phi:.99,zoom:1},goal={...cam},labels=[],roadLabels=[];
  const language=()=>document.documentElement.lang.startsWith('en')?1:0;
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const help=document.getElementById('sector-map-help');
  const places=document.querySelectorAll('.sector-places [data-sector-place]');
  function select(key){
    if(!descriptions[key])return;selection=key;stage.dataset.selected=key;
    document.querySelectorAll('[data-sector-place]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.sectorPlace===key)));
    document.getElementById('sector-place-description').textContent=descriptions[key][language()];
    if(model){const [x,,z]=model.places[key].ground;model.halo.position.set(x,.57,z);model.halo.scale.setScalar(key==='pixel'?1:.6);draw()}
  }
  places.forEach(button=>button.addEventListener('click',()=>select(button.dataset.sectorPlace)));
  function fallback(){
    failed=true;stage.dataset.ready='false';canvas.hidden=true;
    labelsHost.hidden=true;document.getElementById('sector-map-tools').hidden=true;
    help.textContent=language()?'Illustrative area model. Use Get directions to plan your visit.':'Maqueta del sector. Usa Cómo llegar para planificar tu visita.';
    input?.cancel();cancelAnimationFrame(raf);raf=0;
  }
  function copy(){
    select(selection);
    if(ready&&!failed&&!lost){
      help.textContent=language()?'Drag to rotate · + / − to zoom · Home to reset':'Arrastra para girar · + / − para acercar · Inicio para centrar';
      model.theme(document.body.classList.contains('essential')||document.body.classList.contains('editorial'));draw();
    }else if(failed)fallback();
  }
  document.addEventListener('site:render',copy);
  function rotate(dx,dy){goal.theta-=dx*.006;goal.phi=clamp(goal.phi-dy*.005,.16,1.2);views('custom');draw()}
  function zoom(scale){goal.zoom=clamp(goal.zoom/scale,.75,1.85);draw()}
  function reset(){Object.assign(goal,{theta:.63,phi:.99,zoom:1});views('perspective');draw()}
  function views(view){stage.dataset.view=view;document.querySelectorAll('[data-sector-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.sectorView===view)))}
  function hit(event){
    if(!renderer||lost||failed)return;
    const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;
    const point=new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
    ray.setFromCamera(point,camera);
    const intersection=ray.intersectObjects(model.pickables).find(hit=>hit.object.userData.owners[hit.instanceId]);
    return intersection?.object.userData.owners[intersection.instanceId];
  }
  function init(){
    if(ready||failed)return;
    if(!window.THREE||!window.AlphaSectorScene||!window.ViewerControls){fallback();return}
    try{
      renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
      renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));renderer.setClearColor(0x000000,0);
      renderer.outputEncoding=THREE.sRGBEncoding;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
      renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
      model=AlphaSectorScene.build(THREE);camera=new THREE.OrthographicCamera(-65,65,55,-55,.1,500);ray=new THREE.Raycaster();
      Object.entries(model.places).forEach(([key,place],i)=>{
        const element=document.createElement('button');element.type='button';element.className='sector-map-pin';element.dataset.sectorPlace=key;
        element.innerHTML=`<i>0${i+1}</i><span>${key==='pixel'?'Pixel':key==='metro'?'Metro':'Coral'}</span>`;
        element.addEventListener('click',()=>select(key));labelsHost.append(element);
        labels.push({element,position:new THREE.Vector3(...place.position)});
      });
      [['Av. 5 de Junio',[-18,.5,-24]],['Av. Rodrigo de Chávez',[22,.5,10]]].forEach(([text,position])=>{
        const element=document.createElement('span');element.className='sector-map-road';element.textContent=text;labelsHost.append(element);
        roadLabels.push({element,position:new THREE.Vector3(...position)});
      });
      input=ViewerControls.bind(canvas,{rotate,zoom,reset,tap:event=>{const key=hit(event);if(key)select(key)},
        active:active=>stage.classList.toggle('is-dragging',active),hover:event=>canvas.style.cursor=hit(event)?'pointer':'grab',leave:()=>canvas.style.cursor='grab'});
      document.querySelectorAll('[data-sector-action]').forEach(button=>button.addEventListener('click',()=>{
        const action=button.dataset.sectorAction;
        if(action==='reset')reset();else if(action==='left')rotate(-55,0);else zoom(action==='in'?.85:1/.85);
      }));
      document.querySelectorAll('[data-sector-view]').forEach(button=>button.addEventListener('click',()=>{
        const above=button.dataset.sectorView==='above';Object.assign(goal,{theta:above?0:.63,phi:above?.16:.99,zoom:1});views(button.dataset.sectorView);draw();
      }));
      canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();lost=true;fallback()});
      canvas.addEventListener('webglcontextrestored',()=>{lost=false;failed=false;canvas.hidden=false;labelsHost.hidden=false;document.getElementById('sector-map-tools').hidden=false;stage.dataset.ready='true';resize();copy()});
      ready=true;canvas.hidden=false;labelsHost.hidden=false;document.getElementById('sector-map-tools').hidden=false;
      new ResizeObserver(resize).observe(stage);resize();copy();stage.dataset.ready='true';
    }catch(error){renderer?.dispose();fallback()}
  }
  function resize(){
    if(!renderer||!camera||lost||failed)return;
    const width=stage.clientWidth,height=stage.clientHeight;if(!width||!height)return;
    renderer.setSize(width,height,false);
    const aspect=width/height,halfHeight=Math.max(48,63/aspect);
    camera.left=-halfHeight*aspect;camera.right=halfHeight*aspect;camera.top=halfHeight;camera.bottom=-halfHeight;camera.updateProjectionMatrix();draw();
  }
  function updateLabels(){
    const width=stage.clientWidth,height=stage.clientHeight,occupied=[];
    // Prioritize the selected landmark; hide overlapping secondary labels at tight angles.
    const sorted=[...labels].sort((a,b)=>Number(b.element.dataset.sectorPlace===selection)-Number(a.element.dataset.sectorPlace===selection));
    [...sorted,...roadLabels].forEach(({element,position})=>{
      const point=position.clone().project(camera),w=element.offsetWidth||100,h=element.offsetHeight||34;
      const x=clamp((point.x*.5+.5)*width-w/2,10,width-w-10),y=(1-(point.y*.5+.5))*height-h-20;
      const rect={left:x,top:y,right:x+w,bottom:y+h};
      const hidden=point.z>1||point.z< -1||y<64||y+h>height-90||occupied.some(r=>rect.left<r.right+7&&rect.right>r.left-7&&rect.top<r.bottom+7&&rect.bottom>r.top-7);
      element.style.visibility=hidden?'hidden':'visible';element.style.transform=`translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
      if(!hidden)occupied.push(rect);
    });
  }
  function draw(){
    if(!ready||failed||lost||!visible||document.hidden||raf)return;
    raf=requestAnimationFrame(frame);
  }
  function frame(){
    raf=0;if(failed||lost||!visible||document.hidden)return;
    let moving=false;
    for(const key of ['theta','phi','zoom']){const delta=goal[key]-cam[key];if(Math.abs(delta)>.0003)moving=true;cam[key]=reduce.matches||Math.abs(delta)<.0003?goal[key]:cam[key]+delta*.16}
    camera.position.set(Math.sin(cam.theta)*Math.sin(cam.phi)*170,Math.cos(cam.phi)*170,Math.cos(cam.theta)*Math.sin(cam.phi)*170);
    camera.lookAt(0,5,0);camera.zoom=cam.zoom;camera.updateProjectionMatrix();camera.updateMatrixWorld();
    try{renderer.render(model.scene,camera);updateLabels()}catch(error){fallback();return}
    if(moving)draw();
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden){input?.cancel();cancelAnimationFrame(raf);raf=0}else draw()});
  if('IntersectionObserver' in window){
    new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible){init();draw()}else{input?.cancel();cancelAnimationFrame(raf);raf=0}},{rootMargin:'180px'}).observe(stage);
  }else{visible=true;init()}
  copy();
})();
