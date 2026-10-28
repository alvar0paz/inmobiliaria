/* All visible architecture is procedural geometry. No photographs or raster textures. */
window.Architecture = (() => {
  function create(T, canvas, onUnit) {
    const scene=new T.Scene(), camera=new T.PerspectiveCamera(38,1,.1,800);
    const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.6)); renderer.outputEncoding=T.sRGBEncoding;
    renderer.toneMapping=T.ACESFilmicToneMapping; renderer.toneMappingExposure=1.15;
    renderer.shadowMap.enabled=true; renderer.shadowMap.type=T.PCFSoftShadowMap;
    const world=new T.Group(), home=new T.Group();scene.add(world,home);home.visible=false;
    const hemi=new T.HemisphereLight('#e8f3ff','#73664c',.85);scene.add(hemi);
    const sun=new T.DirectionalLight('#ffe3b2',2.6);sun.position.set(35,65,30);sun.castShadow=true;
    sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-.0004;sun.shadow.normalBias=.08;
    Object.assign(sun.shadow.camera,{left:-40,right:40,top:65,bottom:-30,near:.5,far:180});scene.add(sun,sun.target);
    const fill=new T.DirectionalLight('#adc8e7',.7);fill.intensity=.3;fill.position.set(-35,25,-20);scene.add(fill);
    const materials={}, geometries={};
    const mat=(name,color,extra={})=>{if(materials[name])return materials[name];const m=new T.MeshStandardMaterial({color,roughness:.65,...extra});m.name=name;m.color.convertSRGBToLinear();return materials[name]=m;};
    const stone=mat('stone','#ded4bd'),lightStone=mat('lightStone','#ece5d6'),wood=mat('wood','#97704a'),oak=mat('oak','#bd9567'),dark=mat('dark','#37443c'),metal=mat('metal','#424b43',{metalness:.65,roughness:.3}),glass=mat('glass','#829d9b',{metalness:.55,roughness:.12,transparent:true,opacity:.58}),leaf=mat('leaf','#506946'),leaf2=mat('leaf2','#7c8c59'),soil=mat('soil','#554938'),water=mat('water','#5baca9',{metalness:.5,roughness:.13}),fabric=mat('fabric','#e9dfc9',{roughness:1}),cushion=mat('cushion','#9b9f82',{roughness:1}),brass=mat('brass','#bb985b',{metalness:.6,roughness:.3}),glow=mat('glow','#fff1c7',{emissive:'#ffb563',emissiveIntensity:.8});
    const boxGeo=new T.BoxGeometry(1,1,1);
    function box(p,w,h,d,x,y,z,m=stone){let geometry=boxGeo;const soft=['fabric','cushion','linen'].includes(m.name)&&h>.12;
      if(soft){const key=`soft${w},${h},${d}`;geometry=geometries[key];if(!geometry){geometry=new T.BoxGeometry(w,h,d,5,5,5);const pos=geometry.attributes.position,r=Math.min(.09,w/4,h/3,d/3),v=new T.Vector3(),inner=new T.Vector3();for(let i=0;i<pos.count;i++){v.fromBufferAttribute(pos,i);inner.set(Math.max(-w/2+r,Math.min(w/2-r,v.x)),Math.max(-h/2+r,Math.min(h/2-r,v.y)),Math.max(-d/2+r,Math.min(d/2-r,v.z)));v.sub(inner).normalize().multiplyScalar(r).add(inner);pos.setXYZ(i,v.x,v.y,v.z);}geometry.computeVertexNormals();geometries[key]=geometry;}}
      const o=new T.Mesh(geometry,m);if(!soft)o.scale.set(w,h,d);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;p.add(o);return o}
    function cyl(p,r,h,x,y,z,m,top=r){const key=`c${r},${h},${top}`;const g=geometries[key]||(geometries[key]=new T.CylinderGeometry(top,r,h,20));const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;p.add(o);return o}
    function sphere(p,r,x,y,z,m,sx=1,sy=1,sz=1){const key=`s${r}`;const g=geometries[key]||(geometries[key]=new T.SphereGeometry(r,10,8));const o=new T.Mesh(g,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;p.add(o);return o}
    function plant(p,x,y,z,s=1){cyl(p,.28*s,.5*s,x,y+.25*s,z,stone,.36*s);for(let i=0;i<7;i++){const a=i*2.4;const o=sphere(p,.27*s,x+Math.cos(a)*.22*s,y+(.8+(i%3)*.16)*s,z+Math.sin(a)*.22*s,i%2?leaf:leaf2,.55,1.8,.8);o.rotation.z=Math.cos(a)*.6;}}
    function tree(p,x,z,s=1){cyl(p,.19*s,3*s,x,1.5*s,z,wood,.1*s);for(let i=0;i<7;i++){const a=i*2.4;sphere(p,1.05*s,x+Math.cos(a)*.65*s,(3.3+(i%3)*.45)*s,z+Math.sin(a)*.65*s,i%2?leaf:leaf2,1,1.1,1);}}
    const building=new T.Group();world.add(building);const pick=[];const FH=3.2;
    box(world,105,.7,85,0,-.55,0,mat('ground','#c6c9b8'));
    box(world,100,.06,12,0,-.14,23,mat('road','#6b716b'));
    for(let x=-48;x<50;x+=7)box(world,3,.02,.13,x,-.09,23,lightStone);
    box(world,32,.35,29,0,.02,1,lightStone);
    for(let x=-15;x<16;x+=1.1)box(world,.025,.01,27,x,.203,1,stone);
    for(let z=-12;z<15;z+=1.1)box(world,30,.01,.025,0,.204,z,stone);
    box(building,15,3.15,14,0,1.8,0,glass);
    for(let x=-7.5;x<=7.5;x+=1.5)box(building,.11,3.5,.14,x,1.8,7.1,metal);
    box(building,6,.35,4,0,3.2,8.5,stone);box(building,5,.1,3.9,0,2.98,8.4,wood);
    box(building,.3,3.1,.3,-2.7,1.5,10.2,metal);box(building,.3,3.1,.3,2.7,1.5,10.2,metal);
    box(building,14,3,.3,0,1.65,-6.8,wood);box(building,4,.85,1,0,.85,2,stone);
    for(let x=-6;x<7;x+=.23)box(building,.09,2.8,.1,x,1.6,-6.56,oak);
    const unitGlass=mat('unitGlass','#587b79',{roughness:.18,metalness:.5});
    for(let f=0;f<12;f++){
      const y=3.5+f*FH;
      box(building,16,.27,16,0,y,0,lightStone);
      box(building,2,3,14,0,y+1.6,0,stone);
      for(let side of [-1,1])for(let col=0;col<3;col++){
        const x=(col-1)*5,z=side*5.7;
        const unit=box(building,4.75,2.85,3.9,x,y+1.55,z,unitGlass);unit.userData.unitId=`${f+2}0${side===1?col+1:col+4}`;pick.push(unit);
        box(building,.18,2.9,4.1,x-2.4,y+1.6,z,stone);
        box(building,4.6,.16,1.6,x,y+.18,side*8.1,stone);
        box(building,4.6,1.0,.06,x,y+.78,side*8.82,glass);
        box(building,4.8,.06,.09,x,y+1.32,side*8.82,metal);
        for(let a of [-2.25,0,2.25]){box(building,.065,2.7,.1,x+a,y+1.6,side*7.71,metal);box(building,.05,1.1,.06,x+a,y+.77,side*8.82,metal);}
        if((f+col)%3===0){box(building,1.5,.45,.55,x+1.4,y+.4,side*8.38,stone);for(let i=0;i<4;i++)sphere(building,.25,x+.9+i*.3,y+.85,side*8.38,leaf,1,1.35,1);}
        if((col+f)%4===0){box(building,1.7,.14,.7,x-.5,y+.8,side*6.5,glow);}
        if(col===0)for(let k=0;k<4;k++)box(building,.12,2.8,.18,x-1.9+k*.24,y+1.6,side*7.88,wood);
      }
      for(let side of [-1,1]){box(building,.32,3.1,14.5,side*7.65,y+1.58,0,stone);for(let k=-4;k<=4;k+=2)box(building,.35,2.2,1.35,side*7.84,y+1.65,k,glass);}
    }
    const roof=42;box(building,16,.35,17,0,roof,0,lightStone);
    box(building,6,.4,9,-3.7,roof+.2,0,stone);box(building,5.6,.08,8.6,-3.7,roof+.44,0,water);
    for(let i=0;i<10;i++)box(building,.018,.012,8,-6+i*.5,roof+.49,0,mat('ripple','#a1d2c5',{roughness:.2}));
    for(let i=0;i<4;i++){box(building,.12,2.6,.12,1.4+i*1.7,roof+1.3,-5,wood);box(building,.12,2.6,.12,1.4+i*1.7,roof+1.3,4,wood);}
    for(let i=0;i<17;i++)box(building,5.8,.13,.13,4,roof+2.7,-5+i*.56,wood);
    for(let z of [-7.8,7.8]){box(building,15,1,.07,0,roof+.6,z,glass);box(building,15,.07,.09,0,roof+1.15,z,metal);}
    for(let i=0;i<4;i++){box(building,1.1,.2,2.5,3.4,roof+.45,-3+i*2.4,fabric);plant(building,6.5,roof+.2,-5+i*3,.8);}
    for(let x of [-12,12])for(let z of [-9,0,10])tree(world,x,z,1.1);
    for(let x of [-10,10]){box(world,3,.5,1,x,.5,13,stone);for(let k=0;k<6;k++)box(world,3,.07,.1,x,.8,12.6+k*.15,wood);}
    for(let x of [-14,14]){cyl(world,.065,4,x,2,14,metal);sphere(world,.28,x,4,14,glow);}
    // Abstract neighbourhood gives scale without pretending to represent a real location.
    for(let i=0;i<12;i++){const x=(i%6-2.5)*17,z=i<6?-30:40,h=7+(i*7%15);box(world,10,h,9,x,h/2,z,mat('context','#bdc5b8'));box(world,10.4,.3,9.4,x,h,z,lightStone);}
    // A continuous apartment, with geometry-built joinery, furnishings and terrace.
    box(home,15,.3,11,0,-.15,0,stone);
    for(let i=0;i<54;i++){const m=i%3===0?oak:mat('floor','#bda17d');box(home,.265,.035,10.9,-7.15+i*.27,.025,0,m);}
    box(home,15,3.2,.18,0,1.6,-5.5,lightStone);box(home,.18,3.2,11,-7.5,1.6,0,lightStone);
    box(home,3,1.0,.18,6,.5,-.2,lightStone);box(home,.18,3.2,5,2.5,1.6,-3,lightStone);
    box(home,15,.12,.1,0,.12,-5.35,oak);box(home,.1,.12,11,-7.35,.12,0,oak);
    // Kitchen, with cabinet gaps, recessed handles, hob, basin and tap.
    for(let i=0;i<7;i++){box(home,.74,.9,.7,-6.7+i*.78,.5,-4.95,oak);box(home,.52,.025,.03,-6.7+i*.78,.82,-4.57,metal);box(home,.74,.75,.4,-6.7+i*.78,2.5,-5.18,lightStone);}
    box(home,5.5,.09,.85,-4.4,1,-4.9,lightStone);box(home,5.5,.035,.05,-4.4,2.08,-4.94,glow);
    box(home,1,.03,.55,-5.8,1.06,-4.85,metal);for(let x of [-6.05,-5.55])for(let z of [-5,-4.7])cyl(home,.12,.02,x,1.08,z,dark);
    box(home,.7,.015,.45,-3,1.06,-4.85,metal);box(home,.56,.02,.32,-3,1.075,-4.85,mat('basin','#80938b',{metalness:.6}));cyl(home,.025,.35,-3,1.25,-5.1,brass);box(home,.25,.035,.035,-2.9,1.43,-5.1,brass);
    box(home,2.8,.9,1.15,-4.7,.5,-2,wood);box(home,3,.1,1.35,-4.7,1,-2,lightStone);
    for(let x of [-5.5,-4.2]){cyl(home,.33,.1,x,.72,-.9,oak);for(let z of [-1.1,-.7])for(let xx of [-.18,.18])box(home,.04,.65,.04,x+xx,.36,z,metal);}
    for(let x of [-5.7,-3.8]){cyl(home,.025,1.1,x,2.65,-2,metal);cyl(home,.27,.2,x,2.04,-2,brass,.1);cyl(home,.23,.025,x,1.93,-2,glow);}
    // Living room layered rug, modular sofa, cushions, coffee table, books and shelving.
    box(home,5,.035,3.7,-2.7,.07,2.2,mat('rug','#d1c8b2',{roughness:1}));
    for(let i=0;i<27;i++)box(home,4.85,.012,.026,-2.7,.095,.5+i*.13,mat('rugThread','#bcb69e'));
    box(home,3.5,.32,1.15,-3.7,.35,1.1,wood);box(home,3.45,.25,1.05,-3.7,.63,1.1,fabric);box(home,3.6,.85,.25,-3.7,.78,.55,fabric);
    for(let x of [-5.4,-2])box(home,.24,.7,1.3,x,.65,1.1,fabric);
    for(let x of [-4.7,-3.7,-2.7]){box(home,.94,.22,.95,x,.72,1.2,fabric);const c=box(home,.68,.55,.18,x,.98,.8,cushion);c.rotation.x=-.16;}
    cyl(home,.85,.13,-3.3,.52,3,stone);cyl(home,.4,.45,-3.3,.27,3,wood);box(home,.4,.055,.3,-3.55,.63,3.1,oak);box(home,.3,.04,.24,-3.5,.68,3.1,lightStone);cyl(home,.13,.27,-3,.72,2.9,brass,.08);
    box(home,.4,2.1,3,-7.15,1.1,1.7,wood);for(let y of [.35,1,1.7,2.3])box(home,.5,.06,3.3,-7,y,1.7,oak);
    for(let i=0;i<12;i++)box(home,.3,.4,.1,-7,.59,1+i*.12,i%3?stone:cushion);
    plant(home,-6.3,.05,4.3,1.1);plant(home,-.7,.05,3.9,.7);
    // Dining and sculptural pendant.
    cyl(home,.85,.12,.6,.9,-1.4,oak);cyl(home,.25,.85,.6,.43,-1.4,wood);
    for(let i=0;i<4;i++){const a=i*Math.PI/2,x=.6+Math.cos(a)*1.15,z=-1.4+Math.sin(a)*1.15;cyl(home,.33,.14,x,.5,z,fabric);cyl(home,.12,.45,x,.23,z,wood);}
    cyl(home,.02,.6,.6,2.9,-1.4,metal);sphere(home,.38,.6,2.4,-1.4,glow,1.5,.6,1.5);
    // Bedroom: upholstered bed, linen layers, pillows, bedside tables and wardrobe.
    box(home,2.7,.3,2.6,5,.3,-3.4,wood);box(home,2.6,.28,2.45,5,.55,-3.4,fabric);box(home,2.8,1.2,.18,5,.85,-4.72,cushion);
    box(home,2.65,.09,1.4,5,.74,-2.95,mat('linen','#b5ad93'));for(let x of [4.35,5.65]){const pillow=box(home,1,.17,.55,x,.81,-4.1,fabric);pillow.rotation.y=x<5?.05:-.05;box(home,.65,.45,.6,x<5?3.1:6.9,.3,-4.1,oak);cyl(home,.16,.22,x<5?3.1:6.9,.67,-4.1,brass);sphere(home,.2,x<5?3.1:6.9,.88,-4.1,glow);}
    for(let x of [3.4,4.4,5.4,6.4]){box(home,.94,2.8,.6,x,1.45,-5.07,oak);box(home,.03,.42,.03,x+.25,1.4,-4.74,brass);}
    box(home,2.5,.025,1.5,5,.08,-1.4,mat('bedrug','#d2c8af'));
    // Window frames and voile curtains remain visible in every interior view.
    for(let x=-7;x<=7;x+=1.75){box(home,.065,3.2,.09,x,1.6,5.5,metal);box(home,1.7,2.9,.025,x+.85,1.6,5.5,mat('homeglass','#bdd6d2',{transparent:true,opacity:.12,roughness:.1,metalness:.15}));}
    for(let x of [-7.1,6.9])for(let k=0;k<7;k++)cyl(home,.065,2.9,x+k*.08,1.65,5.22,mat('curtain','#e9e3d3',{transparent:true,opacity:.8}));
    box(home,15,.09,.12,0,3.18,5.5,metal);box(home,15,.06,.12,0,.15,5.5,metal);
    box(home,15,.2,2.5,0,-.04,6.85,stone);for(let i=0;i<50;i++)box(home,.23,.035,2.4,-7.3+i*.3,.08,6.85,oak);
    box(home,15,1,.045,0,.7,8.05,glass);box(home,15,.045,.06,0,1.23,8.05,metal);
    for(let x of [-7,-3.5,0,3.5,7])box(home,.05,1.2,.05,x,.65,8,metal);
    for(let x of [-6.5,6.5])plant(home,x,.1,7.2,1);
    cyl(home,.5,.08,3.5,.65,6.8,stone);cyl(home,.16,.6,3.5,.32,6.8,metal);
    for(let x of [2.3,4.7]){box(home,.8,.12,.8,x,.45,6.8,fabric);box(home,.8,.65,.12,x,.75,6.4,wood);for(let z of [6.5,7.1])for(let a of [-.3,.3])box(home,.04,.4,.04,x+a,.2,z,metal);}
    const horizon=new T.Group();home.add(horizon);
    for(let i=0;i<18;i++){const x=(i-9)*6,h=4+i*11%13;box(horizon,4,h,5,x,-12+h/2,28,mat('skyline','#aab8ad'));}
    const marker=box(building,4.9,3.1,4.15,0,0,0,mat('selected','#d8b46b',{transparent:true,opacity:.45,emissive:'#a88437',emissiveIntensity:.35}));marker.visible=false;
    const ray=new T.Raycaster(),pointer=new T.Vector2();
    let mode='building',light=1,room='overview',dirty=true,visible=true,raf=0,disposed=false;
    const pose={theta:.62,phi:1.12,r:87,x:0,y:22,z:0},goal={...pose};
    const rooms={overview:{theta:.55,phi:.64,r:21,x:0,y:0,z:1},living:{theta:.25,phi:1.46,r:3.8,x:-3.5,y:1.15,z:1},kitchen:{theta:.22,phi:1.39,r:5.1,x:-4.4,y:1.2,z:-3.8},bedroom:{theta:.34,phi:1.12,r:4.3,x:5,y:.85,z:-3.5},terrace:{theta:-.45,phi:1.42,r:4.5,x:3.5,y:1.1,z:6.8}};
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    function wake(){dirty=true;if(!raf&&!disposed&&visible&&!document.hidden)raf=requestAnimationFrame(draw);}
    function reset(){if(mode==='building'){Object.assign(goal,{theta:.62,phi:1.12,r:ViewerControls.fitDistance(22,46,20,camera.aspect,38)*.86,x:0,y:21,z:0})}else Object.assign(goal,rooms[room]);wake();}
    function size(){const b=canvas.parentElement.getBoundingClientRect();renderer.setSize(b.width,b.height,false);camera.aspect=b.width/b.height;camera.updateProjectionMatrix();reset();}
    function draw(){raf=0;if(disposed||!visible||document.hidden)return;let moving=false;for(const k of Object.keys(pose)){const delta=goal[k]-pose[k];if(Math.abs(delta)>.002){pose[k]+=reduced?delta:delta*.13;moving=true}else pose[k]=goal[k];}
      camera.position.set(pose.x+pose.r*Math.sin(pose.phi)*Math.sin(pose.theta),pose.y+pose.r*Math.cos(pose.phi),pose.z+pose.r*Math.sin(pose.phi)*Math.cos(pose.theta));camera.lookAt(pose.x,pose.y,pose.z);renderer.render(scene,camera);dirty=false;if(moving)wake();}
    function lighting(index){light=index;const interior=mode==='interior';const presets=[['#dae5e5','#fff2d4',1.4,.65,.95,40,65],['#ddd6c6','#ffd1a0',1.55,.6,.9,35,45],['#233a48','#a3bdd3',.45,.45,1.0,-30,45]];const a=presets[index];scene.background=new T.Color(a[0]);scene.fog=new T.Fog(a[0],140,350);sun.color.set(a[1]);sun.intensity=a[2];hemi.intensity=a[3];renderer.toneMappingExposure=a[4];sun.position.set(interior?12:a[5],interior?18:a[6],interior?12:30);sun.target.position.set(0,interior?0:20,0);glow.emissiveIntensity=index===2?2.8:.6;wake();}
    function setMode(value,view='overview'){mode=value;room=view;world.visible=mode==='building';home.visible=!world.visible;canvas.dataset.mode=mode;canvas.dataset.room=room;camera.fov=mode==='interior'&&view!=='overview'?52:38;camera.updateProjectionMatrix();lighting(light);reset();Object.assign(pose,goal);wake();}
    function select(id){const m=pick.find(m=>m.userData.unitId===String(id));marker.visible=!!m;if(m){marker.position.copy(m.position);goal.y=m.position.y;goal.theta=m.position.z<0?Math.PI+.62:.62;goal.r=60;}wake();}
    const control=ViewerControls.bind(canvas,{rotate:(dx,dy)=>{goal.theta-=dx*.006;goal.phi=Math.max(.18,Math.min(1.53,goal.phi+dy*.004));wake()},zoom:s=>{goal.r=Math.max(mode==='building'?25:2,Math.min(mode==='building'?180:35,goal.r*s));wake()},reset,tap:e=>{if(mode!=='building'||!onUnit)return;const b=canvas.getBoundingClientRect();pointer.set((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(pick,false)[0];if(hit)onUnit(hit.object.userData.unitId)}});
    const resize=new ResizeObserver(size);resize.observe(canvas.parentElement);
    const observer=new IntersectionObserver(e=>{visible=e[0].isIntersecting;if(visible)wake();else if(raf){cancelAnimationFrame(raf);raf=0;}});observer.observe(canvas);
    const visibility=()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;}else wake()};document.addEventListener('visibilitychange',visibility);
    lighting(1);size();Object.assign(pose,goal);wake();
    return {setMode,select,lighting,command(action){if(action==='reset')reset();if(action==='left')goal.theta-=.3;if(action==='right')goal.theta+=.3;if(action==='in')goal.r=Math.max(mode==='building'?25:2,goal.r*.82);if(action==='out')goal.r=Math.min(mode==='building'?180:35,goal.r/ .82);wake()},dispose(){disposed=true;cancelAnimationFrame(raf);resize.disconnect();observer.disconnect();document.removeEventListener('visibilitychange',visibility);control.cancel();boxGeo.dispose();Object.values(geometries).forEach(g=>g.dispose());Object.values(materials).forEach(m=>m.dispose());renderer.dispose();},stats(){return{drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles}}};
  }
  return {create};
})();
