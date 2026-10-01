/* Proforma page: tier tabs, level 1 (central manager + WhatsApp bot), level 2 (2D buildings),
   level 3 (3D model + virtual visit), quote calculator, launch screen and sound.
   Runs after app.js, so `state`, `render`, `$` and `$$` are available. */
(()=>{
'use strict';
const D=JSON.parse($('#demo-data').textContent);
const en=()=>state.lang==='en', L=(es,e)=>en()?e:es, tr=a=>a[en()?1:0];
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const COLOR={disponible:'#d5bc7c',reservado:'#7f8ea3',vendido:'#3b423b'};
const P={};D.projects.forEach(p=>{P[p.slug]=p;p.sellable=true;p.priceAge=5});
const price=(p,u)=>Math.round(u.m2*p.m2_price*(1+(u.floor-2)*.008)/100)*100;
const money=n=>'USD '+Math.round(n).toLocaleString(en()?'en-US':'es-EC',{maximumFractionDigits:0});
const priceOk=p=>p.sellable&&p.priceAge<=D.priceValidDays;
const month=ym=>{const [y,m]=ym.split('-');return new Date(y,m-1,1).toLocaleDateString(en()?'en-US':'es-EC',{month:'short',year:'numeric'})};
const tyName=k=>tr(D.typologies[k].name), stName=k=>tr(D.status[k]), usName=k=>tr(D.unitStatus[k]);
const free=p=>p.units.filter(u=>u.status==='disponible');
const fromPrice=(p,type)=>{const us=free(p).filter(u=>!type||u.type===type);return us.length?Math.min(...us.map(u=>price(p,u))):null};
const typesOf=p=>Object.keys(D.typologies).filter(k=>p.units.some(u=>u.type===k));
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const clock=()=>new Date().toLocaleTimeString(en()?'en-US':'es-EC',{hour:'2-digit',minute:'2-digit'});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const priceLabel=(p,u)=>u.status==='vendido'?'—':!p.sellable?L('No comercializable','Not for sale'):priceOk(p)?money(price(p,u)):L('Consultar precio','Ask for price');
const legend=units=>{const c={disponible:0,reservado:0,vendido:0};units.forEach(u=>c[u.status]++);return Object.keys(c).map(k=>`<span><i style="background:${COLOR[k]}"></i>${usName(k)} <b>${c[k]}</b></span>`).join('')};
const hooks={change:[],lang:[]}, on=(e,f)=>hooks[e].push(f), fire=e=>hooks[e].forEach(f=>f());

function log(html){const ol=$('#event-log');if(!ol)return;const li=document.createElement('li');li.innerHTML=`<span>${new Date().toLocaleTimeString('es-EC',{hour12:false})}</span> ${html}`;ol.prepend(li);while(ol.children.length>40)ol.lastChild.remove()}

/* ---------- Sound: an original startup chord and a soft ambient pad, synthesised with Web Audio ---------- */
const Sound=(()=>{
 let ctx=null,master=null,pad=null,enabled=false;
 const btn=$('#sound-toggle');
 function ensure(){if(ctx)return ctx;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;ctx=new AC();master=ctx.createGain();master.gain.value=.9;const comp=ctx.createDynamicsCompressor();master.connect(comp).connect(ctx.destination);return ctx}
 function reverb(){const len=ctx.sampleRate*3.2,buf=ctx.createBuffer(2,len,ctx.sampleRate);for(let c=0;c<2;c++){const d=buf.getChannelData(c);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.6)}const r=ctx.createConvolver();r.buffer=buf;return r}
 function voice(freq,t0,dur,gain,out,type='sine',detune=0){const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.value=freq;o.detune.value=detune;g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(gain,t0+.035);g.gain.exponentialRampToValueAtTime(gain*.45,t0+.7);g.gain.exponentialRampToValueAtTime(.0001,t0+dur);o.connect(g).connect(out);o.start(t0);o.stop(t0+dur+.05)}
 // Wide, warm major chord with a slow bloom: the "switching on" feeling, not a copy of any product sound.
 function chime(){if(!enabled||!ensure())return;const t=ctx.currentTime+.05,bus=ctx.createGain(),rv=reverb(),wet=ctx.createGain(),lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.setValueAtTime(900,t);lp.frequency.exponentialRampToValueAtTime(5200,t+.5);bus.gain.value=.16;wet.gain.value=.55;bus.connect(lp);lp.connect(master);lp.connect(rv).connect(wet).connect(master);
  [[87.31,.9],[174.61,.7],[261.63,.55],[349.23,.5],[440,.42],[523.25,.32],[659.25,.2]].forEach(([f,g],i)=>{voice(f,t+i*.012,4.2,g,bus,'sine');voice(f,t+i*.012,3.6,g*.35,bus,'triangle',i%2?6:-6)})}
 function whoosh(){if(!enabled||!ensure())return;const t=ctx.currentTime,len=ctx.sampleRate*.6,buf=ctx.createBuffer(1,len,ctx.sampleRate),d=buf.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;const s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();s.buffer=buf;f.type='bandpass';f.Q.value=1.2;f.frequency.setValueAtTime(300,t);f.frequency.exponentialRampToValueAtTime(2400,t+.45);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.05,t+.12);g.gain.exponentialRampToValueAtTime(.0001,t+.58);s.connect(f).connect(g).connect(master);s.start(t);s.stop(t+.6)}
 function tick(){if(!enabled||!ensure())return;const t=ctx.currentTime,o=ctx.createOscillator(),g=ctx.createGain();o.frequency.setValueAtTime(1800,t);o.frequency.exponentialRampToValueAtTime(900,t+.05);g.gain.setValueAtTime(.035,t);g.gain.exponentialRampToValueAtTime(.0001,t+.07);o.connect(g).connect(master);o.start(t);o.stop(t+.08)}
 // Slow evolving pad (Fmaj9 → Dm9 → Bbmaj7 → Cadd9) at low volume.
 function startPad(){if(pad||!ensure())return;const out=ctx.createGain(),lp=ctx.createBiquadFilter(),rv=reverb();out.gain.value=0;out.gain.linearRampToValueAtTime(.05,ctx.currentTime+4);lp.type='lowpass';lp.frequency.value=1100;lp.connect(out);lp.connect(rv).connect(out);out.connect(master);
  const chords=[[174.61,220,261.63,329.63,392],[146.83,174.61,220,261.63,329.63],[116.54,174.61,233.08,293.66,349.23],[130.81,196,261.63,293.66,392]];let i=0,alive=true;
  const play=()=>{if(!alive)return;const t=ctx.currentTime;chords[i%4].forEach((f,j)=>{[-5,5].forEach(dt=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type=j?'sine':'triangle';o.frequency.value=f;o.detune.value=dt;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.09,t+3);g.gain.linearRampToValueAtTime(.09,t+7);g.gain.linearRampToValueAtTime(0,t+10.5);o.connect(g).connect(lp);o.start(t);o.stop(t+10.6)})});i++};
  play();const timer=setInterval(play,8000);pad={stop(){alive=false;clearInterval(timer);out.gain.cancelScheduledValues(ctx.currentTime);out.gain.setTargetAtTime(0,ctx.currentTime,.5);setTimeout(()=>out.disconnect(),2500)}}}
 function set(v){enabled=v;if(btn){btn.setAttribute('aria-pressed',v);btn.classList.toggle('on',v)}if(v){ensure();ctx&&ctx.resume();startPad()}else if(pad){pad.stop();pad=null}try{localStorage.setItem('pf-sound',v?'1':'0')}catch(e){}}
 let muted=false;try{muted=localStorage.getItem('pf-sound')==='0'}catch(e){}
 if(btn){btn.setAttribute('aria-pressed',!muted);btn.classList.toggle('on',!muted);btn.addEventListener('click',e=>{e.stopPropagation();const want=btn.getAttribute('aria-pressed')!=='true';set(want);if(want)chime()})}
 // Browsers only allow audio after a user gesture: sound is on by default and starts with the first one.
 const unlock=e=>{removeEventListener('pointerdown',unlock,true);removeEventListener('keydown',unlock,true);if(muted||enabled||e.target.closest('#sound-toggle,#launch'))return;set(true);chime()};
 addEventListener('pointerdown',unlock,true);addEventListener('keydown',unlock,true);
 return {set,chime,whoosh,tick,get on(){return enabled},get muted(){return muted}};
})();

/* ---------- Launch screen ---------- */
(()=>{const s=$('#launch');if(!s)return;let seen=false;try{seen=sessionStorage.getItem('pf-launch')==='1'}catch(e){}
 if(seen){s.remove();document.documentElement.classList.add('pf-open');return}
 document.documentElement.classList.add('pf-launching');
 const open=()=>{try{sessionStorage.setItem('pf-launch','1')}catch(e){}if(!Sound.muted){Sound.set(true);Sound.chime()}s.classList.add('out');document.documentElement.classList.remove('pf-launching');document.documentElement.classList.add('pf-open');setTimeout(()=>s.remove(),reduce?0:1500)};
 $('#launch-open').addEventListener('click',open);
 $('#launch-open').focus({preventScroll:true});
})();

/* ---------- Scroll reveal ---------- */
if('IntersectionObserver' in window&&!reduce){const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{rootMargin:'0px 0px -8% 0px'});$$('.pf-reveal').forEach((el,i)=>{el.style.setProperty('--d',(i%4)*80+'ms');io.observe(el)})}else $$('.pf-reveal').forEach(el=>el.classList.add('in'));

/* ---------- Section index ---------- */
(()=>{const links=$$('[data-dot]');if(!links.length||!('IntersectionObserver' in window))return;let current=null;
 const mark=id=>{if(id===current)return;current=id;links.forEach(l=>l.setAttribute('aria-current',l.dataset.dot===id))};
 const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)mark(e.target.id)}),{rootMargin:'-45% 0px -50% 0px'});
 links.forEach(l=>{const el=document.getElementById(l.dataset.dot);if(el)io.observe(el);l.addEventListener('click',e=>{e.preventDefault();Sound.tick();el.scrollIntoView({behavior:reduce?'auto':'smooth'})})});
})();

/* ---------- Tabs, linked to the visual directions ---------- */
const TIER_STYLE={basico:'essential',medio:'editorial',alto:'immersive'};
const STYLE_TIER=Object.fromEntries(Object.entries(TIER_STYLE).map(([k,v])=>[v,k]));
let tier=null;
function withTransition(fn){if(document.startViewTransition&&!reduce)document.startViewTransition(fn);else fn()}
function selectTier(k,opts={}){
 if(!TIER_STYLE[k])k='basico';
 const changed=tier!==k;
 const apply=()=>{tier=k;
  $$('[data-tab]').forEach(b=>{const s=b.dataset.tab===k;b.setAttribute('aria-selected',s);b.tabIndex=s?0:-1});
  $$('[data-panel]').forEach(p=>p.hidden=p.dataset.panel!==k);
  $$('[data-tier-card]').forEach(c=>c.classList.toggle('is-active',c.dataset.tierCard===k));
  if(!opts.fromStyle&&state.style!==TIER_STYLE[k]){state.style=TIER_STYLE[k];render()}
 };
 if(changed&&opts.animate)withTransition(apply);else apply();
 if(changed&&opts.animate)Sound.whoosh();
 ({basico:Basic,medio:Mid,alto:High})[k].show();
 if(opts.hash)history.replaceState(null,'',location.pathname+location.search+'#demo-'+k);
 if(opts.scroll)$('#demo').scrollIntoView({behavior:reduce?'auto':'smooth'});
}

/* ---------- Level 1: central manager, outputs and WhatsApp bot ---------- */
const Basic=(()=>{
 const f=$('#cms');if(!f)return{show(){}};
 let cur=D.projects[0],chatLang=null,awaitingName=false,leadN=1042,chatToken=0;
 const chat=$('#wa-body'),quick=$('#wa-quick');
 const today=()=>new Date().toLocaleDateString(en()?'en-US':'es-EC',{day:'numeric',month:'short',year:'numeric'});
 function fill(){f.project.value=cur.slug;f.m2_price.value=cur.m2_price;f.status.value=cur.status;f.progress.value=cur.progress;f.progress_out.value=cur.progress+'%';f.sellable.checked=cur.sellable;[...f.age].forEach(r=>r.checked=+r.value===cur.priceAge)}
 function note(){const n=$('#cms-note');n.textContent=!cur.sellable?L('Regla activa: no comercializable. El sitio sigue publicado, sin botones de compra ni formularios de venta.','Rule active: not for sale. The site stays live, without purchase buttons or sales forms.'):cur.priceAge>D.priceValidDays?L(`Regla activa: precios con ${cur.priceAge} días. Se muestra “Consultar precio” en todos los sitios y se avisa al responsable comercial.`,`Rule active: prices are ${cur.priceAge} days old. “Ask for price” is shown on every site and the sales lead is notified.`):L('Cada cambio regenera la tarjeta, el sitio, el JSON-LD, la tabla de estado, los sitemaps, el llms.txt y el feed.','Every change regenerates the card, the site, the JSON-LD, the status table, the sitemaps, llms.txt and the feed.')}
 function feedJSON(){const ok=priceOk(cur);const o={nombre:cur.name,nombre_completo:`Edificio ${cur.name} · Alpha Builders`,dominio:cur.domain,sector:cur.sector,estado:cur.status,avance_obra:cur.progress,fecha_estimada_entrega:cur.delivery,comercializable:cur.sellable,precio_m2_usd:ok?cur.m2_price:null,nota_precio:ok?null:'Consultar precio',tipologias:typesOf(cur).map(k=>({tipo:D.typologies[k].name[0],dormitorios:D.typologies[k].beds,desde_usd:ok?fromPrice(cur,k):null,disponibles:free(cur).filter(u=>u.type===k).length})),publisher:'https://alphabuildershq.com/#organization',ultima_actualizacion:new Date().toISOString().slice(0,10)};
  return esc(JSON.stringify(o,null,2)).replace(/(&quot;[^&]*?&quot;)(\s*:)?|\b(true|false|null)\b|-?\b\d+(?:\.\d+)?\b/g,(m,s,colon,lit)=>s?`<span class="${colon?'k':'s'}">${s}</span>${colon||''}`:`<span class="n">${m}</span>`)}
 function outputs(flash){
  const ok=priceOk(cur),from=fromPrice(cur);
  $('#out-card').innerHTML=`<div class="pf-card-mini"><img src="/assets/${cur.image}.webp" alt=""><div><h4>${cur.name}</h4><p>${esc(cur.sector)} · Quito</p><span class="pf-badge gold">${stName(cur.status)}</span><span class="pf-badge">${free(cur).length} ${L('disponibles','available')}</span><span class="pf-price ${ok?'':'ask'}">${!cur.sellable?L('Sin unidades a la venta','No units for sale'):ok&&from?L('Desde ','From ')+money(from):L('Consultar precio','Ask for price')}</span></div></div>`;
  $('#out-page-domain').textContent=cur.domain+'/';
  $('#out-page').innerHTML=`<div class="pf-page-mini"><span class="pf-byline">${L('Un proyecto de Alpha Builders','A project by Alpha Builders')}</span><h4>${cur.name}</h4><dl><dt>${L('Dirección','Address')}</dt><dd>${esc(cur.address)}</dd><dt>${L('Estado','Status')}</dt><dd>${stName(cur.status)} · ${cur.progress}%</dd><dt>${L('Entrega','Delivery')}</dt><dd>${cur.status==='entregado'?L('Entregado','Delivered'):month(cur.delivery)}</dd><dt>${L('Precio/m²','Price/m²')}</dt><dd>${ok?money(cur.m2_price):L('Consultar','Ask')}</dd></dl><div class="pf-cta">${cur.sellable?`<span>${L('Cotizar','Get a quote')}</span><span class="alt">WhatsApp</span>`:`<span class="alt">${L('Contacto para propietarios','Owner contact')}</span>`}</div><p>${L('Última actualización: ','Last updated: ')}${today()}</p></div>`;
  $('#out-status').innerHTML=`<table class="pf-status-row"><thead><tr><th>${L('Proyecto','Project')}</th><th>${L('Estado','Status')}</th><th>${L('Avance','Progress')}</th><th>${L('Entrega','Delivery')}</th></tr></thead><tbody>${D.projects.map(p=>`<tr class="${p===cur?'is-current':''}"><td>${p.name}</td><td>${stName(p.status)}</td><td>${p.progress}%<div class="pf-bar"><i style="width:${p.progress}%"></i></div></td><td>${p.status==='entregado'?'—':month(p.delivery)}</td></tr>`).join('')}</tbody></table>`;
  $('#out-feed').innerHTML=feedJSON();
  note();
  if(flash&&!reduce)$$('.pf-out').forEach((el,i)=>{el.classList.remove('flash');void el.offsetWidth;setTimeout(()=>el.classList.add('flash'),i*90)});
 }
 function regen(){log(`${L('regenerado','regenerated')}: ${L('tarjeta · sitio · JSON-LD · tabla de estado · sitemap · llms.txt · feed','card · site · JSON-LD · status table · sitemap · llms.txt · feed')}`);log(`IndexNow → ${cur.domain}, alphabuildershq.com`)}
 f.addEventListener('submit',e=>e.preventDefault());
 f.project.addEventListener('change',()=>{cur=P[f.project.value];fill();outputs(true);resetChat();Sound.tick();log(`${L('gestor · abre','manager · opens')} <b>${cur.name}</b>`)});
 f.m2_price.addEventListener('input',()=>{const v=+f.m2_price.value;if(v>=500&&v<=6000){cur.m2_price=v;outputs(false);fire('change')}});
 f.m2_price.addEventListener('change',()=>{outputs(true);log(`${L('gestor','manager')} · precio_m2 ${cur.slug} = ${cur.m2_price}`);regen()});
 f.status.addEventListener('change',()=>{cur.status=f.status.value;outputs(true);fire('change');log(`${L('gestor','manager')} · estado ${cur.slug} = ${cur.status}`);regen()});
 f.progress.addEventListener('input',()=>{cur.progress=+f.progress.value;f.progress_out.value=cur.progress+'%';outputs(false);fire('change')});
 f.progress.addEventListener('change',()=>{outputs(true);log(`${L('gestor','manager')} · avance ${cur.slug} = ${cur.progress}%`);regen()});
 [...f.age].forEach(r=>r.addEventListener('change',()=>{cur.priceAge=+r.value;outputs(true);fire('change');if(cur.priceAge>D.priceValidDays){log(L(`regla · precios de ${cur.slug} con ${cur.priceAge} días → “Consultar precio” en todos los sitios`,`rule · ${cur.slug} prices ${cur.priceAge} days old → “Ask for price” on every site`));log(L('correo → responsable comercial','email → sales lead'))}regen()}));
 f.sellable.addEventListener('change',()=>{cur.sellable=f.sellable.checked;outputs(true);fire('change');log(`Legal · comercializable ${cur.slug} = ${cur.sellable}`);if(!cur.sellable)log(L('regla · sin botones de compra; contacto para propietarios','rule · no purchase buttons; owner contact instead'));regen()});

 function msg(side,html){const d=document.createElement('div');d.className='pf-msg '+side;d.innerHTML=html+`<time>${clock()}</time>`;chat.append(d);chat.scrollTop=chat.scrollHeight}
 function bot(html,delay=750){const token=chatToken;return new Promise(res=>{const t=document.createElement('div');t.className='pf-msg in typing';t.innerHTML='<i></i><i></i><i></i>';chat.append(t);chat.scrollTop=chat.scrollHeight;setTimeout(()=>{t.remove();if(token!==chatToken)return res(false);msg('in',html);Sound.tick();res(true)},reduce?0:delay)})}
 const QUICK=[['precios',['Precios','Prices']],['disponibilidad',['Disponibilidad','Availability']],['obra',['Avance de obra','Construction']],['ubicacion',['Ubicación','Location']],['visita',['Agendar visita','Book a visit']]];
 function setQuick(list){quick.innerHTML='';list.forEach(([k,label])=>{const b=document.createElement('button');b.type='button';b.textContent=tr(label);b.onclick=()=>ask(k,tr(label));quick.append(b)})}
 function answer(k){const p=cur;switch(k){
  case 'precios':if(!p.sellable)return L(`${p.name} no tiene unidades a la venta en este momento. Te comunico con atención a propietarios y compradores.`,`${p.name} has no units for sale right now. I’ll connect you with owner and buyer support.`);
   if(!priceOk(p))return L(`Estamos actualizando los precios de ${p.name}. Un asesor te confirma hoy mismo el valor vigente.`,`We’re updating ${p.name}’s prices. An advisor will confirm the current price today.`);
   return L(`Precios de ${p.name}:`,`${p.name} prices:`)+'\n'+typesOf(p).map(k=>{const v=fromPrice(p,k),t=D.typologies[k];return `• ${tyName(k)} · ${t.beds?t.beds+' '+L('dorm.','bed'):L('monoambiente','open plan')} · ${v?L('desde','from')+` <b>${money(v)}</b>`:L('agotado','sold out')}`}).join('\n')+'\n'+L(`Precios vigentes, actualizados hace ${p.priceAge} días.`,`Current prices, updated ${p.priceAge} days ago.`);
  case 'disponibilidad':return L(`Hoy quedan <b>${free(p).length}</b> unidades disponibles en ${p.name}:`,`There are <b>${free(p).length}</b> units available in ${p.name} today:`)+'\n'+typesOf(p).map(k=>`• ${tyName(k)}: ${free(p).filter(u=>u.type===k).length}`).join('\n')+'\n'+L(`Míralas piso por piso en ${p.domain}/tipologias/`,`See them floor by floor at ${p.domain}/tipologias/`);
  case 'obra':return p.status==='entregado'?L(`${p.name} ya fue entregado.`,`${p.name} has been delivered.`):L(`${p.name} está en estado <b>${stName(p.status).toLowerCase()}</b>, con <b>${p.progress}%</b> de avance.\nEntrega estimada: ${month(p.delivery)}.`,`${p.name} is <b>${stName(p.status).toLowerCase()}</b>, at <b>${p.progress}%</b>.\nEstimated delivery: ${month(p.delivery)}.`);
  case 'ubicacion':return `📍 ${esc(p.address)}, ${esc(p.sector)}, Quito.\n`+L('La sala de ventas atiende de lunes a sábado.','The sales office is open Monday to Saturday.');
  case 'visita':return L('¡Con gusto! ¿Me compartes tu nombre y un número de contacto?','Happy to help! Could you share your name and a contact number?');
  default:return L('Puedo ayudarte con precios, disponibilidad, avance de obra, ubicación o agendar una visita.','I can help with prices, availability, construction progress, location or booking a visit.')}}
 function intent(t){t=t.toLowerCase();return /precio|cuesta|valor|cu[aá]nto|price|cost/.test(t)?'precios':/dispon|quedan|unidad|avail|left/.test(t)?'disponibilidad':/obra|avance|entrega|progress|deliver/.test(t)?'obra':/d[oó]nde|ubica|direc|where|locat|address/.test(t)?'ubicacion':/visita|cita|agendar|visit|book/.test(t)?'visita':'otro'}
 async function lead(name){awaitingName=false;const first=esc(name.split(/[\s·,]/)[0]);if(!await bot(L(`Gracias, ${first}. Un asesor de la sala de ventas de ${cur.name} te escribe hoy. Horario: lunes a viernes de 9:00 a 18:00 y sábados de 10:00 a 14:00.`,`Thanks, ${first}. An advisor from the ${cur.name} sales office will message you today. Hours: Monday to Friday 9:00–18:00, Saturday 10:00–14:00.`)))return;
  const id='A-'+(++leadN),c=document.createElement('div');c.className='pf-lead-card';c.innerHTML=`→ CRM · lead ${id}<br>proyecto: ${cur.slug} · canal: whatsapp<br>sitio: ${cur.domain} · utm_source: google<br>${L('copia por correo a la sala de ventas','email copy to the sales office')}`;chat.append(c);chat.scrollTop=chat.scrollHeight;
  log(`CRM · lead ${id} · proyecto=${cur.slug} · canal=whatsapp`);setQuick(QUICK)}
 async function ask(k,text){msg('out',esc(text));setQuick([]);
  if(k==='lead'){lead(text);return}
  log(`bot · intent=${k} · proyecto=${cur.slug}`);
  if(!await bot(answer(k),k==='precios'?1000:800))return;
  if(k==='visita'){awaitingName=true;setQuick([['lead',['Andrea Pérez · 099 123 4567','Andrea Pérez · 099 123 4567']]])}else setQuick(QUICK)}
 $('#wa-form').addEventListener('submit',e=>{e.preventDefault();const i=$('#wa-text'),v=i.value.trim();if(!v)return;i.value='';if(awaitingName){msg('out',esc(v));setQuick([]);lead(v)}else ask(intent(v),v)});
 function resetChat(){chatToken++;chat.innerHTML='';awaitingName=false;chatLang=state.lang;$('#wa-name').textContent=cur.name;const av=$('#wa-avatar');av.textContent=cur.name[0];av.style.background=cur.color;setQuick([]);
  msg('out',L(`Hola, vi ${cur.name} en ${cur.domain}`,`Hi, I saw ${cur.name} on ${cur.domain}`));
  log(`GA4 · whatsapp_click · proyecto=${cur.slug} · origen=${cur.domain}`);
  bot(L(`¡Hola! 👋 Soy el asistente de <b>${cur.name}</b>, un proyecto de Alpha Builders. Respondo con los mismos datos que publica el sitio. ¿Qué te gustaría saber?`,`Hi! 👋 I’m the <b>${cur.name}</b> assistant, a project by Alpha Builders. I answer with the same data the website shows. What would you like to know?`),1100).then(ok=>ok&&setQuick(QUICK))}
 fill();
 on('lang',()=>{outputs(false);const i=$('#wa-text');i.placeholder=i.dataset[en()?'phEn':'phEs'];if(chatLang&&chatLang!==state.lang&&tier==='basico')resetChat()});
 return {show(){outputs(false);if(chatLang!==state.lang)resetChat()}};
})();

/* ---------- Level 2: buildings in 2D ---------- */
const Mid=(()=>{
 if(!$('#elev'))return{show(){},draw(){}};
 let p=D.projects[0],floor=null,unit=null,type=null,onlyFree=false,ready=false;
 const NS='http://www.w3.org/2000/svg';
 const visible=u=>(!type||u.type===type)&&(!onlyFree||u.status==='disponible');
 const bestFloor=pr=>{let best=2,n=-1;for(let f=2;f<=pr.floors+1;f++){const c=pr.units.filter(u=>u.floor===f&&u.status==='disponible').length;if(c>n){n=c;best=f}}return best};
 function sky(){$('#skyline').innerHTML=D.projects.map(pr=>{const cols=pr.layout.length,rows=pr.floors+1,cw=64/cols,rh=92/rows;let r='';pr.units.forEach(u=>{r+=`<rect x="${u.pos*cw+.6}" y="${(pr.floors+1-u.floor)*rh+.6}" width="${cw-1.2}" height="${rh-1.2}" fill="${COLOR[u.status]}"/>`});r+=`<rect x="0" y="${pr.floors*rh+.6}" width="64" height="${rh-1}" fill="#f1d9a055"/>`;
  return `<button class="pf-sky" data-sky="${pr.slug}" aria-pressed="${pr===p}"><svg viewBox="0 0 64 92" aria-hidden="true">${r}</svg><span><b>${pr.name}</b><small>${esc(pr.sector)} · ${pr.floors} ${L('pisos','floors')}</small><span class="pf-sky-count"><em>${free(pr).length}</em> ${L('disponibles de','available of')} ${pr.units.length}</span></span></button>`}).join('');
  $$('[data-sky]').forEach(b=>b.onclick=()=>{p=P[b.dataset.sky];floor=bestFloor(p);unit=null;Sound.tick();withTransition(draw)})}
 function filters(){const chips=[[null,['Todas','All']],...Object.keys(D.typologies).map(k=>[k,D.typologies[k].name])];
  $('#filters2d').innerHTML=chips.map(([k,n])=>`<button class="pf-chip" data-type="${k||''}" aria-pressed="${type===k}">${tr(n)}</button>`).join('')+`<button class="pf-chip" data-free aria-pressed="${onlyFree}">${L('Solo disponibles','Available only')}</button>`;
  $$('#filters2d [data-type]').forEach(b=>b.onclick=()=>{type=b.dataset.type||null;Sound.tick();draw()});$('#filters2d [data-free]').onclick=()=>{onlyFree=!onlyFree;Sound.tick();draw()}}
 function elev(){const cols=p.layout.length,F=p.floors,fh=30,gut=48,W=520,bw=W-gut-18,cw=bw/cols,top=50,H=top+(F+1)*fh+34;
  let s=`<defs><linearGradient id="skyg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c2620"/><stop offset="1" stop-color="#0e120f"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#skyg)"/>`;
  s+=`<rect x="${gut-4}" y="${top-14}" width="${bw+8}" height="14" fill="#2c332c"/><rect x="${gut+bw*.62}" y="${top-30}" width="${bw*.22}" height="16" fill="#252b25"/>`;
  if(p.amenities.includes('pool'))s+=`<rect x="${gut+bw*.08}" y="${top-11}" width="${bw*.4}" height="6" fill="#5fb3c9"/><text x="${gut+bw*.08}" y="${top-20}" class="t-s">${L('PISCINA','POOL')}</text>`;
  if(p.amenities.includes('rooftop'))s+=`<text x="${gut+bw*.08}" y="${top-20}" class="t-s">ROOFTOP</text>`;
  for(let f=F+1;f>=2;f--){const y=top+(F+1-f)*fh,us=p.units.filter(u=>u.floor===f).sort((a,b)=>a.pos-b.pos),n=us.filter(u=>u.status==='disponible'&&visible(u)).length;
   s+=`<g class="floor${f===floor?' is-sel':''}" data-floor="${f}" tabindex="0" role="button" aria-label="${L('Piso','Floor')} ${f}, ${n} ${L('disponibles','available')}"><rect class="floor-hit" x="4" y="${y}" width="${W-8}" height="${fh}" fill="transparent"/><text x="${gut-10}" y="${y+fh/2+4}" text-anchor="end" class="t-f">P${f}</text>`;
   us.forEach(u=>{const x=gut+u.pos*cw;s+=`<rect x="${x+2}" y="${y+3}" width="${cw-4}" height="${fh-6}" fill="${COLOR[u.status]}" opacity="${visible(u)?1:.13}"/><line x1="${x+cw/2}" y1="${y+3}" x2="${x+cw/2}" y2="${y+fh-3}" stroke="#0e120f" stroke-opacity=".35"/>`});
   s+=`<line x1="${gut-4}" y1="${y+fh}" x2="${gut+bw+4}" y2="${y+fh}" stroke="#c9c2ae" stroke-opacity=".5"/></g>`}
  const ly=top+F*fh;s+=`<rect x="${gut}" y="${ly+2}" width="${bw}" height="${fh-2}" fill="#f1d9a0" opacity=".25"/><rect x="${gut+bw/2-14}" y="${ly+8}" width="28" height="${fh-8}" fill="#f1d9a0" opacity=".7"/><text x="${gut-10}" y="${ly+fh/2+4}" text-anchor="end" class="t-f">PB</text><text x="${gut+8}" y="${ly+fh/2+4}" class="t-s">LOBBY</text>`;
  s+=`<line x1="0" y1="${top+(F+1)*fh}" x2="${W}" y2="${top+(F+1)*fh}" stroke="#d5bc7c" stroke-width="1.5"/><text x="${W/2}" y="${H-10}" text-anchor="middle" class="t-s">${esc(p.address).toUpperCase()}</text>`;
  s+=`<style>.t-f{font:600 11px DM Sans,sans-serif;fill:#9da596}.t-s{font:600 9px DM Sans,sans-serif;letter-spacing:.14em;fill:#9da596}</style>`;
  const svg=$('#elev');svg.setAttribute('viewBox',`0 0 ${W} ${H}`);svg.innerHTML=s;
  $$('#elev .floor').forEach(g=>{const go=()=>{floor=+g.dataset.floor;unit=null;Sound.tick();$$('#elev .floor').forEach(x=>x.classList.toggle('is-sel',x===g));plan();card()};g.onclick=go;g.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go()}}});
  $('#elev-title').textContent=`${p.name} · ${L('fachada esquemática','schematic elevation')}`}
 function plan(){const us=p.units.filter(u=>u.floor===floor).sort((a,b)=>a.pos-b.pos),x0=30,y0=46,w=540,rowH=128,corr=34;
  const row=list=>{const ws=list.map(u=>u.m2),sum=ws.reduce((a,b)=>a+b,0);let x=x0;return list.map((u,i)=>{const ww=ws[i]/sum*w,r=[u,x,ww];x+=ww;return r})};
  let s=`<rect x="${x0-6}" y="${y0-6}" width="${w+12}" height="${rowH*2+corr+12}" fill="none" stroke="#c9c2ae" stroke-opacity=".6" stroke-width="2"/>`;
  s+=`<rect x="${x0}" y="${y0+rowH}" width="${w}" height="${corr}" fill="#ffffff08"/><rect x="${x0+w/2-48}" y="${y0+rowH+4}" width="96" height="${corr-8}" fill="#2c332c" stroke="#9da596" stroke-opacity=".4"/><text x="${x0+w/2}" y="${y0+rowH+corr/2+3}" text-anchor="middle" class="t-s">${L('ASCENSORES','LIFTS')}</text><text x="${x0+10}" y="${y0+rowH+corr/2+3}" class="t-s">${L('CIRCULACIÓN','CORRIDOR')}</text>`;
  const draw=(cells,y,front)=>cells.forEach(([u,x,ww])=>{const vis=visible(u),dark=u.status!=='disponible',ty=D.typologies[u.type];
   s+=`<g class="unit${unit===u?' is-sel':''}" data-unit="${u.id}" tabindex="0" role="button" aria-label="${L('Unidad','Unit')} ${u.id}, ${tyName(u.type)}, ${u.m2} m², ${usName(u.status)}" opacity="${vis?1:.18}"><rect x="${x+2}" y="${y+2}" width="${ww-4}" height="${rowH-4}" fill="${COLOR[u.status]}" fill-opacity="${u.status==='vendido'?.9:.88}" stroke="#0e120f" stroke-width="2"/>`;
   if(ty.beds)s+=`<line x1="${x+ww*.58}" y1="${front?y+2:y+rowH*.38}" x2="${x+ww*.58}" y2="${front?y+rowH*.62:y+rowH-2}" stroke="#0e120f" stroke-opacity=".45" stroke-width="1.5"/>`;
   s+=`<rect x="${x+ww/2-9}" y="${front?y+rowH-4:y}" width="18" height="4" fill="#0e120f"/><text x="${x+10}" y="${y+22}" class="t-u" fill="${dark?'#efece2':'#1b1f18'}">${u.id}</text><text x="${x+10}" y="${y+38}" class="t-v" fill="${dark?'#c7ccbf':'#3a3322'}">${tyName(u.type)}</text><text x="${x+10}" y="${y+rowH-14}" class="t-v" fill="${dark?'#c7ccbf':'#3a3322'}">${u.m2} m²</text></g>`});
  draw(row(us.filter(u=>u.pos<p.front)),y0,true);draw(row(us.filter(u=>u.pos>=p.front)),y0+rowH+corr,false);
  s+=`<line x1="${x0}" y1="${y0-18}" x2="${x0+w}" y2="${y0-18}" stroke="#d5bc7c" stroke-dasharray="4 5"/><text x="${x0}" y="${y0-26}" class="t-s">${L('FACHADA PRINCIPAL · BALCONES','MAIN FAÇADE · BALCONIES')}</text><g transform="translate(${x0+w-12},${y0-30})"><path d="M0 -8 L5 6 L0 3 L-5 6Z" fill="#d5bc7c"/><text y="-11" text-anchor="middle" class="t-s">N</text></g>`;
  s+=`<style>.t-u{font:700 14px DM Sans,sans-serif}.t-v{font:500 11px DM Sans,sans-serif}.t-s{font:600 9px DM Sans,sans-serif;letter-spacing:.14em;fill:#9da596}</style>`;
  const svg=$('#plan');svg.setAttribute('viewBox',`0 0 600 ${y0+rowH*2+corr+20}`);svg.innerHTML=s;
  $$('#plan .unit').forEach(g=>{const go=()=>{unit=us.find(u=>u.id===g.dataset.unit);Sound.tick();$$('#plan .unit').forEach(x=>x.classList.toggle('is-sel',x===g));card()};g.onclick=go;g.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go()}}});
  $('#plan-title').textContent=`${p.name} · ${L('piso','floor')} ${floor}`}
 function card(){const c=$('#unit2d');if(!unit){c.innerHTML=`<p class="pf-unit-empty">${L('Toca una unidad en la planta para ver su ficha.','Tap a unit on the plan to see its details.')}</p>`;return}
  const u=unit,ty=D.typologies[u.type];
  c.innerHTML=`<span class="pf-level">${p.name.toUpperCase()} · ${L('PISO','FLOOR')} ${u.floor}</span><h4>${L('Unidad','Unit')} ${u.id} · ${tyName(u.type)}</h4><dl><dt>${L('Dorm.','Beds')}</dt><dd>${ty.beds||'—'}</dd><dt>m²</dt><dd>${u.m2}</dd><dt>${L('Precio','Price')}</dt><dd>${priceLabel(p,u)}</dd><dt>${L('Estado','Status')}</dt><dd><span class="pf-status"><i style="background:${COLOR[u.status]}"></i>${usName(u.status)}</span></dd></dl><div class="pf-actions">${u.status==='disponible'&&p.sellable?`<button class="button" data-wa>${L('Cotizar por WhatsApp','Quote on WhatsApp')}</button>`:''}<button class="button ghost" data-to3d>${L('Ver en 3D','View in 3D')}</button></div><p class="detail-note" data-wa-preview></p>`;
  const wa=c.querySelector('[data-wa]');if(wa)wa.onclick=()=>{c.querySelector('[data-wa-preview]').textContent=L(`Se abriría WhatsApp de la sala de ventas con: “Hola, me interesa la unidad ${u.id} (${tyName(u.type)}) de ${p.name}. La vi en ${p.domain}.”`,`The sales office WhatsApp would open with: “Hi, I’m interested in unit ${u.id} (${tyName(u.type)}) at ${p.name}. I saw it on ${p.domain}.”`);log(`GA4 · whatsapp_click · proyecto=${p.slug} · unidad=${u.id}`)};
  c.querySelector('[data-to3d]').onclick=()=>{selectTier('alto',{animate:true,hash:true});High.focusUnit(p.slug,u.id);$('#stage3d').scrollIntoView({behavior:reduce?'auto':'smooth',block:'center'})}}
 function draw(){if(floor==null)floor=bestFloor(p);sky();filters();elev();plan();card();$('.pf-mid [data-legend]').innerHTML=legend(p.units)}
 function focusUnit(slug,id){p=P[slug];unit=p.units.find(u=>u.id===id)||null;if(unit)floor=unit.floor;draw()}
 on('change',()=>ready&&draw());on('lang',()=>ready&&draw());
 return {show(){ready=true;draw()},draw,focusUnit};
})();

/* ---------- Level 3: 3D model of the network ---------- */
const High=(()=>{
 const stage=$('#stage3d'),canvas=$('#scene3d');if(!stage)return{show(){},focusUnit(){}};
 let ready=false,renderer,scene,camera,ray,mouse,raf=0,visible=false,sel=null,focus=null,iso=0,onlyFree=false,last=performance.now(),hoverQueued=null;
 const FH=3.2,DEPTH=7,CORR=2.4,UW=4.8,SPOT={pixel:[0,0],magnus:[-36,-12],sparta:[36,-6]};
 const B={},units=[],labels=[];
 const portrait=()=>stage.clientWidth<stage.clientHeight*.9,far=()=>portrait()?1.55:1;
 const cam={theta:.7,phi:1.1,r:175,tx:0,ty:20,tz:-6},goal={...cam};
 const tip=document.createElement('div');tip.className='pf-3d-tip';tip.hidden=true;stage.append(tip);
 const MAT={disponible:{color:'#d5bc7c',emissive:'#5a4618',emissiveIntensity:.55,roughness:.35,metalness:.2},reservado:{color:'#7f8ea3',emissive:'#1c2430',emissiveIntensity:.3,roughness:.55},vendido:{color:'#353c35',roughness:.85}};
 function fail(){stage.insertAdjacentHTML('beforeend',`<div class="pf-3d-fallback">${L('Este navegador no tiene WebGL activo. La disponibilidad está en la vista 2D y en las tablas.','WebGL is not available in this browser. Availability is shown in the 2D view and the tables.')}</div>`)}
 function box(w,h,d,mat,x,y,z,parent){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m}
 function build(p){
  const g=new THREE.Group(),[gx,gz]=SPOT[p.slug];g.position.set(gx,0,gz);scene.add(g);
  const front=p.layout.slice(0,p.front),back=p.layout.slice(p.front),W=Math.max(front.length,back.length)*UW,DT=DEPTH*2+CORR,H=(p.floors+1)*FH;
  const info=B[p.slug]={p,g,W,DT,H,units:[],slabs:[],roof:[]};
  const rowX=row=>{const w=row.map(k=>(D.typologies[k].m2[0]+D.typologies[k].m2[1])/2),s=w.reduce((a,b)=>a+b);let x=-W/2;return w.map(v=>{const ww=v/s*W,c=x+ww/2;x+=ww;return [c,ww]})};
  const fx=rowX(front),bx=rowX(back);
  box(W-.4,H,CORR,new THREE.MeshStandardMaterial({color:'#262c26',roughness:.9}),0,H/2,0,g);
  const lobby=box(W,FH-.3,DT,new THREE.MeshStandardMaterial({color:'#f1d9a0',emissive:'#8a6a2a',emissiveIntensity:.7,transparent:true,opacity:.6,roughness:.2}),0,FH/2,0,g);lobby.userData={building:p.slug};info.lobby=lobby;
  const slabMat=new THREE.MeshStandardMaterial({color:'#b9b3a2',roughness:.8});
  for(let f=1;f<=p.floors+2;f++){const s=box(W+.7,.24,DT+.7,slabMat,0,(f-1)*FH,0,g);s.userData.level=f;info.slabs.push(s)}
  const fin=box(.35,H+2.5,.35,new THREE.MeshStandardMaterial({color:p.color,emissive:p.color,emissiveIntensity:.6}),-W/2-.5,(H+2.5)/2,DT/2+.5,g);info.roof.push(fin);
  info.roof.push(box(W*.3,2.2,DT*.35,new THREE.MeshStandardMaterial({color:'#2c322c',roughness:.9}),W*.25,H+1.2,-DT*.2,g));
  if(p.amenities.includes('pool'))info.roof.push(box(W*.45,.3,DT*.4,new THREE.MeshStandardMaterial({color:'#5fb3c9',emissive:'#1d5f73',emissiveIntensity:.8,roughness:.1,metalness:.3}),-W*.18,H+.3,DT*.12,g));
  if(p.amenities.includes('rooftop'))for(let i=0;i<5;i++)info.roof.push(box(1.2,.9,1.2,new THREE.MeshStandardMaterial({color:'#4f6b45',roughness:1}),-W/2+2+i*(W-4)/4,H+.55,DT/2-1.2,g));
  const edge=new THREE.LineBasicMaterial({color:'#0e120f',transparent:true,opacity:.5});
  p.units.forEach(u=>{const isF=u.pos<p.front,[cx,ww]=isF?fx[u.pos]:bx[u.pos-p.front],z=isF?CORR/2+DEPTH/2:-(CORR/2+DEPTH/2);
   const mat=new THREE.MeshStandardMaterial({...MAT[u.status]}),m=box(ww-.28,FH-.5,DEPTH-.3,mat,cx,(u.floor-1)*FH+FH/2+.12,z,g);
   const e=new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry),edge);m.add(e);m.userData={u,p,edge:e,base:MAT[u.status]};info.units.push(m);units.push(m)});
  info.amen=[];p.amenities.forEach(a=>{const pos=a==='lobby'?new THREE.Vector3(gx,FH*.9,gz+DT/2+.5):a==='pool'?new THREE.Vector3(gx-W*.18,H+.6,gz+DT*.12):a==='rooftop'?new THREE.Vector3(gx,H+1.5,gz+DT/2-1.2):new THREE.Vector3(gx+W/2,FH,gz);info.amen.push({a,pos})});
 }
 function context(){const mat=new THREE.MeshStandardMaterial({color:'#1f261f',roughness:1}),rnd=(s=>()=>(s=(s*16807)%2147483647)/2147483647)(7);
  for(let i=0;i<46;i++){const a=rnd()*Math.PI*2,r=62+rnd()*110,x=Math.cos(a)*r,z=Math.sin(a)*r,h=4+rnd()*22,w=6+rnd()*10;box(w,h,6+rnd()*10,mat,x,h/2,z,scene)}
  const road=new THREE.MeshStandardMaterial({color:'#121612',roughness:1});[[0,18,300,9],[0,-44,300,7]].forEach(([x,z,w,d])=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,d),road);m.rotation.x=-Math.PI/2;m.position.set(x,.03,z);m.receiveShadow=true;scene.add(m)});
  [-18,18,54].forEach(x=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(8,300),road);m.rotation.x=-Math.PI/2;m.position.set(x,.03,0);scene.add(m)});
  const leaf=new THREE.MeshStandardMaterial({color:'#3f5a3a',roughness:1}),trunk=new THREE.MeshStandardMaterial({color:'#3a2f25'});
  for(let i=0;i<40;i++){const x=-120+i*6+rnd()*2,z=rnd()>.5?23:13,t=new THREE.Group();box(.3,1.6,.3,trunk,0,.8,0,t);const s=new THREE.Mesh(new THREE.SphereGeometry(1.3+rnd()*.6,10,8),leaf);s.position.y=2.6;s.castShadow=true;t.add(s);t.position.set(x,0,z);scene.add(t)}}
 function init(){
  if(ready)return true;if(!window.THREE){fail();ready=true;return false}
  try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'})}catch(e){fail();ready=true;return false}
  ready=true;renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  scene=new THREE.Scene();scene.background=new THREE.Color('#0e120f');scene.fog=new THREE.Fog('#0e120f',170,420);
  camera=new THREE.PerspectiveCamera(34,1,.5,900);ray=new THREE.Raycaster();mouse=new THREE.Vector2();
  scene.add(new THREE.HemisphereLight('#f3ecd8','#1a201a',.8));
  const sun=new THREE.DirectionalLight('#fff1d6',1.25);sun.position.set(70,120,60);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-90,right:90,top:90,bottom:-90,near:10,far:320});sun.shadow.bias=-.0005;scene.add(sun);
  const rim=new THREE.DirectionalLight('#9fb7d4',.35);rim.position.set(-80,40,-60);scene.add(rim);
  const ground=new THREE.Mesh(new THREE.CircleGeometry(260,72),new THREE.MeshStandardMaterial({color:'#151a16',roughness:1}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
  const grid=new THREE.GridHelper(320,80,'#263026','#1b221c');grid.position.y=.02;scene.add(grid);
  context();D.projects.forEach(build);
  D.projects.forEach(p=>{const el=document.createElement('div');el.className='pf-3d-label';el.innerHTML='<button type="button"></button>';el.firstChild.onclick=()=>focusProject(p.slug);$('#labels3d').append(el);const b=B[p.slug];labels.push({el,pos:new THREE.Vector3(SPOT[p.slug][0],b.H+4,SPOT[p.slug][1]),show:()=>!focus,p});
   b.amen.forEach(({a,pos})=>{const el2=document.createElement('div');el2.className='pf-3d-label amenity';const scene_=a==='lobby'?'lobby':a==='pool'?'pool':null;el2.innerHTML=`<button type="button" ${scene_?'':'disabled'}></button>`;if(scene_)el2.firstChild.onclick=()=>Tour.open(scene_,p.slug);$('#labels3d').append(el2);labels.push({el:el2,pos,show:()=>focus===p.slug&&!iso,amen:a})})});
  $('#projects3d').innerHTML=D.projects.map(p=>`<button class="pf-chip" data-p3="${p.slug}" aria-pressed="false">${p.name}</button>`).join('');
  $$('[data-p3]').forEach(b=>b.onclick=()=>focusProject(b.dataset.p3));
  $('#overview3d').onclick=()=>focusProject(null);
  $('#floor3d').oninput=e=>{iso=+e.target.value<=1?0:+e.target.value;Sound.tick();if(focus){const b=B[focus];goal.ty=iso?(iso-1)*FH+FH/2:b.H*.45;goal.r=iso?Math.max(b.W,b.DT)*2.6+14:Math.max(b.H,b.W)*1.9+22;goal.phi=iso?.78:1.18}apply();ui()};
  $('#avail3d').onchange=e=>{onlyFree=e.target.checked;Sound.tick();apply()};
  bindPointer();labelText();apply();ui();
  new ResizeObserver(resize).observe(stage);resize();cam.r=goal.r=175*far();
  new IntersectionObserver(es=>{visible=es[0].isIntersecting;if(visible)loop()}).observe(stage);
  return true}
 function resize(){if(!renderer)return;const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}
 function labelText(){labels.forEach(l=>{const b=l.el.firstChild;if(l.p)b.innerHTML=`<b>${l.p.name}</b><small>${free(l.p).length} ${L('disponibles','available')}</small>`;else b.textContent=l.amen==='lobby'?'Lobby':l.amen==='pool'?L('Piscina','Pool'):l.amen==='rooftop'?'Rooftop':'Gym'})}
 function apply(){units.forEach(m=>{const {u,p,edge,base}=m.userData,mat=m.material;let o=1;
   if(focus&&p.slug!==focus)o=.22;
   if(onlyFree&&u.status!=='disponible')o=Math.min(o,.07);
   if(iso&&p.slug===focus&&u.floor!==iso)o=u.floor>iso?0:.06;
   mat.transparent=o<1;mat.opacity=o;mat.depthWrite=o>=1;m.visible=o>0;edge.visible=o>=.5;
   mat.emissive.set(m===sel?'#ffffff':base.emissive||'#000000');mat.emissiveIntensity=m===sel?.45:base.emissiveIntensity||0});
  Object.values(B).forEach(b=>{const mine=b.p.slug===focus;b.slabs.forEach(s=>{s.visible=!(iso&&mine&&s.userData.level>iso+1)});b.roof.forEach(r=>r.visible=!(iso&&mine));b.lobby.visible=!(iso&&mine&&iso>1)})}
 function ui(){$$('[data-p3]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.p3===focus));$('#overview3d').setAttribute('aria-pressed',!focus);
  const r=$('#floor3d'),o=$('#floor3d-out');r.disabled=!focus;r.max=focus?B[focus].p.floors+1:1;r.min=1;r.value=iso||1;o.textContent=iso?`${L('piso','floor')} ${iso}`:L('todos','all');
  $('.pf-high [data-legend]').innerHTML=legend(focus?P[focus].units:D.projects.flatMap(p=>p.units))}
 function focusProject(slug,keep){focus=slug;iso=0;if(!keep)select(null);Sound.whoosh();
  if(slug){const b=B[slug],[x,z]=SPOT[slug];Object.assign(goal,{tx:x,ty:b.H*.45,tz:z,r:(Math.max(b.H,b.W)*1.9+22)*far(),phi:1.18})}else Object.assign(goal,{tx:0,ty:20,tz:-6,r:175*far(),phi:1.1});
  apply();ui();log(`GA4 · maqueta_3d · proyecto=${slug||'red'}`)}
 function select(m){sel=m;const box=$('#unit3d');if(!m){box.hidden=true;apply();return}
  const {u,p}=m.userData,ty=D.typologies[u.type];
  box.innerHTML=`<button class="close" data-x aria-label="${L('Cerrar','Close')}">×</button><span class="pf-level">${p.name.toUpperCase()} · ${L('PISO','FLOOR')} ${u.floor}</span><h4>${L('Unidad','Unit')} ${u.id}</h4><dl><dt>${L('Tipo','Type')}</dt><dd>${tyName(u.type)}</dd><dt>m²</dt><dd>${u.m2}</dd><dt>${L('Precio','Price')}</dt><dd>${priceLabel(p,u)}</dd><dt>${L('Estado','Status')}</dt><dd><span class="pf-status"><i style="background:${COLOR[u.status]}"></i>${usName(u.status)}</span></dd></dl><div class="pf-actions"><button class="button" data-visit>${L('Visita virtual','Virtual visit')}</button><button class="button ghost" data-to2d>${L('Ver en 2D','View in 2D')}</button></div>`;
  box.hidden=false;box.querySelector('[data-x]').onclick=()=>select(null);
  box.querySelector('[data-visit]').onclick=()=>Tour.open(ty.scene,p.slug);
  box.querySelector('[data-to2d]').onclick=()=>{selectTier('medio',{animate:true,hash:true});Mid.focusUnit(p.slug,u.id);$('#demo').scrollIntoView({behavior:reduce?'auto':'smooth'})};
  const w=m.getWorldPosition(new THREE.Vector3()),front=u.pos<p.front;let th=(front?.45:Math.PI+.45),d=th-goal.theta;d=Math.atan2(Math.sin(d),Math.cos(d));Object.assign(goal,{tx:w.x,ty:w.y,tz:w.z,r:52*far(),phi:1.15,theta:goal.theta+d});
  apply();Sound.tick();log(`GA4 · unidad_3d · proyecto=${p.slug} · unidad=${u.id}`)}
 function pick(e){const r=canvas.getBoundingClientRect();mouse.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(mouse,camera);const hits=ray.intersectObjects(units.concat(Object.values(B).map(b=>b.lobby)),false);return hits.find(h=>h.object.visible&&(!h.object.material.transparent||h.object.material.opacity>.3))}
 function bindPointer(){const ptrs=new Map();let down=null,moved=false,pinch=0;const dist=()=>{const [a,b]=[...ptrs.values()];return Math.hypot(a.x-b.x,a.y-b.y)};
  canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});down={x:e.clientX,y:e.clientY};moved=false;last=performance.now();if(ptrs.size===2)pinch=dist()});
  canvas.addEventListener('pointermove',e=>{if(ptrs.has(e.pointerId)){const pr=ptrs.get(e.pointerId),dx=e.clientX-pr.x,dy=e.clientY-pr.y;ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});last=performance.now();
    if(ptrs.size===1){if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>5){moved=true;stage.classList.add('dragging');tip.hidden=true}if(moved){goal.theta-=dx*.006;goal.phi=clamp(goal.phi-dy*.005,.3,1.45)}}
    else if(ptrs.size===2){const d=dist();if(pinch)goal.r=clamp(goal.r*pinch/d,16,300);pinch=d;moved=true}}
   else if(e.pointerType==='mouse'){hoverQueued=e}});
  const up=e=>{ptrs.delete(e.pointerId);stage.classList.remove('dragging');if(!ptrs.size){if(down&&!moved)click(e);down=null}};
  canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',e=>{ptrs.delete(e.pointerId);down=null});
  canvas.addEventListener('pointerleave',()=>{tip.hidden=true;canvas.style.cursor=''});
  canvas.addEventListener('wheel',e=>{e.preventDefault();last=performance.now();goal.r=clamp(goal.r*(1+e.deltaY*.0012),16,300)},{passive:false})}
 function hover(e){const h=pick(e),r=stage.getBoundingClientRect();if(h&&h.object.userData.u){const {u}=h.object.userData;tip.innerHTML=`<b>${u.id}</b> · ${tyName(u.type)} · <span style="color:${u.status==='vendido'?'#9da596':COLOR[u.status]}">${usName(u.status)}</span>`;tip.style.left=e.clientX-r.left+'px';tip.style.top=e.clientY-r.top+'px';tip.hidden=false;canvas.style.cursor='pointer'}else if(h){tip.hidden=true;canvas.style.cursor='pointer'}else{tip.hidden=true;canvas.style.cursor=''}}
 function click(e){const h=pick(e);if(!h)return;const d=h.object.userData;if(d.u){if(focus!==d.p.slug){focus=d.p.slug;iso=0;ui()}select(h.object)}else if(d.building&&focus!==d.building)focusProject(d.building)}
 function loop(){if(raf)return;const step=t=>{raf=0;if(!visible||tier!=='alto')return;
   if(hoverQueued){hover(hoverQueued);hoverQueued=null}
   if(!sel&&!iso&&performance.now()-last>4500&&!reduce)goal.theta+=focus?.0016:.0009;
   const k=reduce?1:.075;for(const key of ['theta','phi','r','tx','ty','tz'])cam[key]+=(goal[key]-cam[key])*k;
   camera.position.set(cam.tx+cam.r*Math.sin(cam.phi)*Math.sin(cam.theta),cam.ty+cam.r*Math.cos(cam.phi),cam.tz+cam.r*Math.sin(cam.phi)*Math.cos(cam.theta));camera.lookAt(cam.tx,cam.ty,cam.tz);
   if(sel)sel.material.emissiveIntensity=.3+Math.sin(t/260)*.18;
   renderer.render(scene,camera);
   const w=stage.clientWidth,h=stage.clientHeight,vec=new THREE.Vector3();labels.forEach(l=>{vec.copy(l.pos).project(camera);const show=l.show()&&vec.z<1&&Math.abs(vec.x)<1.05&&Math.abs(vec.y)<1.05;l.el.style.display=show?'':'none';if(show){l.el.style.left=(vec.x+1)/2*w+'px';l.el.style.top=(1-vec.y)/2*h+'px'}});
   raf=requestAnimationFrame(step)};raf=requestAnimationFrame(step)}
 function focusUnit(slug,id){if(!init()||!renderer)return;const m=B[slug].units.find(x=>x.userData.u.id===id);focus=slug;iso=m?m.userData.u.floor:0;ui();if(m)select(m);else apply();loop()}
 on('change',()=>{if(!renderer)return;labelText();if(sel)select(sel)});
 on('lang',()=>{if(!renderer)return;labelText();ui();if(sel)select(sel)});
 return {show(){if(init()&&renderer){resize();loop()}Tour.show()},focusUnit};
})();

/* ---------- Virtual visit: renders wrapped on a panoramic arc ---------- */
const Tour=(()=>{
 const stage=$('#tourStage'),canvas=$('#tour3d');if(!stage)return{show(){},open(){}};
 const SC={
  living:{img:'pixel-living',group:'apt',title:['Sala, comedor y cocina','Living, dining and kitchen'],desc:['Un solo ambiente integrado, con ventanal hacia la ciudad.','One open-plan space with a window onto the city.'],hot:[{u:.05,v:.5,to:'suite',label:['Ir al dormitorio','Go to the bedroom'],icon:'→'},{u:.3,v:.34,label:['Cocina abierta con isla','Open kitchen with island'],icon:'i'},{u:.66,v:.36,label:['Ventanal de piso a techo','Floor-to-ceiling window'],icon:'i'},{u:.56,v:.86,to:'lobby',label:['Bajar al lobby','Go down to the lobby'],icon:'↓'}]},
  suite:{img:'pixel-apartment',group:'apt',title:['Dormitorio','Bedroom'],desc:['Dormitorio con vista, zona de TV y escritorio.','A bedroom with a view, TV area and desk.'],hot:[{u:.03,v:.5,to:'living',label:['Volver a la sala','Back to the living room'],icon:'←'},{u:.44,v:.36,label:['Vista hacia Quito','View over Quito'],icon:'i'},{u:.77,v:.42,label:['Muro de TV con acento de color','TV wall with colour accent'],icon:'i'}]},
  lobby:{img:'pixel-lobby',group:'common',title:['Lobby · Pixel Colors','Lobby · Pixel Colors'],desc:['El primer espacio que recibe a residentes y visitas.','The first space that welcomes residents and guests.'],hot:[{u:.05,v:.55,to:'living',label:['Subir al departamento','Go up to the apartment'],icon:'↑'},{u:.94,v:.58,to:'pool',label:['Ir a la piscina','Go to the pool'],icon:'→'},{u:.5,v:.14,label:['Techo de píxeles de colores','Colour pixel ceiling'],icon:'i'}]},
  pool:{img:'pixel-pool-water',group:'common',title:['Piscina · Pixel Pool','Pool · Pixel Pool'],desc:['Piscina cubierta con zona lounge.','Indoor pool with a lounge area.'],hot:[{u:.56,v:.3,label:['Zona lounge','Lounge area'],icon:'i'},{u:.42,v:.72,label:['Piscina con zona de descanso','Pool with a rest area'],icon:'i'},{u:.08,v:.5,to:'lobby',label:['Volver al lobby','Back to the lobby'],icon:'←'}]}};
 const ORDER=[['apt',['DEPARTAMENTO','APARTMENT'],['living','suite']],['common',['ÁREAS COMUNES','SHARED SPACES'],['lobby','pool']]];
 const ARC=150*Math.PI/180,R=10;
 const H=R*ARC/(1920/841);
 let ready=false,renderer,scene,camera,mesh,cur='living',from='pixel',yaw=0,pitch=0,fov=54,gYaw=0,gPitch=0,gFov=54,visible=false,raf=0,last=0,busy=false;const tex={};
 function init(){if(ready)return!!renderer;ready=true;if(!window.THREE)return false;try{renderer=new THREE.WebGLRenderer({canvas,antialias:true})}catch(e){return false}
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));scene=new THREE.Scene();scene.background=new THREE.Color('#0b0f0c');
  camera=new THREE.PerspectiveCamera(fov,1,.1,100);camera.rotation.order='YXZ';
  mesh=new THREE.Mesh(new THREE.CylinderGeometry(R,R,H,96,1,true,Math.PI-ARC/2,ARC),new THREE.MeshBasicMaterial({side:THREE.BackSide,color:'#ffffff'}));scene.add(mesh);
  const floor=new THREE.Mesh(new THREE.CircleGeometry(R,48),new THREE.MeshBasicMaterial({color:'#0b0f0c'}));floor.rotation.x=-Math.PI/2;floor.position.y=-H/2;scene.add(floor);
  bind();new ResizeObserver(resize).observe(stage);resize();new IntersectionObserver(es=>{visible=es[0].isIntersecting;if(visible)loop()}).observe(stage);
  nav();load(cur).then(t=>{mesh.material.map=t;mesh.material.needsUpdate=true;caption();hotspots()});return true}
 function load(k){if(tex[k])return Promise.resolve(tex[k]);return new Promise(res=>new THREE.TextureLoader().load(`/assets/${SC[k].img}.webp`,t=>{t.wrapS=THREE.RepeatWrapping;t.repeat.x=-1;t.offset.x=1;t.anisotropy=renderer.capabilities.getMaxAnisotropy();tex[k]=t;res(t)}))}
 function resize(){if(!renderer)return;const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}
 function limits(){const v=fov*Math.PI/360,hf=Math.atan(Math.tan(v)*camera.aspect);return{y:Math.max(0,ARC/2-hf),p:Math.max(0,Math.atan(H/2/R)-v)}}
 function bind(){let down=null;canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);down={x:e.clientX,y:e.clientY,yaw:gYaw,pitch:gPitch};stage.classList.add('dragging');last=performance.now()});
  canvas.addEventListener('pointermove',e=>{if(!down)return;const k=fov/stage.clientHeight*Math.PI/180;gYaw=down.yaw+(e.clientX-down.x)*k;gPitch=down.pitch+(e.clientY-down.y)*k;last=performance.now()});
  const up=()=>{down=null;stage.classList.remove('dragging')};canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
  canvas.addEventListener('wheel',e=>{e.preventDefault();gFov=clamp(gFov+e.deltaY*.03,32,54);last=performance.now()},{passive:false});
  stage.addEventListener('keydown',e=>{const s=.12;if(e.key==='ArrowLeft')gYaw+=s;else if(e.key==='ArrowRight')gYaw-=s;else return;e.preventDefault()});stage.tabIndex=0}
 function nav(){$('#tourNav').innerHTML=ORDER.map(([g,label,keys])=>`<span>${tr(label)}</span>`+keys.map(k=>`<button class="pf-chip" data-scene3="${k}" aria-pressed="${k===cur}">${tr(SC[k].title)}</button>`).join('')).join('');
  $$('[data-scene3]').forEach(b=>b.onclick=()=>go(b.dataset.scene3));
  const pos={living:[8,8],suite:[78,8],lobby:[8,62],pool:[78,62]};
  $('#tourMini').innerHTML=`<svg viewBox="0 0 150 116"><path d="M75 44v20" stroke="#9da596" stroke-dasharray="2 3"/>${Object.entries(pos).map(([k,[x,y]])=>`<rect x="${x}" y="${y}" width="64" height="44" fill="${k===cur?'#d5bc7c':'#ffffff10'}" stroke="#9da596" stroke-opacity=".5"/><text x="${x+32}" y="${y+26}" text-anchor="middle" style="font:600 8px DM Sans,sans-serif;letter-spacing:.06em" fill="${k===cur?'#1b1f18':'#c7ccbf'}">${tr(SC[k].title).split(' ·')[0].split(',')[0].toUpperCase()}</text>`).join('')}</svg>`}
 function caption(){const s=SC[cur],g=ORDER.find(o=>o[0]===s.group);$('#tour-kicker').textContent=`${L('VISITA VIRTUAL','VIRTUAL VISIT')} · ${P[from].name} · ${tr(g[1])}${from!=='pixel'?' · '+L('interiores de referencia de Pixel','Pixel reference interiors'):''}`;$('#tour-title').textContent=tr(s.title);$('#tour-desc').textContent=tr(s.desc)}
 function hotspots(){const box=$('#tourHotspots');box.innerHTML='';SC[cur].hot.forEach(h=>{const b=document.createElement('button');b.className='pf-hot';b.type='button';b.innerHTML=`<i>${h.icon}</i><span>${tr(h.label)}</span>`;const y=(.5-h.u)*ARC;h.pos=new THREE.Vector3(-Math.sin(y)*R*.95,(.5-h.v)*H*.9,-Math.cos(y)*R*.95);h.el=b;if(h.to)b.onclick=()=>go(h.to);else{b.onclick=()=>{gYaw=y;last=performance.now()};b.setAttribute('aria-label',tr(h.label))}box.append(b)})}
 async function go(k){if(busy||k===cur||!renderer)return;busy=true;Sound.whoosh();const fade=$('#tourFade');gFov=38;fade.classList.add('on');log(`GA4 · tour_open · escena=${k} · proyecto=${from}`);
  const [t]=await Promise.all([load(k),new Promise(r=>setTimeout(r,reduce?0:480))]);
  cur=k;mesh.material.map=t;mesh.material.needsUpdate=true;fov=46;gFov=54;yaw=gYaw=0;pitch=gPitch=0;caption();nav();hotspots();
  requestAnimationFrame(()=>fade.classList.remove('on'));setTimeout(()=>busy=false,reduce?0:450)}
 function loop(){if(raf)return;const step=t=>{raf=0;if(!visible||tier!=='alto')return;
   const lim=limits();if(!reduce&&performance.now()-last>3500)gYaw=Math.sin(t/7000)*lim.y*.8;gYaw=clamp(gYaw,-lim.y,lim.y);gPitch=clamp(gPitch,-lim.p,lim.p);
   const k=reduce?1:.08;yaw+=(gYaw-yaw)*k;pitch+=(gPitch-pitch)*k;fov+=(gFov-fov)*(reduce?1:.06);
   camera.fov=fov;camera.updateProjectionMatrix();camera.rotation.y=yaw;camera.rotation.x=pitch;renderer.render(scene,camera);
   const w=stage.clientWidth,h=stage.clientHeight,v=new THREE.Vector3();SC[cur].hot.forEach(x=>{if(!x.el)return;v.copy(x.pos).project(camera);const s=v.z<1&&Math.abs(v.x)<.96&&Math.abs(v.y)<.92;x.el.style.display=s?'':'none';if(s){x.el.style.left=(v.x+1)/2*w+'px';x.el.style.top=(1-v.y)/2*h+'px'}});
   raf=requestAnimationFrame(step)};raf=requestAnimationFrame(step)}
 function open(k,slug){from=slug||'pixel';if(!init())return;stage.scrollIntoView({behavior:reduce?'auto':'smooth',block:'center'});if(k===cur){caption();Sound.whoosh()}else go(k);loop()}
 on('lang',()=>{if(renderer){nav();caption();hotspots()}});
 return {show(){if(init()){resize();loop()}},open};
})();

/* ---------- Quote calculator ---------- */
function calcQuote(){Object.keys(TIER_STYLE).forEach(k=>{const v=key=>{const i=$(`[data-price="${k}:${key}"]`),n=parseFloat(i&&i.value);return isNaN(n)?null:n};
  const set=(key,n)=>{const c=$(`[data-calc="${k}:${key}"]`);if(c)c.textContent=n==null?'—':money(n)};
  const core=v('core'),site=v('site'),sites=site==null?null:site*15,sub=core==null||sites==null?null:core+sites,tot=sub==null?null:sub*1.15;
  set('sites',sites);set('subtotal',sub);set('vat',sub==null?null:sub*.15);set('total',tot);set('sign',tot==null?null:tot*.7);set('accept',tot==null?null:tot*.3);
  const tt=$(`[data-total="${k}"]`);if(tt)tt.innerHTML=tot==null?L('Precio por definir','Price to be confirmed'):`${L('Total con IVA','Total incl. VAT')}<b>${money(tot)}</b>`})}
$$('[data-price]').forEach(i=>{try{const s=localStorage.getItem('pf-price:'+i.dataset.price);if(s!=null&&i.value==='')i.value=s}catch(e){}
 i.addEventListener('input',()=>{try{localStorage.setItem('pf-price:'+i.dataset.price,i.value)}catch(e){}calcQuote()})});
const pb=$('#print-quote');if(pb)pb.onclick=()=>window.print();

/* ---------- Wiring ---------- */
$$('[data-tab]').forEach((b,i,all)=>{b.onclick=()=>selectTier(b.dataset.tab,{animate:true,hash:true});b.onkeydown=e=>{const d=e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0;if(!d)return;e.preventDefault();const n=all[(i+d+all.length)%all.length];n.focus();n.click()}});
$$('[data-tier]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();selectTier(a.dataset.tier,{animate:true,hash:true,scroll:true})}));
$$('[data-style]').forEach(b=>b.addEventListener('click',()=>{const k=STYLE_TIER[b.dataset.style];if(k&&k!==tier)selectTier(k,{fromStyle:true,animate:true})}));
let lastLang=state.lang;
new MutationObserver(()=>{if(state.lang!==lastLang){lastLang=state.lang;fire('lang');calcQuote()}}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
const fromHash=(location.hash.match(/^#demo-(basico|medio|alto)$/)||[])[1];
selectTier(fromHash||STYLE_TIER[state.style]||'basico',{fromStyle:!fromHash});
calcQuote();
})();
