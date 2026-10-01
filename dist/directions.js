/* The featured project changes its image, description and destination together. */
(()=>{
 const projects={pixel:{name:'Pixel',url:'/pixel/',copy:['Entra a Pixel. Descubre sus espacios y explora una nueva forma de elegir tu hogar.','Step inside Pixel. Discover its spaces and a new way to choose your home.']},magnus:{name:'Magnus',url:'https://alphabuildershq.com/magnus/',copy:['Descubre la arquitectura de Magnus. Continúa en el sitio del proyecto para conocer sus detalles.','Discover the architecture of Magnus. Continue to the project website for details.']},sparta:{name:'Sparta',url:'https://alphabuildershq.com/proyecto-sparta/',copy:['Sparta, en la Av. Bélgica y Shyris. Conoce el proyecto y sus espacios en su sitio oficial.','Sparta, on Av. Bélgica and Shyris. Discover the project and its spaces on its official website.']}};
 let featured='pixel';
 function update(){
  const link=document.querySelector('#featured-link');if(!link)return;
  const p=projects[featured],en=state.lang==='en';
  document.querySelectorAll('[data-scene-home]').forEach(e=>e.hidden=e.dataset.sceneHome!==featured);
  document.querySelectorAll('[data-featured]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.featured===featured)));
  const description=document.querySelector('#featured-description');description.removeAttribute('data-es');description.removeAttribute('data-en');description.textContent=p.copy[en?1:0];
  link.textContent=featured==='pixel'?(en?'Enter Pixel':'Entrar a Pixel'):(en?'Discover ':'Conocer ')+p.name;
  link.href=featured==='pixel'?`/pixel/?style=${state.style}&lang=${state.lang}`:p.url;
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
  if(email){const subject=en?'Enquiry about Pixel':'Consulta sobre Pixel';const body=(en?'Hello, I am interested in ':'Hola, me interesa ')+detail+(interest.id?(en?'. I saw this apartment in the illustrative preview; please confirm actual availability and pricing.':'. Vi este departamento en la muestra ilustrativa; por favor confirmar disponibilidad y precio reales.'):(en?'. Please send me more information.':'. Por favor enviarme más información.'));email.href='mailto:contacto@pixel.com.ec?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body)}
 }
 document.querySelectorAll('[data-home-type]').forEach(a=>a.addEventListener('click',()=>{interest={type:a.dataset.homeType};showInterest()}));
 document.addEventListener('pixel:interest',e=>{const value=typeof e.detail==='string'?{type:e.detail}:e.detail;if(labels[value.type]){interest=value;showInterest()}});
 document.addEventListener('site:render',showInterest);
})();
