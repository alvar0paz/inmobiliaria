/* Proforma page: tier tabs, level 1 (central manager + WhatsApp bot), level 2 (2D buildings),
   level 3 (3D model + virtual visit), quote calculator, launch screen and sound.
   Runs after app.js, so `state`, `render`, `$` and `$$` are available. */
(()=>{
'use strict';
const projectMode=!!$('#project-explorer');
let selectedHome=null;
function rememberHome(p,u){if(!projectMode)return;selectedHome={...u,project:p.slug};document.dispatchEvent(new CustomEvent('pixel:interest',{detail:selectedHome}))}
document.addEventListener('pixel:interest',event=>{if(!event.detail?.id)selectedHome=null});
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
 const muted=true;
 if(btn){btn.setAttribute('aria-pressed','false');btn.classList.remove('on');btn.addEventListener('click',e=>{e.stopPropagation();const want=!enabled;set(want);if(want)chime()})}
 // Audio starts only when the visitor explicitly enables the sound button.
 return {set,chime,whoosh,tick,get on(){return enabled},get muted(){return muted}};
})();

/* ---------- Launch screen ---------- */
(()=>{const s=$('#launch');if(!s)return;let seen=false;try{seen=sessionStorage.getItem('pf-launch')==='1'}catch(e){}
 if(seen||new URLSearchParams(location.search).get('demo')==='3d'){s.remove();document.documentElement.classList.add('pf-open');return}
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
 const changed=tier!==k,homeToRestore=selectedHome;
 const apply=()=>{tier=k;
  $$('[data-tab]').forEach(b=>{const s=b.dataset.tab===k;b.setAttribute('aria-selected',s);b.tabIndex=s?0:-1});
  $$('[data-panel]').forEach(p=>p.hidden=p.dataset.panel!==k);
  $$('[data-tier-card]').forEach(c=>c.classList.toggle('is-active',c.dataset.tierCard===k));
  $$('[data-select-tier]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.selectTier===k));
  if(!projectMode&&!opts.fromStyle&&state.style!==TIER_STYLE[k]){state.style=TIER_STYLE[k];render()}
 };
 if(changed&&opts.animate&&!projectMode)withTransition(apply);else apply();
 if(changed&&opts.animate)Sound.whoosh();
 ({basico:Basic,medio:Mid,alto:High})[k].show();
 if(projectMode&&homeToRestore&&changed)({medio:Mid,alto:High})[k]?.focusUnit(homeToRestore.project,homeToRestore.id);
 if(opts.hash)history.replaceState(null,'',location.pathname+location.search+(projectMode?'#experience':'#demo-'+k));
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
  $('#out-card').innerHTML=`<div class="pf-card-mini"><img src="/assets/${cur.image}.png" alt=""><div><h4>${cur.name}</h4><p>${esc(cur.sector)} · Quito</p><span class="pf-badge gold">${stName(cur.status)}</span><span class="pf-badge">${free(cur).length} ${L('disponibles','available')}</span><span class="pf-price ${ok?'':'ask'}">${!cur.sellable?L('Sin unidades a la venta','No units for sale'):ok&&from?L('Desde ','From ')+money(from):L('Consultar precio','Ask for price')}</span></div></div>`;
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
  const u=unit,ty=D.typologies[u.type];if(tier==='medio')rememberHome(p,u);
  c.innerHTML=`<span class="pf-level">${p.name.toUpperCase()} · ${L('PISO','FLOOR')} ${u.floor}</span><h4>${L('Unidad','Unit')} ${u.id} · ${tyName(u.type)}</h4><dl><dt>${L('Dorm.','Beds')}</dt><dd>${ty.beds||'—'}</dd><dt>m²</dt><dd>${u.m2}</dd><dt>${L('Precio','Price')}</dt><dd>${priceLabel(p,u)}</dd><dt>${L('Estado','Status')}</dt><dd><span class="pf-status"><i style="background:${COLOR[u.status]}"></i>${usName(u.status)}</span></dd></dl><div class="pf-actions">${u.status==='disponible'&&p.sellable?`<button class="button" data-wa>${projectMode?L('Consultar este departamento','Enquire about this apartment'):L('Cotizar por WhatsApp','Quote on WhatsApp')}</button>`:''}<button class="button ghost" data-to3d>${L('Explorar en 3D','Explore in 3D')}</button></div><p class="detail-note" data-wa-preview></p>`;
  const wa=c.querySelector('[data-wa]');if(wa)wa.onclick=()=>{if(projectMode){rememberHome(p,u);$('#contact').scrollIntoView({behavior:'instant'});return}c.querySelector('[data-wa-preview]').textContent=L(`Se abriría WhatsApp de la sala de ventas con: “Hola, me interesa la unidad ${u.id} (${tyName(u.type)}) de ${p.name}. La vi en ${p.domain}.”`,`The sales office WhatsApp would open with: “Hi, I’m interested in unit ${u.id} (${tyName(u.type)}) at ${p.name}. I saw it on ${p.domain}.”`);log(`GA4 · whatsapp_click · proyecto=${p.slug} · unidad=${u.id}`)};
  c.querySelector('[data-to3d]').hidden=projectMode&&state.style!=='immersive';
  c.querySelector('[data-to3d]').onclick=()=>{selectTier('alto',{animate:false,hash:true});High.focusUnit(p.slug,u.id);$('#stage3d').scrollIntoView({behavior:'instant',block:'center'})}}
 function draw(){if(floor==null)floor=bestFloor(p);sky();filters();elev();plan();card();$('.pf-mid [data-legend]').innerHTML=legend(p.units)}
 function focusUnit(slug,id){p=P[slug];unit=p.units.find(u=>u.id===id)||null;if(unit)floor=unit.floor;draw()}
 on('change',()=>ready&&draw());on('lang',()=>ready&&draw());
 return {show(){ready=true;draw()},draw,focusUnit};
})();

/* ---------- Level 3: 3D model of the network ---------- */
const High=(()=>{
 const stage=$('#stage3d'),canvas=$('#scene3d');if(!stage)return{show(){},focusUnit(){}};
 let ready=false,renderer,scene,camera,ray,mouse,input,raf=0,visible=false,sel=null,focus=null,iso=0,onlyFree=false,contextLost=false;
 let spatialMode='model',exploded=false,spread=0,daylight=1,lightValue=1,inside=false,interior,sun,hemi,rim,environment=[];
 const FH=3.2,DEPTH=7,CORR=2.4,UW=4.8,SPOT={pixel:[0,0],magnus:[-36,-12],sparta:[36,-6]};
 const B={},units=[],labels=[];
 const cam={theta:.7,phi:1.1,r:175,tx:0,ty:20,tz:-6},goal={...cam};
 const tip=document.createElement('div');tip.className='pf-3d-tip';tip.hidden=true;stage.append(tip);
 const MAT={disponible:{color:'#567a80',emissive:'#213e47',emissiveIntensity:.12,roughness:.3,metalness:.35},reservado:{color:'#596976',emissive:'#172e3c',emissiveIntensity:.1,roughness:.4,metalness:.25},vendido:{color:'#31464f',roughness:.5,metalness:.25}};
 function fail(){if(stage.querySelector('.pf-3d-fallback'))return;stage.insertAdjacentHTML('beforeend',`<div class="pf-3d-fallback">${L('Este navegador no tiene WebGL activo. La disponibilidad está en la vista 2D y en las tablas.','WebGL is not available in this browser. Availability is shown in the 2D view and the tables.')}</div>`)}
 function box(w,h,d,mat,x,y,z,parent){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m}
 function build(p){
  const g=new THREE.Group(),[gx,gz]=SPOT[p.slug];g.position.set(gx,0,gz);scene.add(g);
  const front=p.layout.slice(0,p.front),back=p.layout.slice(p.front),W=Math.max(front.length,back.length)*UW,DT=DEPTH*2+CORR,H=(p.floors+1)*FH;
  const info=B[p.slug]={p,g,W,DT,H,units:[],slabs:[],roof:[]};
  const rowX=row=>{const w=row.map(k=>(D.typologies[k].m2[0]+D.typologies[k].m2[1])/2),s=w.reduce((a,b)=>a+b);let x=-W/2;return w.map(v=>{const ww=v/s*W,c=x+ww/2;x+=ww;return [c,ww]})};
  const fx=rowX(front),bx=rowX(back);
  info.core=box(W-.4,H,CORR,new THREE.MeshStandardMaterial({color:'#262c26',roughness:.9}),0,H/2,0,g);
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
   const e=new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry),edge);m.add(e);m.userData={u,p,edge:e,base:MAT[u.status],baseY:m.position.y,baseZ:m.position.z};info.units.push(m);units.push(m);
   // Balcony edge and mullions give depth without changing the unit pick targets.
   const frame=new THREE.MeshStandardMaterial({color:'#d9c7aa',roughness:.68}),status=new THREE.MeshStandardMaterial({color:COLOR[u.status],roughness:.55});
   const side=isF?1:-1,face=side*(DEPTH-.28)/2;
   box(ww-.18,.11,.28,frame,0,-FH/2+.25,face,m);
   box(ww-.48,.09,.13,status,0,-.28,face+side*.28,m);
   [-.5,0,.5].forEach(v=>box(.085,FH-.55,.13,frame,v*(ww-.45),0,face,m));
  });
  info.slabs.forEach(m=>m.userData.baseY=m.position.y);info.roof.forEach(m=>m.userData.baseY=m.position.y);
 }
 function context(){const mat=new THREE.MeshStandardMaterial({color:'#1f261f',roughness:1}),rnd=(s=>()=>(s=(s*16807)%2147483647)/2147483647)(7);
  for(let i=0;i<46;i++){const a=rnd()*Math.PI*2,r=62+rnd()*110,x=Math.cos(a)*r,z=Math.sin(a)*r,h=4+rnd()*22,w=6+rnd()*10;box(w,h,6+rnd()*10,mat,x,h/2,z,scene)}
  const road=new THREE.MeshStandardMaterial({color:'#121612',roughness:1});[[0,18,300,9],[0,-44,300,7]].forEach(([x,z,w,d])=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,d),road);m.rotation.x=-Math.PI/2;m.position.set(x,.03,z);m.receiveShadow=true;scene.add(m)});
  [-18,18,54].forEach(x=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(8,300),road);m.rotation.x=-Math.PI/2;m.position.set(x,.03,0);scene.add(m)});
  const leaf=new THREE.MeshStandardMaterial({color:'#3f5a3a',roughness:1}),trunk=new THREE.MeshStandardMaterial({color:'#3a2f25'});
  for(let i=0;i<40;i++){const x=-120+i*6+rnd()*2,z=rnd()>.5?23:13,t=new THREE.Group();box(.3,1.6,.3,trunk,0,.8,0,t);const s=new THREE.Mesh(new THREE.SphereGeometry(1.3+rnd()*.6,10,8),leaf);s.position.y=2.6;s.castShadow=true;t.add(s);t.position.set(x,0,z);scene.add(t)}}
 function init(){
  if(ready)return !!renderer;
  ready=true;
  if(!window.THREE){fail();return false}
  try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'default'})}catch(e){fail();return false}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,3));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputEncoding=THREE.sRGBEncoding;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  scene=new THREE.Scene();scene.background=new THREE.Color('#263e4c');scene.fog=new THREE.Fog('#263e4c',150,400);
  camera=new THREE.PerspectiveCamera(34,1,.5,1200);ray=new THREE.Raycaster();mouse=new THREE.Vector2();
  hemi=new THREE.HemisphereLight('#e6f1f4','#686157',1.1);scene.add(hemi);
  sun=new THREE.DirectionalLight('#ffe3b8',1.5);sun.position.set(70,120,60);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-90,right:90,top:90,bottom:-90,near:.5,far:320});sun.shadow.bias=-.0003;scene.add(sun);
  rim=new THREE.DirectionalLight('#b4d9ed',.65);rim.position.set(-80,40,-60);scene.add(rim);
  const beforeContext=new Set(scene.children);
  const ground=new THREE.Mesh(new THREE.CircleGeometry(260,72),new THREE.MeshStandardMaterial({color:'#151a16',roughness:1}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
  const grid=new THREE.GridHelper(320,80,'#263026','#1b221c');grid.position.y=.02;scene.add(grid);
  context();environment=scene.children.filter(o=>!beforeContext.has(o));D.projects.forEach(build);
  interior=AlphaSpatial.interior(THREE);scene.add(interior.group);interior.group.visible=false;light();
  D.projects.forEach(p=>{
   const el=document.createElement('div');el.className='pf-3d-label';el.hidden=true;el.innerHTML='<button type="button"></button>';el.firstChild.onclick=()=>focusProject(p.slug);$('#labels3d').append(el);
   labels.push({el,pos:new THREE.Vector3(SPOT[p.slug][0],B[p.slug].H+4,SPOT[p.slug][1]),p});
  });
  $('#projects3d').innerHTML=D.projects.map(p=>`<button class="pf-chip" data-p3="${p.slug}" aria-pressed="false">${p.name}</button>`).join('');
  $$('[data-p3]').forEach(b=>b.onclick=()=>focusProject(b.dataset.p3));
  $('#overview3d').onclick=()=>{onlyFree=false;$('#avail3d').checked=false;focusProject(null)};
  $('#floor3d').oninput=e=>setFloor(Number(e.target.value));
  $('#floor3d-prev').onclick=()=>setFloor((iso||1)-1);
  $('#floor3d-next').onclick=()=>setFloor((iso||1)+1);
  $('#avail3d').onchange=e=>{onlyFree=e.target.checked;reconcile();apply();ui();loop()};
  $('#unit3d-select').onchange=e=>select(units.find(m=>`${m.userData.p.slug}:${m.userData.u.id}`===e.target.value)||null);
  $('#spatial-building').onclick=()=>setMode('model');
  $('#spatial-interior').onclick=()=>setMode('interior');
  $('#explode3d').onclick=()=>{if(!focus)focusProject(D.projects[0].slug);exploded=!exploded;iso=0;reconcile();apply();ui();frame()};
  $$('[data-daylight]').forEach(b=>b.onclick=()=>{daylight=+b.dataset.daylight;light();ui();loop()});
  $('#interior-camera').onclick=()=>{inside=!inside;ui();frame()};
  $('#interior-renders').onclick=()=>Tour.open(sel?D.typologies[sel.userData.u.type].scene:'living',focus||D.projects[0].slug);
  $$('[data-model-action]').forEach(b=>b.onclick=()=>{
   const action=b.dataset.modelAction;
   if(action==='reset')frame();else if(action==='in')zoom(.8);else if(action==='out')zoom(1.25);else rotate(action==='left'?-40:40,0);
  });
  input=ViewerControls.bind(canvas,{rotate,zoom,tap:click,reset:frame,escape:()=>select(null),
   active:v=>{stage.classList.toggle('dragging',v);tip.hidden=true},
   hover:e=>{hover(e)},leave:()=>{tip.hidden=true;canvas.style.cursor=''}});
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();contextLost=true;fail()});
  canvas.addEventListener('webglcontextrestored',()=>{contextLost=false;stage.querySelector('.pf-3d-fallback')?.remove();loop()});
  new ResizeObserver(resize).observe(stage);resize();frame(true);labelText();apply();ui();
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)loop();else input.cancel()}).observe(stage);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)input.cancel();else loop()});
  return true;
 }
 function dimensions(){
  if(spatialMode==='interior')return {width:15,height:7,depth:12};
  if(!focus)return {width:100,height:66,depth:35};
  const b=B[focus];return {width:b.W+5,height:iso?FH*2:b.H+5+(exploded?(b.p.floors+1)*2:0),depth:b.DT+5};
 }
 function fitting(){const d=dimensions();return ViewerControls.fitDistance(d.width,d.height,d.depth,camera.aspect)}
 function resize(){
  if(!renderer)return;
  const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;
  const oldFit=camera.aspect?fitting():null;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,3));renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
  if(oldFit){goal.r=clamp(goal.r*fitting()/oldFit,spatialMode==='interior'?5:18,fitting()*2.5)}
  loop();
 }
 function frame(immediate=false){
  if(!renderer)return;
  if(spatialMode==='interior'){
   interior.setInside(inside);
   Object.assign(goal,inside?{theta:.12,phi:1.48,r:camera.aspect<1?12:10,tx:0,ty:1.55,tz:-2.6}:{theta:.62,phi:.85,r:fitting(),tx:0,ty:1,tz:0});
   if(immediate)Object.assign(cam,goal);loop();return;
  }
  const b=focus?B[focus]:null,[x,z]=focus?SPOT[focus]:[0,-6];
  Object.assign(goal,{theta:.7,phi:iso?.65:1.1,r:fitting(),tx:x,ty:iso?(iso-.5)*FH:b?(b.H+(exploded?(b.p.floors+1)*2:0))/2:27,tz:z});
  if(immediate)Object.assign(cam,goal);
  loop();
 }
 function rotate(dx,dy){goal.theta-=dx*.006;goal.phi=clamp(goal.phi-dy*.005,.25,1.48);tip.hidden=true;loop()}
 function zoom(scale){goal.r=clamp(goal.r*scale,spatialMode==='interior'?5:18,fitting()*2.5);tip.hidden=true;loop()}
 function labelText(){labels.forEach(l=>{l.el.firstChild.innerHTML=`<b>${l.p.name}</b><small>${free(l.p).length} ${L('disponibles','available')}</small>`})}
 function matches(m){const {u,p}=m.userData;return(!focus||p.slug===focus)&&(!iso||u.floor===iso)&&(!onlyFree||u.status==='disponible')}
 function reconcile(){if(sel&&!matches(sel)){sel=null;$('#unit3d').hidden=true}tip.hidden=true}
 function apply(){
  if(!renderer)return;
  units.forEach(m=>{
   const {edge,base}=m.userData,mat=m.material;
   m.visible=matches(m);edge.visible=m.visible;mat.opacity=1;mat.transparent=false;mat.depthWrite=true;
   mat.emissive.set(m===sel?'#ffffff':base.emissive||'#000000');mat.emissiveIntensity=m===sel?.5:base.emissiveIntensity||0;
  });
  Object.values(B).forEach(b=>{
   b.g.visible=spatialMode==='model'&&(!focus||b.p.slug===focus);
   b.slabs.forEach(s=>s.visible=!iso||s.userData.level===iso);
   b.roof.forEach(r=>r.visible=!iso);b.lobby.visible=!iso;
   b.core.scale.y=iso?FH/b.H:1;b.core.position.y=iso?(iso-.5)*FH:b.H/2;
  });
  if(interior)interior.group.visible=spatialMode==='interior';
  environment.forEach(o=>o.visible=spatialMode==='model');
  loop();
 }
 function ui(){
  $$('[data-p3]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.p3===focus)));$('#overview3d').setAttribute('aria-pressed',String(!focus));
  $('#floor3d-filter').hidden=!focus;
  const range=$('#floor3d'),max=focus?B[focus].p.floors+1:1;
  range.disabled=!focus;range.max=max;range.min=1;range.value=iso||1;
  const floorText=iso?`${L('Piso','Floor')} ${iso}`:L('Todos los pisos','All floors');
  $('#floor3d-out').textContent=floorText;range.setAttribute('aria-valuetext',floorText);
  $('#floor3d-prev').disabled=!focus||!iso;$('#floor3d-next').disabled=!focus||iso===max;
  const scope=focus?P[focus].units.filter(u=>!iso||u.floor===iso):D.projects.flatMap(p=>p.units);
  $('.pf-model-sidebar [data-legend]').innerHTML=legend(scope);
  const list=$('#unit3d-select'),choices=focus?units.filter(matches):[];
  list.disabled=!focus||!choices.length;
  list.innerHTML=`<option value="">${L('Elige una unidad','Choose a unit')}</option>`+choices.map(m=>{const {u,p}=m.userData;return `<option value="${p.slug}:${u.id}">${u.id} · ${tyName(u.type)} · ${usName(u.status)}</option>`}).join('');
  list.value=sel?`${sel.userData.p.slug}:${sel.userData.u.id}`:'';
  $('#selection3d-status').textContent=!focus?L('Elige un proyecto para explorar sus pisos y unidades.','Choose a project to explore its floors and units.'):choices.length?L(`${choices.length} unidades en esta vista. Selecciona una en la maqueta o en la lista.`,`${choices.length} units in this view. Select one in the model or list.`):L('No hay unidades disponibles en este piso. Prueba otro piso o desactiva el filtro.','No available units on this floor. Try another floor or turn off the filter.');
  // A compact DOM description also makes state changes observable without reading WebGL internals.
  stage.dataset.project=focus||'network';stage.dataset.floor=String(iso);stage.dataset.visibleUnits=String(units.filter(matches).length);
  canvas.setAttribute('aria-label',spatialMode==='interior'?L('Ambiente 3D ilustrativo con luz variable','Illustrative 3D room with variable lighting'):L('Maqueta 3D de los proyectos','3D model of the projects'));stage.dataset.mode=spatialMode;stage.dataset.exploded=String(exploded);stage.dataset.daylight=String(daylight);
  stage.closest('.pf-high').dataset.spatialMode=spatialMode;
  $('#spatial-building').setAttribute('aria-pressed',String(spatialMode==='model'));$('#spatial-interior').setAttribute('aria-pressed',String(spatialMode==='interior'));
  $('#explode3d').hidden=spatialMode==='interior';$('#explode3d').setAttribute('aria-pressed',String(exploded));$('#explode3d').textContent=exploded?L('Unir pisos','Join floors'):L('Separar pisos','Separate floors');
  $('#spatial-daylight').hidden=spatialMode!=='interior';$('#spatial-interior-tools').hidden=spatialMode!=='interior';
  $$('[data-daylight]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.daylight===daylight)));
  $('#interior-camera').textContent=inside?L('Ver distribución','View cutaway'):L('Entrar al espacio','Step inside');$('#interior-camera').setAttribute('aria-pressed',String(inside));
  $('#spatial-scene-label').textContent=spatialMode==='model'?L('MAQUETA VIVA','LIVING MODEL'):L('UN DÍA EN CASA','A DAY AT HOME');
  $('#spatial-scene-note').textContent=spatialMode==='model'?(exploded?L('El edificio se abre para ti.','The building opens up for you.'):L('Gira. Separa los pisos. Elige un espacio.','Rotate. Separate the floors. Choose a space.')):L('Ambiente y luz ilustrativos; no es el plano de la unidad.','Illustrative room and lighting; not this unit’s floor plan.');
  if(spatialMode==='interior')$('#selection3d-status').textContent=L('Conserva tu selección mientras exploras este ambiente conceptual.','Keep your selection while exploring this conceptual room.');
 }
 function light(){
  const home=spatialMode==='interior',lo=Math.floor(lightValue),hi=Math.min(2,lo+1),mix=lightValue-lo;
  const value=a=>a[lo]+(a[hi]-a[lo])*mix,color=a=>new THREE.Color(a[lo]).lerp(new THREE.Color(a[hi]),mix);
  scene.fog=home?null:new THREE.Fog('#263e4c',150,400);
  scene.background.copy(home?color(['#b7cbcd','#b78f79','#14283e']):new THREE.Color('#263e4c'));
  hemi.intensity=home?value([.9,.6,.16]):.72;sun.intensity=home?value([1.5,1.2,.13]):1.1;
  sun.color.copy(home?color(['#fff0cd','#ffc28c','#9bb8ed']):new THREE.Color('#ffe3b8'));
  sun.position.set(...(home?[value([-9,-11,8]),value([13,6,8]),value([4,-1,-4])]:[70,120,60]));
  renderer.toneMappingExposure=home?value([1,.98,.85]):.96;
  const radius=home?16:90;Object.assign(sun.shadow.camera,{left:-radius,right:radius,top:radius,bottom:-radius});sun.shadow.camera.updateProjectionMatrix();
  rim.intensity=home?value([.25,.2,.1]):.5;interior.setTime(lightValue);
 }
 function setMode(mode){
  spatialMode=mode;tip.hidden=true;canvas.style.cursor='grab';
  if(mode==='interior'&&!focus){focus=D.projects[0].slug;iso=0;}
  light();apply();ui();frame();
 }
 function positions(){
  const value=!iso?spread:0;
  Object.values(B).forEach(b=>{b.units.forEach(m=>{m.position.y=m.userData.baseY+(m.userData.u.floor-1)*value*2;m.position.z=m.userData.baseZ+(m===sel?Math.sign(m.userData.baseZ)*value*2.6:0)});b.slabs.forEach(m=>m.position.y=m.userData.baseY+(m.userData.level-1)*value*2);b.roof.forEach(m=>m.position.y=m.userData.baseY+(b.p.floors+1)*value*2);b.core.visible=value<.01;});
 }
 function setFloor(value){
  if(!focus)return;
  const floor=clamp(Math.round(value),1,B[focus].p.floors+1);iso=floor===1?0:floor;exploded=false;
  reconcile();apply();ui();frame();
 }
 function focusProject(slug){
  focus=slug;iso=0;sel=null;exploded=false;spatialMode='model';light();$('#unit3d').hidden=true;
  apply();ui();frame();log(`GA4 · maqueta_3d · proyecto=${slug||'red'}`);
 }
 function select(m){
  sel=m;const card=$('#unit3d');
  if(!m){card.hidden=true;apply();ui();return}
  const {u,p}=m.userData,ty=D.typologies[u.type];if(tier==='alto')rememberHome(p,u);
  if(focus!==p.slug){focus=p.slug;iso=0;frame()}
  card.innerHTML=`<button class="close" data-x aria-label="${L('Cerrar unidad','Close unit')}">×</button><span class="pf-level">${p.name.toUpperCase()} · ${L('PISO','FLOOR')} ${u.floor}</span><h4>${L('Unidad','Unit')} ${u.id}</h4><dl><div><dt>${L('Tipo','Type')}</dt><dd>${tyName(u.type)}</dd></div><div><dt>m²</dt><dd>${u.m2}</dd></div><div><dt>${L('Precio','Price')}</dt><dd>${priceLabel(p,u)}</dd></div><div><dt>${L('Estado','Status')}</dt><dd><span class="pf-status"><i style="background:${COLOR[u.status]}"></i>${usName(u.status)}</span></dd></div></dl><div class="pf-actions">${projectMode?`<button class="button" data-enquire>${L('Consultar este departamento','Enquire about this apartment')}</button>`:''}<button class="button ghost" data-room>${L('Abrir ambiente 3D','Open 3D room')}</button><button class="button ghost" data-visit>${L('Ver renders','View renders')}</button><button class="button ghost" data-to2d>${L('Ver en 2D','View in 2D')}</button></div>`;
  card.hidden=false;card.querySelector('[data-x]').onclick=()=>{select(null);$('#unit3d-select').focus({preventScroll:true})};
  if(projectMode)card.querySelector('[data-enquire]').onclick=()=>{rememberHome(p,u);$('#contact').scrollIntoView({behavior:'instant'})};
  card.querySelector('[data-visit]').onclick=()=>Tour.open(ty.scene,p.slug);
  card.querySelector('[data-room]').onclick=()=>setMode('interior');
  card.querySelector('[data-to2d]').onclick=()=>{selectTier('medio',{animate:false,hash:true});Mid.focusUnit(p.slug,u.id);$('#demo-medio').scrollIntoView({behavior:'instant',block:'start'})};
  apply();ui();log(`GA4 · unidad_3d · proyecto=${p.slug} · unidad=${u.id}`);
 }
 function pick(e){
  if(!renderer||contextLost||spatialMode!=='model')return null;
  const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return null;
  mouse.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(mouse,camera);
  return ray.intersectObjects(units.filter(matches),false)[0]||null;
 }
 function hover(e){
  const hit=pick(e);if(!hit){tip.hidden=true;canvas.style.cursor='grab';return}
  const {u}=hit.object.userData,r=stage.getBoundingClientRect();
  tip.textContent=`${u.id} · ${tyName(u.type)} · ${usName(u.status)}`;
  tip.style.left=clamp(e.clientX-r.left+12,8,Math.max(8,r.width-240))+'px';tip.style.top=clamp(e.clientY-r.top+12,8,r.height-44)+'px';tip.hidden=false;canvas.style.cursor='pointer';
 }
 function click(e){if(spatialMode!=='model')return;const hit=pick(e);if(hit)select(hit.object);else select(null)}
 function loop(){
  if(raf||!renderer||contextLost||!visible||tier!=='alto'||document.hidden)return;
  const step=()=>{
   raf=0;if(!visible||tier!=='alto'||document.hidden||contextLost)return;
   let moving=false;
   if(spatialMode==='interior'){const delta=daylight-lightValue;if(Math.abs(delta)>.002)moving=true;lightValue=reduce||Math.abs(delta)<.002?daylight:lightValue+delta*.12;light();}
   const spreadGoal=exploded&&!iso?1:0,spreadDelta=spreadGoal-spread;
   if(Math.abs(spreadDelta)>.001)moving=true;
   spread=reduce||Math.abs(spreadDelta)<.001?spreadGoal:spread+spreadDelta*.13;positions();
   for(const key of ['theta','phi','r','tx','ty','tz']){const d=goal[key]-cam[key];if(Math.abs(d)>.001)moving=true;cam[key]=reduce||Math.abs(d)<.001?goal[key]:cam[key]+d*.16}
   camera.position.set(cam.tx+cam.r*Math.sin(cam.phi)*Math.sin(cam.theta),cam.ty+cam.r*Math.cos(cam.phi),cam.tz+cam.r*Math.sin(cam.phi)*Math.cos(cam.theta));camera.lookAt(cam.tx,cam.ty,cam.tz);
   renderer.render(scene,camera);
   const w=stage.clientWidth,h=stage.clientHeight,vec=new THREE.Vector3();
   labels.forEach(l=>{vec.copy(l.pos).project(camera);const show=spatialMode==='model'&&!focus&&vec.z>-1&&vec.z<1&&Math.abs(vec.x)<.94&&Math.abs(vec.y)<.92;l.el.hidden=!show;if(show){l.el.style.left=(vec.x+1)/2*w+'px';l.el.style.top=(1-vec.y)/2*h+'px'}});
   canvas.dataset.view=[cam.theta,cam.phi,cam.r].map(n=>n.toFixed(3)).join(',');
   if(moving)raf=requestAnimationFrame(step);
  };
  raf=requestAnimationFrame(step);
 }
 async function focusUnit(slug,id){
  try{await AlphaAssets.three()}catch{fail();return}
  if(!init())return;
  focus=slug;spatialMode='model';exploded=false;light();const m=B[slug]?.units.find(x=>x.userData.u.id===id);iso=m?m.userData.u.floor:0;
  if(m&&m.userData.u.status!=='disponible'){onlyFree=false;$('#avail3d').checked=false}
  select(m||null);frame();
 }
 on('change',()=>{if(!renderer)return;labelText();reconcile();if(sel)select(sel);else{apply();ui()}});
 on('lang',()=>{if(!renderer)return;labelText();if(sel)select(sel);else ui();loop()});
 return {show(){AlphaAssets.whenVisible(stage,async()=>{try{await AlphaAssets.three();if(tier!=='alto')return;if(init()){if(projectMode&&!focus)focusProject(D.projects[0].slug);resize();loop()}}catch{fail()}});Tour.show()},focusUnit};
})();

/* ---------- Virtual visit: renders wrapped on a panoramic arc ---------- */
const Tour=(()=>{
 const stage=$('#tourStage'),canvas=$('#tour3d');if(!stage)return{show(){},open(){}};
 const SC={
  living:{img:'pixel-living-render',group:'apt',title:['Sala, comedor y cocina','Living, dining and kitchen'],desc:['Un solo ambiente integrado, con ventanal hacia la ciudad.','One open-plan space with a window onto the city.'],hot:[{u:.05,v:.5,to:'suite',label:['Ir al dormitorio','Go to the bedroom'],icon:'→'},{u:.3,v:.34,label:['Cocina abierta con isla','Open kitchen with island'],icon:'i'},{u:.66,v:.36,label:['Ventanal de piso a techo','Floor-to-ceiling window'],icon:'i'},{u:.56,v:.86,to:'lobby',label:['Bajar al lobby','Go down to the lobby'],icon:'↓'}]},
  suite:{img:'pixel-apartment-render',group:'apt',title:['Dormitorio','Bedroom'],desc:['Dormitorio con vista, zona de TV y escritorio.','A bedroom with a view, TV area and desk.'],hot:[{u:.03,v:.5,to:'living',label:['Volver a la sala','Back to the living room'],icon:'←'},{u:.44,v:.36,label:['Vista hacia Quito','View over Quito'],icon:'i'},{u:.77,v:.42,label:['Muro de TV con acento de color','TV wall with colour accent'],icon:'i'}]},
  lobby:{img:'pixel-lobby-render',group:'common',title:['Lobby · Pixel Colors','Lobby · Pixel Colors'],desc:['El primer espacio que recibe a residentes y visitas.','The first space that welcomes residents and guests.'],hot:[{u:.05,v:.55,to:'living',label:['Subir al departamento','Go up to the apartment'],icon:'↑'},{u:.94,v:.58,to:'pool',label:['Ir a la piscina','Go to the pool'],icon:'→'},{u:.5,v:.14,label:['Techo de píxeles de colores','Colour pixel ceiling'],icon:'i'}]},
  pool:{img:'pixel-pool-water-render',group:'common',title:['Piscina · Pixel Pool','Pool · Pixel Pool'],desc:['Piscina cubierta con zona lounge.','Indoor pool with a lounge area.'],hot:[{u:.56,v:.3,label:['Zona lounge','Lounge area'],icon:'i'},{u:.42,v:.72,label:['Piscina con zona de descanso','Pool with a rest area'],icon:'i'},{u:.08,v:.5,to:'lobby',label:['Volver al lobby','Back to the lobby'],icon:'←'}]}};
 const ORDER=[['apt',['DEPARTAMENTO','APARTMENT'],['living','suite']],['common',['ÁREAS COMUNES','SHARED SPACES'],['lobby','pool']]];
 const ARC=150*Math.PI/180,R=10;
 const H=R*ARC/(1920/841);
 let ready=false,renderer,scene,camera,mesh,cur='living',from='pixel',yaw=0,pitch=0,fov=54,gYaw=0,gPitch=0,gFov=54,visible=false,raf=0,sequence=0,loaded=false,failed=null,contextLost=false,input;
 const textures=new Map();
 function status(message){const el=$('#tour-status');el.textContent=message;el.hidden=!message}
 function init(){
  if(ready)return !!renderer;ready=true;
  try{if(!window.THREE)throw new Error('WebGL unavailable');renderer=new THREE.WebGLRenderer({canvas,antialias:true})}catch(e){status(L('La visita necesita WebGL. Puedes abrir el recorrido completo en el enlace inferior.','This visit needs WebGL. Open the full tour using the link below.'));return false}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,3));scene=new THREE.Scene();scene.background=new THREE.Color('#0b0f0c');
  camera=new THREE.PerspectiveCamera(fov,1,.1,100);camera.rotation.order='YXZ';
  mesh=new THREE.Mesh(new THREE.CylinderGeometry(R,R,H,96,1,true,Math.PI-ARC/2,ARC),new THREE.MeshBasicMaterial({side:THREE.BackSide,color:'#ffffff'}));mesh.visible=false;scene.add(mesh);
  const floor=new THREE.Mesh(new THREE.CircleGeometry(R,48),new THREE.MeshBasicMaterial({color:'#0b0f0c'}));floor.rotation.x=-Math.PI/2;floor.position.y=-H/2;scene.add(floor);
  input=ViewerControls.bind(canvas,{rotate,zoom,reset,active:v=>stage.classList.toggle('dragging',v)});
  $$('[data-tour-action]').forEach(b=>b.onclick=()=>{const a=b.dataset.tourAction;if(a==='reset')reset();else zoom(a==='in'?.85:1/.85)});
  $('#tour-retry').onclick=()=>{if(failed)go(failed)};
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();contextLost=true;status(L('La vista 3D se ha interrumpido. Esperando a que se recupere…','The 3D view was interrupted. Waiting for it to recover…'))});
  canvas.addEventListener('webglcontextrestored',()=>{contextLost=false;status('');loop()});
  new ResizeObserver(resize).observe(stage);resize();
  new IntersectionObserver(es=>{visible=es[0].isIntersecting;if(visible)loop();else input.cancel()}).observe(stage);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)input.cancel();else loop()});
  nav();go(cur);return true;
 }
 function load(k){
  if(textures.has(k))return textures.get(k);
  const promise=new Promise((resolve,reject)=>{
   let settled=false;
   const timer=setTimeout(()=>{settled=true;reject(new Error('Image load timed out'))},15000);
   new THREE.TextureLoader().load(`/assets/${SC[k].img}.png`,texture=>{
    if(settled){texture.dispose();return}settled=true;clearTimeout(timer);
    // Keep non-power-of-two photographs at native resolution in WebGL 1.
    // Repeating/mipmapped textures otherwise get resized to smaller powers of two.
    texture.wrapS=texture.wrapT=THREE.ClampToEdgeWrapping;
    texture.generateMipmaps=false;texture.minFilter=texture.magFilter=THREE.LinearFilter;
    texture.repeat.x=-1;texture.offset.x=1;
    texture.anisotropy=renderer.capabilities.getMaxAnisotropy();resolve(texture);
   },undefined,error=>{if(settled)return;settled=true;clearTimeout(timer);reject(error)});
  }).catch(error=>{textures.delete(k);throw error});
  textures.set(k,promise);return promise;
 }
 function resize(){if(!renderer)return;const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,3));renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();loop()}
 function limits(){const v=gFov*Math.PI/360,hf=Math.atan(Math.tan(v)*camera.aspect);return{y:Math.max(0,ARC/2-hf-.015),p:Math.max(0,Math.atan(H/2/R)-v-.015)}}
 function rotate(dx,dy){const k=gFov/Math.max(1,stage.clientHeight)*Math.PI/180;gYaw+=dx*k;gPitch+=dy*k;loop()}
 function zoom(scale){gFov=clamp(gFov*scale,28,54);loop()}
 function reset(){gYaw=gPitch=0;gFov=54;loop()}
 function nav(){
  const box=$('#tourNav');
  if(!box.children.length){box.innerHTML=ORDER.flatMap(([, ,keys])=>keys.map(k=>`<button class="pf-chip" data-scene3="${k}"></button>`)).join('');$$('[data-scene3]').forEach(b=>b.onclick=()=>go(b.dataset.scene3))}
  $$('[data-scene3]').forEach(b=>{b.textContent=tr(SC[b.dataset.scene3].title);b.setAttribute('aria-pressed',String(loaded&&b.dataset.scene3===cur))});
 }
 function caption(){const s=SC[cur],g=ORDER.find(o=>o[0]===s.group);$('#tour-kicker').textContent=`${L('VISITA VIRTUAL','VIRTUAL VISIT')} · ${P[from].name} · ${tr(g[1])}${from!=='pixel'?' · '+L('interiores de referencia de Pixel','Pixel reference interiors'):''}`;$('#tour-title').textContent=tr(s.title);$('#tour-desc').textContent=tr(s.desc)}
 function hotspots(){
  const box=$('#tourHotspots');box.innerHTML='';
  SC[cur].hot.forEach(h=>{
   const b=document.createElement('button');b.className='pf-hot';b.type='button';b.innerHTML=`<i aria-hidden="true">${h.icon}</i><span>${tr(h.label)}</span>`;b.setAttribute('aria-label',tr(h.label));
   const y=(.5-h.u)*ARC;h.pos=new THREE.Vector3(-Math.sin(y)*R*.95,(.5-h.v)*H*.9,-Math.cos(y)*R*.95);h.el=b;
   b.onclick=()=>{if(h.to)go(h.to);else{gYaw=y;loop()}};box.append(b);
  });
 }
 async function go(k){
  if(!renderer||!SC[k])return;
  const request=++sequence;failed=null;$('#tour-retry').hidden=true;stage.setAttribute('aria-busy','true');
  status(L('Cargando espacio…','Loading space…'));$('#tourFade').classList.add('on');$('#tourHotspots').hidden=true;
  try{
   const texture=await load(k);if(request!==sequence)return;
   cur=k;loaded=true;mesh.visible=true;mesh.material.map=texture;mesh.material.needsUpdate=true;
   yaw=gYaw=pitch=gPitch=0;fov=gFov=54;
   stage.dataset.scene=cur;caption();nav();hotspots();status('');
   log(`GA4 · tour_open · escena=${k} · proyecto=${from}`);
  }catch(error){
   if(request!==sequence)return;
   failed=k;status(L('No se pudo cargar la imagen. Reintenta o elige otro espacio.','The image could not load. Retry or choose another space.'));$('#tour-retry').hidden=false;
  }finally{
   if(request===sequence){stage.setAttribute('aria-busy','false');$('#tourFade').classList.remove('on');$('#tourHotspots').hidden=!loaded;loop()}
  }
 }
 function loop(){
  if(raf||!renderer||contextLost||!visible||tier!=='alto'||document.hidden)return;
  const step=()=>{
   raf=0;if(!visible||tier!=='alto'||document.hidden||contextLost)return;
   const lim=limits();gYaw=clamp(gYaw,-lim.y,lim.y);gPitch=clamp(gPitch,-lim.p,lim.p);
   const moving=Math.abs(gYaw-yaw)>.0001||Math.abs(gPitch-pitch)>.0001||Math.abs(gFov-fov)>.001;
   const k=reduce||!moving?1:.18;yaw+=(gYaw-yaw)*k;pitch+=(gPitch-pitch)*k;fov+=(gFov-fov)*k;
   camera.fov=fov;camera.updateProjectionMatrix();camera.rotation.y=yaw;camera.rotation.x=pitch;renderer.render(scene,camera);
   const w=stage.clientWidth,h=stage.clientHeight,v=new THREE.Vector3();
   if(loaded)SC[cur].hot.forEach(x=>{v.copy(x.pos).project(camera);const show=v.z>-1&&v.z<1&&Math.abs(v.x)<.9&&Math.abs(v.y)<.88;x.el.hidden=!show;if(show){x.el.style.left=(v.x+1)/2*w+'px';x.el.style.top=(1-v.y)/2*h+'px'}});
   canvas.dataset.view=[yaw,pitch,fov].map(n=>n.toFixed(3)).join(',');
   if(moving)raf=requestAnimationFrame(step);
  };raf=requestAnimationFrame(step);
 }
 function open(k,slug){from=slug||'pixel';if(!init())return;stage.closest('.pf-tour-shell').scrollIntoView({behavior:'instant',block:'start'});canvas.focus({preventScroll:true});go(k);loop()}
 on('lang',()=>{if(renderer){nav();if(loaded){caption();hotspots();loop()}}});
 return {show(){AlphaAssets.whenVisible(stage,async()=>{try{await AlphaAssets.three();if(tier==='alto'&&init()){resize();loop()}}catch{status(L('No se pudo cargar la visita. Recarga para intentarlo de nuevo.','The tour could not load. Reload to try again.'))}})},open};
})();

/* ---------- Quote calculator ---------- */
const quoteMoney=n=>'USD '+n.toLocaleString(en()?'en-US':'es-EC',{minimumFractionDigits:2,maximumFractionDigits:2});
const quoteVat=Number($('#proforma')?.dataset.vat||0);
const cents=n=>Math.round((n+Number.EPSILON)*100)/100;
function calcQuote(){Object.keys(TIER_STYLE).forEach(k=>{const v=key=>{const i=$(`[data-price="${k}:${key}"]`),n=parseFloat(i&&i.value);return isNaN(n)?null:n};
  const set=(key,n)=>{const c=$(`[data-calc="${k}:${key}"]`);if(c)c.textContent=n==null?'—':quoteMoney(n)};
  const core=v('core'),site=v('site'),sites=site==null?null:cents(site*15),tot=core==null||sites==null?null:cents(core+sites),sub=tot==null?null:cents(tot/(1+quoteVat)),vat=tot==null?null:cents(tot-sub),sign=tot==null?null:cents(tot*.7);
  set('sites',sites);set('subtotal',sub);set('vat',vat);set('total',tot);set('sign',sign);set('accept',tot==null?null:cents(tot-sign));
  set('maintenance_network',v('maintenance')==null?null:cents(v('maintenance')*16));set('hosting_network',v('hosting')==null?null:cents(v('hosting')*16));
  const tt=$(`[data-total="${k}"]`);if(tt)tt.innerHTML=tot==null?L('Precio por definir','Price to be confirmed'):`${L('Total con IVA','Total incl. VAT')}<b>${quoteMoney(tot)}</b>`});
  $$('[data-price]').forEach(i=>{const p=$(`[data-print="${i.dataset.price}"]`);if(p)p.textContent=i.value===''?'—':quoteMoney(Number(i.value))})}
const pb=$('#print-quote');if(pb)pb.onclick=()=>window.print();

/* ---------- Wiring ---------- */
$$('[data-select-tier]').forEach(b=>b.addEventListener('click',()=>selectTier(b.dataset.selectTier,{animate:true,hash:true})));
$$('[data-tab]').forEach((b,i,all)=>{b.onclick=()=>selectTier(b.dataset.tab,{animate:true,hash:true});b.onkeydown=e=>{const d=e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0;if(!d)return;e.preventDefault();const visible=all.filter(x=>x.getClientRects().length);const index=visible.indexOf(b);const n=visible[(index+d+visible.length)%visible.length];n.focus();n.click()}});
$$('[data-tier]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();selectTier(a.dataset.tier,{animate:true,hash:true,scroll:true})}));
let lastStyle=state.style;
document.addEventListener('site:render',()=>{if(state.style===lastStyle)return;lastStyle=state.style;const k=projectMode?'medio':STYLE_TIER[state.style];if(k&&k!==tier)selectTier(k,{fromStyle:true,animate:false})});
let lastLang=state.lang;
new MutationObserver(()=>{if(state.lang!==lastLang){lastLang=state.lang;fire('lang');calcQuote()}}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
// Explicit demo links select the live model, bypassing the optional arrival story.
function open3DDemo(){
 if(projectMode&&state.style!=='immersive'){state.style='immersive';render()}
 selectTier('alto',{animate:false});
 const arrival=$('.arrival-optional');if(arrival)arrival.open=false;
 $('#spatial-building')?.click();
 const url=new URL(location.href);url.searchParams.set('demo','3d');url.hash='demo-3d';
 history.replaceState(null,'',url.pathname+url.search+url.hash);
 requestAnimationFrame(()=>{
  const heading=$('.spatial-heading'),bar=$('.navigation');
  const top=heading.getBoundingClientRect().top+window.scrollY-(bar?.offsetHeight||0)-16;
  window.scrollTo({top,behavior:'instant'});
  heading.focus({preventScroll:true});
 });
}
$$('[data-demo3d]').forEach(link=>link.addEventListener('click',event=>{
 if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
 event.preventDefault();open3DDemo();
}));
const fromHash=projectMode?null:(location.hash.match(/^#demo-(basico|medio|alto)$/)||[])[1];
selectTier(projectMode?'medio':(fromHash||STYLE_TIER[state.style]||'basico'),{fromStyle:!fromHash});
calcQuote();
if(new URLSearchParams(location.search).get('demo')==='3d')open3DDemo();
})();
