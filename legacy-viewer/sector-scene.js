/* Offline architectural diorama. The roads and landmarks follow Residencia 01's reference
   diagram; building massing and landscaping are illustrative, not survey data. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.AlphaSectorScene=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  const places={pixel:{position:[-3,32,-6],ground:[-3,0,-6]},metro:{position:[-28,5,24],ground:[-28,0,24]},coral:{position:[-33,11,-7],ground:[-33,0,-7]}};
  function build(T){
    const scene=new T.Scene(),materials={},batches=new Map(),pickables=[];
    function material(name,color,options={}){return materials[name]=new T.MeshStandardMaterial({color,roughness:.8,...options})}
    const m={
      base:material('base','#142d2e'),edge:material('edge','#405b53',{metalness:.25}),
      ground:material('ground','#30483e'),pavement:material('pavement','#617468'),
      road:material('road','#203234'),stripe:material('stripe','#a3aa8c'),
      block:material('block','#60776e'),roof:material('roof','#84988a'),
      glass:material('glass','#213b43',{metalness:.52,roughness:.22}),
      concrete:material('concrete','#c2c3af'),trim:material('trim','#6f8a8b'),
      warm:material('warm','#e6bf7a',{emissive:'#c68a3e',emissiveIntensity:.45,roughness:.3}),
      coral:material('coral','#d67d67'),teal:material('teal','#3f9d98'),yellow:material('yellow','#ddc376'),
      park:material('park','#416047'),leaf:material('leaf','#739464'),leaf2:material('leaf2','#91a273'),
      trunk:material('trunk','#736652'),metal:material('metal','#9aa99b',{metalness:.55}),
      accent:material('accent','#dce7a7',{emissive:'#c8df85',emissiveIntensity:.6}),
      car:material('car','#c5c7b6'),carDark:material('carDark','#718783')
    };
    function instance(geometry,mat,scale,pos,owner=null,rotation=0){
      const key=geometry+':'+mat.uuid;
      if(!batches.has(key))batches.set(key,{geometry,mat,items:[]});
      batches.get(key).items.push({scale,pos,owner,rotation});
    }
    function box(w,h,d,mat,x,y,z,owner=null,rotation=0){instance('box',mat,[w,h,d],[x,y,z],owner,rotation)}
    function tree(x,z,size=1){
      instance('cylinder',m.trunk,[.22*size,2*size,.22*size],[x,1.3*size,z]);
      instance('leaf',m.leaf,[1.5*size,2*size,1.5*size],[x,3.1*size,z]);
      instance('leaf',m.leaf2,[1.05*size,1.4*size,1.1*size],[x+.45*size,3.8*size,z]);
      box(2.6*size,.22,2.6*size,m.park,x,.38,z);
    }
    // Layered plinth, inset rim and a miniature urban fabric.
    box(96,2.4,78,m.base,0,-1.6,0);
    box(95.7,.18,77.7,m.edge,0,-.3,0);
    box(94,.35,76,m.ground,0,-.02,0);
    box(9,.08,76,m.road,-18,.21,0);
    box(94,.08,9,m.road,0,.22,10);
    box(94,.08,5,m.road,0,.22,-26);
    box(5,.08,76,m.road,27,.21,0);
    // Raised blocks leave a clear, legible street intersection.
    [[-33,-7,18,27],[-33,26,18,20],[3,-6,36,27],[3,27,36,18],[38,-7,13,27],[38,27,13,18],[-33,-33,18,7],[3,-33,36,7]].forEach(([x,z,w,d])=>box(w,.45,d,m.pavement,x,.27,z));
    for(let x=-44;x<46;x+=5){if(Math.abs(x+18)<8||Math.abs(x-27)<5)continue;box(2.5,.025,.15,m.stripe,x,.28,10)}
    for(let z=-35;z<38;z+=5){if(Math.abs(z-10)<7||Math.abs(z+26)<4)continue;box(.15,.025,2.5,m.stripe,-18,.28,z)}
    for(let i=0;i<7;i++){
      box(.7,.03,3.1,m.stripe,-21+i*1.05,.29,3.8);
      box(.7,.03,3.1,m.stripe,-21+i*1.05,.29,16.2);
      box(3.1,.03,.7,m.stripe,-25,.29,6.8+i*1.05);
      box(3.1,.03,.7,m.stripe,-11,.29,6.8+i*1.05);
    }
    // Residencia 01's colourful framed facade, recessed glazing, balconies and roof garden.
    const px=-3,pz=-6,W=13,D=13,H=28;
    box(W,H,D,m.glass,px,H/2+.55,pz,'pixel');
    box(W+1,1,D+1,m.concrete,px,.95,pz,'pixel');
    box(W+.2,2.4,.22,m.warm,px,2.6,pz+D/2+.13,'pixel');
    const colour=[m.teal,m.coral,m.yellow,m.trim,m.teal,m.yellow,m.coral,m.trim,m.teal];
    for(let f=1;f<=9;f++){
      const y=3+f*2.75;
      box(W+1.1,.27,D+1.1,m.concrete,px,y,pz,'pixel');
      for(const side of [-1,1]){
        box(W,.48,.35,colour[f-1],px,y+.3,pz+side*(D/2+.24),'pixel');
        for(let j=0;j<4;j++){
          const x=px-W/2+1.65+j*3.22;
          box(.14,2.3,.25,m.metal,x-1.45,y-1.23,pz+side*(D/2+.15),'pixel');
          if((f+j)%4===0)box(2.6,1.5,.16,m.warm,x,y-1.25,pz+side*(D/2+.1),'pixel');
          box(2.9,.15,1.1,m.concrete,x,y-.05,pz+side*(D/2+.55),'pixel');
          box(2.9,.7,.09,m.glass,x,y+.4,pz+side*(D/2+1.04),'pixel');
          box(2.9,.055,.1,m.metal,x,y+.79,pz+side*(D/2+1.04),'pixel');
        }
        box(.48,2.75,1.5,colour[f-1],px+side*(W/2+.1),y-1.1,pz+D/2-.3,'pixel');
        box(.24,.5,D,colour[(f+2)%9],px+side*(W/2+.16),y+.35,pz,'pixel');
        for(let j=0;j<3;j++)box(.2,2.3,.17,m.concrete,px+side*(W/2+.15),y-1.2,pz-4.2+j*4.2,'pixel');
      }
    }
    box(5.5,1.7,4.2,m.trim,px+2,29.1,pz-2,'pixel');
    box(9,.22,3,m.park,px-1,28.8,pz+3.5,'pixel');
    for(let i=0;i<5;i++)instance('leaf',m.leaf,[.65,.8,.65],[px-4.5+i*1.65,29.45,pz+4],'pixel');
    for(let i=0;i<6;i++)box(.17,1.7,.17,m.metal,px-5+i*1.9,29.8,pz-4.5,'pixel');
    for(let i=0;i<5;i++)box(10,.12,.24,m.concrete,px-.25,30.7,pz-5+i*.8,'pixel');
    // Landmark anchors are taken only from the supplied reference diagram.
    box(13,7.5,15,m.block,-33,4.2,-7,'coral');
    box(13.6,.4,15.6,m.roof,-33,8.1,-7,'coral');
    box(13.7,.75,.3,m.coral,-33,6.2,.68,'coral');
    box(10,2.3,.15,m.glass,-33,2.4,.57,'coral');
    box(7,.45,10,m.concrete,-28,.8,24,'metro');
    box(6.6,2.5,.3,m.glass,-28,2.1,25.8,'metro');
    box(7.7,.3,5.4,m.accent,-28,3.5,24,'metro');
    [-31,-25].forEach(x=>box(.15,2.7,.15,m.metal,x,2,22,'metro'));
    // Low background buildings give the main tower space to breathe.
    [[14,-7,8,10,10],[16,-18,6,5,7],[1,-18,8,5,5],[-36,-18,9,4,5],[38,-10,8,12,9],[38,1,8,6,5],[-3,28,9,8,7],[13,28,10,9,11],[38,26,9,10,8],[-37,27,6,10,4],[-4,-33,12,5,5],[15,-33,8,5,7]].forEach(([x,z,w,d,h],index)=>{
      box(w,h,d,m.block,x,h/2+.55,z);
      box(w+.35,.25,d+.35,m.roof,x,h+.65,z);
      box(w*.42,.5,d*.38,m.pavement,x+1,h+1,z);
      for(let floor=1;floor<h/2.6;floor++)for(let j=0;j<Math.floor(w/2);j++)
        box(.7,1,.09,(floor+j+index)%5===0?m.warm:m.glass,x-w/2+1.2+j*1.9,floor*2.5,z+d/2+.05);
    });
    // A pocket garden, planted sidewalks, benches and streetlights.
    box(10,.16,13,m.park,11,.56,23);
    [[7,19],[13,19],[7,27],[17,34],[2,35],[-7,34],[-11,-17],[-10,-10],[19,-13],[21,-4],[20,2],[-41,4],[-41,-5],[-40,18],[-37,35],[34,17],[42,17],[33,-18],[42,-18],[-10,21]].forEach(([x,z],i)=>tree(x,z,.75+(i%3)*.13));
    [[-11,1],[-26,1],[-26,18],[-10,18],[22,17],[32,3]].forEach(([x,z])=>{
      box(.13,4.8,.13,m.metal,x,2.6,z);box(1.5,.13,.24,m.metal,x+.65,5,z);box(1,.06,.35,m.warm,x+.7,4.92,z);
    });
    [[6,25],[13,25],[-8,-16]].forEach(([x,z])=>{box(2.6,.25,.8,m.trunk,x,1,z);box(.16,.7,.7,m.metal,x-1,.65,z);box(.16,.7,.7,m.metal,x+1,.65,z)});
    [[-34,8.1,0],[-3,11.9,0],[14,8.1,0],[-20,29,Math.PI/2],[-16,-17,Math.PI/2],[36,-26,0]].forEach(([x,z,rot],i)=>{
      box(3.6,.8,1.55,i%2?m.carDark:m.car,x,.8,z,null,rot);
      box(1.8,.65,1.4,m.glass,x,1.45,z,null,rot);
    });
    const geometry={box:new T.BoxGeometry(1,1,1),cylinder:new T.CylinderGeometry(1,1,1,6),leaf:new T.IcosahedronGeometry(1,1)};
    const dummy=new T.Object3D();
    batches.forEach(({geometry:key,mat,items})=>{
      const mesh=new T.InstancedMesh(geometry[key],mat,items.length);
      items.forEach((item,i)=>{dummy.position.set(...item.pos);dummy.scale.set(...item.scale);dummy.rotation.set(0,item.rotation,0);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix)});
      mesh.castShadow=key!=='box'||mat!==m.road;mesh.receiveShadow=true;
      mesh.userData.owners=items.map(item=>item.owner);
      if(items.some(item=>item.owner))pickables.push(mesh);
      scene.add(mesh);
    });
    const halo=new T.Mesh(new T.RingGeometry(9.5,9.7,72),new T.MeshBasicMaterial({color:'#e0ebae',transparent:true,opacity:.85,side:T.DoubleSide,depthWrite:false}));
    halo.rotation.x=-Math.PI/2;halo.position.set(-3,.57,-6);scene.add(halo);
    // A contact shadow under the floating model (no remote environment assets).
    const shadow=new T.Mesh(new T.PlaneGeometry(400,400),new T.ShadowMaterial({opacity:.22}));
    shadow.rotation.x=-Math.PI/2;shadow.position.y=-3.2;shadow.receiveShadow=true;scene.add(shadow);
    const ambient=new T.HemisphereLight('#e8f0de','#263a34',1.1);scene.add(ambient);
    const sun=new T.DirectionalLight('#ffe3ae',2.1);sun.position.set(-35,85,45);sun.castShadow=true;
    sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-70,right:70,top:70,bottom:-70,near:1,far:190});sun.shadow.bias=-.00025;sun.shadow.normalBias=.18;sun.shadow.radius=3;scene.add(sun);
    const fill=new T.DirectionalLight('#b2d4e2',.7);fill.position.set(60,35,-40);scene.add(fill);
    function theme(light){
      const colours=light?{base:'#71857b',edge:'#acb79c',ground:'#a7b69c',pavement:'#d4d4bf',road:'#7d9389',stripe:'#e7e5cf',block:'#b2baaa',roof:'#d4d6bc'}:{base:'#142d2e',edge:'#405b53',ground:'#30483e',pavement:'#617468',road:'#203234',stripe:'#a3aa8c',block:'#60776e',roof:'#84988a'};
      Object.entries(colours).forEach(([key,value])=>materials[key].color.set(value));
      ambient.intensity=light?1.25:1.1;sun.intensity=light?1.75:2.1;
    }
    scene.updateMatrixWorld(true);
    return {scene,places,pickables,halo,theme};
  }
  return {build,places};
});
