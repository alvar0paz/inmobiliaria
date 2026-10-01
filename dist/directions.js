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
 function showInterest(){const el=document.querySelector('#home-interest');if(!el||!interest)return;el.hidden=false;el.textContent=(state.lang==='en'?'Your interest: ':'Te interesa: ')+labels[interest][state.lang==='en'?1:0]}
 document.querySelectorAll('[data-home-type]').forEach(a=>a.addEventListener('click',()=>{interest=a.dataset.homeType;showInterest()}));
 document.addEventListener('pixel:interest',e=>{if(labels[e.detail]){interest=e.detail;showInterest()}});
 document.addEventListener('site:render',showInterest);
})();
/* Reading and keyboard order follow each direction's visual sequence. */
(()=>{
 const main=document.querySelector('.discover-page');if(!main)return;
 let previous=null;
 function arrange(){if(previous===state.style)return;previous=state.style;
  const order=state.style==='essential'?['details','homes','experience','amenities','location','contact']:state.style==='editorial'?['homes','experience','amenities','details','location','contact']:['experience','homes','amenities','details','location','contact'];
  order.forEach(id=>main.append(document.getElementById(id)));
 }
 document.addEventListener('site:render',arrange);arrange();
})();
/* Start each visual direction at its opening composition. */
(()=>{
 if(!document.querySelector('.discovery-home,.discover-page'))return;
 let previous=state.style;
 document.addEventListener('site:render',()=>{
  if(previous===state.style)return;previous=state.style;
  history.replaceState(null,'',location.pathname+location.search);
  window.scrollTo({top:0,behavior:'instant'});
 });
})();
