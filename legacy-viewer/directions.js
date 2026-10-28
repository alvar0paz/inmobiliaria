/* The featured project changes its image, description and destination together. */
(()=>{
 const projects={pixel:{name:'Residencia 01',url:'/proyecto/',copy:['Explora Residencia 01, un proyecto ficticio para descubrir esta experiencia.','Explore Residencia 01, a fictional project showcasing this experience.']},magnus:{name:'Residencia 02',url:'/demo/#demo-medio',copy:['Otro ejemplo de arquitectura para tu portafolio.','Another architectural example for your portfolio.']},sparta:{name:'Residencia 03',url:'/demo/#demo-alto',copy:['Una tercera identidad visual, conectada a la misma información.','A third visual identity connected to the same information.']}};
 let featured='pixel';
 function update(){
  const link=document.querySelector('#featured-link');if(!link)return;
  const p=projects[featured],en=state.lang==='en';
  document.querySelectorAll('[data-scene-home]').forEach(e=>e.hidden=e.dataset.sceneHome!==featured);
  document.querySelectorAll('[data-featured]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.featured===featured)));
  const description=document.querySelector('#featured-description');description.removeAttribute('data-es');description.removeAttribute('data-en');description.textContent=p.copy[en?1:0];
  link.textContent=featured==='pixel'?(en?'View proposed Residencia 01 demo':'Ver demo propuesta de Residencia 01'):(en?'Explore demo: ':'Explorar demo: ')+p.name+' ↗';
  link.href=featured==='pixel'?`/proyecto/?style=${state.style}&lang=${state.lang}`:p.url;
  if(featured==='pixel'){link.removeAttribute('target');link.removeAttribute('rel')}else{link.target='_blank';link.rel='noopener'}
 }
 document.querySelectorAll('[data-featured]').forEach(b=>b.onclick=()=>{featured=b.dataset.featured;update()});
 document.querySelectorAll('.studio-menu-panel a,.studio-menu-panel button').forEach(b=>b.addEventListener('click',()=>b.closest('details').open=false));
 document.addEventListener('site:render',update);update();
})();
(()=>{
 let interest=null;
 const labels={estudio:['Estudio','Studio'],suite:['Suite','Suite'],departamento:['Departamento','Apartment'],depa2:['Departamento de 2 dormitorios','Two-bedroom apartment'],depa3:['Departamento de 3 dormitorios','Three-bedroom apartment']};
 function showInterest(){
  const el=document.querySelector('#home-interest');if(!el||!interest)return;
  const en=state.lang==='en',type=labels[interest.type]?.[en?1:0]||interest.type;
  const detail=interest.id?`${en?'Apartment':'Departamento'} ${interest.id} · ${en?'Floor':'Piso'} ${interest.floor} · ${type} · ${interest.m2} m²`:type;
  el.hidden=false;el.textContent=(en?'Your selection: ':'Tu selección: ')+detail;
  const email=document.querySelector('[data-enquiry-email]');
  if(email){const subject=en?'Real estate website demo':'Demo web inmobiliaria';const body=(en?'Hello, I would like this experience for my project. I tried the demo with ':'Hola, me gustaría esta experiencia para mi proyecto. Probé la demo con ')+detail+(interest.id?(en?'. This is a fictional selection from the demo.':'. Esta es una selección ficticia de la demo.'):(en?'. Please send me more information.':'. Por favor enviarme más información.'));email.href='mailto:info@tnkoo.com?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body)}
 }
 document.querySelectorAll('[data-home-type]').forEach(a=>a.addEventListener('click',()=>{interest={type:a.dataset.homeType};showInterest()}));
 document.addEventListener('pixel:interest',e=>{const value=typeof e.detail==='string'?{type:e.detail}:e.detail;if(labels[value.type]){interest=value;showInterest()}});
 document.addEventListener('site:render',showInterest);
})();
