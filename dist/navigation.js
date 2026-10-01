/* The mobile menu and desktop links share one DOM and one reading order. */
document.addEventListener('DOMContentLoaded',()=>{
 const menu=document.getElementById('primary-menu'),toggle=document.querySelector('.menu-toggle');
 if(!menu||!toggle)return;
 const close=(focus=false)=>{menu.classList.remove('is-open');toggle.setAttribute('aria-expanded','false');if(focus)toggle.focus()};
 toggle.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')!=='true';toggle.setAttribute('aria-expanded',String(open));menu.classList.toggle('is-open',open)});
 menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>close()));
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu.classList.contains('is-open'))close(true)});
 document.addEventListener('click',e=>{if(!e.target.closest('.navigation'))close()});
 matchMedia('(max-width:800px)').addEventListener('change',()=>close());
 const links=[...menu.querySelectorAll('a')].filter(a=>a.pathname===location.pathname&&a.hash);
 const sections=links.map(a=>document.querySelector(a.hash)).filter(Boolean);
 if(!sections.length)return;
 const update=()=>{let active=null;for(const section of sections){if(section.getBoundingClientRect().top<=150)active=section.id}links.forEach(a=>{if(a.hash==='#'+active)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current')})};
 let pending=false;window.addEventListener('scroll',()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{update();pending=false})},{passive:true});update();
});
