/* Arrival uses verified Residencia 01 renders; the furnished room is explicitly illustrative. */
(()=>{
 const frames=[...document.querySelectorAll('[data-arrival-image]')];if(!frames.length)return;
 let stop=0;const titles=[['Todo empieza<br>con una mirada.','It starts<br>with a first look.'],['Un lugar<br>que te recibe.','A place<br>that welcomes you.'],['Aquí empieza<br>tu historia.','Your story<br>begins here.']],captions=[['La ciudad queda afuera. Tu historia está por empezar.','The city stays outside. Your story is about to begin.'],['El color, la luz y el primer paso hacia casa.','Colour, light and your first step towards home.'],['Deja que el espacio te cuente el resto.','Let the space tell you the rest.']],actions=[['Entrar al lobby','Enter the lobby'],['Conocer el interior','See the interior'],['Abrir la maqueta','Open the model']];
 function update(animate=false){const n=state.lang==='en'?1:0;frames.forEach((img,i)=>{img.hidden=i!==stop;img.classList.toggle('arriving',animate&&i===stop)});document.querySelectorAll('[data-arrival-step]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.arrivalStep===stop)));document.getElementById('arrival-title').innerHTML=titles[stop][n];document.getElementById('arrival-caption').textContent=captions[stop][n];document.getElementById('arrival-continue').textContent=actions[stop][n];}
 document.querySelectorAll('[data-arrival-step]').forEach(b=>b.onclick=()=>{stop=+b.dataset.arrivalStep;update(true)});
 document.getElementById('arrival-continue').onclick=()=>{if(stop<2){stop++;update(true)}else{document.getElementById('spatial-building').click();document.querySelector('.spatial-heading').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});}};
 document.addEventListener('site:render',()=>update());update();
})();
window.AlphaSpatial={};
/* Small on-demand scene shared by the buyer page and the High quote demo. */
window.AlphaSpatial.interior=function(T){
 const group=new T.Group(),glowing=[];
 const material=(color,extra={})=>new T.MeshStandardMaterial({color,roughness:.73,metalness:.04,...extra});
 const stone=material('#c2b8a5'),wall=material('#e8deca'),wood=material('#926744'),linen=material('#e2d5bf'),teal=material('#244a4f'),bronze=material('#9f794a'),green=material('#587055'),dark=material('#223844');
 const glow=material('#e6c18a',{emissive:'#ffb35f',emissiveIntensity:.3});glowing.push(glow);
 const unitBox=new T.BoxGeometry(1,1,1);
 function box(x,y,z,w,h,d,m,parent=group){const o=new T.Mesh(unitBox,m);o.position.set(x,y,z);o.scale.set(w,h,d);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
 function cylinder(x,y,z,r,h,m,parent=group){const o=new T.Mesh(new T.CylinderGeometry(r,r,h,24),m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
 function plant(x,z,s=1){cylinder(x,.22*s,z,.3*s,.44*s,stone);cylinder(x,.8*s,z,.045*s,1.4*s,wood);for(let i=0;i<7;i++){const a=i*2.4,o=new T.Mesh(new T.SphereGeometry(1,12,8),green);o.scale.set(.34*s,.57*s,.2*s);o.position.set(x+Math.cos(a)*.3*s,(1.02+i*.08)*s,z+Math.sin(a)*.3*s);o.rotation.z=Math.cos(a)*.38;o.castShadow=true;group.add(o);}}
 function sofa(x,z,angle=0){const g=new T.Group();g.position.set(x,0,z);g.rotation.y=angle;group.add(g);box(0,.32,0,3.1,.4,1.05,linen,g);box(0,.73,-.46,3.1,.87,.18,linen,g);box(-1.47,.52,0,.2,.7,1.06,linen,g);box(1.47,.52,0,.2,.7,1.06,linen,g);for(let i=-1;i<=1;i++)box(i*.92,.57,.04,.88,.17,.8,wall,g);for(let x of[-1.2,1.2])for(let z of[-.35,.35])cylinder(x,.12,z,.05,.24,bronze,g);}
 box(0,-.14,0,13,.28,10,stone);for(let i=0;i<32;i++)box(-6.28+i*.4,.01,0,.382,.035,9.85,i%3===0?wood:material('#af8964'));
 box(-6.45,2,0,.18,4,10,wall);box(6.45,2,-1.7,.18,4,6.6,wall);
 box(0,.2,-5,13,.4,.22,dark);box(0,3.82,-5,13,.35,.22,dark);
 for(let i=0;i<6;i++)box(-6.4+i*2.56,2,-5,.1,4,.2,dark);
 const glass=material('#abc9cf',{transparent:true,opacity:.17,roughness:.18,metalness:.18,side:T.DoubleSide});
 for(let i=0;i<5;i++)box(-5.12+i*2.56,2,-5,2.43,3.44,.04,glass);
 box(0,3.67,-4.81,12.8,.055,.05,glow);
 box(-1,.05,.5,7.5,.06,5.4,material('#c7baa4'));sofa(-1.8,-1.1);sofa(2.5,1,-Math.PI/2);
 cylinder(-.7,.47,1.18,1,.12,wood);cylinder(-.7,.23,1.18,.15,.46,bronze);cylinder(-.98,.58,1.13,.15,.16,wall);box(-.3,.56,1.45,.52,.045,.35,teal);
 box(2.5,1.02,-3.25,3.5,.15,1.2,wood);for(let x of[1.05,3.95])for(let z of[-3.65,-2.85])cylinder(x,.49,z,.055,.98,bronze);
 for(let x of[1.6,3.3]){box(x,.51,-2.13,.7,.13,.72,teal);box(x,.85,-1.79,.7,.72,.08,teal);for(let z of[-2.42,-1.87])cylinder(x,.24,z,.045,.48,bronze);}
 plant(-5.15,-3.8,1.55);plant(5.2,-4,1.45);plant(-5.2,3.5,.9);
 box(-6.31,2.2,.1,.05,1.8,2.6,wood);box(-6.26,2.2,.1,.05,1.52,2.32,wall);box(-6.21,2.1,.1,.02,.9,1.38,teal);
 cylinder(4.6,1.32,2.2,.055,2.64,bronze);cylinder(4.6,2.67,2.2,.51,.24,glow);
 const backdrop=new T.Group();backdrop.visible=false;group.add(backdrop);
 const skyline=material('#8c9b9f');for(let i=0;i<14;i++){const x=-24+i*3.5,h=2+(i*7%9);box(x,h/2-1.1,-25-(i%3)*3,2.2,h,3,skyline,backdrop);}
 const mountains=material('#677f86');for(let i=0;i<8;i++){const o=new T.Mesh(new T.ConeGeometry(13+(i%3)*5,8+(i%4)*3,5),mountains);o.position.set(-50+i*16,1.5,-61-(i%2)*6);o.rotation.y=i*.7;backdrop.add(o);}
 const lamp=new T.PointLight('#ffc07c',0,23,2);lamp.position.set(4,2.3,1.5);group.add(lamp);
 return {group,setInside(value){backdrop.visible=value},setTime(index){const lo=Math.floor(index),hi=Math.min(2,lo+1),mix=index-lo,value=a=>a[lo]+(a[hi]-a[lo])*mix,color=a=>new T.Color(a[lo]).lerp(new T.Color(a[hi]),mix);lamp.intensity=value([0,.25,.9]);glowing.forEach(m=>m.emissiveIntensity=value([.12,.35,1.1]));skyline.color.copy(color(['#8eaaa9','#ae947e','#283c59']));mountains.color.copy(color(['#789997','#8b777a','#25374e']));}};
};
