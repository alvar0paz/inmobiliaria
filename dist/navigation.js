/* The mobile menu and desktop links share one DOM and one reading order. */
document.addEventListener('DOMContentLoaded',()=>{
 const menu=document.getElementById('primary-menu'),toggle=document.querySelector('.menu-toggle');
 if(!menu||!toggle)return;
 const options=menu.querySelector('.options-menu'),summary=options?.querySelector('summary');
 const desktopHover=matchMedia('(min-width:801px) and (hover:hover) and (pointer:fine)');
 const closeOptions=()=>{if(options)options.open=false};
 const close=(focus=false)=>{closeOptions();menu.classList.remove('is-open');toggle.setAttribute('aria-expanded','false');if(focus)toggle.focus()};
 toggle.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')!=='true';toggle.setAttribute('aria-expanded',String(open));menu.classList.toggle('is-open',open);if(!open)closeOptions()});
 if(options){
  // Native disclosure handles taps, Enter and Space; mouse hover adds the desktop shortcut.
  options.addEventListener('pointerenter',e=>{if(desktopHover.matches&&e.pointerType==='mouse')options.open=true});
  options.addEventListener('pointerleave',e=>{if(desktopHover.matches&&e.pointerType==='mouse'&&!options.contains(document.activeElement))closeOptions()});
  options.addEventListener('focusout',()=>requestAnimationFrame(()=>{if(!options.contains(document.activeElement))closeOptions()}));
  summary.addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();options.open=true;options.querySelector('a').focus()}});
  document.addEventListener('click',e=>{if(!options.contains(e.target))closeOptions()});
 }
 menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>close()));
 document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;if(options?.open){e.preventDefault();closeOptions();summary.focus()}else if(menu.classList.contains('is-open'))close(true)});
 document.addEventListener('click',e=>{if(!e.target.closest('.navigation'))close()});
 matchMedia('(max-width:800px)').addEventListener('change',()=>close());
 const links=[...menu.querySelectorAll(':scope > a')].filter(a=>a.pathname===location.pathname&&a.hash);
 const sections=links.map(a=>document.querySelector(a.hash)).filter(Boolean);
 if(!sections.length)return;
 const comparison=document.getElementById('opciones');
 const update=()=>{let active=null;for(const section of sections){if(section.getBoundingClientRect().top<=150)active=section.id}if(comparison&&comparison.getBoundingClientRect().top<=150)active='opciones';links.forEach(a=>{if(a.hash==='#'+active)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current')});if(summary){if(active==='opciones')summary.setAttribute('aria-current','location');else summary.removeAttribute('aria-current')}};
 let pending=false;window.addEventListener('scroll',()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{update();pending=false})},{passive:true});update();
});
