(() => {
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)], state={lang:document.documentElement.lang};
const tier='basico', Sound={tick(){}};
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

const Basic=(()=>{
 const f=$('#cms');if(!f)return{show(){}};
 let cur=D.projects[0],chatLang=null,awaitingName=false,leadN=1042,chatToken=0;
 const chat=$('#wa-body'),quick=$('#wa-quick');
 const today=()=>new Date().toLocaleDateString(en()?'en-US':'es-EC',{day:'numeric',month:'short',year:'numeric'});
 function fill(){f.project.value=cur.slug;f.m2_price.value=cur.m2_price;f.status.value=cur.status;f.progress.value=cur.progress;f.progress_out.value=cur.progress+'%';f.sellable.checked=cur.sellable;[...f.age].forEach(r=>r.checked=+r.value===cur.priceAge)}
 function note(){const n=$('#cms-note');n.textContent=!cur.sellable?L('Regla activa: no comercializable. El sitio sigue publicado, sin botones de compra ni formularios de venta.','Rule active: not for sale. The site stays live, without purchase buttons or sales forms.'):cur.priceAge>D.priceValidDays?L(`Regla activa: precios con ${cur.priceAge} días. Se muestra “Consultar precio” en todos los sitios y se avisa al responsable comercial.`,`Rule active: prices are ${cur.priceAge} days old. “Ask for price” is shown on every site and the sales lead is notified.`):L('Esta demo local actualiza la tarjeta, el sitio, el JSON-LD, la tabla de estado, los sitemaps, el llms.txt y el feed.','This local demo updates the card, the site, the JSON-LD, the status table, the sitemaps, llms.txt and the feed.')}
 function feedJSON(){const ok=priceOk(cur);const o={nombre:cur.name,nombre_completo:`Edificio ${cur.name} · tnkoo Software Lab`,dominio:cur.domain,sector:cur.sector,estado:cur.status,avance_obra:cur.progress,fecha_estimada_entrega:cur.delivery,comercializable:cur.sellable,precio_m2_usd:ok?cur.m2_price:null,nota_precio:ok?null:'Consultar precio',tipologias:typesOf(cur).map(k=>({tipo:D.typologies[k].name[0],dormitorios:D.typologies[k].beds,desde_usd:ok?fromPrice(cur,k):null,disponibles:free(cur).filter(u=>u.type===k).length})),publisher:'https://inmobiliaria.alvaropaz.com/',ultima_actualizacion:new Date().toISOString().slice(0,10)};
  return esc(JSON.stringify(o,null,2)).replace(/(&quot;[^&]*?&quot;)(\s*:)?|\b(true|false|null)\b|-?\b\d+(?:\.\d+)?\b/g,(m,s,colon,lit)=>s?`<span class="${colon?'k':'s'}">${s}</span>${colon||''}`:`<span class="n">${m}</span>`)}
 function outputs(flash){
  const ok=priceOk(cur),from=fromPrice(cur);
  $('#out-card').innerHTML=`<div class="pf-card-mini"><div><h4>${cur.name}</h4><p>${esc(cur.sector)} · Quito</p><span class="pf-badge gold">${stName(cur.status)}</span><span class="pf-badge">${free(cur).length} ${L('disponibles','available')}</span><span class="pf-price ${ok?'':'ask'}">${!cur.sellable?L('Sin unidades a la venta','No units for sale'):ok&&from?L('Desde ','From ')+money(from):L('Consultar precio','Ask for price')}</span></div></div>`;
  $('#out-page-domain').textContent=cur.domain+'/';
  $('#out-page').innerHTML=`<div class="pf-page-mini"><span class="pf-byline">${L('Proyecto ficticio · Demo','Fictional project · Demo')}</span><h4>${cur.name}</h4><dl><dt>${L('Dirección','Address')}</dt><dd>${esc(cur.address)}</dd><dt>${L('Estado','Status')}</dt><dd>${stName(cur.status)} · ${cur.progress}%</dd><dt>${L('Entrega','Delivery')}</dt><dd>${cur.status==='entregado'?L('Entregado','Delivered'):month(cur.delivery)}</dd><dt>${L('Precio/m²','Price/m²')}</dt><dd>${ok?money(cur.m2_price):L('Consultar','Ask')}</dd></dl><div class="pf-cta">${cur.sellable?`<span>${L('Cotizar','Get a quote')}</span><span class="alt">WhatsApp</span>`:`<span class="alt">${L('Contacto para propietarios','Owner contact')}</span>`}</div><p>${L('Última actualización: ','Last updated: ')}${today()}</p></div>`;
  $('#out-status').innerHTML=`<table class="pf-status-row"><thead><tr><th>${L('Proyecto','Project')}</th><th>${L('Estado','Status')}</th><th>${L('Avance','Progress')}</th><th>${L('Entrega','Delivery')}</th></tr></thead><tbody>${D.projects.map(p=>`<tr class="${p===cur?'is-current':''}"><td>${p.name}</td><td>${stName(p.status)}</td><td>${p.progress}%<div class="pf-bar"><i style="width:${p.progress}%"></i></div></td><td>${p.status==='entregado'?'—':month(p.delivery)}</td></tr>`).join('')}</tbody></table>`;
  $('#out-feed').innerHTML=feedJSON();
  note();
  if(flash&&!reduce)$$('.pf-out').forEach((el,i)=>{el.classList.remove('flash');void el.offsetWidth;setTimeout(()=>el.classList.add('flash'),i*90)});
 }
 function regen(){log(`${L('regenerado','regenerated')}: ${L('tarjeta · sitio · JSON-LD · tabla de estado · sitemap · llms.txt · feed','card · site · JSON-LD · status table · sitemap · llms.txt · feed')}`);log(`Simulación → ${cur.domain}, promotora.example`)}
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
  bot(L(`¡Hola! 👋 Soy el asistente de <b>${cur.name}</b>, un proyecto ficticio de demostración. Respondo con los mismos datos que publica el sitio. ¿Qué te gustaría saber?`,`Hi! 👋 I’m the <b>${cur.name}</b> assistant, a fictional demonstration project. I answer with the same data the website shows. What would you like to know?`),1100).then(ok=>ok&&setQuick(QUICK))}
 fill();
 on('lang',()=>{outputs(false);const i=$('#wa-text');i.placeholder=i.dataset[en()?'phEn':'phEs'];if(chatLang&&chatLang!==state.lang&&tier==='basico')resetChat()});
 return {show(){outputs(false);if(chatLang!==state.lang)resetChat()}};
})();


Basic.show();document.addEventListener('demo:language',()=>{state.lang=document.documentElement.lang;fire('lang')});
})();
